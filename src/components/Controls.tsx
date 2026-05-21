import React from 'react';
import { useScoreStore } from '../store/useScoreStore';
import { playScore, stopAudio } from '../utils/audio';

export const Controls: React.FC = () => {
  const { 
    previousResponse, 
    currentResponse, 
    isPlaying, 
    playheadStep,
    clearResponse, 
    submitResponse, 
    resetLoop,
    noteLength,
    setNoteLength,
    playbackMode,
    setPlaybackMode,
    metronomeEnabled,
    setMetronomeEnabled,
    auditionEnabled,
    setAuditionEnabled,
    autoScrollEnabled,
    setAutoScrollEnabled
  } = useScoreStore();

  const handlePlay = (mode: 'previous' | 'response' | 'full') => {
    setPlaybackMode(mode);
    playScore(previousResponse, currentResponse);
  };

  const handleStop = () => {
    stopAudio();
  };

  const handleSubmit = () => {
    if (currentResponse.length === 0) {
      alert("Please add some notes to your response before submitting.");
      return;
    }
    stopAudio();
    submitResponse();
  };

  return (
    <div className="flex flex-col gap-6 mt-6 border-t border-zinc-800 pt-6">
      
      {/* Top Row: Playback Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => handlePlay('previous')}
            className={`px-3 py-1.5 text-sm transition-colors rounded ${isPlaying && playbackMode === 'previous' ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
          >
            Play Previous
          </button>
          <button 
            onClick={() => handlePlay('response')}
            className={`px-3 py-1.5 text-sm transition-colors rounded ${isPlaying && playbackMode === 'response' ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
          >
            Play Response
          </button>
          <button 
            onClick={() => handlePlay('full')}
            className={`px-3 py-1.5 text-sm transition-colors rounded ${isPlaying && playbackMode === 'full' ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
          >
            Play Full
          </button>
          <button 
            onClick={handleStop}
            className="px-3 py-1.5 text-sm transition-colors rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 ml-2"
          >
            Stop
          </button>
        </div>

        <div className="flex items-center px-4">
          <span className="text-xs font-mono text-zinc-400 bg-zinc-800 px-2 py-1 rounded border border-zinc-700">
            120 BPM • Bar {Math.floor(playheadStep / 8) + 1} / Step {(playheadStep % 8) + 1}
          </span>
        </div>

        <button
          onClick={() => setMetronomeEnabled(!metronomeEnabled)}
          className={`px-3 py-1.5 text-sm transition-colors rounded ${metronomeEnabled ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
        >
          Metronome {metronomeEnabled ? 'On' : 'Off'}
        </button>

        <button
          onClick={() => setAuditionEnabled(!auditionEnabled)}
          className={`px-3 py-1.5 text-sm transition-colors rounded ${auditionEnabled ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
        >
          🔊 Audition
        </button>
        
        <button
          onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}
          className={`px-3 py-1.5 text-sm transition-colors rounded ${autoScrollEnabled ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
        >
          Auto-Scroll {autoScrollEnabled ? 'On' : 'Off'}
        </button>
      </div>

      {/* Bottom Row: Edit & Submit Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">Note Length:</span>
          {[1, 2, 4, 8].map(len => (
            <button
              key={len}
              onClick={() => setNoteLength(len)}
              className={`w-8 h-8 flex items-center justify-center text-sm transition-colors rounded ${noteLength === len ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
            >
              {len}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <button 
          onClick={clearResponse}
          className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          Clear Response
        </button>
        
        <button 
          onClick={handleSubmit}
          className="px-6 py-2 text-sm bg-zinc-100 text-zinc-900 hover:bg-white transition-colors rounded font-medium"
        >
          Submit
        </button>

        <div className="w-full h-px bg-zinc-800 my-2 md:hidden" />
        
        <button 
          onClick={resetLoop}
          className="px-4 py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors md:ml-4"
        >
          Reset Loop
        </button>
      </div>
    </div>
  );
};
