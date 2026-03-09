import {geminiPrompt} from "../prompts/gemini";

export function buildSystemPrompt(): string {
  return geminiPrompt;
}