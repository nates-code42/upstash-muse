import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Search, Settings, MessageSquare, Loader2, Database, Brain } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Search as UpstashSearch } from '@upstash/search';
import { Redis } from '@upstash/redis';

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

const SearchInterface = () => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  
  // Redis client for configuration storage
  const redis = new Redis({
    url: "https://charmed-grubworm-8756.upstash.io",
    token: "ASI0AAImcDJhYTZmMzQ0ZmZjYzE0NmVhOTc3YjYxMDVmMmFiM2EyZnAyODc1Ng"
  });
  
  // Configuration state
  const [config, setConfig] = useState({
    upstashUrl: '',
    upstashToken: '',
    openaiApiKey: '',
    systemPrompt: 'You are a helpful AI assistant. Based on the search results provided, give a comprehensive and accurate response to the user\'s query. Only use information from the search results.',
    searchIndex: 'CBM Products1',
    contentFields: 'Name,Description'
  });

  // Load configuration from Redis on component mount
  useEffect(() => {
    loadConfigFromRedis();
  }, []);

  const loadConfigFromRedis = async () => {
    try {
      setIsLoadingConfig(true);
      const savedConfig = await redis.get('search-assistant-config');
      if (savedConfig && typeof savedConfig === 'object') {
        setConfig(prev => ({ ...prev, ...savedConfig as Partial<typeof config> }));
        console.log('Loaded config from Redis:', savedConfig);
      }
    } catch (error) {
      console.error('Failed to load config from Redis:', error);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const saveConfigToRedis = async () => {
    try {
      await redis.set('search-assistant-config', config);
      toast({
        title: "Configuration saved",
        description: "Your settings have been stored securely"
      });
      console.log('Saved config to Redis:', config);
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
        description: "Please configure your Upstash Search URL, token, index name, and OpenAI credentials",
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

      // Step 2: Generate OpenAI response
      const contextText = searchResults.map(result => 
        `Content: ${JSON.stringify(result.content)}\nMetadata: ${JSON.stringify(result.metadata || {})}`
      ).join('\n\n');

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
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
          max_tokens: 1000,
          temperature: 0.7
        })
      });

      if (!openaiResponse.ok) {
        throw new Error('Failed to generate OpenAI response');
      }

      const openaiData = await openaiResponse.json();
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

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Configuration Panel */}
        {showConfig && (
          <Card className="mb-8 shadow-card">
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
        )}

        {/* Search Input */}
        <Card className="mb-8 shadow-card">
          <CardContent className="p-6">
            <div className="flex space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Enter your search query or question..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="text-lg py-3"
                />
              </div>
              <Button 
                onClick={handleSearch}
                disabled={isLoading || !query.trim()}
                variant="premium"
                size="lg"
                className="gap-2 px-8"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <div className="space-y-6">
          {isLoadingConfig ? (
            <Card className="text-center py-12 shadow-card">
              <CardContent>
                <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Loading Configuration</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Retrieving your saved settings...
                </p>
              </CardContent>
            </Card>
          ) : messages.length === 0 ? (
            <Card className="text-center py-12 shadow-card">
              <CardContent>
                <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Ready to Search</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {config.upstashUrl && config.upstashToken && config.openaiApiKey && config.searchIndex
                    ? "Enter a query above to search your Upstash database and get AI-powered responses based on your content."
                    : "Configure your Upstash Search and OpenAI credentials to get started."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            messages.map((message) => (
              <Card key={message.id} className="shadow-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        <Search className="w-3 h-3" />
                        Query
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    {message.searchResults && (
                      <Badge className="gap-1">
                        <Database className="w-3 h-3" />
                        {message.searchResults.length} results
                      </Badge>
                    )}
                  </div>
                  <p className="font-medium text-foreground">{message.query}</p>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex items-start gap-2 mb-3">
                    <Badge variant="secondary" className="gap-1">
                      <Brain className="w-3 h-3" />
                      AI Response
                    </Badge>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                      {message.response}
                    </p>
                  </div>
                  
                  {message.searchResults && message.searchResults.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Based on {message.searchResults.length} search results
                      </p>
                      <div className="grid gap-2">
                        {message.searchResults.slice(0, 3).map((result, idx) => (
                          <div key={result.id} className="text-xs p-2 bg-muted rounded border-l-2 border-primary">
                            <div className="font-mono text-muted-foreground">
                              Score: {result.score.toFixed(3)}
                            </div>
                            <div className="truncate">
                              {JSON.stringify(result.content).substring(0, 100)}...
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchInterface;