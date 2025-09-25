import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateApiKey, recordApiUsage } from '../shared/auth.ts';
import { UpstashRedis, UpstashSearch, smartParse } from '../shared/upstash.ts';
import { OpenAIClient, processSearchResultsToSources } from '../shared/openai.ts';
import { ChatSearchRequest, ChatSearchResponse, SystemPrompt } from '../shared/types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const startTime = Date.now();
    
    // Validate API key
    const authHeader = req.headers.get('authorization');
    const validation = await validateApiKey(authHeader, 'chat-search');
    
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: validation.error }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    let requestData: ChatSearchRequest;
    try {
      requestData = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate required fields
    if (!requestData.query) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Redis configuration - same as in the frontend
    const redisConfig = {
      url: "https://charmed-grubworm-8756.upstash.io",
      token: "ASI0AAImcDJhYTZmMzQ0ZmZjYzE0NmVhOTc3YjYxMDVmMmFiM2EyZnAyODc1Ng"
    };

    const redis = new UpstashRedis(redisConfig);

    // Load configuration from Redis
    let config;
    try {
      const configData = await redis.get('chatbot_config');
      config = smartParse(configData) || {};
    } catch (error) {
      console.error('Error loading config from Redis:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Configuration not found. Please configure the system first.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate configuration
    if (!config.upstashUrl || !config.upstashToken || !config.openaiApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Incomplete configuration. Please ensure all API keys are set.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Load prompts and select the right one
    let selectedPrompt = 'You are a helpful assistant for Circuit Board Medics, a company specializing in electronic control module repair.';
    let promptName = 'Default Prompt';
    
    if (requestData.promptId) {
      try {
        const promptsData = await redis.get('chatbot_prompts');
        const prompts = smartParse(promptsData) || [];
        
        const prompt = prompts.find((p: SystemPrompt) => p.id === requestData.promptId);
        if (prompt) {
          selectedPrompt = prompt.content;
          promptName = prompt.name;
        }
      } catch (error) {
        console.warn('Error loading prompt:', error);
        // Continue with default prompt
      }
    }

    // Perform search using Upstash
    const search = new UpstashSearch(config.upstashUrl, config.upstashToken);
    const searchIndex = requestData.searchIndex || config.searchIndex || 'CBM Products1';
    const maxResults = Math.min(requestData.maxResults || 10, 20); // Cap at 20 results
    
    console.log(`Searching for: "${requestData.query}" in index: ${searchIndex}`);
    
    const searchResults = await search.search(requestData.query, {
      filter: searchIndex,
      limit: maxResults
    });

    console.log(`Found ${searchResults.length} search results`);

    if (searchResults.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          data: {
            query: requestData.query,
            response: "I couldn't find any relevant information for your query. Please try rephrasing your question or contact our support team for assistance.",
            sources: [],
            searchResults: [],
            promptUsed: promptName,
            model: requestData.model || config.openaiModel || 'gpt-4o-mini',
            timestamp: new Date().toISOString()
          },
          usage: {
            searchResultsCount: 0,
            responseTokens: 0,
            searchLatency: `${Date.now() - startTime}ms`
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate AI response
    const openai = new OpenAIClient(config.openaiApiKey);
    const model = requestData.model || config.openaiModel || 'gpt-4o-mini';
    
    const { response, tokenCount } = await openai.generateResponse(
      requestData.query,
      selectedPrompt,
      searchResults,
      model
    );

    // Process search results into sources
    const sources = processSearchResultsToSources(searchResults);

    // Record API usage
    if (validation.validation) {
      await recordApiUsage(validation.validation.key_id!, 'chat-search');
    }

    const responseData: ChatSearchResponse = {
      success: true,
      data: {
        query: requestData.query,
        response: response,
        sources: sources,
        searchResults: searchResults,
        promptUsed: promptName,
        model: model,
        timestamp: new Date().toISOString()
      },
      usage: {
        searchResultsCount: searchResults.length,
        responseTokens: tokenCount,
        searchLatency: `${Date.now() - startTime}ms`
      }
    };

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in chat-search function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error. Please try again later.' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});