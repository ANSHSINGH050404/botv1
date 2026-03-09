import type { ChatMessage, ToolCall, ToolCallDelta } from '../api/types';
import { QueryHandler } from './query';
import * as p from '@clack/prompts';
import { executeToolCalls } from './toolExecutor';

export async function runMessageLoop(queryHandler: QueryHandler, initialMessages: ChatMessage[]) {
  let messages = [...initialMessages];
  let isRunning = true;

  while (isRunning) {
    const s = p.spinner();
    s.start('Thinking...');

    try {
      const stream = await queryHandler.execute(messages);
      let fullResponse = '';
      let first = true;
      const toolCallBuffers = new Map<number, ToolCall>();

      for await (const chunk of stream) {
        if (chunk.delta.content) {
          if (first) {
            s.stop('Assistant:');
            process.stdout.write(' ');
            first = false;
          }
          fullResponse += chunk.delta.content;
          process.stdout.write(chunk.delta.content);
        }

        if (chunk.delta.tool_calls) {
          if (first) {
            s.stop('Assistant:');
            first = false;
          }
          bufferToolCalls(toolCallBuffers, chunk.delta.tool_calls);
        }
      }

      if (first) {
        s.stop();
      }

      const finalizedToolCalls = Array.from(toolCallBuffers.entries())
        .sort(([a], [b]) => a - b)
        .map(([, call], idx) => ({
          id: call.id || `tool_call_${Date.now()}_${idx}`,
          type: 'function' as const,
          function: {
            name: call.function.name,
            arguments: call.function.arguments,
          },
        }))
        .filter((call) => call.function.name.trim().length > 0);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: fullResponse || null,
      };

      if (finalizedToolCalls.length > 0) {
        assistantMessage.tool_calls = finalizedToolCalls;
      }

      messages.push(assistantMessage);

      if (finalizedToolCalls.length === 0) {
        isRunning = false;
        continue;
      }

      process.stdout.write('\n');

      const { messages: toolMessages, results } = await executeToolCalls(finalizedToolCalls);
      for (const result of results) {
        const linePrefix = result.result.isError ? 'Tool error:' : 'Tool:';
        process.stdout.write(`\n${linePrefix} ${result.callSummary}\n${result.resultSummary}\n`);
      }

      messages.push(...toolMessages);
    } catch (error) {
      s.stop('Error');
      const message = error instanceof Error ? error.message : String(error);
      p.log.error(`Assistant runtime error: ${message}`);
      throw error;
    }
  }

  return messages;
}

function bufferToolCalls(toolCallBuffers: Map<number, ToolCall>, deltas: ToolCallDelta[]) {
  for (const delta of deltas) {
    const existing = toolCallBuffers.get(delta.index) ?? {
      id: '',
      type: 'function',
      function: {
        name: '',
        arguments: '',
      },
    };

    if (delta.id) {
      existing.id = delta.id;
    }

    if (delta.function?.name) {
      existing.function.name += delta.function.name;
    }

    if (delta.function?.arguments) {
      existing.function.arguments += delta.function.arguments;
    }

    toolCallBuffers.set(delta.index, existing);
  }
}
