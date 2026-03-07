import type { ChatMessage, ChatCompletionChunk } from '../api/types';
import { QueryHandler } from './query';

export async function runMessageLoop(queryHandler: QueryHandler, initialMessages: ChatMessage[]) {
  let messages = [...initialMessages];
  let isRunning = true;

  while (isRunning) {
    const stream = await queryHandler.execute(messages);
    let fullResponse = "";
    
    // Process the stream regardless of the provider
    for await (const chunk of stream) {
      if (chunk.delta.content) {
        fullResponse += chunk.delta.content;
        process.stdout.write(chunk.delta.content); // Real-time UI update
      }
      
      // Handle Tool Calls (if any) in the same standardized way
      if (chunk.delta.tool_calls) {
        // Logic for buffering and executing tool calls...
      }
    }

    messages.push({ role: 'assistant', content: fullResponse });
    
    // Exit condition (e.g., no more tool calls needed)
    isRunning = false; 
  }

  return messages;
}