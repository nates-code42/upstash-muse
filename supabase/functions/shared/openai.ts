import { SearchResult, Source } from './types.ts';

/**
 * OpenAI API client for generating responses
 */
export class OpenAIClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateResponse(
    query: string,
    systemPrompt: string,
    searchResults: SearchResult[],
    model: string = 'gpt-4o-mini'
  ): Promise<{ response: string; tokenCount: number }> {
    try {
      // Format search results for the AI context
      const formattedResults = searchResults.map(result => {
        const content = result.content;
        const metadata = result.metadata;
        
        let formattedContent = '';
        
        if (typeof content === 'object') {
          // Handle structured content
          formattedContent = Object.entries(content)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
        } else {
          formattedContent = String(content);
        }
        
        // Add metadata if available
        if (metadata && typeof metadata === 'object') {
          const metadataStr = Object.entries(metadata)
            .filter(([_, value]) => value != null && value !== '')
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
          
          if (metadataStr) {
            formattedContent += '\n' + metadataStr;
          }
        }
        
        return formattedContent;
      }).join('\n\n---\n\n');

      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Based on the following search results, please answer the user's question: "${query}"\n\nSearch Results:\n${formattedResults}`
        }
      ];

      const requestBody: any = {
        model: model,
        messages: messages
      };

      // Handle different model parameter requirements
      if (model.startsWith('gpt-5') || model.startsWith('o3') || model.startsWith('o4') || model.startsWith('gpt-4.1')) {
        // Newer models (GPT-5, O3, O4, GPT-4.1) use max_completion_tokens and don't support temperature
        requestBody.max_completion_tokens = 1000;
      } else {
        // Legacy models use max_tokens and support temperature
        requestBody.max_tokens = 1000;
        requestBody.temperature = 0.7;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API Error:', errorText);
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from OpenAI API');
      }

      const generatedResponse = data.choices[0].message?.content || '';
      const tokenCount = data.usage?.completion_tokens || 0;

      return {
        response: generatedResponse,
        tokenCount: tokenCount
      };

    } catch (error) {
      console.error('Error generating OpenAI response:', error);
      throw error;
    }
  }
}

/**
 * Process search results into sources for the response
 */
export function processSearchResultsToSources(searchResults: SearchResult[]): Source[] {
  return searchResults.map((result, index) => {
    const content = result.content;
    const metadata = result.metadata || {};
    
    // Extract title
    let title = 'Unknown Product';
    if (content?.Title || content?.title) {
      title = content.Title || content.title;
    } else if (content?.['Product Name']) {
      title = content['Product Name'];
    } else if (metadata?.title) {
      title = metadata.title;
    }
    
    // Extract description
    let description = metadata?.Description || 
                    content?.Description || 
                    content?.description || 
                    content?.['Short Description'] ||
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
      score: result.score,
      metadata
    };
  });
}