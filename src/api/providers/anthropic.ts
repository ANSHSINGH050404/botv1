import Anthropic from '@anthropic-ai/sdk';
import type { ILLMClient } from '../interface';
import type { ChatCompletionRequest, ChatCompletionChunk, ChatMessage } from '../types';

export class AnthropicProvider implements ILLMClient {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async *streamChatCompletion(request: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    const systemMessage = request.messages.find((m) => m.role === 'system')?.content;
    const messages = request.messages
      .filter((m) => m.role !== 'system')
      .map(mapMessageToAnthropic)
      .filter((m): m is { role: 'user' | 'assistant'; content: string } => m !== null);

    const stream = await this.client.messages.create({
      model: request.model,
      system: systemMessage ?? undefined,
      messages,
      max_tokens: request.max_tokens || 4096,
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield {
          id: 'claude-res',
          delta: { content: event.delta.text },
          finish_reason: null,
        };
      }
    }
  }
}

function mapMessageToAnthropic(message: ChatMessage): { role: 'user' | 'assistant'; content: string } | null {
  if (message.role === 'assistant') {
    return {
      role: 'assistant',
      content: message.content || '',
    };
  }

  if (message.role === 'user') {
    return {
      role: 'user',
      content: message.content || '',
    };
  }

  if (message.role === 'tool') {
    return {
      role: 'user',
      content: `Tool result (${message.tool_name || 'unknown'}): ${message.content || ''}`,
    };
  }

  return null;
}
