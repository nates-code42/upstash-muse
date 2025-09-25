import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Copy, ExternalLink, Code, Zap, Webhook, Key, Shield, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import logoImage from '@/assets/circuit-board-medics-logo.png';

const DocsPage = () => {
  const [activeEndpoint, setActiveEndpoint] = useState('chat-search');
  const [testApiKey, setTestApiKey] = useState('');
  const [testQuery, setTestQuery] = useState('What FICM parts do you have for Ford F-250?');
  const [testResponse, setTestResponse] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Code copied to clipboard",
    });
  };

  const testEndpoint = async () => {
    if (!testApiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter your API key to test the endpoint",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch(`${window.location.origin}/functions/v1/chat-search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: testQuery,
          maxResults: 5
        })
      });

      const data = await response.json();
      setTestResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setTestResponse(`Error: ${error}`);
    } finally {
      setIsTesting(false);
    }
  };

  const endpoints = [
    {
      id: 'chat-search',
      name: 'Chat Search',
      method: 'POST',
      url: '/functions/v1/chat-search',
      description: 'Main search endpoint that queries your knowledge base and returns AI-generated responses'
    },
    {
      id: 'prompts',
      name: 'List Prompts',
      method: 'GET', 
      url: '/functions/v1/prompts',
      description: 'Get all available system prompts with their IDs and descriptions'
    },
    {
      id: 'config',
      name: 'Configuration',
      method: 'GET',
      url: '/functions/v1/config',
      description: 'Get available OpenAI models and search indexes'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-sm border-b border-border/40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => window.location.href = '/'}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Chat
            </Button>
            <img src={logoImage} alt="Circuit Board Medics" className="h-8" />
          </div>
          <h1 className="text-xl font-semibold">API Documentation</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="sticky top-8 space-y-2">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-4">
                Navigation
              </h3>
              <a href="#getting-started" className="block px-3 py-2 text-sm hover:bg-muted rounded-md">
                Getting Started
              </a>
              <a href="#authentication" className="block px-3 py-2 text-sm hover:bg-muted rounded-md">
                Authentication
              </a>
              <a href="#endpoints" className="block px-3 py-2 text-sm hover:bg-muted rounded-md">
                API Endpoints
              </a>
              <a href="#rate-limits" className="block px-3 py-2 text-sm hover:bg-muted rounded-md">
                Rate Limits
              </a>
              <a href="#integrations" className="block px-3 py-2 text-sm hover:bg-muted rounded-md">
                Integrations
              </a>
              <a href="#examples" className="block px-3 py-2 text-sm hover:bg-muted rounded-md">
                Code Examples
              </a>
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Getting Started */}
            <section id="getting-started">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Code className="h-5 w-5" />
                    <span>Getting Started</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p>
                    The Circuit Board Medics API allows you to integrate our AI-powered chatbot 
                    into your applications and workflows. Perfect for automation tools like n8n, 
                    Zapier, or custom applications.
                  </p>
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Base URL:</h4>
                    <code className="text-sm">{window.location.origin}/functions/v1</code>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Authentication */}
            <section id="authentication">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Key className="h-5 w-5" />
                    <span>Authentication</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p>
                    All API requests require authentication using API keys. Include your API key 
                    in the Authorization header of every request.
                  </p>
                  
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Authorization Header:</h4>
                    <code className="text-sm">Authorization: Bearer your-api-key-here</code>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Need an API key?</strong> Generate one in the main application by clicking 
                      "Configure" and scrolling to the API Keys section.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Rate Limits */}
            <section id="rate-limits">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Rate Limits</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <Shield className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                      <div className="font-semibold">100 requests</div>
                      <div className="text-sm text-muted-foreground">per hour per API key</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <Clock className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <div className="font-semibold">Rolling window</div>
                      <div className="text-sm text-muted-foreground">resets every hour</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <Code className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                      <div className="font-semibold">429 status</div>
                      <div className="text-sm text-muted-foreground">when limit exceeded</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* API Endpoints */}
            <section id="endpoints">
              <Card>
                <CardHeader>
                  <CardTitle>API Endpoints</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeEndpoint} onValueChange={setActiveEndpoint}>
                    <TabsList className="grid w-full grid-cols-3">
                      {endpoints.map(endpoint => (
                        <TabsTrigger key={endpoint.id} value={endpoint.id}>
                          <Badge variant={endpoint.method === 'GET' ? 'default' : 'secondary'} className="mr-2">
                            {endpoint.method}
                          </Badge>
                          {endpoint.name}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    <TabsContent value="chat-search" className="space-y-4 mt-6">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge>POST</Badge>
                          <code>/functions/v1/chat-search</code>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Main search endpoint that queries your knowledge base and returns AI-generated responses with sources.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2">Request Body:</h4>
                          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "query": "What FICM parts do you have for Ford F-250?",
  "promptId": "prompt_1234567890", // optional
  "searchIndex": "CBM Products1", // optional  
  "maxResults": 10, // optional, max 20
  "model": "gpt-4o-mini" // optional
}`}
                          </pre>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">Response:</h4>
                          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "success": true,
  "data": {
    "query": "What FICM parts do you have for Ford F-250?",
    "response": "Based on our search results, we have...",
    "sources": [
      {
        "id": "source-1",
        "title": "Ford F-250 FICM Repair",
        "description": "Professional FICM repair services...",
        "url": "https://circuitboardmedics.com/ford-ficm",
        "score": 0.95
      }
    ],
    "searchResults": [...],
    "promptUsed": "Circuit Board Medics Assistant", 
    "model": "gpt-4o-mini",
    "timestamp": "2025-09-25T15:21:40Z"
  },
  "usage": {
    "searchResultsCount": 5,
    "responseTokens": 156,
    "searchLatency": "1.2s"
  }
}`}
                          </pre>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="prompts" className="space-y-4 mt-6">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge>GET</Badge>
                          <code>/functions/v1/prompts</code>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Get all available system prompts with their IDs and descriptions.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Response:</h4>
                        <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "success": true,
  "data": [
    {
      "id": "prompt_1758811735718",
      "name": "Circuit Board Medics Assistant",
      "description": "Standard assistant for CBM queries",
      "content": "You are a helpful assistant for..."
    },
    {
      "id": "prompt_1758811735719", 
      "name": "Technical Expert",
      "description": "Detailed technical explanations",
      "content": "You are a technical expert..."
    }
  ]
}`}
                        </pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="config" className="space-y-4 mt-6">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge>GET</Badge>
                          <code>/functions/v1/config</code>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Get available OpenAI models and search indexes for use in requests.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Response:</h4>
                        <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "success": true,
  "data": {
    "models": [
      "gpt-4o-mini",
      "gpt-4o", 
      "gpt-4",
      "gpt-3.5-turbo"
    ],
    "searchIndexes": [
      "CBM Products1",
      "CBM Products2", 
      "General Knowledge"
    ]
  }
}`}
                        </pre>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </section>

            {/* API Explorer */}
            <section id="api-explorer">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="h-5 w-5" />
                    <span>API Explorer</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">API Key</label>
                      <Input
                        type="password"
                        value={testApiKey}
                        onChange={(e) => setTestApiKey(e.target.value)}
                        placeholder="Enter your API key"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Test Query</label>
                      <Input
                        value={testQuery}
                        onChange={(e) => setTestQuery(e.target.value)}
                        placeholder="Enter your test query"
                      />
                    </div>
                  </div>
                  <Button onClick={testEndpoint} disabled={isTesting}>
                    {isTesting ? 'Testing...' : 'Test Endpoint'}
                  </Button>
                  {testResponse && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium">Response</label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(testResponse)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <Textarea
                        value={testResponse}
                        readOnly
                        className="font-mono text-xs h-40"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* Integration Examples */}
            <section id="integrations">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Webhook className="h-5 w-5" />
                    <span>Integration Examples</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* n8n Integration */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                      <ExternalLink className="h-4 w-4" />
                      <span>n8n Workflow</span>
                    </h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <ol className="list-decimal list-inside space-y-2 text-sm">
                        <li>Add an HTTP Request node to your n8n workflow</li>
                        <li>Set the method to POST and URL to: <code>{window.location.origin}/functions/v1/chat-search</code></li>
                        <li>Add Authorization header: <code>Bearer your-api-key</code></li>
                        <li>Set Content-Type to <code>application/json</code></li>
                        <li>Add your query in the request body as JSON</li>
                      </ol>
                    </div>
                  </div>

                  {/* Zapier Integration */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Zapier Webhook</h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <ol className="list-decimal list-inside space-y-2 text-sm">
                        <li>Create a new Zap with a trigger of your choice</li>
                        <li>Add a "Webhooks by Zapier" action</li>
                        <li>Choose "POST" method</li>
                        <li>Set URL to: <code>{window.location.origin}/functions/v1/chat-search</code></li>
                        <li>Add headers: Authorization: <code>Bearer your-api-key</code></li>
                        <li>Set payload type to JSON and add your query data</li>
                      </ol>
                    </div>
                  </div>

                  {/* curl Example */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">curl Example</h3>
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X POST "${window.location.origin}/functions/v1/chat-search" \\
  -H "Authorization: Bearer your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "What FICM parts do you have for Ford F-250?",
    "maxResults": 5
  }'`}
                      </pre>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(`curl -X POST "${window.location.origin}/functions/v1/chat-search" \\
  -H "Authorization: Bearer your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "What FICM parts do you have for Ford F-250?",
    "maxResults": 5
  }'`)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* JavaScript Example */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">JavaScript Example</h3>
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`const response = await fetch('${window.location.origin}/functions/v1/chat-search', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-api-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: 'What FICM parts do you have for Ford F-250?',
    maxResults: 5
  })
});

const data = await response.json();
console.log(data);`}
                      </pre>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(`const response = await fetch('${window.location.origin}/functions/v1/chat-search', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-api-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: 'What FICM parts do you have for Ford F-250?',
    maxResults: 5
  })
});

const data = await response.json();
console.log(data);`)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Error Codes */}
            <section id="examples">
              <Card>
                <CardHeader>
                  <CardTitle>Error Codes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg">
                      <Badge variant="destructive">401</Badge>
                      <span className="text-sm">Unauthorized - Invalid or missing API key</span>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
                      <Badge variant="secondary">429</Badge>
                      <span className="text-sm">Rate limit exceeded - Too many requests per hour</span>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                      <Badge variant="secondary">400</Badge>
                      <span className="text-sm">Bad request - Invalid or missing parameters</span>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg">
                      <Badge variant="destructive">500</Badge>
                      <span className="text-sm">Internal server error - Something went wrong on our end</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocsPage;