import { useSimulationStore } from '../../store/simulationStore';
import { STATUS_COLORS } from '../../simulation/constants';
import { Clock, Timer, AlertCircle } from 'lucide-react';

export default function RegenerationPanel() {
  const { result, currentTimeIndex } = useSimulationStore();
  const snapshot = result?.timeline[currentTimeIndex];
  const shiftInfo = result?.shiftInfo;

  if (!snapshot) return null;

  const activeRegens = snapshot.regeneration.active;
  const queuedRegens = snapshot.regeneration.queue;
  const regenDetails = snapshot.regeneration.details;

  // Format time from minutes into shift to actual clock time
  const formatTime = (minutes: number) => {
    if (!shiftInfo) return `${minutes}m`;
    const totalMinutes = shiftInfo.startHour * 60 + minutes;
    const hours = Math.floor(totalMinutes / 60) % 24;
    const mins = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Format duration in minutes to hours:minutes
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Get phase color
  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'CHEMICAL':
        return 'bg-amber-100 text-amber-700';
      case 'RINSE':
        return 'bg-blue-100 text-blue-700';
      case 'COMPLETE':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  // Get exchanger type from ID (e.g., "SAC-A" -> "SAC")
  const getExchangerType = (id: string) => {
    return id.split('-')[0];
  };

  const hasContent = activeRegens.length > 0 || queuedRegens.length > 0;

  return (
    <div className="card">
      <div className="card-header py-2 flex items-center gap-2">
        <Timer className="w-4 h-4" />
        Regeneration Status
      </div>
      <div className="card-body p-2">
        {!hasContent ? (
          <div className="text-center text-slate-500 py-4 text-sm">
            No active or queued regenerations
          </div>
        ) : (
          <div className="space-y-3">
            {/* Active Regenerations */}
            {activeRegens.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                  <span className="w-2 h-2 bg-warning-500 rounded-full animate-pulse"></span>
                  Active Regenerations
                </h4>
                <div className="space-y-2">
                  {activeRegens.map((id) => {
                    const detail = regenDetails[id];
                    if (!detail) return null;

                    const progressPercent = (detail.elapsedMinutes / detail.totalDuration) * 100;

                    return (
                      <div key={id} className="bg-slate-50 rounded-lg p-2">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-700">{id}</span>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${getPhaseColor(detail.phase)}`}>
                              {detail.phase}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">
                            {getExchangerType(id)}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                          <div
                            className="bg-warning-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(progressPercent, 100)}%` }}
                          />
                        </div>

                        {/* Time Details */}
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-[10px] text-slate-500">Started</p>
                            <p className="font-medium text-slate-700 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(detail.startTime)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500">Elapsed</p>
                            <p className="font-medium text-slate-700">
                              {formatDuration(detail.elapsedMinutes)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500">Remaining</p>
                            <p className="font-medium text-warning-600">
                              {formatDuration(detail.remainingMinutes)}
                            </p>
                          </div>
                        </div>

                        {/* Phase Transition Info */}
                        {detail.phase === 'CHEMICAL' && (
                          <div className="mt-2 pt-2 border-t border-slate-200 text-xs">
                            <p className="text-slate-500">
                              Chemical ends at {formatTime(detail.chemicalEndTime)}
                              <span className="text-slate-400"> ({formatDuration(detail.chemicalEndTime - snapshot.timestamp)} remaining)</span>
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Exhaust Queue */}
            {queuedRegens.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-orange-500" />
                  Exhaust Queue (Waiting for Regeneration)
                </h4>
                <div className="flex flex-wrap gap-1">
                  {queuedRegens.map((id, index) => (
                    <div
                      key={id}
                      className="flex items-center gap-1 px-2 py-1 bg-orange-50 border border-orange-200 rounded text-xs"
                    >
                      <span className="text-orange-600 font-medium">{index + 1}.</span>
                      <span className="font-semibold text-orange-700">{id}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS.EXHAUST.bg} ${STATUS_COLORS.EXHAUST.text}`}>
                        EXH
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-slate-500">
                  These exchangers are exhausted and waiting for a regeneration slot to become available.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
