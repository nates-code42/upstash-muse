// Shared TypeScript interfaces and types for the API

export interface ChatSearchRequest {
  query: string;
  promptId?: string;
  searchIndex?: string;
  maxResults?: number;
  model?: string;
  temperature?: number;
}

export interface ChatSearchResponse {
  success: boolean;
  data?: {
    query: string;
    response: string;
    sources: Source[];
    searchResults: SearchResult[];
    promptUsed: string;
    model: string;
    timestamp: string;
  };
  usage?: {
    searchResultsCount: number;
    responseTokens: number;
    searchLatency: string;
  };
  error?: string;
}

export interface Source {
  id: string;
  title: string;
  description: string;
  url: string;
  score?: number;
  metadata?: any;
}

export interface SearchResult {
  id: string;
  content: any;
  metadata?: any;
  score: number;
}

export interface SystemPrompt {
  id: string;
  name: string;
  description?: string;
  content: string;
}

export interface PromptsResponse {
  success: boolean;
  data?: SystemPrompt[];
  error?: string;
}

export interface ConfigResponse {
  success: boolean;
  data?: {
    models: string[];
    searchIndexes: string[];
  };
  error?: string;
}

export interface ApiKeyValidation {
  is_valid: boolean;
  key_id: string | null;
  user_id: string | null;
  rate_limit: number;
  current_usage: number;
  rate_limit_exceeded: boolean;
}

export interface RedisConfig {
  url: string;
  token: string;
}