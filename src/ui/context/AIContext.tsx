import React, { createContext, useContext, useState, useMemo } from 'react';
import { ClientFactory, type ProviderType } from '../../api/clientFactory';
import { type ILLMClient } from '../../api/interface';

interface AIContextType {
  provider: ProviderType;
  model: string;
  client: ILLMClient;
  setAIConfig: (provider: ProviderType, model: string, apiKey: string) => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const AIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState({
    provider: 'gemini' as ProviderType,
    model: 'gemini-2.0-flash',
    apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
  });

  // Memoize the client so we don't recreate it on every render
  const client = useMemo(() => 
    ClientFactory.createClient(config.provider, config.apiKey), 
    [config.provider, config.apiKey]
  );

  const setAIConfig = (provider: ProviderType, model: string, apiKey: string) => {
    setConfig({ provider, model, apiKey });
  };

  return (
    <AIContext.Provider value={{ ...config, client, setAIConfig }}>
      {children}
    </AIContext.Provider>
  );
};

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) throw new Error('useAI must be used within an AIProvider');
  return context;
};