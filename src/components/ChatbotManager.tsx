import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Bot,
  Star,
  Clock,
  Settings
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ChatbotProfile } from '@/types/chatbot';
import { SystemPrompt } from './PromptLibrary';

interface ChatbotManagerProps {
  isOpen: boolean;
  onClose: () => void;
  redisGet: (key: string) => Promise<any>;
  redisSet: (key: string, value: any) => Promise<any>;
  activeChatbotId?: string;
  onChatbotSelect: (chatbotId: string) => void;
  onChatbotsUpdated: () => Promise<void>;
}

export const ChatbotManager: React.FC<ChatbotManagerProps> = ({
  isOpen,
  onClose,
  redisGet,
  redisSet,
  activeChatbotId,
  onChatbotSelect,
  onChatbotsUpdated
}) => {
  const [chatbots, setChatbots] = useState<ChatbotProfile[]>([]);
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingChatbot, setEditingChatbot] = useState<ChatbotProfile | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    searchIndex: 'CBM Products1',
    openaiModel: 'gpt-4.1-2025-04-14',
    temperature: 0.7,
    maxResults: 10,
    systemPromptId: '',
    isPublic: true,
    rateLimit: 100
  });

  useEffect(() => {
    if (isOpen) {
      loadChatbots();
      loadPrompts();
    }
  }, [isOpen]);

  const loadChatbots = async () => {
    try {
      setIsLoading(true);
      const storedChatbots = await redisGet('chatbot-profiles');
      const chatbotsArray = Array.isArray(storedChatbots) ? storedChatbots : [];

      console.log('ChatbotManager: Loaded chatbots:', chatbotsArray.length);
      setChatbots(chatbotsArray);

      // If no chatbots exist, show the create form
      if (chatbotsArray.length === 0) {
        setIsCreating(true);
      }
    } catch (error) {
      console.error('ChatbotManager: Failed to load chatbots:', error);
      toast({
        title: "Error",
        description: "Failed to load chatbots from database",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPrompts = async () => {
    try {
      const storedPrompts = await redisGet('system-prompts');
      const promptsArray = Array.isArray(storedPrompts) ? storedPrompts : [];
      setPrompts(promptsArray);
    } catch (error) {
      console.error('Failed to load prompts:', error);
    }
  };

  const saveChatbots = async (updatedChatbots: ChatbotProfile[]) => {
    try {
      await redisSet('chatbot-profiles', updatedChatbots);
      setChatbots(updatedChatbots);
      await onChatbotsUpdated();
    } catch (error) {
      console.error('Failed to save chatbots:', error);
      throw error;
    }
  };

  const createChatbot = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Name is required",
        variant: "destructive"
      });
      return;
    }

    if (!formData.systemPromptId && prompts.length > 0) {
      toast({
        title: "Validation Error",
        description: "Please select a system prompt",
        variant: "destructive"
      });
      return;
    }

    const newChatbot: ChatbotProfile = {
      id: `chatbot_${Date.now()}`,
      name: formData.name.trim(),
      description: formData.description.trim(),
      config: {
        searchIndex: formData.searchIndex,
        openaiModel: formData.openaiModel,
        temperature: formData.temperature,
        maxResults: formData.maxResults
      },
      systemPromptId: formData.systemPromptId,
      availablePrompts: [formData.systemPromptId],
      isActive: chatbots.length === 0,
      isPublic: formData.isPublic,
      rateLimit: formData.rateLimit,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      const updatedChatbots = [...chatbots, newChatbot];
      await saveChatbots(updatedChatbots);

      // If this is the first chatbot, set it as active
      if (chatbots.length === 0) {
        await redisSet('active-chatbot-id', newChatbot.id);
        onChatbotSelect(newChatbot.id);
      }

      resetForm();
      setIsCreating(false);

      toast({
        title: "Success",
        description: "Chatbot created successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create chatbot",
        variant: "destructive"
      });
    }
  };

  const updateChatbot = async () => {
    if (!editingChatbot || !formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Name is required",
        variant: "destructive"
      });
      return;
    }

    const updatedChatbot: ChatbotProfile = {
      ...editingChatbot,
      name: formData.name.trim(),
      description: formData.description.trim(),
      config: {
        searchIndex: formData.searchIndex,
        openaiModel: formData.openaiModel,
        temperature: formData.temperature,
        maxResults: formData.maxResults
      },
      systemPromptId: formData.systemPromptId,
      isPublic: formData.isPublic,
      rateLimit: formData.rateLimit,
      updatedAt: new Date()
    };

    try {
      const updatedChatbots = chatbots.map(c =>
        c.id === editingChatbot.id ? updatedChatbot : c
      );
      await saveChatbots(updatedChatbots);

      resetForm();
      setEditingChatbot(null);

      toast({
        title: "Success",
        description: "Chatbot updated successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update chatbot",
        variant: "destructive"
      });
    }
  };

  const deleteChatbot = async (chatbotId: string) => {
    const chatbotToDelete = chatbots.find(c => c.id === chatbotId);
    if (!chatbotToDelete) return;

    // Prevent deleting the last chatbot
    if (chatbots.length === 1) {
      toast({
        title: "Cannot Delete",
        description: "You must have at least one chatbot",
        variant: "destructive"
      });
      return;
    }

    try {
      const updatedChatbots = chatbots.filter(c => c.id !== chatbotId);
      await saveChatbots(updatedChatbots);

      // If we're deleting the active chatbot, select the first remaining chatbot
      if (activeChatbotId === chatbotId) {
        const newActiveChatbot = updatedChatbots[0];
        await redisSet('active-chatbot-id', newActiveChatbot.id);
        onChatbotSelect(newActiveChatbot.id);
      }

      toast({
        title: "Success",
        description: "Chatbot deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete chatbot",
        variant: "destructive"
      });
    }
  };

  const selectChatbot = async (chatbotId: string) => {
    try {
      await redisSet('active-chatbot-id', chatbotId);
      onChatbotSelect(chatbotId);

      const selectedChatbot = chatbots.find(c => c.id === chatbotId);
      console.log('ChatbotManager: Chatbot selected:', chatbotId, selectedChatbot?.name);

      toast({
        title: "Chatbot Selected",
        description: `Now using: ${selectedChatbot?.name}`
      });
    } catch (error) {
      console.error('ChatbotManager: Failed to select chatbot:', error);
      toast({
        title: "Error",
        description: "Failed to select chatbot",
        variant: "destructive"
      });
    }
  };

  const startEditing = (chatbot: ChatbotProfile) => {
    setEditingChatbot(chatbot);
    setFormData({
      name: chatbot.name,
      description: chatbot.description,
      searchIndex: chatbot.config.searchIndex,
      openaiModel: chatbot.config.openaiModel,
      temperature: chatbot.config.temperature,
      maxResults: chatbot.config.maxResults,
      systemPromptId: chatbot.systemPromptId,
      isPublic: chatbot.isPublic,
      rateLimit: chatbot.rateLimit || 100
    });
    setIsCreating(false);
  };

  const startCreating = () => {
    setIsCreating(true);
    setEditingChatbot(null);
    resetForm();
  };

  const cancelEditing = () => {
    setEditingChatbot(null);
    setIsCreating(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      searchIndex: 'CBM Products1',
      openaiModel: 'gpt-4.1-2025-04-14',
      temperature: 0.7,
      maxResults: 10,
      systemPromptId: prompts.length > 0 ? prompts[0].id : '',
      isPublic: true,
      rateLimit: 100
    });
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(date));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-6xl h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center">
            <Bot className="h-5 w-5 mr-2 text-primary" />
            Chatbot Manager
          </DialogTitle>
          <DialogDescription className="sr-only">Manage multiple chatbot configurations</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0">
            {/* Chatbots List */}
            <div className="flex flex-col min-h-0">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-foreground">Your Chatbots</h3>
                <Button onClick={startCreating} size="sm" className="h-8">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Chatbot
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="pr-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-muted-foreground">Loading chatbots...</div>
                    </div>
                  ) : chatbots.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-muted/50 flex items-center justify-center">
                        <Bot className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                      <p className="text-muted-foreground mb-4">No chatbots yet</p>
                      <Button onClick={startCreating} size="sm">
                        Create your first chatbot
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {chatbots.map((chatbot) => (
                        <Card
                          key={chatbot.id}
                          className={`cursor-pointer transition-all hover:shadow-sm ${
                            activeChatbotId === chatbot.id
                              ? 'ring-2 ring-primary/20 border-primary/30'
                              : 'hover:border-border'
                          }`}
                          onClick={() => selectChatbot(chatbot.id)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-sm font-medium flex items-center">
                                  {chatbot.name}
                                  {activeChatbotId === chatbot.id && (
                                    <Badge variant="secondary" className="ml-2 h-5 text-xs">
                                      Active
                                    </Badge>
                                  )}
                                  {chatbot.isPublic && (
                                    <Star className="h-3 w-3 ml-1 text-primary" />
                                  )}
                                </CardTitle>
                                {chatbot.description && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {chatbot.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center space-x-1 ml-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditing(chatbot);
                                  }}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteChatbot(chatbot.id);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-center text-xs text-muted-foreground mb-2">
                              <Clock className="h-3 w-3 mr-1" />
                              Updated {formatDate(chatbot.updatedAt)}
                            </div>
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <p>Index: {chatbot.config.searchIndex}</p>
                              <p>Model: {chatbot.config.openaiModel}</p>
                              <p>Temperature: {chatbot.config.temperature}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Edit/Create Form */}
            <div className="flex flex-col min-h-0">
              {(isCreating || editingChatbot) ? (
                <div className="flex flex-col h-full min-h-0">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-foreground">
                      {isCreating ? 'Create New Chatbot' : 'Edit Chatbot'}
                    </h3>
                    <Button variant="ghost" size="sm" onClick={cancelEditing}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    <div className="flex flex-col space-y-4 pr-4">
                      <div>
                        <Label>Name *</Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Customer Support Bot"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Brief description of this chatbot's purpose"
                          className="mt-1 resize-none h-20"
                        />
                      </div>

                      <div>
                        <Label>System Prompt *</Label>
                        <Select
                          value={formData.systemPromptId}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, systemPromptId: value }))}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select a system prompt" />
                          </SelectTrigger>
                          <SelectContent>
                            {prompts.map((prompt) => (
                              <SelectItem key={prompt.id} value={prompt.id}>
                                {prompt.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Search Index *</Label>
                        <Input
                          value={formData.searchIndex}
                          onChange={(e) => setFormData(prev => ({ ...prev, searchIndex: e.target.value }))}
                          placeholder="CBM Products1"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>OpenAI Model</Label>
                        <Select
                          value={formData.openaiModel}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, openaiModel: value }))}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gpt-4.1-2025-04-14">gpt-4.1-2025-04-14</SelectItem>
                            <SelectItem value="gpt-4.1-mini-2025-04-14">gpt-4.1-mini-2025-04-14</SelectItem>
                            <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                            <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                            <SelectItem value="gpt-3.5-turbo">gpt-3.5-turbo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Temperature: {formData.temperature}</Label>
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={formData.temperature}
                          onChange={(e) => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                          className="w-full mt-1"
                        />
                      </div>

                      <div>
                        <Label>Max Results</Label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={formData.maxResults}
                          onChange={(e) => setFormData(prev => ({ ...prev, maxResults: parseInt(e.target.value) || 10 }))}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>Rate Limit (per hour)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={formData.rateLimit}
                          onChange={(e) => setFormData(prev => ({ ...prev, rateLimit: parseInt(e.target.value) || 100 }))}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 flex-shrink-0">
                    <Button variant="outline" onClick={cancelEditing}>
                      Cancel
                    </Button>
                    <Button onClick={isCreating ? createChatbot : updateChatbot}>
                      <Save className="h-4 w-4 mr-2" />
                      {isCreating ? 'Create' : 'Update'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                      <Settings className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Select a chatbot to edit or create a new one
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
