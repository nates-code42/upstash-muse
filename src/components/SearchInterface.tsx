import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Search, Settings, MessageSquare, Loader2, Database, Brain } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
  
  // Configuration state
  const [config, setConfig] = useState({
    upstashUrl: '',
    upstashToken: '',
    openaiApiKey: '',
    systemPrompt: 'You are a helpful AI assistant. Based on the search results provided, give a comprehensive and accurate response to the user\'s query. Only use information from the search results.',
    searchIndex: 'default'
  });

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Please enter a search query",
        variant: "destructive"
      });
      return;
    }

    if (!config.upstashUrl || !config.upstashToken || !config.openaiApiKey) {
      toast({
        title: "Missing Configuration",
        description: "Please configure your Upstash and OpenAI credentials",
        variant: "destructive"
      });
      setShowConfig(true);
      return;
    }

    setIsLoading(true);
    
    try {
      // Step 1: Search Upstash
      const searchResponse = await fetch(`${config.upstashUrl}/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.upstashToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          index: config.searchIndex,
          query: query,
          limit: 10
        })
      });

      if (!searchResponse.ok) {
        throw new Error('Failed to search Upstash database');
      }

      const searchData = await searchResponse.json();
      const searchResults: SearchResult[] = searchData.results || [];

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
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
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
                    <Label htmlFor="search-index">Search Index</Label>
                    <Input
                      id="search-index"
                      placeholder="default"
                      value={config.searchIndex}
                      onChange={(e) => setConfig(prev => ({ ...prev, searchIndex: e.target.value }))}
                    />
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
              
              <div className="flex justify-end">
                <Button 
                  variant="premium" 
                  onClick={() => setShowConfig(false)}
                  className="gap-2"
                >
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
          {messages.length === 0 ? (
            <Card className="text-center py-12 shadow-card">
              <CardContent>
                <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Ready to Search</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Enter a query above to search your Upstash database and get AI-powered responses based on your content.
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