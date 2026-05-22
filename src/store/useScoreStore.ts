import { create } from 'zustand';
import type { Note, HistoryEntry } from '../types/music';
import { supabase } from '../lib/supabase';

let isSubscribed = false;

// A simple C Dorian phrase for the starter
const defaultStarterPhrase: Note[] = [
  { pitch: 'C4', step: 0, durationSteps: 1 },
  { pitch: 'Eb4', step: 2, durationSteps: 1 },
  { pitch: 'G4', step: 4, durationSteps: 1 },
  { pitch: 'F4', step: 6, durationSteps: 1 },
  { pitch: 'C4', step: 8, durationSteps: 1 },
  { pitch: 'C4', step: 10, durationSteps: 1 },
  { pitch: 'Eb4', step: 12, durationSteps: 1 },
  { pitch: 'D4', step: 14, durationSteps: 1 },
  { pitch: 'G3', step: 16, durationSteps: 1 },
  { pitch: 'Bb3', step: 18, durationSteps: 1 },
  { pitch: 'C4', step: 20, durationSteps: 1 },
  { pitch: 'C4', step: 24, durationSteps: 1 },
  { pitch: 'G4', step: 32, durationSteps: 1 },
  { pitch: 'F4', step: 34, durationSteps: 1 },
  { pitch: 'Eb4', step: 36, durationSteps: 1 },
  { pitch: 'D4', step: 38, durationSteps: 1 },
  { pitch: 'C4', step: 40, durationSteps: 1 },
  { pitch: 'C4', step: 48, durationSteps: 1 },
];

interface ScoreState {
  previousResponse: Note[]; // bars 1-8 (steps 0-63)
  currentResponse: Note[];  // bars 9-16 (steps 64-127)
  conversationHistory: HistoryEntry[];
  isPlaying: boolean;
  playheadStep: number;
  playingHistoryIndex: number | null;
  overridePreviousResponse: Note[] | null;
  // Settings
  noteLength: number;
  playbackMode: 'previous' | 'response' | 'full';
  metronomeEnabled: boolean;
  auditionEnabled: boolean;
  autoScrollEnabled: boolean;
  
  // Actions
  toggleNote: (step: number, pitch: string) => boolean;
  clearResponse: () => void;
  submitResponse: () => Promise<void>;
  resetLoop: () => void;
  loadState: () => Promise<void>;
  setIsPlaying: (playing: boolean) => void;
  setPlayheadStep: (step: number) => void;
  setPlayingHistoryIndex: (index: number | null) => void;
  setOverridePreviousResponse: (notes: Note[] | null) => void;
  setNoteLength: (length: number) => void;
  setPlaybackMode: (mode: 'previous' | 'response' | 'full') => void;
  setMetronomeEnabled: (enabled: boolean) => void;
  setAuditionEnabled: (enabled: boolean) => void;
  setAutoScrollEnabled: (enabled: boolean) => void;
  updateNoteDuration: (step: number, pitch: string, newDuration: number) => void;
  updateNoteStep: (oldStep: number, pitch: string, newStep: number) => void;
}

const normalizeNote = (n: any, isResponse: boolean): Note => {
  let step = Number(n.step) || 0;
  const minStep = isResponse ? 64 : 0;
  const maxStep = isResponse ? 127 : 63;
  if (step < minStep) step = minStep;
  if (step > maxStep) step = maxStep;

  let dur = Math.floor(Number(n.durationSteps ?? n.duration) || 1);
  if (dur < 1) dur = 1;
  if (step + dur > maxStep + 1) {
    dur = (maxStep + 1) - step;
  }

  return {
    pitch: String(n.pitch || "C4"),
    step,
    durationSteps: dur
  };
};

