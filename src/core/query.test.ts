import { describe, expect, it } from 'bun:test';
import type { ILLMClient } from '../api/interface';
import type { ChatCompletionChunk, ChatCompletionRequest } from '../api/types';
import { QueryHandler } from './query';

class FakeClient implements ILLMClient {
  public lastRequest: ChatCompletionRequest | null = null;

  async *streamChatCompletion(request: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    this.lastRequest = request;
    yield {
      id: 'test',
      delta: { content: 'ok' },
      finish_reason: 'stop',
    };
  }
}

describe('QueryHandler', () => {
  it('includes tool definitions and streams', async () => {
    const client = new FakeClient();
    const handler = new QueryHandler(client, 'model-x');
    const stream = await handler.execute([{ role: 'user', content: 'hi' }]);

    const chunks: ChatCompletionChunk[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBe(1);
    expect(client.lastRequest?.tools && client.lastRequest.tools.length > 0).toBeTrue();
    expect(client.lastRequest?.stream).toBeTrue();
  });
});
