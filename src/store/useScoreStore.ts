import { create } from 'zustand';
import type { Note, HistoryEntry } from '../types/music';

// A simple C Dorian phrase for the starter
const defaultStarterPhrase: Note[] = [
  { pitch: 'C4', step: 0, duration: 1 },
  { pitch: 'Eb4', step: 2, duration: 1 },
  { pitch: 'G4', step: 4, duration: 1 },
  { pitch: 'F4', step: 6, duration: 1 },
  { pitch: 'C4', step: 8, duration: 1 },
  { pitch: 'C4', step: 10, duration: 1 },
  { pitch: 'Eb4', step: 12, duration: 1 },
  { pitch: 'D4', step: 14, duration: 1 },
  { pitch: 'G3', step: 16, duration: 1 },
  { pitch: 'Bb3', step: 18, duration: 1 },
  { pitch: 'C4', step: 20, duration: 1 },
  { pitch: 'C4', step: 24, duration: 1 },
  { pitch: 'G4', step: 32, duration: 1 },
  { pitch: 'F4', step: 34, duration: 1 },
  { pitch: 'Eb4', step: 36, duration: 1 },
  { pitch: 'D4', step: 38, duration: 1 },
  { pitch: 'C4', step: 40, duration: 1 },
  { pitch: 'C4', step: 48, duration: 1 },
];

interface ScoreState {
  previousResponse: Note[]; // bars 1-8 (steps 0-63)
  currentResponse: Note[];  // bars 9-16 (steps 64-127)
  conversationHistory: HistoryEntry[];
  isPlaying: boolean;
  playheadStep: number;
  // Settings
  noteLength: number;
  playbackMode: 'previous' | 'response' | 'full';
  metronomeEnabled: boolean;
  auditionEnabled: boolean;
  
  // Actions
  toggleNote: (step: number, pitch: string) => boolean;
  clearResponse: () => void;
  submitResponse: () => void;
  resetLoop: () => void;
  loadState: () => void;
  setIsPlaying: (playing: boolean) => void;
  setPlayheadStep: (step: number) => void;
  setNoteLength: (length: number) => void;
  setPlaybackMode: (mode: 'previous' | 'response' | 'full') => void;
  setMetronomeEnabled: (enabled: boolean) => void;
  setAuditionEnabled: (enabled: boolean) => void;
}

export const useScoreStore = create<ScoreState>((set, get) => ({
  previousResponse: defaultStarterPhrase,
  currentResponse: [],
  conversationHistory: [],
  isPlaying: false,
  playheadStep: 0,
  noteLength: 1,
  playbackMode: 'full',
  metronomeEnabled: false,
  auditionEnabled: true,
  
  toggleNote: (step: number, pitch: string) => {
    let wasAdded = false;
    if (step < 64 || step > 127) return false;

    set((state) => {
      const exists = state.currentResponse.some(n => n.step === step && n.pitch === pitch);
      if (exists) {
        return { currentResponse: state.currentResponse.filter(n => !(n.step === step && n.pitch === pitch)) };
      } else {
        wasAdded = true;
        const maxDuration = 128 - step;
        const duration = Math.min(state.noteLength, maxDuration);
        return { currentResponse: [...state.currentResponse, { pitch, step, duration }] };
      }
    });
    
    return wasAdded;
  },
  
  clearResponse: () => set({ currentResponse: [] }),
  
  submitResponse: () => {
    const { currentResponse, conversationHistory } = get();
    
    // Shift currentResponse down by 64 steps
    const newPreviousResponse = currentResponse.map(n => ({
      ...n,
      step: n.step - 64
    }));

    const newHistoryEntry: HistoryEntry = {
      id: crypto.randomUUID(),
      notes: newPreviousResponse,
      timestamp: Date.now()
    };
    
    const newHistory = [...conversationHistory, newHistoryEntry];
    
    localStorage.setItem('recursive-score-latest', JSON.stringify(newPreviousResponse));
    localStorage.setItem('recursive-score-history', JSON.stringify(newHistory));
    
    set({
      previousResponse: newPreviousResponse,
      currentResponse: [],
      conversationHistory: newHistory,
    });
  },

  resetLoop: () => {
    localStorage.removeItem('recursive-score-latest');
    localStorage.removeItem('recursive-score-history');
    set({
      previousResponse: defaultStarterPhrase,
      currentResponse: [],
      conversationHistory: []
    });
  },
  
  loadState: () => {
    try {
      const latestData = localStorage.getItem('recursive-score-latest');
      const historyData = localStorage.getItem('recursive-score-history');
      
      let newPreviousResponse = defaultStarterPhrase;
      let newHistory: HistoryEntry[] = [];

      if (latestData) {
        newPreviousResponse = JSON.parse(latestData);
      }
      if (historyData) {
        newHistory = JSON.parse(historyData);
      }

      set({ 
        previousResponse: newPreviousResponse,
        conversationHistory: newHistory
      });
    } catch (e) {
      console.error("Failed to load recursive score state", e);
    }
  },

  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlayheadStep: (step) => set({ playheadStep: step }),
  setNoteLength: (length) => set({ noteLength: length }),
  setPlaybackMode: (mode) => set({ playbackMode: mode }),
  setMetronomeEnabled: (enabled) => set({ metronomeEnabled: enabled }),
  setAuditionEnabled: (enabled) => set({ auditionEnabled: enabled }),
}));
