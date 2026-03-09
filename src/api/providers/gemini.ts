import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ILLMClient } from '../interface';
import type { ChatCompletionRequest, ChatCompletionChunk, ChatMessage, ToolCallDelta } from '../types';

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
    const tools = request.tools?.length ? [{
      functionDeclarations: request.tools.map((tool) => ({
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters,
      })),
    }] : undefined;

    const toolConfig = tools
      ? {
          functionCallingConfig: {
            mode: 'AUTO',
          },
        }
      : undefined;

    let result: any;
    try {
      result = await model.generateContentStream({
        contents,
        tools,
        toolConfig,
      } as any);
    } catch (error) {
      // Some Gemini models reject complex tool schemas. Retry without tools so chat still works.
      if (tools) {
        result = await model.generateContentStream({
          contents,
        } as any);
      } else {
        throw error;
      }
    }

    for await (const chunk of result.stream) {
      const toolCalls = extractToolCalls(chunk as any);
      if (toolCalls.length > 0) {
        yield {
          id: 'gemini-res',
          delta: { tool_calls: toolCalls },
          finish_reason: null,
        };
      }

      const text = chunk.text();
      if (text) {
        yield {
          id: 'gemini-res',
          delta: { content: text },
          finish_reason: null,
        };
      }

      const finishReason = (chunk as any)?.candidates?.[0]?.finishReason;
      yield {
        id: 'gemini-res',
        delta: {},
        finish_reason: typeof finishReason === 'string' ? finishReason.toLowerCase() : null,
      };
    }
  }
}

function mapMessageToGeminiContent(message: ChatMessage) {
  if (message.role === 'tool') {
    return {
      role: 'user',
      parts: [{
        functionResponse: {
          name: message.tool_name || 'tool',
          response: {
            content: message.content || '',
          },
        },
      }],
    };
  }

  if (message.role === 'assistant' && message.tool_calls && message.tool_calls.length > 0) {
    return {
      role: 'model',
      parts: message.tool_calls.map((call) => ({
        functionCall: {
          name: call.function.name,
          args: safeParseJson(call.function.arguments),
        },
      })),
    };
  }

  const text = message.content || '';

  return {
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text }],
  };
}

function extractToolCalls(chunk: any): ToolCallDelta[] {
  const parts = chunk?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return [];

  const toolCalls: ToolCallDelta[] = [];
  for (const [index, part] of parts.entries()) {
    const functionCall = part?.functionCall;
    if (!functionCall?.name) continue;
    toolCalls.push({
      index,
      id: `gemini_tool_${index}`,
      type: 'function',
      function: {
        name: functionCall.name,
        arguments: JSON.stringify(functionCall.args ?? {}),
      },
    });
  }
  return toolCalls;
}

function safeParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
