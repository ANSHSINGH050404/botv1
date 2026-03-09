import { Command } from 'commander';
import * as p from '@clack/prompts';
import { ClientFactory, type ProviderType } from './src/api/clientFactory';
import { QueryHandler } from './src/core/query';
import { runMessageLoop } from './src/core/messageLoop';
import type { ChatMessage } from './src/api/types';
import fs from 'fs';
import { buildSystemPrompt } from './src/core/systemPrompt';
import { config, getDefaultModel, getEnvKey } from './src/config';

const program = new Command();

async function main() {
  p.intro('Welcome to PathForge Agent Engine');

  program
    .option('-p, --provider <type>', 'AI provider (openai, gemini, anthropic)')
    .parse(process.argv);

  let { provider } = program.opts<{ provider?: ProviderType }>();
  provider = provider || config.provider;

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

  p.outro(`Bot initialized with ${provider}. Start chatting below!`);

  const client = ClientFactory.createClient(provider, apiKey);
  const queryHandler = new QueryHandler(client, getDefaultModel(provider));
  let messages: ChatMessage[] = [{ role: 'system', content: buildSystemPrompt() }];

  while (true) {
    const input = await p.text({
      message: "You",
      placeholder: "Ask anything ('exit' to quit)",
      validate: (value) => {
        if (!value?.trim()) return 'Please enter a message.';
      },
    });

    if (p.isCancel(input)) {
      p.cancel('Session ended.');
      process.exit(0);
    }

    const normalized = input.trim().toLowerCase();
    if (normalized === 'exit' || normalized === 'quit') {
      p.outro('Goodbye.');
      process.exit(0);
    }

    messages.push({ role: 'user', content: input });
    messages = await runMessageLoop(queryHandler, messages);
    process.stdout.write('\n\n');
  }
}

main();
