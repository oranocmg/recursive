import React from 'react';
import { useScoreStore } from '../store/useScoreStore';
import { DIATONIC_PITCHES } from '../types/music';
import { playAuditionNote } from '../utils/audio';

interface GridSectionProps {
  title: string;
  startBar: number;
  startStep: number;
  isReadOnly: boolean;
}

const ROW_HEIGHT_CLASS = "h-6"; 
const STEPS_PER_BAR = 8;
const BARS_PER_GRID = 8;
const TOTAL_STEPS = STEPS_PER_BAR * BARS_PER_GRID; 
const LABEL_WIDTH_CLASS = "w-12"; 

const GridSection: React.FC<GridSectionProps> = ({ title, startBar, startStep, isReadOnly }) => {
  const { previousResponse, currentResponse, toggleNote, playheadStep, isPlaying, auditionEnabled } = useScoreStore();
  
  const showPlayhead = isPlaying && playheadStep >= startStep && playheadStep < startStep + TOTAL_STEPS;
  const relativePlayheadStep = playheadStep - startStep;

  const handleCellClick = (step: number, pitch: string) => {
    if (!isReadOnly) {
      const wasAdded = toggleNote(step, pitch);
      if (wasAdded && auditionEnabled) {
        playAuditionNote(pitch, useScoreStore.getState().noteLength);
      }
    }
  };

  const getPitchColor = (pitch: string) => {
    const isBlackKey = pitch.includes('b') || pitch.includes('#');
    if (isBlackKey) {
      return "bg-zinc-800 text-zinc-400";
    }
    return "bg-zinc-900 text-zinc-300";
  };

  return (
    <div className="mb-6 last:mb-0">
      <div className="text-sm text-zinc-400 mb-2 font-medium">{title}</div>
      <div className="w-full bg-zinc-900 border border-zinc-700 rounded overflow-hidden">
        
        {/* Header Row */}
        <div className={`flex border-b border-zinc-600 ${ROW_HEIGHT_CLASS}`}>
          <div className={`${LABEL_WIDTH_CLASS} flex-none border-r border-zinc-600 bg-zinc-800`}></div>
          <div className="flex-1 grid grid-cols-8">
            {Array.from({ length: BARS_PER_GRID }).map((_, i) => (
              <div 
                key={i} 
                className={`border-r border-zinc-600 px-1 text-[10px] text-zinc-400 flex items-center ${i % 2 === 1 ? 'bg-black/20' : 'bg-zinc-800/80'}`}
              >
                Bar {startBar + i}
              </div>
            ))}
          </div>
        </div>

        {/* Grid Area */}
        <div className="relative">
          
          {/* Bar Backgrounds Overlay (For alternating bar shading and strong bar lines) */}
          <div className={`absolute top-0 bottom-0 right-0 grid grid-cols-8 pointer-events-none z-0`} style={{ left: '3rem' /* 48px to match w-12 */ }}>
            {Array.from({ length: BARS_PER_GRID }).map((_, i) => (
              <div 
                key={i} 
                className={`border-r border-zinc-600/60 ${i % 2 === 1 ? 'bg-black/20' : 'bg-transparent'}`} 
              />
            ))}
          </div>

          {/* Pitch Rows */}
          {DIATONIC_PITCHES.map((pitch) => (
            <div key={pitch} className={`flex border-b border-zinc-800/40 ${ROW_HEIGHT_CLASS} relative z-10`}>
              
              {/* Left Label */}
              <div 
                className={`${LABEL_WIDTH_CLASS} flex-none flex items-center justify-end px-2 text-[10px] font-mono border-r border-zinc-600 ${getPitchColor(pitch)}`}
              >
                {pitch}
              </div>

              {/* Cells Wrapper */}
              <div className="flex-1 relative">
                
                {/* Interactive Cells grid */}
                <div className="absolute inset-0 grid grid-cols-[repeat(64,1fr)]">
                  {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
                    const step = startStep + i;
                    const isQuarterStart = i % 2 === 0;
                    const isBarStart = i % 8 === 0;
                    
                    return (
                      <div
                        key={step}
                        onClick={() => handleCellClick(step, pitch)}
                        className={`
                          border-r border-zinc-800/10
                          ${isQuarterStart && !isBarStart ? 'border-r-zinc-700/40' : ''}
                          ${isReadOnly ? 'cursor-not-allowed' : 'hover:bg-zinc-600/40 cursor-pointer'}
                          transition-colors duration-75
                        `}
                      />
                    );
                  })}
                </div>
                
                {/* Notes rendered absolutely with percentages */}
                <div className="absolute inset-0 pointer-events-none">
                  {isReadOnly ? 
                    previousResponse.filter(n => n.pitch === pitch).map(n => {
                      const isPlayingNote = isPlaying && playheadStep >= n.step && playheadStep < n.step + n.duration;
                      const leftPercent = ((n.step - startStep) / TOTAL_STEPS) * 100;
                      const widthPercent = (n.duration / TOTAL_STEPS) * 100;
                      return (
                        <div
                          key={`${n.step}-${n.pitch}`}
                          className={`absolute top-[2px] bottom-[2px] rounded-sm z-20 transition-all duration-100 ${isPlayingNote ? 'bg-zinc-300 border border-zinc-200 scale-105 shadow-[0_0_8px_rgba(255,255,255,0.2)]' : 'bg-zinc-600 border border-zinc-500'}`}
                          style={{ 
                            left: `${leftPercent}%`, 
                            width: `calc(${widthPercent}% - 1px)` 
                          }}
                        />
                      );
                    })
                    :
                    currentResponse.filter(n => n.pitch === pitch).map(n => {
                      const relativeStep = n.step - startStep;
                      const isPlayingNote = isPlaying && playheadStep >= n.step && playheadStep < n.step + n.duration;
                      const leftPercent = (relativeStep / TOTAL_STEPS) * 100;
                      const widthPercent = (n.duration / TOTAL_STEPS) * 100;
                      return (
                        <div
                          key={`${n.step}-${n.pitch}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCellClick(n.step, pitch); // toggles off
                          }}
                          className={`absolute top-[2px] bottom-[2px] rounded-sm cursor-pointer pointer-events-auto z-20 transition-all duration-100 ${isPlayingNote ? 'bg-white border border-white scale-105 shadow-[0_0_12px_rgba(255,255,255,0.6)]' : 'bg-zinc-200 border border-zinc-300 hover:bg-zinc-300'}`}
                          style={{ 
                            left: `${leftPercent}%`, 
                            width: `calc(${widthPercent}% - 1px)` 
                          }}
                        />
                      );
                    })
                  }
                </div>
              </div>
            </div>
          ))}

          {/* Playhead */}
          {showPlayhead && (
            <div className={`absolute top-0 bottom-0 right-0 pointer-events-none z-30`} style={{ left: '3rem' }}>
              <div 
                className="absolute top-0 bottom-0 w-px bg-zinc-100 shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-transform duration-75 ease-linear"
                style={{ left: `${(relativePlayheadStep / TOTAL_STEPS) * 100}%` }}
              />
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export const ScoreGrid: React.FC = () => {
  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto">
      <GridSection 
        title="Previous Response" 
        startBar={1} 
        startStep={0} 
        isReadOnly={true} 
      />
      <GridSection 
        title="Your Response" 
        startBar={9} 
        startStep={64} 
        isReadOnly={false} 
      />
    </div>
  );
};
