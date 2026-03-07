import type { ILLMClient } from '../api/interface';
import type { ChatMessage, ChatCompletionRequest } from '../api/types';

export class QueryHandler {
  private client: ILLMClient;
  private model: string;

  // The QueryHandler now accepts ANY client that follows our contract
  constructor(client: ILLMClient, model: string) {
    this.client = client;
    this.model = model;
  }

  async execute(messages: ChatMessage[]) {
    const request: ChatCompletionRequest = {
      model: this.model,
      messages: messages,
      stream: true
    };

    // This call is now provider-agnostic!
    return await this.client.streamChatCompletion(request);
  }
}