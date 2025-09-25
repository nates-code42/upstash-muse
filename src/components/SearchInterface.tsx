import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Settings, MessageSquare, Loader2, Database, Brain, Send, Copy, ExternalLink, Bot, User, BookOpen, FileText, Type } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Search as UpstashSearch } from '@upstash/search';
import { parseMarkdownLinks } from '@/lib/utils';
import { StreamingClient, StreamingEvent } from '@/utils/streamingClient';
import StreamingLoader from './StreamingLoader';
import logoImage from '@/assets/circuit-board-medics-logo.png';
import { PromptLibrary, type SystemPrompt } from './PromptLibrary';
import { ApiKeyManager } from './ApiKeyManager';

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
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [showPromptLibrary, setShowPromptLibrary] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [activeSources, setActiveSources] = useState<Source[]>([]);
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [activePromptId, setActivePromptId] = useState<string>('');
  const [promptsReady, setPromptsReady] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamingClient = React.useRef(new StreamingClient());
  
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
    searchIndex: 'CBM Products1'
  });

  // Load configuration and prompts from Redis on component mount
  useEffect(() => {
    loadConfigFromRedis();
    loadPrompts();
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

  // Smart parsing function to handle various Redis encoding formats
  const smartParse = (value: any): any => {
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
  };

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
      return smartParse(data.result);
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  };

  const redisSet = async (key: string, value: any) => {
    try {
      const isString = typeof value === 'string';
      const body = isString ? value : JSON.stringify(value);
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${redisConfig.token}`,
        'Content-Type': isString ? 'text/plain' : 'application/json',
      };

      const response = await fetch(`${redisConfig.url}/set/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers,
        body,
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

  const loadPrompts = async () => {
    try {
      console.log('Loading prompts from Redis...');
      setPromptsReady(false);
      
      // Load prompts with smart parsing
      const storedPrompts = await redisGet('system-prompts');
      const promptsArray = Array.isArray(storedPrompts) ? storedPrompts : [];
      
      console.log('Loaded prompts:', promptsArray.length);
      setPrompts(promptsArray);
      
      if (promptsArray.length > 0) {
        // Load active prompt ID with smart parsing
        const activeId = await redisGet('active-prompt-id');
        console.log('Loaded active prompt ID:', activeId);
        
        // Verify the active ID exists in the prompts array
        const validPrompt = promptsArray.find(p => p.id === activeId);
        
        if (validPrompt) {
          setActivePromptId(activeId);
          console.log('Using existing active prompt:', activeId);
        } else {
          // Set first prompt as active and persist it
          const firstPromptId = promptsArray[0].id;
          setActivePromptId(firstPromptId);
          await redisSet('active-prompt-id', firstPromptId);
          console.log('Set first prompt as active:', firstPromptId);
        }
      } else {
        console.log('No prompts found, will show prompt library');
        setActivePromptId('');
      }
      
      setPromptsReady(true);
      console.log('Prompts loading complete');
    } catch (error) {
      console.error('Failed to load prompts:', error);
      setPromptsReady(true); // Allow UI to continue even if prompts fail
      toast({
        title: "Error Loading Prompts",
        description: "Failed to load system prompts. Please refresh the page.",
        variant: "destructive"
      });
    }
  };

  // Callback for when prompts are updated in the PromptLibrary
  const handlePromptsUpdated = async () => {
    console.log('Refreshing prompts after library update...');
    await loadPrompts();
  };

  // Enhanced prompt select handler
  const handlePromptSelect = async (promptId: string) => {
    console.log('Selecting prompt:', promptId);
    try {
      await redisSet('active-prompt-id', promptId);
      setActivePromptId(promptId);
      console.log('Prompt selection saved to Redis');
      
    } catch (error) {
      console.error('Failed to select prompt:', error);
      toast({
        title: "Error",
        description: "Failed to save prompt selection",
        variant: "destructive"
      });
    }
  };

  const getActivePrompt = (): SystemPrompt | null => {
    return prompts.find(p => p.id === activePromptId) || null;
  };

  const loadConfigFromRedis = async () => {
    try {
      setIsLoadingConfig(true);
      console.log('Loading configuration from Redis...');
      
      const raw = await redisGet('search-assistant-config');
      console.log('Raw Redis response:', raw);
      
      if (raw) {
        let parsedConfig: any = raw;
        
        // Parse JSON if needed (handles possible double-encoding)
        if (typeof parsedConfig === 'string') {
          try {
            parsedConfig = JSON.parse(parsedConfig);
            if (typeof parsedConfig === 'string') {
              parsedConfig = JSON.parse(parsedConfig);
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
        
        // Use config directly from Redis
        setConfig(parsedConfig);
        console.log('Successfully loaded and validated config:', parsedConfig);
        
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
      const requiredFields = ['openaiApiKey'];
      const missingFields = requiredFields.filter(field => !config[field as keyof typeof config]);
      
      if (missingFields.length > 0) {
        toast({
          title: "Incomplete Configuration",
          description: `Please fill in: ${missingFields.join(', ')}`,
          variant: "destructive"
        });
        return;
      }

      // Check if we have at least one prompt
      if (prompts.length === 0) {
        toast({
          title: "No System Prompt",
          description: "Please create at least one system prompt in the Prompt Library",
          variant: "destructive"
        });
        setShowPromptLibrary(true);
        return;
      }
      
      // Store plain object; redisSet will JSON-encode once
      await redisSet('search-assistant-config', config);
      
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
    if (!query.trim()) return;

    const currentQuery = query.trim();
    setQuery('');
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingContent('');
    setActiveSources([]);

    // Cancel any existing stream
    streamingClient.current.cancel();

    try {
      // Validate configuration
      if (!config.openaiApiKey) {
        throw new Error('Please configure your API key in the configuration panel');
      }

      const activePrompt = getActivePrompt();
      if (!activePrompt) {
        throw new Error('Please select a system prompt');
      }

      // Add user message immediately
      const userMessage: Message = {
        id: Date.now().toString(),
        query: currentQuery,
        response: '',
        timestamp: new Date(),
        searchResults: []
      };
      
      setMessages(prev => [...prev, userMessage]);

      // Stream the response
      let fullResponse = '';
      for await (const event of streamingClient.current.streamChatSearch(
        currentQuery,
        config.openaiApiKey,
        {
          promptId: activePrompt.id,
          searchIndex: config.searchIndex,
          maxResults: 10,
          model: config.openaiModel
        }
      )) {
        if (event.type === 'start' && event.sources) {
          setActiveSources(event.sources);
          setIsLoading(false);
        } else if (event.type === 'content' && event.content) {
          fullResponse += event.content;
          setStreamingContent(fullResponse);
        } else if (event.type === 'done') {
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            query: currentQuery,
            response: fullResponse,
            timestamp: new Date(),
            searchResults: []
          };
          setMessages(prev => [...prev, aiMessage]);
          setStreamingContent('');
          break;
        } else if (event.type === 'error') {
          throw new Error(event.message || 'Streaming error');
        }
      }
    } catch (error) {
      console.error('❌ Search error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        query: currentQuery,
        response: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        searchResults: []
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingContent('');
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
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src={logoImage} 
                alt="Circuit Board Medics" 
                className="h-10 w-auto"
              />
              <div>
                <h1 className="text-xl font-bold text-foreground">AI Search Assistant</h1>
                <p className="text-sm text-muted-foreground">Powered by Circuit Board Medics</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPromptLibrary(true)}
                className="hidden sm:flex"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Prompt Library
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfig(!showConfig)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="bg-background/95 backdrop-blur-sm border-b border-border/40 px-6 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                Active System Prompt
              </label>
              <Select 
                value={activePromptId} 
                onValueChange={handlePromptSelect}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a system prompt" />
                </SelectTrigger>
                <SelectContent>
                  {prompts.map((prompt) => (
                    <SelectItem key={prompt.id} value={prompt.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{prompt.name}</span>
                        {prompt.description && (
                          <span className="text-xs text-muted-foreground">{prompt.description}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {prompts.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No system prompts available. 
                  <Button 
                    variant="link" 
                    className="h-auto p-0 ml-1" 
                    onClick={() => setShowPromptLibrary(true)}
                  >
                    Create one in the Prompt Library
                  </Button>
                </p>
              )}
              {activePromptId && getActivePrompt() && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Preview:</p>
                  <p className="text-xs font-mono text-foreground line-clamp-3">
                    {getActivePrompt()?.content.substring(0, 150)}...
                  </p>
                </div>
              )}
            </div>
            
            {/* API Key Management Section */}
            <div className="mt-6">
              <ApiKeyManager />
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button onClick={saveConfigToRedis} className="px-6">
                Save Configuration
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Library Modal */}
      <PromptLibrary
        isOpen={showPromptLibrary}
        onClose={() => setShowPromptLibrary(false)}
        redisGet={redisGet}
        redisSet={redisSet}
        activePromptId={activePromptId}
        onPromptSelect={handlePromptSelect}
        onPromptsUpdated={handlePromptsUpdated}
      />

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
                ) : messages.length === 0 && !isLoading && !isStreaming ? (
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
                    </div>
                  </div>
                ) : (isLoading && messages.length === 0) || isStreaming ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="py-16">
                      <StreamingLoader isFirstMessage={messages.length === 0} />
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

                    {/* Show streaming content */}
                    {isStreaming && streamingContent && (
                      <div className="space-y-4">
                        <div className="flex justify-start items-start space-x-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 mt-1">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 max-w-3xl">
                            <div className="bg-muted/50 rounded-2xl rounded-tl-md px-6 py-4 shadow-sm">
                              <div className="flex justify-between items-start mb-3">
                                <span className="text-xs font-medium text-muted-foreground">AI Assistant</span>
                              </div>
                              <div className="prose prose-sm max-w-none text-foreground">
                                <div 
                                  className="whitespace-pre-wrap leading-relaxed"
                                  dangerouslySetInnerHTML={{ 
                                    __html: parseMarkdownLinks(streamingContent) 
                                  }}
                                />
                                <span className="animate-pulse text-primary">|</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {isLoading && !isStreaming && (
                      <div className="flex justify-start items-start space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 mt-1">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="bg-muted/50 rounded-2xl rounded-tl-md px-6 py-4 shadow-sm">
                          <StreamingLoader />
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
                  disabled={isLoading || isStreaming}
                />
                <Button
                  onClick={handleSearch}
                  disabled={isLoading || isStreaming || !query.trim()}
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