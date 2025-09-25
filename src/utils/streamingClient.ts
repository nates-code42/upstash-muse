export interface StreamingEvent {
  type: 'start' | 'content' | 'done' | 'error';
  sources?: any[];
  content?: string;
  usage?: any;
  message?: string;
}

export class StreamingClient {
  private controller: AbortController | null = null;

  async *streamChatSearch(
    query: string,
    apiKey: string,
    options: {
      promptId?: string;
      searchIndex?: string;
      maxResults?: number;
      model?: string;
    } = {}
  ): AsyncGenerator<StreamingEvent, void, unknown> {
    // Cancel any existing stream
    this.cancel();
    
    this.controller = new AbortController();

    try {
      const response = await fetch(`https://myyyvzkhlxcxlipionvf.functions.supabase.co/chat-search-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query,
          ...options,
        }),
        signal: this.controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body reader available');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          
          if (trimmedLine === '' || !trimmedLine.startsWith('data: ')) {
            continue;
          }

          const data = trimmedLine.slice(6); // Remove 'data: ' prefix
          
          try {
            const event: StreamingEvent = JSON.parse(data);
            yield event;
          } catch (parseError) {
            console.error('Error parsing streaming event:', parseError);
            // Continue processing other lines
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Stream cancelled');
        return;
      }
      throw error;
    } finally {
      this.controller = null;
    }
  }

  cancel() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }
}
