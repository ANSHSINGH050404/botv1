import OpenAI from 'openai';
import type { ILLMClient } from '../interface';
import type { ChatCompletionRequest, ChatCompletionChunk } from '../types';

export class OpenAIProvider implements ILLMClient {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async *streamChatCompletion(request: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    const stream = await this.client.chat.completions.create({
      ...request,
      stream: true,
    });

    for await (const chunk of stream) {
      yield {
        id: chunk.id,
        delta: chunk.choices[0].delta as any,
        finish_reason: chunk.choices[0].finish_reason,
      };
    }
  }
}