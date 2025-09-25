import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Settings, MessageSquare, Loader2, Database, Brain, Send, Copy, ExternalLink, Bot, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Search as UpstashSearch } from '@upstash/search';
import { parseMarkdownLinks } from '@/lib/utils';
import logoImage from '@/assets/circuit-board-medics-logo.png';

interface SearchResult {
  id: string;
  content: any;
  metadata?: any;
  score: number;
}

interface Message {
  id: string;
  query: string;
  response: string;
  timestamp: Date;
  searchResults?: SearchResult[];
}

interface Source {
  id: string;
  title: string;
  description: string;
  url: string;
  metadata?: any;
}

const SearchInterface = () => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [activeSources, setActiveSources] = useState<Source[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Redis REST API configuration for browser use
  const redisConfig = {
    url: "https://charmed-grubworm-8756.upstash.io",
    token: "ASI0AAImcDJhYTZmMzQ0ZmZjYzE0NmVhOTc3YjYxMDVmMmFiM2EyZnAyODc1Ng"
  };
  
  // Configuration state
  const [config, setConfig] = useState({
    upstashUrl: '',
    upstashToken: '',
    openaiApiKey: '',
    openaiModel: 'gpt-4o',
    systemPrompt: '', // No default - must come from Redis
    searchIndex: 'CBM Products1'
  });

  // Load configuration from Redis on component mount
  useEffect(() => {
    loadConfigFromRedis();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 200; // Max height in pixels
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [query]);

  const redisGet = async (key: string) => {
    try {
      const response = await fetch(`${redisConfig.url}/get/${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${redisConfig.token}`,
        },
      });
      
      if (!response.ok) {
        console.log('Redis GET failed:', response.status, response.statusText);
        return null;
      }
      
      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  };

  const redisSet = async (key: string, value: any) => {
    try {
      const response = await fetch(`${redisConfig.url}/set/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${redisConfig.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(value),
      });
      
      if (!response.ok) {
        throw new Error(`Redis SET failed: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Redis SET error:', error);
      throw error;
    }
  };

  const loadConfigFromRedis = async () => {
    try {
      setIsLoadingConfig(true);
      console.log('Loading configuration from Redis...');
      
      const raw = await redisGet('search-assistant-config');
      console.log('Raw Redis response:', raw);
      
      if (raw) {
        let parsedConfig: any = raw;
        let wasDoubleEncoded = false;
        
        // Parse JSON if needed (handles possible double-encoding)
        if (typeof parsedConfig === 'string') {
          try {
            parsedConfig = JSON.parse(parsedConfig);
            if (typeof parsedConfig === 'string') {
              parsedConfig = JSON.parse(parsedConfig);
              wasDoubleEncoded = true;
            }
          } catch (parseError) {
            console.error('Failed to parse config JSON:', parseError);
            toast({
              title: "Configuration Error",
              description: "Failed to parse saved configuration. Please reconfigure.",
              variant: "destructive"
            });
            setShowConfig(true);
            return;
          }
        }
        
        if (!parsedConfig || typeof parsedConfig !== 'object') {
          console.warn('Parsed config is not an object:', parsedConfig);
          toast({
            title: "Configuration Error",
            description: "Saved configuration is corrupted. Please reconfigure.",
            variant: "destructive"
          });
          setShowConfig(true);
          return;
        }
        
        // Validate critical fields including system prompt
        const requiredFields = ['upstashUrl', 'upstashToken', 'openaiApiKey', 'searchIndex', 'systemPrompt'];
        const missingFields = requiredFields.filter((field) => !parsedConfig[field]);
        
        if (missingFields.length > 0) {
          console.warn('Missing configuration fields:', missingFields);
          toast({
            title: "Incomplete Configuration",
            description: `Missing: ${missingFields.join(', ')}. Please complete your setup.`,
            variant: "destructive"
          });
          setShowConfig(true);
          return; // Don't proceed with incomplete config
        }
        
        // Use config directly from Redis - no fallbacks to defaults
        setConfig(parsedConfig);
        
        console.log('Config updated from Redis:');
        console.log('- System prompt loaded from Redis:', !!parsedConfig.systemPrompt);
        console.log('- System prompt length:', parsedConfig.systemPrompt?.length || 0);
        console.log('- System prompt preview:', parsedConfig.systemPrompt?.substring(0, 100) + '...');
        console.log('- All config fields present:', requiredFields.every(field => parsedConfig[field]));
        
        // If we detected double-encoding, normalize by re-saving once
        if (wasDoubleEncoded) {
          try {
            await redisSet('search-assistant-config', parsedConfig);
            console.log('Normalized double-encoded configuration in Redis');
          } catch (e) {
            console.warn('Failed to normalize saved config:', e);
          }
        }
        
        console.log('Successfully loaded and validated config:', parsedConfig);
        
        toast({
          title: "Configuration Loaded",
          description: "Settings loaded from previous session",
        });
      } else {
        console.log('No saved configuration found, using defaults');
        setShowConfig(true);
        toast({
          title: "First Time Setup",
          description: "Please configure your API credentials to get started",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Failed to load config from Redis:', error);
      toast({
        title: "Configuration Error",
        description: "Failed to load saved settings. Please reconfigure.",
        variant: "destructive"
      });
      setShowConfig(true);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const saveConfigToRedis = async () => {
    try {
      // Validate configuration before saving including system prompt
      const requiredFields = ['upstashUrl', 'upstashToken', 'openaiApiKey', 'searchIndex', 'systemPrompt'];
      const missingFields = requiredFields.filter(field => !config[field as keyof typeof config]);
      
      if (missingFields.length > 0) {
        toast({
          title: "Incomplete Configuration",
          description: `Please fill in: ${missingFields.join(', ')}`,
          variant: "destructive"
        });
        return;
      }
      
      // Store plain object; redisSet will JSON-encode once
      await redisSet('search-assistant-config', config);
      
      toast({
        title: "Configuration saved",
        description: "Your settings have been stored securely in Redis"
      });
      console.log('Saved config to Redis:', config);
      
      // Close config panel after successful save
      setShowConfig(false);
      
    } catch (error) {
      console.error('Failed to save config to Redis:', error);
      toast({
        title: "Failed to save configuration",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Please enter a search query",
        variant: "destructive"
      });
      return;
    }

    if (!config.upstashUrl || !config.upstashToken || !config.openaiApiKey || !config.searchIndex || !config.systemPrompt) {
      toast({
        title: "Missing Configuration",
        description: "Please configure all required fields including system prompt",
        variant: "destructive"
      });
      setShowConfig(true);
      return;
    }

    setIsLoading(true);
    
    try {
      let searchResults: SearchResult[] = [];
      
      // Use the correct Upstash Search SDK pattern: client.index("name").search()
      try {
        const client = new UpstashSearch({
          url: config.upstashUrl,
          token: config.upstashToken,
        });

        const index = client.index(config.searchIndex);
        const searchResponse = await index.search({
          query: query,
          limit: 100, // Retrieve up to 100 results for better coverage
        });

        const allResults = searchResponse || [];
        
        // Debug: Log initial retrieval stats
        console.log('=== Search Result Filtering Debug ===');
        console.log('Total results received from Upstash:', allResults.length);
        if (allResults.length > 0) {
          const scores = allResults.map(r => r.score || 0);
          console.log('Score range:', { min: Math.min(...scores), max: Math.max(...scores) });
        }
        
        // Filter to top 10 results by relevance score (descending)
        searchResults = allResults
          .sort((a, b) => (b.score || 0) - (a.score || 0))
          .slice(0, 10);
        
        console.log('Top 10 results selected for AI context:', searchResults.length);
        if (searchResults.length > 0) {
          const topScores = searchResults.map(r => r.score || 0);
          console.log('Top 10 score range:', { min: Math.min(...topScores), max: Math.max(...topScores) });
        }
        console.log('Results filtered out:', allResults.length - searchResults.length);
        
      } catch (searchError) {
        console.error('Upstash Search error:', searchError);
        throw new Error(`Upstash Search failed: ${searchError instanceof Error ? searchError.message : 'Unknown error'}`);
      }

      // Step 2: Generate OpenAI response with ALL search result data
      const formattedResults = searchResults.map((result, index) => {
        // Include ALL fields from the search result
        const content = result.content || {};
        const metadata = result.metadata || {};
        
        // Format all content fields, ensuring URLs are full
        const contentFields = Object.entries(content)
          .map(([key, value]) => {
            // If this looks like a URL field, ensure it's a full URL
            if (typeof value === 'string' && (key.toLowerCase().includes('url') || value.startsWith('/'))) {
              const fullUrl = value.startsWith('/') ? `https://circuitboardmedics.com${value}` : value;
              return `${key}: ${fullUrl}`;
            }
            return `${key}: ${value}`;
          })
          .join('\n');
        
        // Format all metadata fields, ensuring URLs are full
        const metadataFields = Object.keys(metadata).length > 0 
          ? '\nMetadata:\n' + Object.entries(metadata)
              .map(([key, value]) => {
                // If this looks like a URL field, ensure it's a full URL
                if (typeof value === 'string' && (key.toLowerCase().includes('url') || value.startsWith('/'))) {
                  const fullUrl = value.startsWith('/') ? `https://circuitboardmedics.com${value}` : value;
                  return `${key}: ${fullUrl}`;
                }
                return `${key}: ${value}`;
              })
              .join('\n')
          : '';
        
        return `Result ${index + 1} (ID: ${result.id}, Score: ${result.score?.toFixed(2) || 'N/A'}):\n${contentFields}${metadataFields}`;
      }).join('\n\n');

      const contextText = formattedResults;

      // Format the user message with query wrapper
      const formatUserMessage = (query: string, contextText: string): string => {
        return `Question: ${query}

Relevant content from the website:
${contextText}

Please provide a comprehensive answer based on this information.`;
      };

      const formattedUserMessage = formatUserMessage(query, contextText);

      // Debug: Log the system prompt and formatted message being used
      console.log('=== OpenAI Request Debug ===');
      console.log('System prompt being sent to OpenAI:');
      console.log('Length:', config.systemPrompt.length);
      console.log('First 200 chars:', config.systemPrompt.substring(0, 200));
      console.log('Is Circuit Board Medics prompt?:', config.systemPrompt.includes('Circuit Board Medics'));
      console.log('Formatted user message preview:', formattedUserMessage.substring(0, 300) + '...');

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.openaiModel,
          messages: [
            {
              role: 'system',
              content: config.systemPrompt
            },
            {
              role: 'user',
              content: formattedUserMessage
            }
          ],
          max_tokens: 4000,
          temperature: 0.7
        })
      });

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `HTTP ${openaiResponse.status}: ${openaiResponse.statusText}`;
        throw new Error(`OpenAI API Error: ${errorMessage}`);
      }

      const openaiData = await openaiResponse.json();
      
      if (!openaiData.choices || !openaiData.choices[0]?.message?.content) {
        throw new Error('Invalid response format from OpenAI API');
      }
      
      const aiResponse = openaiData.choices[0].message.content;

      // Add to messages
      const newMessage: Message = {
        id: Date.now().toString(),
        query,
        response: aiResponse,
        timestamp: new Date(),
        searchResults
      };

      setMessages(prev => [...prev, newMessage]);
      setActiveSources(processSearchResultsToSources(searchResults));
      setQuery('');
      
      toast({
        title: "Search completed",
        description: `Found ${searchResults.length} results and generated response`
      });

    } catch (error) {
      console.error('Search error:', error);
      let errorMessage = "An unexpected error occurred";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Provide more specific guidance based on error type
        if (errorMessage.includes('OpenAI API Error')) {
          if (errorMessage.includes('insufficient_quota')) {
            errorMessage = 'OpenAI API quota exceeded. Please check your billing and usage limits.';
          } else if (errorMessage.includes('invalid_api_key')) {
            errorMessage = 'Invalid OpenAI API key. Please check your configuration.';
          } else if (errorMessage.includes('context_length_exceeded')) {
            errorMessage = 'Context too long for the model. Try a shorter query or fewer search results.';
          }
        } else if (errorMessage.includes('Upstash Search failed')) {
          errorMessage = 'Search service error. Please verify your Upstash configuration.';
        }
      }
      
      toast({
        title: "Search failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Message copied to clipboard"
      });
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        toast({
          title: "Copied!",
          description: "Message copied to clipboard"
        });
      } catch (fallbackError) {
        toast({
          title: "Copy failed",
          description: "Unable to copy to clipboard",
          variant: "destructive"
        });
      }
      document.body.removeChild(textArea);
    }
  };

  const processSearchResultsToSources = (searchResults: SearchResult[]): Source[] => {
    return searchResults.map((result, index) => {
      const metadata = result.metadata || {};
      const content = result.content || {};
      
      // Extract title from content (Name field or first available field)
      const title = content.Name || content.Title || content.Product || `Source ${index + 1}`;
      
      // Extract description from content (Description field or truncated content)
      const description = content.Description || 
                         Object.values(content).find(val => typeof val === 'string' && val.length > 20) || 
                         'No description available';
      
      // Extract and construct URL
      let url = '';
      if (metadata['Product URL']) {
        url = `https://circuitboardmedics.com${metadata['Product URL']}`;
      } else if (content.URL || content.url) {
        url = content.URL || content.url;
        // Add domain if it's a relative URL
        if (url.startsWith('/')) {
          url = `https://circuitboardmedics.com${url}`;
        }
      }
      
      return {
        id: result.id || `source-${index}`,
        title: typeof title === 'string' ? title : String(title),
        description: typeof description === 'string' ? description.substring(0, 150) + '...' : 'No description available',
        url,
        metadata
      };
    });
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-sm border-b border-border/40 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <img src={logoImage} alt="Circuit Board Medics" className="h-8" />
          <Button
            variant="ghost"
            onClick={() => setShowConfig(!showConfig)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </header>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="bg-background/95 backdrop-blur-sm border-b border-border/40 px-6 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Upstash Search URL
                </label>
                <input
                  type="text"
                  value={config.upstashUrl}
                  onChange={(e) => setConfig(prev => ({ ...prev, upstashUrl: e.target.value }))}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder="https://your-search-endpoint.upstash.io"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Upstash Token
                </label>
                <input
                  type="password"
                  value={config.upstashToken}
                  onChange={(e) => setConfig(prev => ({ ...prev, upstashToken: e.target.value }))}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder="Your Upstash token"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  value={config.openaiApiKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder="sk-..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  OpenAI Model
                </label>
                <select
                  value={config.openaiModel}
                  onChange={(e) => setConfig(prev => ({ ...prev, openaiModel: e.target.value }))}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                >
                  <option value="gpt-5-mini">gpt-5-mini</option>
                  <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                  <option value="gpt-4o">gpt-4o</option>
                  <option value="gpt-4o-mini">gpt-4o-mini</option>
                  <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Search Index
                </label>
                <input
                  type="text"
                  value={config.searchIndex}
                  onChange={(e) => setConfig(prev => ({ ...prev, searchIndex: e.target.value }))}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder="my-search-index"
                />
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <label className="text-sm font-medium text-foreground">
                System Prompt
              </label>
              <textarea
                value={config.systemPrompt}
                onChange={(e) => setConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
                placeholder="You are a helpful assistant..."
              />
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={saveConfigToRedis} className="px-6">
                Save Configuration
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Container */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8 h-[calc(100vh-240px)]">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col max-w-4xl">
            {/* Chat Messages */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                {isLoadingConfig ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
                      <p className="text-muted-foreground">Loading configuration...</p>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center py-16">
                      <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <Search className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        Ready to help
                      </h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        Ask any question about our products and I'll search through our database to give you the best answer.
                      </p>
                      <div className="mt-6 flex flex-wrap justify-center gap-2">
                        <button 
                          onClick={() => setQuery("What FICM parts do you have for Ford?")}
                          className="px-4 py-2 text-sm bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground rounded-full transition-colors"
                        >
                          FICM parts for Ford
                        </button>
                        <button 
                          onClick={() => setQuery("Show me repair services")}
                          className="px-4 py-2 text-sm bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground rounded-full transition-colors"
                        >
                          Repair services
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 pb-6">
                    {messages.map((message, index) => (
                      <div key={message.id} className="space-y-4">
                        {/* User Message */}
                        <div className="flex justify-end">
                          <div className="max-w-2xl bg-primary text-primary-foreground rounded-2xl rounded-br-md px-6 py-3 shadow-sm">
                            <p className="text-sm font-medium">{message.query}</p>
                          </div>
                        </div>
                        
                        {/* AI Response */}
                        <div className="flex justify-start items-start space-x-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 mt-1">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 max-w-3xl">
                            <div className="bg-muted/50 rounded-2xl rounded-tl-md px-6 py-4 shadow-sm">
                              <div className="flex justify-between items-start mb-3">
                                <span className="text-xs font-medium text-muted-foreground">AI Assistant</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(message.response)}
                                  className="h-7 w-7 p-0 hover:bg-background/50"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="prose prose-sm max-w-none text-foreground">
                                <div 
                                  className="whitespace-pre-wrap leading-relaxed"
                                  dangerouslySetInnerHTML={{ 
                                    __html: parseMarkdownLinks(message.response) 
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex justify-start items-start space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 mt-1">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="bg-muted/50 rounded-2xl rounded-tl-md px-6 py-4 shadow-sm">
                          <div className="flex items-center space-x-2">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                              <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                            <span className="text-sm text-muted-foreground">Searching...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div ref={chatEndRef} />
              </ScrollArea>
            </div>
            
            {/* Search Input */}
            <div className="mt-6">
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything..."
                  className="w-full px-6 py-4 bg-background border border-border rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 text-lg placeholder:text-muted-foreground resize-none min-h-[60px] max-h-[200px]"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSearch}
                  disabled={isLoading || !query.trim()}
                  className="absolute right-2 top-2 rounded-xl px-6 shadow-sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Sources Panel */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-background/60 backdrop-blur-sm border border-border/40 rounded-2xl shadow-sm h-full flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-border/40">
                <h3 className="font-semibold text-foreground flex items-center">
                  <ExternalLink className="h-4 w-4 mr-2 text-primary" />
                  Sources
                </h3>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-6">
                  {activeSources.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-muted/50 flex items-center justify-center">
                        <Database className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Sources will appear here when you ask questions
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeSources.map((source, index) => (
                        <div key={source.id} className="group bg-background/80 border border-border/40 rounded-xl p-4 hover:bg-background transition-all duration-200 hover:shadow-sm">
                          <div className="flex items-start justify-between mb-3">
                            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">
                              [{index + 1}]
                            </span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                          </div>
                          <h4 className="font-medium text-sm text-foreground mb-2 leading-snug">
                            {source.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mb-3 leading-relaxed line-clamp-3">
                            {source.description}
                          </p>
                          {source.url && (
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                            >
                              View Details
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchInterface;
