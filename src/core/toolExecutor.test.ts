import { describe, expect, it } from 'bun:test';
import { executeToolCalls } from './toolExecutor';

describe('executeToolCalls', () => {
  it('returns error result for unknown tool', async () => {
    const { messages, results } = await executeToolCalls([
      {
        id: 'call_1',
        type: 'function',
        function: {
          name: 'missing_tool',
          arguments: '{}',
        },
      },
    ]);

    expect(results[0]?.result.isError).toBeTrue();
    expect(messages[0]?.role).toBe('tool');
    expect(messages[0]?.tool_call_id).toBe('call_1');
  });

  it('returns error for invalid JSON arguments', async () => {
    const { results } = await executeToolCalls([
      {
        id: 'call_2',
        type: 'function',
        function: {
          name: 'glob',
          arguments: '{not-json}',
        },
      },
    ]);

    expect(results[0]?.result.isError).toBeTrue();
  });
});
