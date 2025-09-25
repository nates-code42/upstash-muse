import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ApiKeyValidation } from './types.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Validates API key and checks rate limits
 */
export async function validateApiKey(
  apiKeyHeader: string | null,
  endpoint: string
): Promise<{ valid: boolean; validation?: ApiKeyValidation; error?: string }> {
  if (!apiKeyHeader) {
    return { valid: false, error: 'Missing API key in Authorization header' };
  }

  // Extract API key from "Bearer <key>" format
  const apiKey = apiKeyHeader.replace(/^Bearer\s+/, '');
  
  if (!apiKey) {
    return { valid: false, error: 'Invalid API key format. Use "Bearer <your-api-key>"' };
  }

  try {
    // Hash the API key for comparison (using built-in crypto)
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Call the validation function
    const { data: validationResult, error } = await supabase
      .rpc('validate_api_key', {
        api_key_hash: hashHex,
        endpoint_name: endpoint
      });

    if (error) {
      console.error('Error validating API key:', error);
      return { valid: false, error: 'API key validation failed' };
    }

    if (!validationResult || validationResult.length === 0) {
      return { valid: false, error: 'Invalid API key' };
    }

    const validation = validationResult[0] as ApiKeyValidation;

    if (!validation.is_valid) {
      return { valid: false, error: 'Invalid or expired API key' };
    }

    if (validation.rate_limit_exceeded) {
      return { 
        valid: false, 
        error: `Rate limit exceeded. Limit: ${validation.rate_limit} requests per hour. Current usage: ${validation.current_usage}` 
      };
    }

    return { valid: true, validation };

  } catch (err) {
    console.error('Error in API key validation:', err);
    return { valid: false, error: 'API key validation failed' };
  }
}

/**
 * Records API usage for rate limiting
 */
export async function recordApiUsage(keyId: string, endpoint: string): Promise<void> {
  try {
    const { error } = await supabase
      .rpc('record_api_usage', {
        key_id: keyId,
        endpoint_name: endpoint
      });

    if (error) {
      console.error('Error recording API usage:', error);
    }
  } catch (err) {
    console.error('Error recording API usage:', err);
  }
}

/**
 * Generate a new API key
 */
export async function generateApiKey(): Promise<string> {
  // Generate a secure random API key
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}