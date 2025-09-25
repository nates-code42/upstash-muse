import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { UpstashRedis } from '../shared/upstash.ts';
import { UpstashSearch } from '../shared/upstash.ts';
import { validateApiKey, recordApiUsage } from '../shared/auth.ts';
import { smartParse } from '../shared/upstash.ts';
import { OpenAIClient, processSearchResultsToSources } from '../shared/openai.ts';
import { ChatSearchRequest, SystemPrompt } from '../shared/types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
};

serve(async (req) => {
  console.log('🌊 Streaming chat search request received');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Parse request body
    const requestBody: ChatSearchRequest = await req.json();
    console.log('📝 Request body:', JSON.stringify(requestBody, null, 2));

    if (!requestBody.query || typeof requestBody.query !== 'string') {
      return new Response(JSON.stringify({ error: 'Query is required and must be a string' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate API key
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'API key required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = authHeader.slice(7);
    const validation = await validateApiKey(apiKey, 'chat-search-stream');
    
    if (!validation.valid || (validation.validation && validation.validation.rate_limit_exceeded)) {
      return new Response(JSON.stringify({ 
        error: validation.validation?.rate_limit_exceeded ? 'Rate limit exceeded' : 'Invalid API key' 
      }), {
        status: validation.validation?.rate_limit_exceeded ? 429 : 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        const sendEvent = (type: string, data: any) => {
          const message = `data: ${JSON.stringify({ type, ...data })}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        try {
          // Initialize Redis and Search clients
          const redisConfig = {
            url: Deno.env.get('UPSTASH_REDIS_REST_URL')!,
            token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!
          };
          const redis = new UpstashRedis(redisConfig);
          const upstashSearch = new UpstashSearch(
            Deno.env.get('UPSTASH_SEARCH_URL')!,
            Deno.env.get('UPSTASH_SEARCH_TOKEN')!
          );

          // Get configuration and prompts
          const configData = await redis.get('search_config');
          const config = smartParse(configData) || {};
          console.log('🔧 Configuration loaded:', config);

          const promptsData = await redis.get('system_prompts');
          const prompts: SystemPrompt[] = smartParse(promptsData) || [];

          // Get active prompt
          const activePromptId = requestBody.promptId || config.activePromptId || 'default';
          const activePrompt = prompts.find(p => p.id === activePromptId) || prompts[0];
          
          if (!activePrompt) {
            sendEvent('error', { message: 'No active prompt found' });
            controller.close();
            return;
          }

          console.log('🎯 Using prompt:', activePrompt.name);

          // Perform search
          const searchIndex = requestBody.searchIndex || config.searchIndex || 'cbm-products';
          const maxResults = requestBody.maxResults || config.maxResults || 5;

          console.log(`🔍 Searching in index: ${searchIndex} with query: "${requestBody.query}"`);
          
          const searchResults = await upstashSearch.search(requestBody.query, {
            limit: maxResults
          });
          console.log(`📊 Search found ${searchResults.length} results`);

          if (searchResults.length === 0) {
            sendEvent('start', { sources: [] });
            sendEvent('content', { content: "I couldn't find any relevant information in our knowledge base to answer your question. Could you try rephrasing your question or asking about something else?" });
            sendEvent('done', { usage: { completion_tokens: 0 } });
            controller.close();
            return;
          }

          // Send sources immediately
          const sources = processSearchResultsToSources(searchResults);
          sendEvent('start', { sources });

          // Generate streaming response
          const openaiClient = new OpenAIClient(config.openaiApiKey);
          const model = requestBody.model || config.model || 'gpt-4o-mini';

          console.log(`🤖 Generating streaming response with model: ${model}`);

          let totalTokens = 0;
          for await (const chunk of openaiClient.generateStreamingResponse(
            requestBody.query,
            activePrompt.content,
            searchResults,
            model
          )) {
            if (chunk.type === 'content' && chunk.content) {
              sendEvent('content', { content: chunk.content });
            } else if (chunk.type === 'done' && chunk.usage) {
              totalTokens = chunk.usage.completion_tokens || 0;
              sendEvent('done', { 
                usage: { 
                  searchResultsCount: searchResults.length,
                  responseTokens: totalTokens,
                  searchLatency: '0ms'
                }
              });
            }
          }

          // Record API usage
          if (validation.validation?.key_id) {
            await recordApiUsage(validation.validation.key_id, 'chat-search-stream');
          }

          console.log('✅ Streaming response completed');
          controller.close();

        } catch (error) {
          console.error('❌ Error in streaming response:', error);
          sendEvent('error', { message: error instanceof Error ? error.message : 'Unknown error' });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: corsHeaders,
    });

  } catch (error) {
    console.error('❌ Error processing streaming request:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});