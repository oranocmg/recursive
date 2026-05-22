import React from 'react';
import { useScoreStore } from '../store/useScoreStore';
import { DIATONIC_PITCHES } from '../types/music';
import { playAuditionNote, getExactPlayheadStep } from '../utils/audio';

interface GridSectionProps {
  title: string;
  startBar: number;
  startStep: number;
  isReadOnly: boolean;
}

const BARS = 8;
const STEPS_PER_BAR = 8;
const TOTAL_STEPS = 64;
const STEP_WIDTH = 24;
const ROW_HEIGHT = 28;
const KEY_WIDTH = 64;
const GRID_WIDTH = TOTAL_STEPS * STEP_WIDTH;
const GRID_HEIGHT = DIATONIC_PITCHES.length * ROW_HEIGHT;

const Playhead = ({ startStep }: { startStep: number }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const isPlaying = useScoreStore(s => s.isPlaying);

  React.useEffect(() => {
    if (!isPlaying) return;
    let frameId: number;
    const loop = () => {
      if (ref.current) {
        const exact = getExactPlayheadStep();
        const relative = exact - startStep;
        if (relative >= 0 && relative <= TOTAL_STEPS) {
          ref.current.style.transform = `translateX(${relative * STEP_WIDTH}px)`;
          ref.current.style.display = 'block';
        } else {
          ref.current.style.display = 'none';
        }
      }
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, startStep]);

  if (!isPlaying) return null;
  return (
    <div 
      ref={ref}
      className="absolute top-0 bottom-0 w-px bg-zinc-100 shadow-[0_0_8px_rgba(255,255,255,0.8)] z-30 pointer-events-none"
      style={{ left: 0, willChange: 'transform', display: 'none' }}
    />
  );
};

const GridSection: React.FC<GridSectionProps> = ({ title, startBar, startStep, isReadOnly }) => {
  const { previousResponse, overridePreviousResponse, currentResponse, toggleNote, playheadStep, isPlaying, auditionEnabled } = useScoreStore();
  const effectivePreviousResponse = overridePreviousResponse ?? previousResponse;

  const handleCellClick = (e: React.MouseEvent, baseStep: number, pitch: string, exactStep?: number) => {
    if (!isReadOnly) {
      let step = exactStep ?? baseStep;
      if (!exactStep && e.shiftKey) {
        const rect = e.currentTarget.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        step = baseStep + (offsetX / STEP_WIDTH);
      }
      const wasAdded = toggleNote(step, pitch);
      if (wasAdded && auditionEnabled) {
        playAuditionNote(pitch, useScoreStore.getState().noteLength);
      }
    }
  };

  const getPitchBgColor = (pitch: string) => {
    const isBlackKey = pitch.includes('b') || pitch.includes('#');
    return isBlackKey ? "bg-zinc-800" : "bg-zinc-900";
  };

  const getPitchTextColor = (pitch: string) => {
    const isBlackKey = pitch.includes('b') || pitch.includes('#');
    return isBlackKey ? "text-zinc-400" : "text-zinc-300";
  };

  return (
    <div className="mb-6 last:mb-0 w-max inline-block">
      <div className="text-sm text-zinc-400 mb-2 font-medium">{title}</div>
      <div 
        className="bg-zinc-900 border border-zinc-700 rounded shadow-lg overflow-y-auto overflow-x-hidden relative box-border custom-scrollbar"
        style={{ 
          display: 'grid',
          gridTemplateColumns: `${KEY_WIDTH}px ${GRID_WIDTH}px`,
          gridTemplateRows: `${ROW_HEIGHT}px ${GRID_HEIGHT}px`,
          maxHeight: '700px'
        }}
      >
        {/* Top Left Spacer */}
        <div className="bg-zinc-800 border-r border-b border-zinc-600 box-border sticky top-0 z-50" />
        
        {/* Bar Header Area */}
        <div className="relative border-b border-zinc-600 box-border overflow-hidden bg-zinc-900 sticky top-0 z-40">
          {Array.from({ length: BARS }).map((_, i) => (
            <div 
              key={i} 
              className="absolute top-0 bottom-0 border-r border-zinc-600 px-1 text-[10px] text-zinc-400 flex items-center box-border"
              style={{ 
                left: i * STEPS_PER_BAR * STEP_WIDTH, 
                width: STEPS_PER_BAR * STEP_WIDTH,
                backgroundColor: i % 2 === 1 ? 'rgba(0,0,0,0.2)' : 'rgba(39,39,42,0.8)'
              }}
            >
              Bar {startBar + i}
            </div>
          ))}
        </div>

        {/* Pitch Keys Column */}
        <div className="flex flex-col border-r border-zinc-600 box-border relative z-20">
          {DIATONIC_PITCHES.map((pitch) => (
            <div 
              key={pitch} 
              className={`flex-none flex items-center justify-end px-2 text-[10px] font-mono border-b border-zinc-800/40 box-border ${getPitchBgColor(pitch)} ${getPitchTextColor(pitch)}`}
              style={{ height: ROW_HEIGHT }}
            >
              {pitch}
            </div>
          ))}
        </div>

        {/* Grid Body */}
        <div className="relative box-border cursor-crosshair overflow-hidden" style={{ width: GRID_WIDTH, height: GRID_HEIGHT }}>
          {/* Background Step/Bar Lines */}
          {Array.from({ length: TOTAL_STEPS + 1 }).map((_, stepIndex) => {
            const isBarStart = stepIndex % 8 === 0;
            const isBeatStart = stepIndex % 2 === 0;

            let borderColor = 'border-zinc-800/20'; // subtle step line
            let zIndex = 5;
            if (isBarStart) {
              borderColor = 'border-zinc-600'; // strong bar line
              zIndex = 10;
            } else if (isBeatStart) {
              borderColor = 'border-zinc-700/60'; // beat line
              zIndex = 8;
            }

            const isLast = stepIndex === TOTAL_STEPS;
            const bgColor = (!isLast && Math.floor(stepIndex / 8) % 2 === 1) ? 'rgba(0,0,0,0.1)' : 'transparent';

            return (
              <div 
                key={stepIndex}
                className={`absolute top-0 bottom-0 border-l pointer-events-none box-border ${borderColor}`}
                style={{ 
                  left: stepIndex * STEP_WIDTH, 
                  width: isLast ? 0 : STEP_WIDTH,
                  backgroundColor: bgColor,
                  zIndex
                }}
              />
            );
          })}

          {/* Pitch Rows for backgrounds & click handlers */}
          {DIATONIC_PITCHES.map((pitch, pitchIndex) => (
            <div 
              key={pitch}
              className={`absolute left-0 right-0 border-b border-zinc-800/40 box-border ${getPitchBgColor(pitch)}`}
              style={{ top: pitchIndex * ROW_HEIGHT, height: ROW_HEIGHT }}
            >
              {Array.from({ length: TOTAL_STEPS }).map((_, stepIndex) => (
                <div
                  key={stepIndex}
                  className={`absolute top-0 bottom-0 hover:bg-zinc-600/40 transition-colors duration-75 box-border ${isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  style={{ left: stepIndex * STEP_WIDTH, width: STEP_WIDTH, zIndex: 15 }}
                  onClick={(e) => handleCellClick(e, startStep + stepIndex, pitch)}
                />
              ))}
            </div>
          ))}

          {/* Notes */}
          {DIATONIC_PITCHES.map((pitch, pitchIndex) => {
            const notes = isReadOnly 
              ? effectivePreviousResponse.filter(n => n.pitch === pitch) 
              : currentResponse.filter(n => n.pitch === pitch);

            return notes.map(n => {
              const relativeStep = n.step - startStep;
              const isPlayingNote = isPlaying && playheadStep >= n.step && playheadStep < n.step + n.durationSteps;
              
              return (
                <div
                  key={`${n.step}-${n.pitch}`}
                  onPointerDown={(e) => {
                    if (isReadOnly) return;
                    e.stopPropagation();
                    const startX = e.clientX;
                    const initialStep = n.step;
                    let currentStep = n.step;
                    let hasMoved = false;

                    const handlePointerMove = (moveEvent: PointerEvent) => {
                      const deltaX = moveEvent.clientX - startX;
                      if (Math.abs(deltaX) > 3) hasMoved = true;
                      
                      if (hasMoved) {
                        const exactDeltaSteps = deltaX / STEP_WIDTH;
                        const deltaSteps = moveEvent.shiftKey ? exactDeltaSteps : Math.round(exactDeltaSteps);
                        const newStep = Math.max(startStep, Math.min(startStep + TOTAL_STEPS - n.durationSteps, initialStep + deltaSteps));
                        
                        if (newStep !== currentStep) {
                          useScoreStore.getState().updateNoteStep(currentStep, pitch, newStep);
                          currentStep = newStep;
                        }
                      }
                    };

                    const handlePointerUp = () => {
                      window.removeEventListener('pointermove', handlePointerMove);
                      window.removeEventListener('pointerup', handlePointerUp);
                      if (!hasMoved) {
                        handleCellClick(e as any, initialStep, pitch, initialStep);
                      }
                    };

                    window.addEventListener('pointermove', handlePointerMove);
                    window.addEventListener('pointerup', handlePointerUp);
                  }}
                  className={`absolute rounded-sm box-border flex items-center justify-center transition-colors duration-100 z-20 group
                    ${isReadOnly ? 'pointer-events-none' : 'cursor-pointer pointer-events-auto'}
                    ${isPlayingNote 
                      ? (isReadOnly ? 'bg-zinc-300 border-zinc-200' : 'bg-white border-white shadow-[0_0_8px_rgba(255,255,255,0.6)]') 
                      : (isReadOnly ? 'bg-zinc-600 border-zinc-500' : 'bg-zinc-200 border-zinc-300 hover:bg-zinc-300')
                    } border`}
                  style={{ 
                    left: relativeStep * STEP_WIDTH, 
                    top: pitchIndex * ROW_HEIGHT + 2, 
                    width: n.durationSteps * STEP_WIDTH - 1, 
                    height: ROW_HEIGHT - 4 
                  }}
                >
                  {!isReadOnly && (
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-3 cursor-e-resize z-30 opacity-0 group-hover:opacity-100 hover:bg-black/10 transition-opacity"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        const startX = e.clientX;
                        const startDuration = n.durationSteps;
                        const currentStep = n.step;
                        
                        const handlePointerMove = (moveEvent: PointerEvent) => {
                          const deltaX = moveEvent.clientX - startX;
                          const exactDeltaSteps = deltaX / STEP_WIDTH;
                          const deltaSteps = moveEvent.shiftKey ? exactDeltaSteps : Math.round(exactDeltaSteps);
                          const newDuration = Math.max(0.1, startDuration + deltaSteps);
                          useScoreStore.getState().updateNoteDuration(currentStep, pitch, newDuration);
                        };
                        
                        const handlePointerUp = () => {
                          window.removeEventListener('pointermove', handlePointerMove);
                          window.removeEventListener('pointerup', handlePointerUp);
                        };
                        
                        window.addEventListener('pointermove', handlePointerMove);
                        window.addEventListener('pointerup', handlePointerUp);
                      }}
                    />
                  )}
                </div>
              );
            });
          })}

          <Playhead startStep={startStep} />
        </div>
      </div>
    </div>
  );
};

export const ScoreGrid: React.FC = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isPlaying = useScoreStore(s => s.isPlaying);
  const autoScrollEnabled = useScoreStore(s => s.autoScrollEnabled);
  const setAutoScrollEnabled = useScoreStore(s => s.setAutoScrollEnabled);

  // Disable auto-scroll on manual user interaction
  const handleUserScroll = () => {
    if (autoScrollEnabled) {
      setAutoScrollEnabled(false);
    }
  };

  React.useEffect(() => {
    if (!isPlaying || !autoScrollEnabled) return;
    
    let frameId: number;
    const loop = () => {
      if (containerRef.current && autoScrollEnabled) {
        const exact = getExactPlayheadStep();
        if (exact > 0) {
          const relativeStep = exact >= 64 ? exact - 64 : exact;
          const playheadX = KEY_WIDTH + relativeStep * STEP_WIDTH;
          
          const container = containerRef.current;
          const clientWidth = container.clientWidth;
          
          // Center the playhead
          const targetScroll = playheadX - (clientWidth / 2);
          
          if (targetScroll > 0) {
            container.scrollLeft = targetScroll;
          } else {
            container.scrollLeft = 0;
          }
        }
      }
      frameId = requestAnimationFrame(loop);
    };
    
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, autoScrollEnabled]);

  return (
    <div 
      ref={containerRef}
      onWheel={handleUserScroll}
      onTouchMove={handleUserScroll}
      onPointerDown={handleUserScroll}
      className="flex flex-col gap-8 w-full max-w-full overflow-x-auto pb-8 mx-auto px-4 md:px-8 custom-scrollbar"
      style={{ scrollBehavior: 'auto' }} // auto behavior inside the loop for smooth immediate updates
    >
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
