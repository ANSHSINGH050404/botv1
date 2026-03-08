import { Command } from 'commander';
import * as p from '@clack/prompts';
import { ClientFactory,type ProviderType } from './src/api/clientFactory';
import { config } from './src/config';
import fs from 'fs';

const program = new Command();

async function main() {
  p.intro('🚀 Welcome to PathForge Agent Engine');

  // 1. Check for CLI flags first
  program
    .option('-p, --provider <type>', 'AI provider (openai, gemini, anthropic)')
    .parse(process.argv);

  let { provider } = program.opts();

  // 2. Interactive Selection if no flag is provided
  if (!provider) {
    provider = await p.select({
      message: 'Which AI provider would you like to use today?',
      options: [
        { value: 'openai', label: 'OpenAI (GPT-4)', hint: 'Best for reasoning' },
        { value: 'gemini', label: 'Google Gemini', hint: 'Fast and high context' },
        { value: 'anthropic', label: 'Anthropic Claude', hint: 'Most creative' },
      ],
    });

    if (p.isCancel(provider)) {
      p.cancel('Operation cancelled.');
      process.exit(0);
    }
  }

  // 3. Credential Validation & On-the-fly Input
  let apiKey = getEnvKey(provider);

  if (!apiKey) {
    p.log.warn(`⚠️  Missing API Key for ${provider.toUpperCase()}`);
    apiKey = await p.password({
      message: `Please enter your ${provider} API Key:`,
      validate: (value) => {
        if (!value) return 'API Key is required to continue.';
      }
    });

    if (p.isCancel(apiKey)) {
      p.cancel('Operation cancelled.');
      process.exit(0);
    }

    // Optional: Auto-save to .env for next time
    const save = await p.confirm({ message: 'Would you like to save this key to your .env file?' });
    if (save) {
      fs.appendFileSync('.env', `\n${provider.toUpperCase()}_API_KEY=${apiKey}`);
      p.log.success('Key saved successfully!');
    }
  }

  // 4. Hand off to the Engine
  const client = ClientFactory.createClient(provider as ProviderType, apiKey as string);
  p.outro(`Bot initialized with ${provider}. Start chatting below!`);
  
  // Start your message loop here...
}

function getEnvKey(provider: string) {
  const keys: Record<string, string | undefined> = {
    openai: process.env.OPENAI_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
  };
  return keys[provider];
}

main();