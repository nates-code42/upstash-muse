import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  BookOpen,
  Star,
  Clock
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export interface SystemPrompt {
  id: string;
  name: string;
  description: string;
  content: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PromptLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  redisGet: (key: string) => Promise<any>;
  redisSet: (key: string, value: any) => Promise<any>;
  activePromptId?: string;
  onPromptSelect: (promptId: string) => void;
  onPromptsUpdated: () => Promise<void>;
}

export const PromptLibrary: React.FC<PromptLibraryProps> = ({
  isOpen,
  onClose,
  redisGet,
  redisSet,
  activePromptId,
  onPromptSelect,
  onPromptsUpdated
}) => {
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<SystemPrompt | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    content: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadPrompts();
    }
  }, [isOpen]);

  const loadPrompts = async () => {
    try {
      setIsLoading(true);
      const storedPrompts = await redisGet('system-prompts');
      const promptsArray = Array.isArray(storedPrompts) ? storedPrompts : [];
      
      console.log('PromptLibrary: Loaded prompts:', promptsArray.length);
      setPrompts(promptsArray);
      
      // If no prompts exist, show the create form
      if (promptsArray.length === 0) {
        setIsCreating(true);
      }
    } catch (error) {
      console.error('PromptLibrary: Failed to load prompts:', error);
      toast({
        title: "Error",
        description: "Failed to load prompts from database",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const savePrompts = async (updatedPrompts: SystemPrompt[]) => {
    try {
      await redisSet('system-prompts', updatedPrompts);
      setPrompts(updatedPrompts);
      // Notify parent component to refresh its prompts
      await onPromptsUpdated();
    } catch (error) {
      console.error('Failed to save prompts:', error);
      throw error;
    }
  };

  const createPrompt = async () => {
    if (!formData.name.trim() || !formData.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and content are required",
        variant: "destructive"
      });
      return;
    }

    const newPrompt: SystemPrompt = {
      id: `prompt_${Date.now()}`,
      name: formData.name.trim(),
      description: formData.description.trim(),
      content: formData.content.trim(),
      isDefault: prompts.length === 0, // First prompt becomes default
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      const updatedPrompts = [...prompts, newPrompt];
      await savePrompts(updatedPrompts);
      
      // If this is the first prompt, set it as active
      if (prompts.length === 0) {
        await redisSet('active-prompt-id', newPrompt.id);
        onPromptSelect(newPrompt.id);
      }
      
      setFormData({ name: '', description: '', content: '' });
      setIsCreating(false);
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create prompt",
        variant: "destructive"
      });
    }
  };

  const updatePrompt = async () => {
    if (!editingPrompt || !formData.name.trim() || !formData.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and content are required",
        variant: "destructive"
      });
      return;
    }

    const updatedPrompt: SystemPrompt = {
      ...editingPrompt,
      name: formData.name.trim(),
      description: formData.description.trim(),
      content: formData.content.trim(),
      updatedAt: new Date()
    };

    try {
      const updatedPrompts = prompts.map(p => 
        p.id === editingPrompt.id ? updatedPrompt : p
      );
      await savePrompts(updatedPrompts);
      
      setFormData({ name: '', description: '', content: '' });
      setEditingPrompt(null);
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update prompt",
        variant: "destructive"
      });
    }
  };

  const deletePrompt = async (promptId: string) => {
    const promptToDelete = prompts.find(p => p.id === promptId);
    if (!promptToDelete) return;

    // Prevent deleting the last prompt
    if (prompts.length === 1) {
      toast({
        title: "Cannot Delete",
        description: "You must have at least one system prompt",
        variant: "destructive"
      });
      return;
    }

    try {
      const updatedPrompts = prompts.filter(p => p.id !== promptId);
      await savePrompts(updatedPrompts);
      
      // If we're deleting the active prompt, select the first remaining prompt
      if (activePromptId === promptId) {
        const newActivePrompt = updatedPrompts[0];
        await redisSet('active-prompt-id', newActivePrompt.id);
        onPromptSelect(newActivePrompt.id);
      }
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete prompt",
        variant: "destructive"
      });
    }
  };

  const selectPrompt = async (promptId: string) => {
    try {
      await redisSet('active-prompt-id', promptId);
      onPromptSelect(promptId);
      
      const selectedPrompt = prompts.find(p => p.id === promptId);
      console.log('PromptLibrary: Prompt selected:', promptId, selectedPrompt?.name);
      
    } catch (error) {
      console.error('PromptLibrary: Failed to select prompt:', error);
      toast({
        title: "Error",
        description: "Failed to select prompt",
        variant: "destructive"
      });
    }
  };

  const startEditing = (prompt: SystemPrompt) => {
    setEditingPrompt(prompt);
    setFormData({
      name: prompt.name,
      description: prompt.description,
      content: prompt.content
    });
    setIsCreating(false);
  };

  const startCreating = () => {
    setIsCreating(true);
    setEditingPrompt(null);
    setFormData({ name: '', description: '', content: '' });
  };

  const cancelEditing = () => {
    setEditingPrompt(null);
    setIsCreating(false);
    setFormData({ name: '', description: '', content: '' });
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
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center">
            <BookOpen className="h-5 w-5 mr-2 text-primary" />
            System Prompt Library
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-[600px]">
            {/* Prompts List */}
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-foreground">Your Prompts</h3>
                <Button onClick={startCreating} size="sm" className="h-8">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Prompt
                </Button>
              </div>

              <ScrollArea className="flex-1 max-h-[500px]">
                <div className="pr-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-muted-foreground">Loading prompts...</div>
                    </div>
                  ) : prompts.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-muted/50 flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground mb-4">No prompts yet</p>
                    <Button onClick={startCreating} size="sm">
                      Create your first prompt
                    </Button>
                  </div>
                ) : (
                    <div className="space-y-3">
                      {prompts.map((prompt) => (
                      <Card 
                        key={prompt.id} 
                        className={`cursor-pointer transition-all hover:shadow-sm ${
                          activePromptId === prompt.id 
                            ? 'ring-2 ring-primary/20 border-primary/30' 
                            : 'hover:border-border'
                        }`}
                        onClick={() => selectPrompt(prompt.id)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-sm font-medium flex items-center">
                                {prompt.name}
                                {activePromptId === prompt.id && (
                                  <Badge variant="secondary" className="ml-2 h-5 text-xs">
                                    Active
                                  </Badge>
                                )}
                                {prompt.isDefault && (
                                  <Star className="h-3 w-3 ml-1 text-primary" />
                                )}
                              </CardTitle>
                              {prompt.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {prompt.description}
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
                                  startEditing(prompt);
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
                                  deletePrompt(prompt.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            Updated {formatDate(prompt.updatedAt)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {prompt.content.substring(0, 100)}...
                          </p>
                        </CardContent>
                      </Card>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Edit/Create Form */}
            <div className="flex flex-col min-h-0">
              {(isCreating || editingPrompt) ? (
                <div className="flex flex-col h-full min-h-0">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-foreground">
                      {isCreating ? 'Create New Prompt' : 'Edit Prompt'}
                    </h3>
                    <Button variant="ghost" size="sm" onClick={cancelEditing}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <ScrollArea className="flex-1 max-h-[500px]">
                    <div className="flex flex-col space-y-4 pr-4">
                      <div>
                        <label className="text-sm font-medium text-foreground">Name *</label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Customer Support Assistant"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-foreground">Description</label>
                        <Input
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Brief description of this prompt's purpose"
                          className="mt-1"
                        />
                      </div>

                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-foreground">System Prompt *</label>
                        <Textarea
                          value={formData.content}
                          onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                          placeholder="You are a helpful assistant that..."
                          className="mt-1 resize-none min-h-[300px]"
                        />
                      </div>
                    </div>
                  </ScrollArea>

                  <div className="flex justify-end space-x-3 pt-4 flex-shrink-0">
                    <Button variant="outline" onClick={cancelEditing}>
                      Cancel
                    </Button>
                    <Button onClick={isCreating ? createPrompt : updatePrompt}>
                      <Save className="h-4 w-4 mr-2" />
                      {isCreating ? 'Create' : 'Update'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                      <Edit2 className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Select a prompt to edit or create a new one
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