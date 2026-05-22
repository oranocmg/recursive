import * as Tone from 'tone';
import type { Note } from '../types/music';
import { useScoreStore } from '../store/useScoreStore';

let synth: Tone.PolySynth | null = null;
let metronomeSynth: Tone.Synth | null = null;

const createSynths = () => {
  if (synth) synth.dispose();
  if (metronomeSynth) metronomeSynth.dispose();

  synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.02, decay: 0.1, sustain: 0.1, release: 0.1 }
  }).toDestination();
  synth.volume.value = -6;

  metronomeSynth = new Tone.Synth({
    oscillator: { type: 'square' },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
  }).toDestination();
  
  const metronomeEnabled = useScoreStore.getState().metronomeEnabled;
  metronomeSynth.volume.value = metronomeEnabled ? -12 : -Infinity;
};

export const updateMetronomeVolume = (enabled: boolean) => {
  if (metronomeSynth) {
    metronomeSynth.volume.rampTo(enabled ? -12 : -Infinity, 0.1);
  }
};

let isAudioInitialized = false;
const STEP_DURATION = 0.25; // 120 BPM -> quarter = 0.5s -> 8th step = 0.25s

let playbackStartTime = 0;
let animationFrameId: number | null = null;
let isCurrentlyPlaying = false;
let currentEndStep = 0;
let startOffsetStep = 0;
let isPlayAll = false;
let playAllHistoryData: { id: string; notes: Note[]; timestamp: number }[] = [];
let playAllStartTime = 0;
let nextChunkToSchedule = 0;

export const getExactPlayheadStep = () => {
  if (!isCurrentlyPlaying) return 0;
  const elapsed = (performance.now() - playbackStartTime) / 1000;
  const exact = startOffsetStep + (elapsed / STEP_DURATION);
  return isPlayAll ? (exact % 64) : exact;
};

export const initAudio = async () => {
  if (!isAudioInitialized) {
    await Tone.start();
    createSynths();
    isAudioInitialized = true;
  }
};

const playheadLoop = () => {
  if (!isCurrentlyPlaying) return;

  const elapsed = (performance.now() - playbackStartTime) / 1000;
  const rawStep = startOffsetStep + Math.floor(elapsed / STEP_DURATION);

  if (rawStep >= currentEndStep) {
    stopAudio();
    return;
  }

  const state = useScoreStore.getState();
  state.setPlayheadStep(isPlayAll ? (rawStep % 64) : rawStep);
  
  if (isPlayAll) {
    const activeIndex = Math.floor(rawStep / 64);
    if (state.playingHistoryIndex !== activeIndex && activeIndex >= 0 && activeIndex < state.conversationHistory.length) {
      state.setPlayingHistoryIndex(activeIndex);
      state.setOverridePreviousResponse(state.conversationHistory[activeIndex].notes);
    }

    // Dynamically schedule ahead
    while (nextChunkToSchedule <= activeIndex + 1 && nextChunkToSchedule < playAllHistoryData.length) {
      scheduleChunk(nextChunkToSchedule);
      nextChunkToSchedule++;
    }
  }
  
  animationFrameId = requestAnimationFrame(playheadLoop);
};

export const playScore = async (previousResponse: Note[], currentResponse: Note[]) => {
  await initAudio();
  stopAudio(); // completely clears old synths and stops loop

  const state = useScoreStore.getState();
  const mode = state.playbackMode;
  
  let notesToPlay: Note[] = [];
  let startStep = 0;
  let endStep = 128;

  if (mode === 'previous') {
    notesToPlay = previousResponse;
    endStep = 64;
  } else if (mode === 'response') {
    notesToPlay = currentResponse;
    startStep = 64;
  } else {
    notesToPlay = [...previousResponse, ...currentResponse];
  }

  startOffsetStep = startStep;
  currentEndStep = endStep;
  
  const now = Tone.now();
  
  notesToPlay.forEach(n => {
    // Safety check
    const durationSteps = n.durationSteps && n.durationSteps > 0 ? n.durationSteps : 1;
    const relativeStep = n.step - startStep;
    const startTime = now + relativeStep * STEP_DURATION;
    const duration = durationSteps * STEP_DURATION;
    
    synth?.triggerAttackRelease(n.pitch, duration, startTime);
  });

  // Always schedule metronome so it can be unmuted dynamically
  const totalStepsToPlay = endStep - startStep;
  for (let s = 0; s < totalStepsToPlay; s++) {
    const isQuarter = s % 2 === 0;
    const isBarStart = s % 8 === 0;
    if (isQuarter) {
      const time = now + s * STEP_DURATION;
      const pitch = isBarStart ? "C6" : "C5";
      const vel = isBarStart ? 1 : 0.5;
      metronomeSynth?.triggerAttackRelease(pitch, 0.05, time, vel);
    }
  }

  playbackStartTime = performance.now();
  isCurrentlyPlaying = true;
  state.setIsPlaying(true);
  
  animationFrameId = requestAnimationFrame(playheadLoop);
};

