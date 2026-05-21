import { useEffect } from 'react';
import { useScoreStore } from './store/useScoreStore';
import { ScoreGrid } from './components/ScoreGrid';
import { Controls } from './components/Controls';
import { ConversationHistory } from './components/ConversationHistory';

function App() {
  const { loadState } = useScoreStore();

  useEffect(() => {
    loadState();
  }, [loadState]);

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 font-sans selection:bg-zinc-700">
      <main className="px-6 py-12 max-w-[1200px] mx-auto">
        
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-2xl font-normal mb-2 text-zinc-50">Recursive Score</h1>
          <p className="text-sm text-zinc-400 font-mono">
            Bars 1–8 are the previous response. Bars 9–16 are yours.
          </p>
        </header>

        {/* Interactive Score Area */}
        <section className="mb-8">
          <ScoreGrid />
          <Controls />
        </section>

        {/* History */}
        <section>
          <ConversationHistory />
        </section>

      </main>
    </div>
  );
}

export default App;
