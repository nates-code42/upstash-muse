import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Copy, Trash2, Eye, EyeOff, Key } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  status: 'active' | 'inactive' | 'revoked';
  rate_limit_per_hour: number;
  created_at: string;
  last_used?: string;
}

interface ApiUsage {
  api_key_id: string;
  endpoint: string;
  request_count: number;
  hour_bucket: string;
}

export const ApiKeyManager = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [usage, setUsage] = useState<ApiUsage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<{ name: string; key: string } | null>(null);
  const [showKey, setShowKey] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    loadApiKeys();
    loadUsage();
  }, []);

  const loadApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error('Error loading API keys:', error);
      toast({
        title: "Error",
        description: "Failed to load API keys",
        variant: "destructive",
      });
    }
  };

  const loadUsage = async () => {
    try {
      const { data, error } = await supabase
        .from('api_usage')
        .select('*')
        .gte('hour_bucket', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('hour_bucket', { ascending: false });

      if (error) throw error;
      setUsage(data || []);
    } catch (error) {
      console.error('Error loading API usage:', error);
    }
  };

  const generateApiKey = (): string => {
    // Generate a secure random API key (32 bytes = 64 hex characters)
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return 'cbm_' + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const hashApiKey = async (apiKey: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for the API key",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const apiKey = generateApiKey();
      const hashedKey = await hashApiKey(apiKey);
      const keyPrefix = apiKey.substring(0, 8);

      const { error } = await supabase
        .from('api_keys')
        .insert({
          name: newKeyName.trim(),
          key_hash: hashedKey,
          key_prefix: keyPrefix,
          rate_limit_per_hour: 100
        });

      if (error) throw error;

      setGeneratedKey({ name: newKeyName.trim(), key: apiKey });
      setNewKeyName('');
      setShowCreateDialog(false);
      await loadApiKeys();

      toast({
        title: "Success",
        description: "API key created successfully",
      });
    } catch (error) {
      console.error('Error creating API key:', error);
      toast({
        title: "Error",
        description: "Failed to create API key",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteApiKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Are you sure you want to delete the API key "${keyName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId);

      if (error) throw error;

      await loadApiKeys();
      toast({
        title: "Success",
        description: "API key deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast({
        title: "Error",
        description: "Failed to delete API key",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied",
        description: "API key copied to clipboard",
      });
    });
  };

  const toggleKeyVisibility = (keyId: string) => {
    setShowKey(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getUsageForKey = (keyId: string) => {
    return usage
      .filter(u => u.api_key_id === keyId)
      .reduce((total, u) => total + u.request_count, 0);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Key className="h-5 w-5" />
            <CardTitle>API Keys</CardTitle>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New API Key</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="keyName">API Key Name</Label>
                  <Input
                    id="keyName"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., n8n Integration, Zapier Webhook"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createApiKey} disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Key'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {generatedKey && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4">
              <div className="space-y-2">
                <Label className="text-green-800 font-medium">
                  New API Key Created: {generatedKey.name}
                </Label>
                <div className="flex items-center space-x-2">
                  <Input
                    value={generatedKey.key}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={() => copyToClipboard(generatedKey.key)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-green-700">
                  ⚠️ Save this key now! You won't be able to see it again.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setGeneratedKey(null)}
                >
                  I've saved it
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {apiKeys.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No API keys created yet</p>
            <p className="text-sm">Create your first API key to start using the external API</p>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <Card key={key.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{key.name}</span>
                      <Badge variant={key.status === 'active' ? 'default' : 'secondary'}>
                        {key.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      <span>Key: {key.key_prefix}••••••••</span>
                      <span className="ml-4">Rate limit: {key.rate_limit_per_hour}/hour</span>
                      {key.last_used && (
                        <span className="ml-4">Last used: {formatDate(key.last_used)}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created: {formatDate(key.created_at)}
                      {usage.length > 0 && (
                        <span className="ml-4">Usage (24h): {getUsageForKey(key.id)} requests</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteApiKey(key.id, key.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="text-sm text-muted-foreground space-y-1">
          <p>• Use your API keys to access the chatbot API from external tools like n8n or Zapier</p>
          <p>• Include the API key in the Authorization header: <code>Bearer your-api-key</code></p>
          <p>• Each key has a rate limit of 100 requests per hour</p>
          <p>• Check the <a href="/docs" target="_blank" className="text-blue-600 hover:underline">API documentation</a> for integration examples</p>
        </div>
      </CardContent>
    </Card>
  );
};