export const useScoreStore = create<ScoreState>((set, get) => ({
  previousResponse: defaultStarterPhrase,
  currentResponse: [],
  conversationHistory: [],
  isPlaying: false,
  playheadStep: 0,
  playingHistoryIndex: null,
  overridePreviousResponse: null,
  noteLength: 1,
  playbackMode: 'full',
  metronomeEnabled: false,
  auditionEnabled: true,
  autoScrollEnabled: true,
  
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
        const durationSteps = Math.min(state.noteLength, maxDuration);
        return { currentResponse: [...state.currentResponse, { pitch, step, durationSteps }] };
      }
    });
    
    return wasAdded;
  },

  updateNoteDuration: (step: number, pitch: string, newDuration: number) => {
    set((state) => {
      const target = state.currentResponse.find(n => n.step === step && n.pitch === pitch);
      if (target && target.durationSteps === Math.max(0.1, newDuration)) return state;
      return {
        currentResponse: state.currentResponse.map(n => 
          (n.step === step && n.pitch === pitch) ? { ...n, durationSteps: Math.max(0.1, newDuration) } : n
        )
      };
    });
  },

  updateNoteStep: (oldStep: number, pitch: string, newStep: number) => {
    set((state) => {
      if (oldStep === newStep) return state;
      const target = state.currentResponse.find(n => n.step === oldStep && n.pitch === pitch);
      if (!target) return state;
      return {
        currentResponse: state.currentResponse.map(n => 
          (n.step === oldStep && n.pitch === pitch) ? { ...n, step: newStep } : n
        )
      };
    });
  },
  
  clearResponse: () => set({ currentResponse: [] }),
  
  submitResponse: async () => {
    const { currentResponse, conversationHistory } = get();
    
    const newPreviousResponse = currentResponse.map(n => ({
      ...n,
      step: n.step - 64
    }));

    try {
      const { error } = await supabase
        .from('submissions')
        .insert({ notes: newPreviousResponse });
        
      if (error) throw error;
      
      // State will be updated by the realtime subscription,
      // but we can manually clear the current response right away
      set({
        currentResponse: [],
      });
      // Optionally refetch explicitly just in case realtime is slow
      await get().loadState();
    } catch (e) {
      console.error("Supabase insert failed, falling back to localStorage", e);
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
    }
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
  
  loadState: async () => {
    if (!isSubscribed) {
      isSubscribed = true;
      supabase
        .channel('public:submissions')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'submissions' }, () => {
          get().loadState();
        })
        .subscribe();
    }

    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const newHistory: HistoryEntry[] = data.map((row: any) => ({
          id: row.id,
          notes: Array.isArray(row.notes) ? row.notes.map((n: any) => normalizeNote(n, false)) : [],
          timestamp: new Date(row.created_at).getTime()
        }));
        
        const latestEntry = newHistory[newHistory.length - 1];
        set({
          previousResponse: latestEntry.notes,
          conversationHistory: newHistory
        });
      } else {
        set({
          previousResponse: defaultStarterPhrase,
          conversationHistory: []
        });
      }
    } catch (e) {
      console.error("Failed to load recursive score state from Supabase", e);
      // Fallback to localStorage
      const latestData = localStorage.getItem('recursive-score-latest');
      const historyData = localStorage.getItem('recursive-score-history');
      
      let newPreviousResponse = defaultStarterPhrase;
      let newHistory: HistoryEntry[] = [];

      if (latestData) {
        const parsed = JSON.parse(latestData);
        if (Array.isArray(parsed)) {
          newPreviousResponse = parsed.map(n => normalizeNote(n, false));
        }
      }
      if (historyData) {
        const parsed = JSON.parse(historyData);
        if (Array.isArray(parsed)) {
          newHistory = parsed.map(h => ({
            ...h,
            notes: Array.isArray(h.notes) ? h.notes.map((n: any) => normalizeNote(n, false)) : []
          }));
        }
      }

      set({ 
        previousResponse: newPreviousResponse,
        conversationHistory: newHistory
      });
    }
  },

  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlayheadStep: (step) => set({ playheadStep: step }),
  setPlayingHistoryIndex: (index) => set({ playingHistoryIndex: index }),
  setOverridePreviousResponse: (notes) => set({ overridePreviousResponse: notes }),
  setNoteLength: (length) => set({ noteLength: length }),
  setPlaybackMode: (mode) => set({ playbackMode: mode }),
  setMetronomeEnabled: (enabled) => set({ metronomeEnabled: enabled }),
  setAuditionEnabled: (enabled) => set({ auditionEnabled: enabled }),
  setAutoScrollEnabled: (enabled) => set({ autoScrollEnabled: enabled }),
}));
