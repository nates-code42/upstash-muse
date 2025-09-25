-- Create enum for API key status
CREATE TYPE public.api_key_status as enum ('active', 'inactive', 'revoked');

-- API Keys table for external authentication
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_hash text UNIQUE NOT NULL,
  key_prefix text NOT NULL, -- First 8 characters for display purposes
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  status api_key_status DEFAULT 'active',
  rate_limit_per_hour integer DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  last_used timestamptz,
  expires_at timestamptz
);

-- Enable RLS on API keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- API keys policies - users can only see their own keys
CREATE POLICY "Users can view their own API keys"
ON public.api_keys
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own API keys"
ON public.api_keys
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys"
ON public.api_keys
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys"
ON public.api_keys
FOR DELETE
USING (auth.uid() = user_id);

-- API Usage tracking for rate limiting and monitoring
CREATE TABLE public.api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  request_count integer DEFAULT 1,
  hour_bucket timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(api_key_id, endpoint, hour_bucket)
);

-- Enable RLS on API usage
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- API usage policies - users can only see usage for their own keys
CREATE POLICY "Users can view usage for their own API keys"
ON public.api_usage
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.api_keys 
    WHERE api_keys.id = api_usage.api_key_id 
    AND api_keys.user_id = auth.uid()
  )
);

-- Function to validate API key and check rate limits
CREATE OR REPLACE FUNCTION public.validate_api_key(
  api_key_hash text,
  endpoint_name text,
  rate_limit_window interval DEFAULT '1 hour'::interval
)
RETURNS TABLE(
  is_valid boolean,
  key_id uuid,
  user_id uuid,
  rate_limit integer,
  current_usage bigint,
  rate_limit_exceeded boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  key_record RECORD;
  current_hour timestamptz;
  usage_count bigint;
BEGIN
  -- Get current hour bucket
  current_hour := date_trunc('hour', now());
  
  -- Check if API key exists and is active
  SELECT ak.id, ak.user_id, ak.rate_limit_per_hour, ak.status
  INTO key_record
  FROM public.api_keys ak
  WHERE ak.key_hash = validate_api_key.api_key_hash
    AND ak.status = 'active'
    AND (ak.expires_at IS NULL OR ak.expires_at > now());
  
  -- If key not found or inactive
  IF key_record.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::uuid, 0, 0::bigint, true;
    RETURN;
  END IF;
  
  -- Get current usage for this hour
  SELECT COALESCE(SUM(au.request_count), 0)
  INTO usage_count
  FROM public.api_usage au
  WHERE au.api_key_id = key_record.id
    AND au.endpoint = endpoint_name
    AND au.hour_bucket = current_hour;
  
  -- Update last_used timestamp
  UPDATE public.api_keys 
  SET last_used = now()
  WHERE id = key_record.id;
  
  -- Return validation result
  RETURN QUERY SELECT 
    true,
    key_record.id,
    key_record.user_id,
    key_record.rate_limit_per_hour,
    usage_count,
    usage_count >= key_record.rate_limit_per_hour;
END;
$$;

-- Function to record API usage
CREATE OR REPLACE FUNCTION public.record_api_usage(
  key_id uuid,
  endpoint_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_hour timestamptz;
BEGIN
  current_hour := date_trunc('hour', now());
  
  INSERT INTO public.api_usage (api_key_id, endpoint, hour_bucket, request_count)
  VALUES (key_id, endpoint_name, current_hour, 1)
  ON CONFLICT (api_key_id, endpoint, hour_bucket)
  DO UPDATE SET 
    request_count = api_usage.request_count + 1,
    created_at = now();
END;
$$;