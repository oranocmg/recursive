import React from 'react';
import { useScoreStore } from '../store/useScoreStore';
import { DIATONIC_PITCHES } from '../types/music';
import { playHistoryItem, playAllHistory } from '../utils/audio';

export const ConversationHistory: React.FC = () => {
  const conversationHistory = useScoreStore(s => s.conversationHistory);
  const playingHistoryIndex = useScoreStore(s => s.playingHistoryIndex);

  if (conversationHistory.length === 0) {
    return null;
  }

  return (
    <div className="mt-16 pt-8 border-t border-zinc-800 flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-6">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Conversation So Far</h2>
        <button 
          onClick={() => playAllHistory(conversationHistory)}
          className="px-3 py-1.5 text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors rounded border border-zinc-700"
        >
          ▶ Play All
        </button>
      </div>
      
      <div className="flex flex-col items-center gap-8 w-full max-h-[400px] overflow-y-auto custom-scrollbar pr-4">
        {conversationHistory.map((entry, index) => {
          const isPlaying = playingHistoryIndex === index;
          return (
          <div key={entry.id} className={`flex flex-col gap-2 w-full max-w-md p-4 rounded-lg transition-colors ${isPlaying ? 'bg-zinc-800/50 border border-zinc-700' : 'border border-transparent'}`}>
            <div className="text-xs text-zinc-400 font-mono text-center">
              Submission {index + 1} • {new Date(entry.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
            </div>
            <div 
              className={`w-full h-24 bg-zinc-900 border cursor-pointer transition-colors relative group ${isPlaying ? 'border-zinc-400 shadow-[0_0_12px_rgba(255,255,255,0.1)]' : 'border-zinc-700 hover:border-zinc-500'}`}
              onClick={() => playHistoryItem(entry.notes, index)}
            >
              {/* Play Overlay */}
              <div className="absolute inset-0 bg-zinc-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-10">
                <span className="bg-zinc-800 px-2 py-1 text-xs text-zinc-300 shadow-sm border border-zinc-700 rounded">Click to Play</span>
              </div>

              {/* Thumbnail Grid Optimized */}
              <div className="w-full h-full flex flex-col relative">
                {DIATONIC_PITCHES.map((pitch) => {
                  const pitchNotes = entry.notes.filter(n => n.pitch === pitch);
                  return (
                    <div key={pitch} className="flex-1 border-b border-zinc-800/30 last:border-b-0 relative">
                      {pitchNotes.map(note => (
                        <div 
                          key={`${note.step}-${note.pitch}`}
                          className="absolute bg-zinc-500 top-[1px] bottom-[1px] rounded-[1px]" 
                          style={{ 
                            left: `${(note.step / 64) * 100}%`, 
                            width: `calc(${(note.durationSteps / 64) * 100}% - 1px)` 
                          }} 
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )})}
      </div>
    </div>
  );
};
