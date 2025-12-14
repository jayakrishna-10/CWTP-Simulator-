import { useSimulationStore } from '../../store/simulationStore';
import { formatVolume, formatPercentage, getLoadColor } from '../../utils/formatters';
import { STATUS_COLORS } from '../../simulation/constants';
import { EquipmentStatus } from '../../simulation/types';

export default function ExchangerLoadPanel() {
  const { result, currentTimeIndex } = useSimulationStore();
  const snapshot = result?.timeline[currentTimeIndex];

  if (!snapshot) return null;

  const exchangerTypes = ['SAC', 'SBA', 'MB'] as const;

  const getExchangers = (type: string) =>
    Object.entries(snapshot.exchangers)
      .filter(([id]) => id.startsWith(type))
      .sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="card">
      <div className="card-header">Exchanger Loads</div>
      <div className="card-body space-y-6">
        {exchangerTypes.map((type) => {
          const exchangers = getExchangers(type);
          const config = result!.config.exchangers[type];

          return (
            <div key={type}>
              <h4 className="text-sm font-medium text-slate-600 mb-3">{type} Exchangers</h4>
              <div className="space-y-2">
                {exchangers.map(([id, exchanger], index) => {
                  const obrLimit = config[index].obrLimit;
                  const loadPercent = Math.min(100, exchanger.loadPercentage);
                  const loadColor = getLoadColor(exchanger.loadPercentage);
                  const statusColors = STATUS_COLORS[exchanger.status as EquipmentStatus];

                  return (
                    <div key={id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-700 w-14">{id}</span>
                          <span className={`badge ${statusColors.bg} ${statusColors.text}`}>
                            {exchanger.status === 'SERVICE'
                              ? 'SVC'
                              : exchanger.status === 'STANDBY'
                              ? 'STB'
                              : exchanger.status === 'REGENERATION'
                              ? 'RGN'
                              : 'MNT'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold" style={{ color: loadColor }}>
                            {formatPercentage(exchanger.loadPercentage)}
                          </span>
                          <span className="text-xs text-slate-500 ml-2">
                            ({formatVolume(exchanger.load)}/{formatVolume(obrLimit)})
                          </span>
                        </div>
                      </div>

                      {/* Load Bar */}
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${loadPercent}%`,
                            backgroundColor: loadColor,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
