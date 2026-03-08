import { useEffect, useState } from 'react';
import { useAI } from './context/AIContext';
import type { ChatMessage } from '../api/types';

interface ChatInputProps {
  onSend: (text: string) => Promise<void>;
}

const ChatInput = ({ onSend }: ChatInputProps) => {
  const [value, setValue] = useState('');

  const submit = async () => {
    const text = value.trim();
    if (!text) return;
    setValue('');
    await onSend(text);
  };

  return (
    <div>
      <input value={value} onChange={(e) => setValue((e.currentTarget as any).value)} />
      <button onClick={submit}>Send</button>
    </div>
  );
};

export const REPL = () => {
  const { client, model } = useAI();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [spinnerFrame, setSpinnerFrame] = useState(0);

  useEffect(() => {
    if (!isStreaming) {
      setSpinnerFrame(0);
      return;
    }
    const id = setInterval(() => {
      setSpinnerFrame((prev) => (prev + 1) % 4);
    }, 120);
    return () => clearInterval(id);
  }, [isStreaming]);

  const sendMessage = async (text: string) => {
    const newUserMsg: ChatMessage = { role: 'user', content: text };
    const nextMessages = [...messages, newUserMsg];
    setMessages(nextMessages);
    setIsStreaming(true);

    const stream = client.streamChatCompletion({
      model,
      messages: nextMessages,
    });

    let streamedText = '';

    for await (const chunk of stream) {
      if (chunk.delta.content) {
        streamedText += chunk.delta.content;
      }
    }
    setIsStreaming(false);

    if (streamedText) {
      setMessages((prev) => [...prev, { role: 'assistant', content: streamedText }]);
    }
  };

  const spinner = ['|', '/', '-', '\\'][spinnerFrame];

  return (
    <div className="flex flex-col h-full">
      {isStreaming ? <div>Thinking {spinner}</div> : null}
      <ChatInput onSend={sendMessage} />
    </div>
  );
};
