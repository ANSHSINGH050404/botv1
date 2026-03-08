import OpenAI from 'openai';
import type { ILLMClient } from '../interface';
import type { ChatCompletionRequest, ChatCompletionChunk } from '../types';

export class OpenAIProvider implements ILLMClient {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async *streamChatCompletion(request: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    const messages = request.messages.map((m) => ({
      ...m,
      content: m.content ?? '',
    }));

    const stream = (await this.client.chat.completions.create({
      ...(request as any),
      messages: messages as any,
      stream: true,
    } as any)) as unknown as AsyncIterable<any>;

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      yield {
        id: chunk.id,
        delta: (choice?.delta ?? {}) as any,
        finish_reason: choice?.finish_reason ?? null,
      };
    }
  }
}
