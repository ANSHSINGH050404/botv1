import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ILLMClient } from '../interface';
import type { ChatCompletionRequest, ChatCompletionChunk } from '../types';

export class GeminiProvider implements ILLMClient {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async *streamChatCompletion(request: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    const model = this.genAI.getGenerativeModel({ model: request.model });
    
    // Map OpenAI-style messages to Gemini contents
    const contents = request.messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || '' }],
    }));

    const result = await model.generateContentStream({ contents });

    for await (const chunk of result.stream) {
      yield {
        id: 'gemini-res',
        delta: { content: chunk.text() },
        finish_reason: null, // Gemini handles finish reasons differently
      };
    }
  }
}