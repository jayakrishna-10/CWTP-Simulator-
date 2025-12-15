import { useSimulationStore } from '../../store/simulationStore';
import { formatTimeWithSeconds } from '../../utils/formatters';
import { Droplets, RotateCcw, Clock } from 'lucide-react';

export default function Header() {
  const { reset, result, currentTimeIndex } = useSimulationStore();

  const currentTime = result?.timeline[currentTimeIndex]?.timestamp ?? 0;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-2 py-2">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-slate-800">WTP Simulator</h1>
              <p className="text-[10px] text-slate-500">8-Hour Shift</p>
            </div>
          </div>

          {/* Current Time Display */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono text-base font-semibold text-slate-700">
              {formatTimeWithSeconds(currentTime)}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={reset}
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 text-xs"
              title="Reset & Configure"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Configure</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
