import { useSimulationStore } from '../../store/simulationStore';
import { formatShiftTime12h, getShiftTimeRange } from '../../utils/formatters';
import { ClipboardList, Clock, ArrowUpCircle, ArrowDownCircle, RefreshCw, Droplets, AlertTriangle } from 'lucide-react';
import { LogsheetActionType } from '../../simulation/types';

export default function LogsheetPanel() {
  const { result, currentTimeIndex } = useSimulationStore();

  if (!result) return null;

  // Get logsheet entries up to current time
  const visibleEntries = result.logsheet
    .filter((entry) => entry.timestamp <= currentTimeIndex)
    .slice()
    .reverse();

  const getActionIcon = (action: LogsheetActionType) => {
    switch (action) {
      case 'EXCHANGER_TO_SERVICE':
        return <ArrowUpCircle className="w-3.5 h-3.5 text-success-500" />;
      case 'EXCHANGER_TO_STANDBY':
        return <ArrowDownCircle className="w-3.5 h-3.5 text-warning-500" />;
      case 'REGENERATION_STARTED':
        return <RefreshCw className="w-3.5 h-3.5 text-primary-500" />;
      case 'REGENERATION_COMPLETED':
        return <RefreshCw className="w-3.5 h-3.5 text-success-500" />;
      case 'TRANSFER_STARTED':
        return <Droplets className="w-3.5 h-3.5 text-primary-500" />;
      case 'TRANSFER_STOPPED':
        return <Droplets className="w-3.5 h-3.5 text-slate-500" />;
      case 'STREAM_SHUTDOWN':
        return <AlertTriangle className="w-3.5 h-3.5 text-danger-500" />;
      case 'STREAM_RESTORED':
        return <ArrowUpCircle className="w-3.5 h-3.5 text-success-500" />;
      default:
        return <ClipboardList className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getActionBgColor = (action: LogsheetActionType) => {
    switch (action) {
      case 'EXCHANGER_TO_SERVICE':
        return 'bg-success-50 border-l-success-500';
      case 'EXCHANGER_TO_STANDBY':
        return 'bg-warning-50 border-l-warning-500';
      case 'REGENERATION_STARTED':
        return 'bg-primary-50 border-l-primary-500';
      case 'REGENERATION_COMPLETED':
        return 'bg-success-50 border-l-success-500';
      case 'TRANSFER_STARTED':
        return 'bg-primary-50 border-l-primary-500';
      case 'TRANSFER_STOPPED':
        return 'bg-slate-50 border-l-slate-400';
      case 'STREAM_SHUTDOWN':
        return 'bg-danger-50 border-l-danger-500';
      case 'STREAM_RESTORED':
        return 'bg-success-50 border-l-success-500';
      default:
        return 'bg-slate-50 border-l-slate-400';
    }
  };

  return (
    <div className="card h-full flex flex-col">
      <div className="card-header py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4" />
          <span>Operator Logsheet</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <Clock className="w-3 h-3" />
          <span>{result.shiftInfo.name}</span>
          <span className="text-slate-400">|</span>
          <span>{getShiftTimeRange(result.shiftInfo.type)}</span>
        </div>
      </div>

      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-500">
            {visibleEntries.length} action{visibleEntries.length !== 1 ? 's' : ''} recorded
          </span>
          <span className="text-slate-500">
            Total this shift: {result.logsheet.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[320px] scrollbar-thin">
        {visibleEntries.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-xs">
            <ClipboardList className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p>No automated actions recorded yet</p>
            <p className="text-[10px] text-slate-400 mt-1">
              Actions will appear here as the simulation runs
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleEntries.map((entry, index) => (
              <div
                key={`${entry.timestamp}-${entry.equipmentId}-${index}`}
                className={`p-3 border-l-2 ${getActionBgColor(entry.action)}`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    {getActionIcon(entry.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-semibold text-slate-700">
                        {entry.operatorAction}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-600 leading-relaxed mb-1.5">
                      {entry.reason}
                    </p>
                    <div className="flex items-center gap-3 text-[9px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {entry.actualTime} ({formatShiftTime12h(entry.timestamp, result.shiftInfo.type)})
                      </span>
                      {entry.dgLevel !== undefined && (
                        <span>DG: {entry.dgLevel.toFixed(2)}m</span>
                      )}
                      {entry.dmLevel !== undefined && (
                        <span>DM: {entry.dmLevel.toFixed(2)}m</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
