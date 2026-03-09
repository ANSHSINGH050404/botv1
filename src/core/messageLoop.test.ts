import { describe, expect, it } from 'bun:test';
import type { ChatCompletionChunk, ChatMessage } from '../api/types';
import { runMessageLoop } from './messageLoop';

function streamFrom(chunks: ChatCompletionChunk[]) {
  return (async function* () {
    for (const chunk of chunks) {
      yield chunk;
    }
  })();
}

describe('runMessageLoop', () => {
  it('executes tool calls and continues until final assistant response', async () => {
    const calls: ChatMessage[][] = [];

    const fakeQueryHandler = {
      async execute(messages: ChatMessage[]) {
        calls.push(messages);
        if (calls.length === 1) {
          return streamFrom([
            {
              id: 'a1',
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: 'tool_1',
                    type: 'function',
                    function: { name: 'unknown_tool' },
                  },
                ],
              },
              finish_reason: null,
            },
            {
              id: 'a2',
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    function: { arguments: '{}' },
                  },
                ],
              },
              finish_reason: 'tool_calls',
            },
          ]);
        }

        return streamFrom([
          {
            id: 'b1',
            delta: { content: 'final answer' },
            finish_reason: 'stop',
          },
        ]);
      },
    };

    const write = process.stdout.write;
    process.stdout.write = (() => true) as typeof process.stdout.write;
    try {
      const result = await runMessageLoop(fakeQueryHandler as any, [{ role: 'user', content: 'run tool' }]);
      expect(result.some((m) => m.role === 'tool')).toBeTrue();
      expect(result[result.length - 1]?.content).toBe('final answer');
      expect(calls.length).toBe(2);
    } finally {
      process.stdout.write = write;
    }
  });
});
