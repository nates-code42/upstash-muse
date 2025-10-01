import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot } from 'lucide-react';
import { ChatbotProfile } from '@/types/chatbot';

interface ChatbotSelectorProps {
  chatbots: ChatbotProfile[];
  activeChatbotId: string;
  onSelect: (chatbotId: string) => void;
  isLoading?: boolean;
}

export const ChatbotSelector: React.FC<ChatbotSelectorProps> = ({
  chatbots,
  activeChatbotId,
  onSelect,
  isLoading = false
}) => {
  const activeChatbot = chatbots.find(c => c.id === activeChatbotId);

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 text-sm text-muted-foreground">
        <Bot className="h-4 w-4" />
        <span>Loading...</span>
      </div>
    );
  }

  if (chatbots.length === 0) {
    return null;
  }

  return (
    <Select value={activeChatbotId} onValueChange={onSelect}>
      <SelectTrigger className="w-[200px]">
        <div className="flex items-center space-x-2">
          <Bot className="h-4 w-4" />
          <SelectValue placeholder="Select chatbot">
            {activeChatbot?.name || 'Select chatbot'}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {chatbots.map((chatbot) => (
          <SelectItem key={chatbot.id} value={chatbot.id}>
            <div className="flex flex-col">
              <span className="font-medium">{chatbot.name}</span>
              {chatbot.description && (
                <span className="text-xs text-muted-foreground line-clamp-1">
                  {chatbot.description}
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
