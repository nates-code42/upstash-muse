import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { UpstashRedis } from '../shared/upstash.ts';
import { UpstashSearch } from '../shared/upstash.ts';
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

    // For internal usage, we skip API key validation and use the OpenAI key from Redis
    // This matches the behavior of the original chat-search function

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        const sendEvent = (type: string, data: any) => {
          const message = `data: ${JSON.stringify({ type, ...data })}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        try {
          // Initialize Redis and Search clients (with graceful fallbacks)
          const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
          const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
          const searchUrl = Deno.env.get('UPSTASH_SEARCH_URL');
          const searchToken = Deno.env.get('UPSTASH_SEARCH_TOKEN');

          const hasRedis = !!redisUrl && !!redisToken;
          const hasSearch = !!searchUrl && !!searchToken;

          const redis = hasRedis ? new UpstashRedis({ url: redisUrl!, token: redisToken! }) : null;
          const upstashSearch = hasSearch ? new UpstashSearch(searchUrl!, searchToken!) : null;
          // Get configuration and prompts (guarded if Redis is unavailable)
          let config: any = {};
          let prompts: SystemPrompt[] = [];
          if (redis) {
            try {
              const configData = await redis.get('search_config');
              config = smartParse(configData) || {};
              console.log('🔧 Configuration loaded:', config);
            } catch (e) {
              console.error('Redis GET error (config):', e);
            }
            try {
              const promptsData = await redis.get('system_prompts');
              prompts = smartParse(promptsData) || [];
            } catch (e) {
              console.error('Redis GET error (prompts):', e);
            }
          } else {
            console.warn('Upstash Redis not configured; using defaults');
          }
          // Get active prompt (fallback to default prompt)
          const defaultPrompt: SystemPrompt = {
            id: 'default',
            name: 'Default',
            content: 'You are a helpful assistant. Use provided sources when available.'
          };
          const activePromptId = requestBody.promptId || (config.activePromptId as string) || 'default';
          const activePrompt = prompts.find(p => p.id === activePromptId) || prompts[0] || defaultPrompt;

          console.log('🎯 Using prompt:', activePrompt.name);

          // Perform search (skip gracefully if Upstash Search is unavailable)
          const searchIndex = requestBody.searchIndex || config.searchIndex || 'cbm-products';
          const maxResults = requestBody.maxResults || config.maxResults || 5;

          let searchResults: any[] = [];
          if (upstashSearch) {
            console.log(`🔍 Searching in index: ${searchIndex} with query: "${requestBody.query}"`);
            try {
              searchResults = await upstashSearch.search(requestBody.query, { limit: maxResults });
              console.log(`📊 Search found ${searchResults.length} results`);
            } catch (e) {
              console.error('Search error:', e);
            }
          } else {
            console.warn('Upstash Search not configured; proceeding without search');
          }

          // Send sources immediately
          const sources = processSearchResultsToSources(searchResults);
          sendEvent('start', { sources });

          // Generate streaming response
          const openaiApiKey = (config && (config.openaiApiKey as string)) || Deno.env.get('OPENAI_API_KEY');
          if (!openaiApiKey) {
            sendEvent('error', { message: 'OpenAI API key not configured. Set it in Redis (search_config.openaiApiKey) or as OPENAI_API_KEY secret.' });
            controller.close();
            return;
          }
          const openaiClient = new OpenAIClient(openaiApiKey);
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

          // No API usage recording needed for internal usage

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