import { useAI } from '../context/AIContext';
import { ChatMessage } from '../api/types';

export const REPL = () => {
  const { client, model } = useAI();
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const sendMessage = async (text: string) => {
    const newUserMsg: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, newUserMsg]);

    const stream = await client.streamChatCompletion({
      model,
      messages: [...messages, newUserMsg],
    });

    // Process stream chunks...
    for await (const chunk of stream) {
      if (chunk.delta.content) {
        // Logic to update UI with streaming text
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Message List Rendering */}
      <ChatInput onSend={sendMessage} />
    </div>
  );
};