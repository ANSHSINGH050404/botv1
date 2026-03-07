import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const configSchema = z.object({
  provider: z.enum(['openai', 'gemini', 'anthropic']).default('gemini'),
  model: z.string().min(1),
  apiKey: z.string().min(1),
  temperature: z.preprocess((val) => parseFloat(val as string), z.number().default(0.7)),
});

// Logic to extract the specific key based on the selected provider
const getApiKey = (provider: string) => {
  switch (provider) {
    case 'openai': return process.env.OPENAI_API_KEY;
    case 'gemini': return process.env.GEMINI_API_KEY;
    case 'anthropic': return process.env.ANTHROPIC_API_KEY;
    default: return undefined;
  }
};

const parsed = configSchema.safeParse({
  provider: process.env.LLM_PROVIDER,
  model: process.env.LLM_MODEL,
  apiKey: getApiKey(process.env.LLM_PROVIDER || 'gemini'),
  temperature: process.env.TEMPERATURE,
});

if (!parsed.success) {
  console.error("❌ Invalid environment configuration:", parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;