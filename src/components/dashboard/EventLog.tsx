import { useSimulationStore } from '../../store/simulationStore';
import { formatTimeWithSeconds } from '../../utils/formatters';
import { AlertCircle, AlertTriangle, Info, ChevronRight } from 'lucide-react';

export default function EventLog() {
  const { result, currentTimeIndex, setTimeIndex } = useSimulationStore();

  if (!result) return null;

  // Get events up to current time, most recent first
  const visibleEvents = result.allEvents
    .filter((e) => e.timestamp <= currentTimeIndex)
    .reverse()
    .slice(0, 20);

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-danger-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-warning-500" />;
      default:
        return <Info className="w-4 h-4 text-primary-500" />;
    }
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'border-l-danger-500 bg-danger-50';
      case 'warning':
        return 'border-l-warning-500 bg-warning-50';
      default:
        return 'border-l-primary-500 bg-slate-50';
    }
  };

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <span>Event Log</span>
        <span className="text-xs text-slate-500">
          {result.allEvents.filter((e) => e.timestamp <= currentTimeIndex).length} events
        </span>
      </div>
      <div className="max-h-64 overflow-y-auto scrollbar-thin">
        {visibleEvents.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-sm">
            No events yet
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleEvents.map((event, index) => (
              <button
                key={`${event.timestamp}-${event.equipmentId}-${index}`}
                onClick={() => setTimeIndex(event.timestamp)}
                className={`w-full flex items-start gap-3 p-3 text-left border-l-4 hover:bg-opacity-80 transition-colors ${getSeverityClass(event.severity)}`}
              >
                <div className="flex-shrink-0 mt-0.5">{getIcon(event.severity)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 leading-tight">{event.message}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatTimeWithSeconds(event.timestamp)}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
