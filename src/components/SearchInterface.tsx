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
    systemPrompt: 'You are a helpful AI assistant. Based on the search results provided, give a comprehensive and accurate response to the user\'s query. Only use information from the search results.',
    searchIndex: 'CBM Products1',
    contentFields: 'Name,Description'
  });

  // Load configuration from Redis on component mount
  useEffect(() => {
    loadConfigFromRedis();
  }, []);

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
      
      const savedConfigString = await redisGet('search-assistant-config');
      console.log('Raw Redis response:', savedConfigString);
      
      if (savedConfigString) {
        let parsedConfig;
        
        // Parse JSON string if it's a string, or use directly if it's already an object
        if (typeof savedConfigString === 'string') {
          try {
            parsedConfig = JSON.parse(savedConfigString);
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
        } else if (typeof savedConfigString === 'object') {
          parsedConfig = savedConfigString;
        }
        
        // Validate critical fields
        const requiredFields = ['upstashUrl', 'upstashToken', 'openaiApiKey', 'searchIndex'];
        const missingFields = requiredFields.filter(field => !parsedConfig[field]);
        
        if (missingFields.length > 0) {
          console.warn('Missing configuration fields:', missingFields);
          toast({
            title: "Incomplete Configuration",
            description: `Missing: ${missingFields.join(', ')}. Please complete your setup.`,
            variant: "destructive"
          });
          setShowConfig(true);
        }
        
        // Merge with existing config, keeping defaults for missing fields
        setConfig(prev => ({ 
          ...prev, 
          ...parsedConfig,
          // Ensure critical fields are not empty strings
          upstashUrl: parsedConfig.upstashUrl || prev.upstashUrl,
          upstashToken: parsedConfig.upstashToken || prev.upstashToken,
          openaiApiKey: parsedConfig.openaiApiKey || prev.openaiApiKey,
          searchIndex: parsedConfig.searchIndex || prev.searchIndex,
          openaiModel: parsedConfig.openaiModel || prev.openaiModel,
          systemPrompt: parsedConfig.systemPrompt || prev.systemPrompt,
          contentFields: parsedConfig.contentFields || prev.contentFields
        }));
        
        console.log('Successfully loaded and validated config:', parsedConfig);
        
        toast({
          title: "Configuration Loaded",
          description: "Settings loaded from previous session"
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
      // Validate configuration before saving
      const requiredFields = ['upstashUrl', 'upstashToken', 'openaiApiKey', 'searchIndex'];
      const missingFields = requiredFields.filter(field => !config[field as keyof typeof config]);
      
      if (missingFields.length > 0) {
        toast({
          title: "Incomplete Configuration",
          description: `Please fill in: ${missingFields.join(', ')}`,
          variant: "destructive"
        });
        return;
      }
      
      // Store as JSON string to ensure consistent format
      await redisSet('search-assistant-config', JSON.stringify(config));
      
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

    if (!config.upstashUrl || !config.upstashToken || !config.openaiApiKey || !config.searchIndex) {
      toast({
        title: "Missing Configuration",
        description: "Please configure your Upstash Search URL, token, index name, OpenAI credentials, and model",
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
          limit: 10,
        });

        searchResults = searchResponse || [];
        console.log('Upstash Search response:', searchResponse);
        
      } catch (searchError) {
        console.error('Upstash Search error:', searchError);
        throw new Error(`Upstash Search failed: ${searchError instanceof Error ? searchError.message : 'Unknown error'}`);
      }

      // Step 2: Generate OpenAI response with smart context management
      const formattedResults = searchResults.map((result, index) => {
        // Extract only relevant fields to reduce token usage
        const content = result.content || {};
        const relevantFields: string[] = [];
        
        // Add specified content fields
        const fields = config.contentFields.split(',').map(f => f.trim());
        fields.forEach(field => {
          if (content[field]) {
            relevantFields.push(`${field}: ${content[field]}`);
          }
        });
        
        return `Result ${index + 1} (Score: ${result.score?.toFixed(2) || 'N/A'}):\n${relevantFields.join('\n')}`;
      }).join('\n\n');

      // Estimate tokens and truncate if necessary (rough estimate: 4 chars ≈ 1 token)
      const systemPromptTokens = Math.ceil(config.systemPrompt.length / 4);
      const queryTokens = Math.ceil(query.length / 4);
      const maxContextTokens = 6000; // Conservative limit for GPT-4o (8k context)
      const reservedTokens = systemPromptTokens + queryTokens + 1000; // Reserve for response
      const availableTokens = maxContextTokens - reservedTokens;
      const maxContextChars = availableTokens * 4;

      let contextText = formattedResults;
      if (contextText.length > maxContextChars) {
        contextText = contextText.substring(0, maxContextChars) + '\n\n[Context truncated to fit model limits...]';
        console.log('Context truncated to fit model limits');
      }

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
              content: `${config.systemPrompt}\n\nSearch Results:\n${contextText}`
            },
            {
              role: 'user',
              content: query
            }
          ],
          max_tokens: 1500,
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

      setMessages(prev => [newMessage, ...prev]);
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
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Search className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Search Assistant</h1>
              <p className="text-sm text-muted-foreground">Powered by Upstash & OpenAI</p>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            onClick={() => setShowConfig(!showConfig)}
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            Config
          </Button>
        </div>
      </header>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="upstash-url">Upstash Search URL</Label>
                    <Input
                      id="upstash-url"
                      placeholder="https://your-database-url.upstash.io"
                      value={config.upstashUrl}
                      onChange={(e) => setConfig(prev => ({ ...prev, upstashUrl: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="upstash-token">Upstash Token</Label>
                    <Input
                      id="upstash-token"
                      type="password"
                      placeholder="Your Upstash token"
                      value={config.upstashToken}
                      onChange={(e) => setConfig(prev => ({ ...prev, upstashToken: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="search-index">Search Index Name</Label>
                    <Input
                      id="search-index"
                      placeholder="CBM Products1"
                      value={config.searchIndex}
                      onChange={(e) => setConfig(prev => ({ ...prev, searchIndex: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Your Upstash Search index name (e.g., "CBM Products1")
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="content-fields">Content Fields to Search</Label>
                    <Input
                      id="content-fields"
                      placeholder="Name,Description"
                      value={config.contentFields}
                      onChange={(e) => setConfig(prev => ({ ...prev, contentFields: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Comma-separated list of fields in your content to search
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="openai-key">OpenAI API Key</Label>
                    <Input
                      id="openai-key"
                      type="password"
                      placeholder="sk-..."
                      value={config.openaiApiKey}
                      onChange={(e) => setConfig(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="openai-model">OpenAI Model</Label>
                    <select
                      id="openai-model"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={config.openaiModel}
                      onChange={(e) => setConfig(prev => ({ ...prev, openaiModel: e.target.value }))}
                    >
                      <option value="gpt-4o">GPT-4o (Recommended)</option>
                      <option value="gpt-4o-mini">GPT-4o Mini (Faster, Cheaper)</option>
                      <option value="gpt-4o-2024-08-06">GPT-4o (2024-08-06)</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      GPT-4o is recommended for best performance. GPT-4o Mini for cost efficiency.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="system-prompt">System Prompt</Label>
                    <Textarea
                      id="system-prompt"
                      rows={4}
                      placeholder="Define how the AI should respond..."
                      value={config.systemPrompt}
                      onChange={(e) => setConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowConfig(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="premium" 
                  onClick={saveConfigToRedis}
                  className="gap-2"
                >
                  <Database className="w-4 h-4" />
                  Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chat Interface */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Chat Area - Left Side */}
        <div className="flex-1 flex flex-col">
          {/* Chat Messages */}
          <ScrollArea className="flex-1 px-6">
            <div className="max-w-4xl mx-auto py-6 space-y-6">
              {isLoadingConfig ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading configuration...</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center max-w-md">
                    <MessageSquare className="w-12 h-12 text-primary mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Ready to Search</h3>
                    <p className="text-muted-foreground">
                      {config.upstashUrl && config.upstashToken && config.openaiApiKey && config.searchIndex
                        ? "Ask any question and I'll search the database for relevant information."
                        : "Configure your API credentials to get started."
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => (
                    <div key={message.id} className="space-y-4">
                      {/* User Message */}
                      <div className="flex justify-end">
                        <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4" />
                            <span className="text-sm opacity-90">
                              {message.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm">{message.query}</p>
                        </div>
                      </div>

                      {/* AI Response */}
                      <div className="flex justify-start">
                        <div className="max-w-[80%] bg-card border rounded-2xl rounded-bl-md px-4 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Bot className="w-4 h-4 text-primary" />
                              <span className="text-sm text-muted-foreground">AI Assistant</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => copyToClipboard(message.response)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="prose prose-sm max-w-none">
                            <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                              {message.response}
                            </p>
                          </div>
                          {message.searchResults && message.searchResults.length > 0 && (
                            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                              Based on {message.searchResults.length} search results
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Loading indicator */}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-card border rounded-2xl rounded-bl-md px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 text-primary" />
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Searching and thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={chatEndRef} />
                </>
              )}
            </div>
          </ScrollArea>

          {/* Chat Input - Bottom */}
          <div className="border-t bg-background p-6">
            <div className="max-w-4xl mx-auto flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Ask a question..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="h-12 text-base"
                />
              </div>
              <Button 
                onClick={handleSearch}
                disabled={isLoading || !query.trim()}
                size="lg"
                className="h-12 px-6 gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send
              </Button>
            </div>
          </div>
        </div>

        {/* Sources Panel - Right Side */}
        <div className="w-80 border-l bg-muted/30">
          <div className="p-4 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Sources
            </h3>
          </div>
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {activeSources.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Sources will appear here after you search
                  </p>
                </div>
              ) : (
                activeSources.map((source, index) => (
                  <Card key={source.id} className="p-3 hover:shadow-md transition-shadow">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="outline" className="text-xs">
                          {index + 1}
                        </Badge>
                        {source.url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => window.open(source.url, '_blank')}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      <h4 className="font-medium text-sm leading-tight">
                        {source.title}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {source.description}
                      </p>
                      {source.metadata && source.metadata['Retail Price'] && (
                        <div className="text-xs">
                          <span className="font-medium">Price: </span>
                          <span className="text-green-600">${source.metadata['Retail Price']}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default SearchInterface;