export const stopAudio = () => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  // Dispose and recreate synths to wipe out any future scheduled events
  createSynths();
  Tone.Transport.cancel();
  
  isCurrentlyPlaying = false;
  isPlayAll = false;
  playAllHistoryData = [];
  const state = useScoreStore.getState();
  state.setPlayheadStep(0);
  state.setIsPlaying(false);
  state.setPlayingHistoryIndex(null);
  state.setOverridePreviousResponse(null);
};

export const playHistoryItem = async (notes: Note[], index: number) => {
  await initAudio();
  stopAudio();

  startOffsetStep = 0;
  currentEndStep = 64; 
  
  const now = Tone.now();
  
  notes.forEach(n => {
    const durationSteps = n.durationSteps && n.durationSteps > 0 ? n.durationSteps : 1;
    const startTime = now + n.step * STEP_DURATION;
    const duration = durationSteps * STEP_DURATION;
    synth?.triggerAttackRelease(n.pitch, duration, startTime);
  });
  
  // Schedule metronome
  for (let s = 0; s < 64; s++) {
    const isQuarter = s % 2 === 0;
    const isBarStart = s % 8 === 0;
    if (isQuarter) {
      const time = now + s * STEP_DURATION;
      const pitch = isBarStart ? "C6" : "C5";
      const vel = isBarStart ? 1 : 0.5;
      metronomeSynth?.triggerAttackRelease(pitch, 0.05, time, vel);
    }
  }

  playbackStartTime = performance.now();
  isCurrentlyPlaying = true;
  
  const state = useScoreStore.getState();
  state.setIsPlaying(true);
  state.setPlayingHistoryIndex(index);
  state.setOverridePreviousResponse(notes);
  
  animationFrameId = requestAnimationFrame(playheadLoop);
};

export const scheduleChunk = (chunkIndex: number) => {
  if (chunkIndex >= playAllHistoryData.length) return;
  
  const entry = playAllHistoryData[chunkIndex];
  const sectionStartStep = chunkIndex * 64;
  
  entry.notes.forEach(n => {
    const durationSteps = n.durationSteps && n.durationSteps > 0 ? n.durationSteps : 1;
    const startTime = playAllStartTime + (sectionStartStep + n.step) * STEP_DURATION;
    const duration = durationSteps * STEP_DURATION;
    synth?.triggerAttackRelease(n.pitch, duration, startTime);
  });

  for (let s = 0; s < 64; s++) {
    const isQuarter = s % 2 === 0;
    const isBarStart = s % 8 === 0;
    if (isQuarter) {
      const time = playAllStartTime + (sectionStartStep + s) * STEP_DURATION;
      const pitch = isBarStart ? "C6" : "C5";
      const vel = isBarStart ? 1 : 0.5;
      metronomeSynth?.triggerAttackRelease(pitch, 0.05, time, vel);
    }
  }
};

export const playAllHistory = async (history: { id: string; notes: Note[]; timestamp: number }[]) => {
  await initAudio();
  stopAudio();

  if (history.length === 0) return;

  startOffsetStep = 0;
  currentEndStep = history.length * 64; 
  isPlayAll = true;
  playAllHistoryData = history;
  
  playAllStartTime = Tone.now();
  nextChunkToSchedule = 0;
  
  // Initial schedule (chunk 0 and 1)
  scheduleChunk(0);
  if (history.length > 1) {
    scheduleChunk(1);
  }
  nextChunkToSchedule = 2;

  playbackStartTime = performance.now();
  isCurrentlyPlaying = true;
  
  const state = useScoreStore.getState();
  state.setIsPlaying(true);
  state.setPlayingHistoryIndex(0);
  state.setOverridePreviousResponse(history[0].notes);
  
  animationFrameId = requestAnimationFrame(playheadLoop);
};

export const playAuditionNote = async (pitch: string, durationInSteps: number) => {
  await initAudio();
  const durationSteps = durationInSteps > 0 ? durationInSteps : 1;
  const duration = durationSteps * STEP_DURATION;
  synth?.triggerAttackRelease(pitch, duration);
};
