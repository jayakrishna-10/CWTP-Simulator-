import { useEffect, useRef } from 'react';
import { useSimulationStore } from './store/simulationStore';
import ConfigurationScreen from './components/config/ConfigurationScreen';
import Dashboard from './components/dashboard/Dashboard';

function App() {
  const { screen, isPlaying, playbackSpeed, result, setTimeIndex } =
    useSimulationStore();

  const playbackRef = useRef<number | null>(null);

  // Playback loop
  useEffect(() => {
    if (isPlaying && result) {
      const intervalMs = (60 * 1000) / playbackSpeed; // Time per simulation minute
      playbackRef.current = window.setInterval(() => {
        const { currentTimeIndex, result } = useSimulationStore.getState();
        if (currentTimeIndex < result!.timeline.length - 1) {
          setTimeIndex(currentTimeIndex + 1);
        } else {
          useSimulationStore.setState({ isPlaying: false });
        }
      }, intervalMs);
    }

    return () => {
      if (playbackRef.current) {
        clearInterval(playbackRef.current);
        playbackRef.current = null;
      }
    };
  }, [isPlaying, playbackSpeed, result, setTimeIndex]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {screen === 'config' ? <ConfigurationScreen /> : <Dashboard />}
    </div>
  );
}

export default App;
