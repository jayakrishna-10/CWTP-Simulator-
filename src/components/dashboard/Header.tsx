import { useSimulationStore } from '../../store/simulationStore';
import { formatTimeWithSeconds } from '../../utils/formatters';
import { Droplets, RotateCcw, Clock } from 'lucide-react';

export default function Header() {
  const { reset, result, currentTimeIndex } = useSimulationStore();

  const currentTime = result?.timeline[currentTimeIndex]?.timestamp ?? 0;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
              <Droplets className="w-6 h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-slate-800">WTP Simulator</h1>
              <p className="text-xs text-slate-500">8-Hour Shift Simulation</p>
            </div>
          </div>

          {/* Current Time Display */}
          <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-lg">
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="font-mono text-lg font-semibold text-slate-700">
              {formatTimeWithSeconds(currentTime)}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={reset}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Reset & Configure"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
