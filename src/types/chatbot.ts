export interface ChatbotConfig {
  searchIndex: string;
  openaiModel: string;
  temperature: number;
  maxResults: number;
}

export interface ChatbotProfile {
  id: string;
  name: string;
  description: string;
  icon?: string;

  // Configuration specific to this chatbot
  config: ChatbotConfig;

  // Prompt management
  systemPromptId: string;
  availablePrompts: string[];

  // Settings
  isActive: boolean;
  isPublic: boolean;
  rateLimit?: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface GlobalConfig {
  upstashUrl: string;
  upstashToken: string;
  openaiApiKey: string;
}
