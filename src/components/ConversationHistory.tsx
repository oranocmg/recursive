import React from 'react';
import { useScoreStore } from '../store/useScoreStore';
import { DIATONIC_PITCHES } from '../types/music';
import { playHistoryItem } from '../utils/audio';

export const ConversationHistory: React.FC = () => {
  const { conversationHistory } = useScoreStore();

  if (conversationHistory.length === 0) {
    return null;
  }

  return (
    <div className="mt-16 pt-8 border-t border-zinc-800">
      <h2 className="text-sm font-medium text-zinc-500 mb-6 uppercase tracking-wider">Conversation So Far</h2>
      <div className="flex flex-col gap-8">
        {conversationHistory.map((entry, index) => (
          <div key={entry.id} className="flex flex-col gap-2">
            <div className="text-xs text-zinc-400 font-mono">
              Submission {index + 1} • {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div 
              className="w-full max-w-md h-24 bg-zinc-900 border border-zinc-700 cursor-pointer hover:border-zinc-500 transition-colors relative group"
              onClick={() => playHistoryItem(entry.notes)}
            >
              {/* Play Overlay */}
              <div className="absolute inset-0 bg-zinc-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-10">
                <span className="bg-zinc-800 px-2 py-1 text-xs text-zinc-300 shadow-sm border border-zinc-700 rounded">Click to Play</span>
              </div>

              {/* Thumbnail Grid */}
              <div className="w-full h-full flex flex-col">
                {DIATONIC_PITCHES.map((pitch) => (
                  <div key={pitch} className="flex-1 flex border-b border-zinc-800/30 last:border-b-0">
                    {Array.from({ length: 64 }).map((_, step) => {
                      const note = entry.notes.find(n => n.step === step && n.pitch === pitch);
                      return (
                        <div key={step} className="flex-1 flex border-r border-zinc-800/30 last:border-r-0 relative">
                          {note && (
                            <div 
                              className="absolute bg-zinc-500 z-10" 
                              style={{ 
                                left: 0, 
                                top: 0, 
                                bottom: 0, 
                                // Multiply by step width percentage to span correctly in flex
                                width: `calc(${note.duration} * 100% + ${note.duration - 1}px)` 
                              }} 
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
