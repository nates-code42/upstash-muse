import { RedisConfig, SearchResult } from './types.ts';

/**
 * Redis REST API client for Upstash
 */
export class UpstashRedis {
  private url: string;
  private token: string;

  constructor(config: RedisConfig) {
    this.url = config.url;
    this.token = config.token;
  }

  async get(key: string): Promise<any> {
    try {
      const response = await fetch(`${this.url}/get/${encodeURIComponent(key)}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Redis GET failed: ${response.status}`);
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Redis GET error:', error);
      throw error;
    }
  }

  async set(key: string, value: any): Promise<void> {
    try {
      const response = await fetch(`${this.url}/set/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([value])
      });

      if (!response.ok) {
        throw new Error(`Redis SET failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Redis SET error:', error);
      throw error;
    }
  }
}

/**
 * Upstash Search client
 */
export class UpstashSearch {
  private url: string;
  private token: string;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  async search(query: string, options: {
    filter?: string;
    limit?: number;
  } = {}): Promise<SearchResult[]> {
    try {
      const searchData = {
        q: query,
        filter: options.filter || '',
        limit: options.limit || 10
      };

      const response = await fetch(`${this.url}/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchData)
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform the results to match our interface
      return data.hits?.map((hit: any, index: number) => ({
        id: hit.id || `result-${index}`,
        content: hit.data,
        metadata: hit.metadata,
        score: hit.score || 0
      })) || [];

    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }
}

/**
 * Smart parsing function to handle various Redis encoding formats
 */
export function smartParse(value: any): any {
  if (typeof value !== 'string') return value;
  
  const looksLikeJSON = (s: string) => {
    const trimmed = s.trim();
    return trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('"');
  };
  
  if (!looksLikeJSON(value)) return value;
  
  try {
    let parsed = JSON.parse(value);
    // Handle double-encoding by parsing again if result is still a JSON string
    if (typeof parsed === 'string' && looksLikeJSON(parsed)) {
      parsed = JSON.parse(parsed);
    }
    return parsed;
  } catch {
    return value;
  }
}