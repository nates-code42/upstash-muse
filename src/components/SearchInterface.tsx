import { Slider } from '@/components/ui/slider';
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Settings, MessageSquare, Loader2, Database, Brain, Send, Copy, ExternalLink, Bot, User, BookOpen, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Search as UpstashSearch } from '@upstash/search';
import { parseMarkdownLinks } from '@/lib/utils';
import logoImage from '@/assets/circuit-board-medics-logo.png';
import { PromptLibrary, type SystemPrompt } from './PromptLibrary';
import { ApiKeyManager } from './ApiKeyManager';
import { ChatbotManager } from './ChatbotManager';
import { ChatbotSelector } from './ChatbotSelector';
import { ChatbotProfile, GlobalConfig } from '@/types/chatbot';

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
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [showPromptLibrary, setShowPromptLibrary] = useState(false);
  const [showChatbotManager, setShowChatbotManager] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [activeSources, setActiveSources] = useState<Source[]>([]);
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [chatbots, setChatbots] = useState<ChatbotProfile[]>([]);
  const [activeChatbotId, setActiveChatbotId] = useState<string>('');
  const [activePromptId, setActivePromptId] = useState<string>('');
  const [promptsReady, setPromptsReady] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Redis REST API configuration for browser use
  const redisConfig = {
    url: "https://charmed-grubworm-8756.upstash.io",
    token: "ASI0AAImcDJhYTZmMzQ0ZmZjYzE0NmVhOTc3YjYxMDVmMmFiM2EyZnAyODc1Ng"
  };
  
  // Global configuration state (API keys only)
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({
    upstashUrl: '',
    upstashToken: '',
    openaiApiKey: ''
  });

  // Load configuration, prompts, and chatbots from Redis on component mount
  useEffect(() => {
    loadConfigFromRedis();
    loadPrompts();
    loadChatbots();
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

  // Load chatbots from Redis
  const loadChatbots = async () => {
    try {
      console.log('Loading chatbots from Redis...');
      const storedChatbots = await redisGet('chatbot-profiles');
      const chatbotsArray = Array.isArray(storedChatbots) ? storedChatbots : [];

      console.log('Loaded chatbots:', chatbotsArray.length);
      setChatbots(chatbotsArray);

      if (chatbotsArray.length > 0) {
        const activeId = await redisGet('active-chatbot-id');
        const validChatbot = chatbotsArray.find(c => c.id === activeId);

        if (validChatbot) {
          setActiveChatbotId(activeId);
          console.log('Using existing active chatbot:', activeId);
        } else {
          const firstChatbotId = chatbotsArray[0].id;
          setActiveChatbotId(firstChatbotId);
          await redisSet('active-chatbot-id', firstChatbotId);
          console.log('Set first chatbot as active:', firstChatbotId);
        }
      } else {
        console.log('No chatbots found, will show chatbot manager');
        setActiveChatbotId('');
      }
    } catch (error) {
      console.error('Failed to load chatbots:', error);
      toast({
        title: "Error Loading Chatbots",
        description: "Failed to load chatbot configurations. Please refresh the page.",
        variant: "destructive"
      });
    }
  };

  // Callback for when prompts are updated in the PromptLibrary
  const handlePromptsUpdated = async () => {
    try {
      console.log('Refreshing prompts after library update...');
      await loadPrompts();
      await loadChatbots(); // Refresh chatbots to ensure prompt references are valid
    } catch (error) {
      console.error('Failed to refresh prompts:', error);
      toast({
        title: "Error",
        description: "Failed to refresh prompts. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Callback for when chatbots are updated in the ChatbotManager
  const handleChatbotsUpdated = async () => {
    console.log('Refreshing chatbots after manager update...');
    await loadChatbots();
  };

  // Get active chatbot
  const getActiveChatbot = (): ChatbotProfile | null => {
    return chatbots.find(c => c.id === activeChatbotId) || null;
  };

  // Get active prompt from active chatbot
  const getActivePrompt = (): SystemPrompt | null => {
    const activeChatbot = getActiveChatbot();
    if (!activeChatbot) return null;
    return prompts.find(p => p.id === activeChatbot.systemPromptId) || null;
  };

  // Handle chatbot selection
  const handleChatbotSelect = async (chatbotId: string) => {
    console.log('Selecting chatbot:', chatbotId);
    try {
      await redisSet('active-chatbot-id', chatbotId);
      setActiveChatbotId(chatbotId);
      
      // Update activePromptId to match the selected chatbot's prompt
      const selectedChatbot = chatbots.find(c => c.id === chatbotId);
      if (selectedChatbot) {
        setActivePromptId(selectedChatbot.systemPromptId);
      }
      
      console.log('Chatbot selection saved to Redis');

      // Clear messages when switching chatbots
      setMessages([]);
      setActiveSources([]);

      toast({
        title: "Chatbot Switched",
        description: `Now using: ${chatbots.find(c => c.id === chatbotId)?.name}`
      });
    } catch (error) {
      console.error('Failed to select chatbot:', error);
      toast({
        title: "Error",
        description: "Failed to save chatbot selection",
        variant: "destructive"
      });
    }
  };

  // Handle prompt selection - updates the active chatbot's prompt
  const handlePromptSelect = async (promptId: string) => {
    console.log('Selecting prompt:', promptId);
    try {
      const activeChatbot = getActiveChatbot();
      if (!activeChatbot) {
        toast({
          title: "No Active Chatbot",
          description: "Please select a chatbot first",
          variant: "destructive"
        });
        return;
      }

      // Update the chatbot's systemPromptId
      const updatedChatbot = {
        ...activeChatbot,
        systemPromptId: promptId,
        updatedAt: new Date()
      };

      // Update in chatbots array
      const updatedChatbots = chatbots.map(c => 
        c.id === activeChatbot.id ? updatedChatbot : c
      );

      // Save to Redis and update state
      await redisSet('chatbot-profiles', updatedChatbots);
      setChatbots(updatedChatbots);
      setActivePromptId(promptId);

      toast({
        title: "Prompt Updated",
        description: `${activeChatbot.name} is now using the selected prompt`
      });
    } catch (error) {
      console.error('Failed to select prompt:', error);
      toast({
        title: "Error",
        description: "Failed to update prompt selection",
        variant: "destructive"
      });
    }
  };

  const migrateExistingPrompt = async (existingSystemPrompt: string) => {
    // Create a default prompt from existing system prompt
    const defaultPrompt: SystemPrompt = {
      id: 'default_migrated',
      name: 'Default Assistant',
      description: 'Migrated from previous configuration',
      content: existingSystemPrompt,
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      await redisSet('system-prompts', [defaultPrompt]);
      await redisSet('active-prompt-id', defaultPrompt.id);
      setPrompts([defaultPrompt]);
      setActivePromptId(defaultPrompt.id);
      
      console.log('Migrated existing system prompt to library');
      return true;
    } catch (error) {
      console.error('Failed to migrate existing prompt:', error);
      return false;
    }
  };

  const loadConfigFromRedis = async () => {
    try {
      setIsLoadingConfig(true);
      console.log('Loading global configuration from Redis...');

      // Try loading new global config first
      let raw = await redisGet('global-config');

      // If no global config exists, try migrating from old config
      if (!raw) {
        console.log('No global-config found, checking for old search-assistant-config...');
        const oldConfig = await redisGet('search-assistant-config');

        if (oldConfig) {
          console.log('Migrating old configuration to new structure...');
          await migrateOldConfig(oldConfig);
          raw = await redisGet('global-config');
        }
      }

      if (raw) {
        let parsedConfig: any = raw;

        // Parse JSON if needed
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

        // Validate critical fields (API keys only)
        const requiredFields = ['upstashUrl', 'upstashToken', 'openaiApiKey'];
        const missingFields = requiredFields.filter((field) => !parsedConfig[field]);

        if (missingFields.length > 0) {
          console.warn('Missing global configuration fields:', missingFields);
          toast({
            title: "Incomplete Configuration",
            description: `Missing API keys: ${missingFields.join(', ')}. Please complete your setup.`,
            variant: "destructive"
          });
          setShowConfig(true);
          return;
        }

        setGlobalConfig(parsedConfig);
        console.log('Successfully loaded global config');

      } else {
        console.log('No saved configuration found');
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

  // Migrate old config structure to new chatbot-based structure
  const migrateOldConfig = async (oldConfig: any) => {
    try {
      console.log('Starting migration from old config structure...');

      // Parse if string
      if (typeof oldConfig === 'string') {
        oldConfig = JSON.parse(oldConfig);
      }

      // Extract global API keys
      const newGlobalConfig: GlobalConfig = {
        upstashUrl: oldConfig.upstashUrl || '',
        upstashToken: oldConfig.upstashToken || '',
        openaiApiKey: oldConfig.openaiApiKey || ''
      };

      await redisSet('global-config', newGlobalConfig);
      console.log('Saved new global-config');

      // Check if we already have chatbots
      const existingChatbots = await redisGet('chatbot-profiles');
      if (!existingChatbots || !Array.isArray(existingChatbots) || existingChatbots.length === 0) {
        // Create default chatbot from old config
        const existingPrompts = await redisGet('system-prompts');
        const promptsArray = Array.isArray(existingPrompts) ? existingPrompts : [];

        let systemPromptId = '';
        if (promptsArray.length > 0) {
          systemPromptId = promptsArray[0].id;
        } else if (oldConfig.systemPrompt) {
          // Migrate old system prompt
          const migratedPrompt: SystemPrompt = {
            id: 'prompt_migrated',
            name: 'Migrated Prompt',
            description: 'Automatically migrated from old configuration',
            content: oldConfig.systemPrompt,
            isDefault: true,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          await redisSet('system-prompts', [migratedPrompt]);
          systemPromptId = migratedPrompt.id;
          console.log('Migrated system prompt');
        }

        const defaultChatbot: ChatbotProfile = {
          id: 'chatbot_default',
          name: 'Default Chatbot',
          description: 'Migrated from previous configuration',
          config: {
            searchIndex: oldConfig.searchIndex || 'CBM Products1',
            openaiModel: oldConfig.openaiModel || 'gpt-4.1-2025-04-14',
            temperature: oldConfig.temperature || 0.7,
            maxResults: 10
          },
          systemPromptId: systemPromptId,
          availablePrompts: [systemPromptId],
          isActive: true,
          isPublic: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await redisSet('chatbot-profiles', [defaultChatbot]);
        await redisSet('active-chatbot-id', defaultChatbot.id);
        console.log('Created default chatbot from old config');
      }

      console.log('Migration completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  };

  const saveConfigToRedis = async () => {
    try {
      // Validate global configuration before saving
      const requiredFields = ['upstashUrl', 'upstashToken', 'openaiApiKey'];
      const missingFields = requiredFields.filter(field => !globalConfig[field as keyof GlobalConfig]);

      if (missingFields.length > 0) {
        toast({
          title: "Incomplete Configuration",
          description: `Please fill in: ${missingFields.join(', ')}`,
          variant: "destructive"
        });
        return;
      }

      // Check if we have at least one chatbot
      if (chatbots.length === 0) {
        toast({
          title: "No Chatbot Configured",
          description: "Please create at least one chatbot in the Chatbot Manager",
          variant: "destructive"
        });
        setShowChatbotManager(true);
        return;
      }

      // Store global config
      await redisSet('global-config', globalConfig);

      console.log('Saved global config to Redis:', globalConfig);

      // Close config panel after successful save
      setShowConfig(false);

      toast({
        title: "Configuration Saved",
        description: "Your settings have been saved successfully"
      });

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

    // Check if prompts are still loading
    if (!promptsReady) {
      toast({
        title: "Please wait",
        description: "Still loading system prompts...",
        variant: "default"
      });
      return;
    }

    // Get active chatbot
    const activeChatbot = getActiveChatbot();
    if (!activeChatbot) {
      toast({
        title: "No Chatbot Selected",
        description: "Please select or create a chatbot",
        variant: "destructive"
      });
      setShowChatbotManager(true);
      return;
    }

    // Validate global configuration
    if (!globalConfig.upstashUrl || !globalConfig.upstashToken || !globalConfig.openaiApiKey) {
      const missing = [];
      if (!globalConfig.upstashUrl) missing.push('Upstash URL');
      if (!globalConfig.upstashToken) missing.push('Upstash Token');
      if (!globalConfig.openaiApiKey) missing.push('OpenAI API Key');

      toast({
        title: "Missing Configuration",
        description: `Please configure: ${missing.join(', ')}`,
        variant: "destructive"
      });
      setShowConfig(true);
      return;
    }

    // Get active prompt from chatbot
    const activePrompt = getActivePrompt();
    if (!activePrompt) {
      toast({
        title: "No System Prompt",
        description: `Chatbot "${activeChatbot.name}" has no system prompt configured`,
        variant: "destructive"
      });
      setShowChatbotManager(true);
      return;
    }

    setIsLoading(true);
    
    try {
      let searchResults: SearchResult[] = [];
      
      // Use the correct Upstash Search SDK pattern: client.index("name").search()
      try {
        const client = new UpstashSearch({
          url: globalConfig.upstashUrl,
          token: globalConfig.upstashToken,
        });

        const index = client.index(activeChatbot.config.searchIndex);
        const searchResponse = await index.search({
          query: query,
          limit: activeChatbot.config.maxResults || 100,
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

      // Step 2: Generate OpenAI response using chatbot's model and temperature
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
      console.log('Length:', activePrompt.content.length);
      console.log('First 200 chars:', activePrompt.content.substring(0, 200));
      console.log('Is Circuit Board Medics prompt?:', activePrompt.content.includes('Circuit Board Medics'));
      console.log('Formatted user message preview:', formattedUserMessage.substring(0, 300) + '...');

      // Use max_completion_tokens for newer models, max_tokens for older ones
      const isNewerModel = activeChatbot.config.openaiModel.startsWith('gpt-5') || activeChatbot.config.openaiModel.startsWith('gpt-4.1') || activeChatbot.config.openaiModel.startsWith('o3') || activeChatbot.config.openaiModel.startsWith('o4');
      const requestBody: any = {
        model: activeChatbot.config.openaiModel,
        messages: [
          {
            role: 'system',
            content: activePrompt.content
          },
          {
            role: 'user',
            content: formattedUserMessage
          }
        ]
      };

      // Add the appropriate token limit parameter based on model
      if (isNewerModel) {
        requestBody.max_completion_tokens = 4000;
        // Try to add temperature, but handle gracefully if not supported
        if (activeChatbot.config.temperature !== undefined) {
          requestBody.temperature = activeChatbot.config.temperature;
        }
      } else {
        requestBody.max_tokens = 4000;
        requestBody.temperature = activeChatbot.config.temperature;
      }

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${globalConfig.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
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
      
      // Mark that the first message has been completed
      if (isFirstMessage) {
        setIsFirstMessage(false);
      }
      

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
          <div className="flex items-center space-x-3">
            <ChatbotSelector
              chatbots={chatbots}
              activeChatbotId={activeChatbotId}
              onSelect={handleChatbotSelect}
              isLoading={isLoadingConfig}
            />
            <Button
              variant="ghost"
              onClick={() => setShowChatbotManager(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Bot className="h-4 w-4 mr-2" />
              Manage Chatbots
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowPromptLibrary(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Prompt Library
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowConfig(!showConfig)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </Button>
            <Button
              variant="ghost"
              onClick={() => window.open('/docs', '_blank')}
              className="text-muted-foreground hover:text-foreground"
            >
              <FileText className="h-4 w-4 mr-2" />
              Docs
            </Button>
          </div>
        </div>
      </header>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="bg-background/95 backdrop-blur-sm border-b border-border/40 px-6 py-6">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-lg font-semibold mb-4">Global Configuration (API Keys)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Upstash Search URL
                </label>
                <input
                  type="text"
                  value={globalConfig.upstashUrl}
                  onChange={(e) => setGlobalConfig(prev => ({ ...prev, upstashUrl: e.target.value }))}
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
                  value={globalConfig.upstashToken}
                  onChange={(e) => setGlobalConfig(prev => ({ ...prev, upstashToken: e.target.value }))}
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
                  value={globalConfig.openaiApiKey}
                  onChange={(e) => setGlobalConfig(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder="sk-..."
                />
              </div>
            </div>
            <div className="mt-6 p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> Chatbot-specific settings (model, temperature, search index) are now configured per-chatbot in the Chatbot Manager.
              </p>
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
        activePromptId={getActiveChatbot()?.systemPromptId || ''}
        onPromptSelect={handlePromptSelect}
        onPromptsUpdated={handlePromptsUpdated}
      />

      {/* Chatbot Manager Modal */}
      <ChatbotManager
        isOpen={showChatbotManager}
        onClose={() => setShowChatbotManager(false)}
        redisGet={redisGet}
        redisSet={redisSet}
        activeChatbotId={activeChatbotId}
        onChatbotSelect={handleChatbotSelect}
        onChatbotsUpdated={handleChatbotsUpdated}
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
                            <span className="text-sm text-muted-foreground">
                              {isFirstMessage ? "Ready to help" : "Searching..."}
                            </span>
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