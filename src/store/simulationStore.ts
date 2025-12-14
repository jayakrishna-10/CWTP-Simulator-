import { create } from 'zustand';
import {
  SimulationConfig,
  SimulationResult,
  TimelineSnapshot,
  SimulationEvent,
} from '../simulation/types';
import { runSimulation } from '../simulation/engine';
import { createDefaultConfig } from '../simulation/defaults';
import { CONSTANTS } from '../simulation/constants';

interface SimulationStore {
  // App state
  screen: 'config' | 'simulation';
  setScreen: (screen: 'config' | 'simulation') => void;

  // Configuration
  config: SimulationConfig;
  setConfig: (config: SimulationConfig) => void;
  updateConfig: (updater: (config: SimulationConfig) => SimulationConfig) => void;
  resetConfig: () => void;

  // Simulation Results
  result: SimulationResult | null;
  isSimulating: boolean;
  runSimulation: () => void;

  // Playback
  currentTimeIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  setTimeIndex: (index: number) => void;
  togglePlayback: () => void;
  setPlaybackSpeed: (speed: number) => void;
  stepForward: () => void;
  stepBackward: () => void;
  jumpToStart: () => void;
  jumpToEnd: () => void;

  // Derived data
  currentSnapshot: TimelineSnapshot | null;
  visibleEvents: SimulationEvent[];

  // UI State
  activeTab: 'overview' | 'tanks' | 'loads' | 'trends';
  setActiveTab: (tab: 'overview' | 'tanks' | 'loads' | 'trends') => void;
  selectedTrendType: 'dg' | 'dm' | 'sac' | 'sba' | 'mb' | 'flows';
  setSelectedTrendType: (type: 'dg' | 'dm' | 'sac' | 'sba' | 'mb' | 'flows') => void;

  // Reset
  reset: () => void;
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  // App state
  screen: 'config',
  setScreen: (screen) => set({ screen }),

  // Configuration
  config: createDefaultConfig(),
  setConfig: (config) => set({ config }),
  updateConfig: (updater) => set((state) => ({ config: updater(state.config) })),
  resetConfig: () => set({ config: createDefaultConfig() }),

  // Simulation Results
  result: null,
  isSimulating: false,
  runSimulation: () => {
    set({ isSimulating: true });
    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const { config } = get();
      const result = runSimulation(config);
      set({
        result,
        isSimulating: false,
        currentTimeIndex: 0,
        screen: 'simulation',
        isPlaying: false,
      });
    }, 50);
  },

  // Playback
  currentTimeIndex: 0,
  isPlaying: false,
  playbackSpeed: CONSTANTS.DEFAULT_PLAYBACK_SPEED,
  setTimeIndex: (index) => {
    const { result } = get();
    if (!result) return;
    const clampedIndex = Math.max(0, Math.min(result.timeline.length - 1, index));
    set({ currentTimeIndex: clampedIndex });
  },
  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  stepForward: () => {
    const { currentTimeIndex, result } = get();
    if (!result) return;
    set({ currentTimeIndex: Math.min(currentTimeIndex + 1, result.timeline.length - 1) });
  },
  stepBackward: () => {
    const { currentTimeIndex } = get();
    set({ currentTimeIndex: Math.max(0, currentTimeIndex - 1) });
  },
  jumpToStart: () => set({ currentTimeIndex: 0, isPlaying: false }),
  jumpToEnd: () => {
    const { result } = get();
    if (!result) return;
    set({ currentTimeIndex: result.timeline.length - 1, isPlaying: false });
  },

  // Derived data (computed on access)
  get currentSnapshot() {
    const { result, currentTimeIndex } = get();
    if (!result) return null;
    return result.timeline[currentTimeIndex];
  },
  get visibleEvents() {
    const { result, currentTimeIndex } = get();
    if (!result) return [];
    // Get events up to current time, most recent first
    return result.allEvents
      .filter((e) => e.timestamp <= currentTimeIndex)
      .reverse()
      .slice(0, 50);
  },

  // UI State
  activeTab: 'overview',
  setActiveTab: (tab) => set({ activeTab: tab }),
  selectedTrendType: 'dg',
  setSelectedTrendType: (type) => set({ selectedTrendType: type }),

  // Reset
  reset: () =>
    set({
      screen: 'config',
      config: createDefaultConfig(),
      result: null,
      currentTimeIndex: 0,
      isPlaying: false,
      playbackSpeed: CONSTANTS.DEFAULT_PLAYBACK_SPEED,
      activeTab: 'overview',
      selectedTrendType: 'dg',
    }),
}));
