
import type { ChatCompletionRequest, ChatCompletionChunk } from './types';

/**
 * ILLMClient is the abstract contract. 
 * The core bot logic will only ever interact with this interface.
 */
export interface ILLMClient {
  /**
   * Sends a prompt to the provider and returns an AsyncIterable 
   * for real-time streaming of the response.
   */
  streamChatCompletion(
    request: ChatCompletionRequest
  ): Promise<AsyncIterable<ChatCompletionChunk>>;
  
}