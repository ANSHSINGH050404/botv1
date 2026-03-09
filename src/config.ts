import { z } from 'zod';
import dotenv from 'dotenv';
import type { ProviderType } from './api/clientFactory';

dotenv.config();

const configSchema = z.object({
  provider: z.enum(['openai', 'gemini', 'anthropic']).optional(),
  model: z.string().min(1).optional(),
  temperature: z.preprocess((val) => {
    if (val === undefined) return undefined;
    const parsed = Number.parseFloat(String(val));
    return Number.isFinite(parsed) ? parsed : undefined;
  }, z.number().default(0.7)),
});

const parsed = configSchema.safeParse({
  provider: process.env.LLM_PROVIDER,
  model: process.env.LLM_MODEL,
  temperature: process.env.TEMPERATURE,
});

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.format());
  process.exit(1);
}

const parsedData = parsed.data;

const defaultModels: Record<ProviderType, string> = {
  openai: 'gpt-4o-mini',
  gemini: 'gemini-1.5-flash',
  anthropic: 'claude-3-5-sonnet-latest',
};

export function getEnvKey(provider: ProviderType): string | undefined {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY;
    case 'gemini':
      return process.env.GEMINI_API_KEY;
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY;
  }
}

export function getDefaultModel(provider: ProviderType): string {
  return parsedData.model || defaultModels[provider];
}

export const config = parsedData;
