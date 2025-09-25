import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateApiKey, recordApiUsage } from '../shared/auth.ts';
import { ConfigResponse } from '../shared/types.ts';

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
    const validation = await validateApiKey(authHeader, 'config');
    
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: validation.error }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Available OpenAI models
    const availableModels = [
      'gpt-4o-mini',
      'gpt-4o',
      'gpt-4',
      'gpt-3.5-turbo'
    ];

    // Available search indexes (based on the current application)
    const availableSearchIndexes = [
      'CBM Products1',
      'CBM Products2',
      'General Knowledge'
    ];

    // Record API usage
    if (validation.validation) {
      await recordApiUsage(validation.validation.key_id!, 'config');
    }

    const responseData: ConfigResponse = {
      success: true,
      data: {
        models: availableModels,
        searchIndexes: availableSearchIndexes
      }
    };

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in config function:', error);
    
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