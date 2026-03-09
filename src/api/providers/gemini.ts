import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ILLMClient } from '../interface';
import type { ChatCompletionRequest, ChatCompletionChunk, ChatMessage } from '../types';

export class GeminiProvider implements ILLMClient {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async *streamChatCompletion(request: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    const systemMessage = request.messages.find((m) => m.role === 'system')?.content ?? undefined;
    const model = this.genAI.getGenerativeModel({
      model: request.model,
      systemInstruction: systemMessage || undefined,
    });

    const contents = request.messages
      .filter((m) => m.role !== 'system')
      .map(mapMessageToGeminiContent);

    const result = await model.generateContentStream({ contents });

    for await (const chunk of result.stream) {
      yield {
        id: 'gemini-res',
        delta: { content: chunk.text() },
        finish_reason: null,
      };
    }
  }
}

function mapMessageToGeminiContent(message: ChatMessage) {
  const text = message.role === 'tool'
    ? `Tool result (${message.tool_name || 'unknown'}): ${message.content || ''}`
    : message.content || '';

  return {
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text }],
  };
}
