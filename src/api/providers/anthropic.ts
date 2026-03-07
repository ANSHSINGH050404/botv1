import Anthropic from '@anthropic-ai/sdk';
import type { ILLMClient } from '../interface';
import type { ChatCompletionRequest, ChatCompletionChunk } from '../types';

export class AnthropicProvider implements ILLMClient {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async *streamChatCompletion(request: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    const systemMessage = request.messages.find(m => m.role === 'system')?.content;
    const userMessages = request.messages.filter(m => m.role !== 'system');

    const stream = await this.client.messages.create({
      model: request.model,
      system: systemMessage,
      messages: userMessages as any,
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