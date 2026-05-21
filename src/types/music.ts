export interface Note {
  pitch: string; // e.g., "C4"
  step: number;  // 0 to 127 for the full 16-bar loop
  duration: number; // e.g., 1 (8th note)
}

export interface HistoryEntry {
  id: string;
  notes: Note[]; // 8-bar phrase (steps 0 to 63)
  timestamp: number;
}

// C Dorian from C3 to C5
export const DIATONIC_PITCHES = [
  "C5", "Bb4", "A4", "G4", "F4", "Eb4", "D4", "C4",
  "Bb3", "A3", "G3", "F3", "Eb3", "D3", "C3"
];
