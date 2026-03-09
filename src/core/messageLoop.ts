import type { ChatMessage, ChatCompletionChunk } from '../api/types';
import { QueryHandler } from './query';
import * as p from '@clack/prompts';

export async function runMessageLoop(queryHandler: QueryHandler, initialMessages: ChatMessage[]) {
  let messages = [...initialMessages];
  let isRunning = true;

  while (isRunning) {
    const s = p.spinner();
    s.start('Thinking...');
    
    const stream = await queryHandler.execute(messages);
    let fullResponse = "";
    let first = true;
    
    // Process the stream regardless of the provider
    for await (const chunk of stream) {
      if (chunk.delta.content) {
        if (first) {
          s.stop('Assistant:');
          process.stdout.write(' ');
          first = false;
        }
        fullResponse += chunk.delta.content;
        process.stdout.write(chunk.delta.content); // Real-time UI update
      }
      
      // Handle Tool Calls (if any) in the same standardized way
      if (chunk.delta.tool_calls) {
        if (first) {
          s.stop('Thinking...');
          first = false;
        }
        // Logic for buffering and executing tool calls...
      }
    }

    if (first) {
      s.stop(); // Just in case nothing was yielded
    }

    messages.push({ role: 'assistant', content: fullResponse });

    
    // Exit condition (e.g., no more tool calls needed)
    isRunning = false; 
  }

  return messages;
}