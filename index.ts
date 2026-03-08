import { Command } from 'commander';
import * as p from '@clack/prompts';
import { ClientFactory, type ProviderType } from './src/api/clientFactory';
import fs from 'fs';

const program = new Command();

async function main() {
  p.intro('Welcome to PathForge Agent Engine');

  program
    .option('-p, --provider <type>', 'AI provider (openai, gemini, anthropic)')
    .parse(process.argv);

  let { provider } = program.opts<{ provider?: ProviderType }>();

  if (!provider) {
    const selectedProvider = await p.select({
      message: 'Which AI provider would you like to use today?',
      options: [
        { value: 'openai', label: 'OpenAI (GPT-4)', hint: 'Best for reasoning' },
        { value: 'gemini', label: 'Google Gemini', hint: 'Fast and high context' },
        { value: 'anthropic', label: 'Anthropic Claude', hint: 'Most creative' },
      ],
    });

    if (p.isCancel(selectedProvider)) {
      p.cancel('Operation cancelled.');
      process.exit(0);
    }

    provider = selectedProvider;
  }

  let apiKey = getEnvKey(provider);

  if (!apiKey) {
    p.log.warn(`Missing API Key for ${provider.toUpperCase()}`);

    const enteredApiKey = await p.password({
      message: `Please enter your ${provider} API Key:`,
      validate: (value) => {
        if (!value) return 'API Key is required to continue.';
      },
    });

    if (p.isCancel(enteredApiKey)) {
      p.cancel('Operation cancelled.');
      process.exit(0);
    }

    apiKey = enteredApiKey;

    const save = await p.confirm({ message: 'Would you like to save this key to your .env file?' });
    if (save) {
      fs.appendFileSync('.env', `\n${provider.toUpperCase()}_API_KEY=${apiKey}`);
      p.log.success('Key saved successfully!');
    }
  }

  ClientFactory.createClient(provider, apiKey);
  p.outro(`Bot initialized with ${provider}. Start chatting below!`);

  // Start your message loop here...
}

function getEnvKey(provider: ProviderType) {
  const keys: Record<ProviderType, string | undefined> = {
    openai: process.env.OPENAI_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
  };
  return keys[provider];
}

main();
