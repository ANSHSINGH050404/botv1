import { useAI } from '../context/AIContext';

export const Header = () => {
  const { provider, model } = useAI();

  return (
    <header className="flex justify-between p-4 bg-slate-900 text-white">
      <h1 className="text-xl font-bold">PathForge AI</h1>
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase px-2 py-1 bg-blue-600 rounded">
          {provider}
        </span>
        <span className="text-sm text-slate-400">{model}</span>
      </div>
    </header>
  );
};