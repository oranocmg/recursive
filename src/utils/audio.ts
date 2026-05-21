import * as Tone from 'tone';
import type { Note } from '../types/music';
import { useScoreStore } from '../store/useScoreStore';

const synth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'triangle' },
  envelope: { attack: 0.02, decay: 0.1, sustain: 0.1, release: 0.1 }
}).toDestination();
synth.volume.value = -6;

const metronomeSynth = new Tone.Synth({
  oscillator: { type: 'square' },
  envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
}).toDestination();
metronomeSynth.volume.value = -12;

let isAudioInitialized = false;
let currentPart: Tone.Part | null = null;
let playheadEventId: number | null = null;
let metronomeEventId: number | null = null;

export const initAudio = async () => {
  if (!isAudioInitialized) {
    await Tone.start();
    Tone.Transport.bpm.value = 120;
    isAudioInitialized = true;
  }
};

export const playScore = async (previousResponse: Note[], currentResponse: Note[]) => {
  await initAudio();
  stopAudio();

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

  const events = notesToPlay.map(note => {
    const durBeats = note.duration * 0.5;
    return {
      time: `0:0:${note.step * 2}`,
      pitch: note.pitch,
      duration: `${durBeats} * 4n`,
    };
  });

  currentPart = new Tone.Part((time, value) => {
    synth.triggerAttackRelease(value.pitch, value.duration, time);
  }, events).start(0);

  metronomeEventId = Tone.Transport.scheduleRepeat((time) => {
    if (!useScoreStore.getState().metronomeEnabled) return;
    const ticksPerBeat = Tone.Transport.PPQ;
    const beat = Math.floor(Tone.Transport.ticks / ticksPerBeat) % 4;
    if (beat === 0) {
      metronomeSynth.triggerAttackRelease("C6", "32n", time, 1);
    } else {
      metronomeSynth.triggerAttackRelease("C5", "32n", time, 0.5);
    }
  }, "4n");

  playheadEventId = Tone.Transport.scheduleRepeat((time) => {
    Tone.Draw.schedule(() => {
      const ticksPerStep = Tone.Transport.PPQ / 2;
      const step = Math.floor(Tone.Transport.ticks / ticksPerStep);
      
      const setPlayhead = useScoreStore.getState().setPlayheadStep;
      setPlayhead(step);
      
      if (step >= endStep) {
        stopAudio();
      }
    }, time);
  }, '32n');

  if (startStep > 0) {
    Tone.Transport.position = `0:0:${startStep * 2}`;
  } else {
    Tone.Transport.position = 0;
  }

  Tone.Transport.start();
  useScoreStore.getState().setIsPlaying(true);
};

export const stopAudio = () => {
  if (currentPart) {
    currentPart.dispose();
    currentPart = null;
  }
  if (playheadEventId !== null) {
    Tone.Transport.clear(playheadEventId);
    playheadEventId = null;
  }
  if (metronomeEventId !== null) {
    Tone.Transport.clear(metronomeEventId);
    metronomeEventId = null;
  }
  Tone.Transport.stop();
  Tone.Transport.position = 0;
  useScoreStore.getState().setPlayheadStep(0);
  useScoreStore.getState().setIsPlaying(false);
};

export const playHistoryItem = async (notes: Note[]) => {
  await initAudio();
  stopAudio();

  const events = notes.map(note => {
    const durBeats = note.duration * 0.5;
    return {
      time: `0:0:${note.step * 2}`,
      pitch: note.pitch,
      duration: `${durBeats} * 4n`,
    };
  });

  currentPart = new Tone.Part((time, value) => {
    synth.triggerAttackRelease(value.pitch, value.duration, time);
  }, events).start(0);

  Tone.Transport.scheduleOnce((time) => {
    Tone.Transport.stop(time);
    useScoreStore.getState().setIsPlaying(false);
  }, "+8m");

  Tone.Transport.position = 0;
  Tone.Transport.start();
  useScoreStore.getState().setIsPlaying(true);
};

export const playAuditionNote = async (pitch: string, durationInSteps: number) => {
  await initAudio();
  const durBeats = durationInSteps * 0.5;
  synth.triggerAttackRelease(pitch, `${durBeats} * 4n`);
};
