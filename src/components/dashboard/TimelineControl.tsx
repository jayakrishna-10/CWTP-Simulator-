import { useSimulationStore } from '../../store/simulationStore';
import { formatTimeWithSeconds } from '../../utils/formatters';
import { CONSTANTS } from '../../simulation/constants';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
} from 'lucide-react';

const SPEED_OPTIONS = [10, 25, 50, 100];

export default function TimelineControl() {
  const {
    result,
    currentTimeIndex,
    isPlaying,
    playbackSpeed,
    setTimeIndex,
    togglePlayback,
    setPlaybackSpeed,
    stepForward,
    stepBackward,
    jumpToStart,
    jumpToEnd,
  } = useSimulationStore();

  if (!result) return null;

  const totalFrames = result.timeline.length - 1;
  const currentTime = result.timeline[currentTimeIndex].timestamp;
  const progress = (currentTimeIndex / totalFrames) * 100;

  // Get recent event for mobile display
  const recentEvent = result.allEvents
    .filter((e) => e.timestamp <= currentTimeIndex)
    .slice(-1)[0];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 space-y-3">
        {/* Timeline Slider */}
        <div className="space-y-2">
          <div className="relative">
            <input
              type="range"
              min={0}
              max={totalFrames}
              value={currentTimeIndex}
              onChange={(e) => setTimeIndex(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
              style={{
                background: `linear-gradient(to right, #2563eb ${progress}%, #e2e8f0 ${progress}%)`,
              }}
            />
            {/* Event markers */}
            <div className="absolute top-0 left-0 right-0 h-2 pointer-events-none">
              {result.allEvents
                .filter((e) => e.severity === 'warning' || e.severity === 'error')
                .map((event, i) => (
                  <div
                    key={i}
                    className={`absolute w-1 h-2 rounded ${
                      event.severity === 'error' ? 'bg-danger-500' : 'bg-warning-500'
                    }`}
                    style={{
                      left: `${(event.timestamp / CONSTANTS.SIMULATION_DURATION_MINUTES) * 100}%`,
                    }}
                  />
                ))}
            </div>
          </div>

          {/* Time Labels */}
          <div className="flex justify-between text-xs text-slate-500">
            <span>00:00</span>
            <span className="font-mono font-semibold text-primary-600">
              {formatTimeWithSeconds(currentTime)}
            </span>
            <span>08:00</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          {/* Playback Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={jumpToStart}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Jump to start"
            >
              <Rewind className="w-5 h-5" />
            </button>
            <button
              onClick={stepBackward}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Step backward"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              onClick={togglePlayback}
              className="p-3 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors shadow-md"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-0.5" />
              )}
            </button>
            <button
              onClick={stepForward}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Step forward"
            >
              <SkipForward className="w-5 h-5" />
            </button>
            <button
              onClick={jumpToEnd}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Jump to end"
            >
              <FastForward className="w-5 h-5" />
            </button>
          </div>

          {/* Speed Control */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden sm:inline">Speed:</span>
            <div className="flex gap-1">
              {SPEED_OPTIONS.map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    playbackSpeed === speed
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Event (Mobile) */}
        {recentEvent && (
          <div className="md:hidden text-xs text-center truncate">
            <span
              className={`inline-block px-2 py-1 rounded ${
                recentEvent.severity === 'error'
                  ? 'bg-danger-100 text-danger-600'
                  : recentEvent.severity === 'warning'
                  ? 'bg-warning-100 text-warning-600'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {formatTimeWithSeconds(recentEvent.timestamp)} - {recentEvent.message}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
