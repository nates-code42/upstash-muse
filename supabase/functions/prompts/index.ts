import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateApiKey, recordApiUsage } from '../shared/auth.ts';
import { UpstashRedis, smartParse } from '../shared/upstash.ts';
import { PromptsResponse, SystemPrompt } from '../shared/types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    // Validate API key
    const authHeader = req.headers.get('authorization');
    const validation = await validateApiKey(authHeader, 'prompts');
    
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: validation.error }),
        { 
          status: 401, 
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

    // Load prompts from Redis
    let prompts: SystemPrompt[] = [];
    try {
      const promptsData = await redis.get('chatbot_prompts');
      const parsedPrompts = smartParse(promptsData);
      
      if (Array.isArray(parsedPrompts)) {
        prompts = parsedPrompts.map((prompt: any) => ({
          id: prompt.id,
          name: prompt.name,
          description: prompt.description || '',
          content: prompt.content
        }));
      }
    } catch (error) {
      console.error('Error loading prompts from Redis:', error);
      // Return empty array if no prompts found
    }

    // Add default prompt if no prompts exist
    if (prompts.length === 0) {
      prompts = [{
        id: 'default',
        name: 'Default Assistant',
        description: 'Standard Circuit Board Medics assistant prompt',
        content: 'You are a helpful assistant for Circuit Board Medics, a company specializing in electronic control module repair.'
      }];
    }

    // Record API usage
    if (validation.validation) {
      await recordApiUsage(validation.validation.key_id!, 'prompts');
    }

    const responseData: PromptsResponse = {
      success: true,
      data: prompts
    };

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in prompts function:', error);
    
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