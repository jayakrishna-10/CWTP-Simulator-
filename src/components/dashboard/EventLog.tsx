import { useSimulationStore } from '../../store/simulationStore';
import { formatTimeWithSeconds } from '../../utils/formatters';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

export default function EventLog() {
  const { result, currentTimeIndex, setTimeIndex } = useSimulationStore();

  if (!result) return null;

  // Get events up to current time, most recent first
  const visibleEvents = result.allEvents
    .filter((e) => e.timestamp <= currentTimeIndex)
    .reverse()
    .slice(0, 15);

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="w-3 h-3 text-danger-500" />;
      case 'warning':
        return <AlertTriangle className="w-3 h-3 text-warning-500" />;
      default:
        return <Info className="w-3 h-3 text-primary-500" />;
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
    <div className="card h-full flex flex-col">
      <div className="card-header py-2 flex items-center justify-between">
        <span>Events</span>
        <span className="text-[10px] text-slate-500">
          {result.allEvents.filter((e) => e.timestamp <= currentTimeIndex).length} total
        </span>
      </div>
      <div className="flex-1 overflow-y-auto max-h-[240px] scrollbar-thin">
        {visibleEvents.length === 0 ? (
          <div className="p-3 text-center text-slate-500 text-xs">
            No events yet
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleEvents.map((event, index) => (
              <button
                key={`${event.timestamp}-${event.equipmentId}-${index}`}
                onClick={() => setTimeIndex(event.timestamp)}
                className={`w-full flex items-start gap-2 p-2 text-left border-l-2 hover:bg-opacity-80 transition-colors ${getSeverityClass(event.severity)}`}
              >
                <div className="flex-shrink-0 mt-0.5">{getIcon(event.severity)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-slate-700 leading-tight line-clamp-2">{event.message}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {formatTimeWithSeconds(event.timestamp)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
