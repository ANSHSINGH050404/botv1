import type { ILLMClient } from './interface';
import { OpenAIProvider } from './providers/openai';
import { GeminiProvider } from './providers/gemini';
import { AnthropicProvider } from './providers/anthropic';

export type ProviderType = 'openai' | 'gemini' | 'anthropic';

/**
 * The ClientFactory handles the instantiation logic for all LLM providers.
 * This centralizes API key management and class mapping.
 */
export class ClientFactory {
  /**
   * Creates and returns a provider instance based on the specified name.
   * * @param provider - The name of the LLM provider (e.g., 'openai')
   * @param apiKey - The API key for that specific provider
   * @returns An object conforming to the ILLMClient interface
   */
  static createClient(provider: ProviderType, apiKey: string): ILLMClient {
    switch (provider) {
      case 'openai':
        return new OpenAIProvider(apiKey);
      case 'gemini':
        return new GeminiProvider(apiKey);
      case 'anthropic':
        return new AnthropicProvider(apiKey);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}