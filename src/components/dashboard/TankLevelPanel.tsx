import { useSimulationStore } from '../../store/simulationStore';
import { formatLevel, formatPercentage, getLevelColor } from '../../utils/formatters';
import { CONSTANTS, LEVEL_COLORS } from '../../simulation/constants';

export default function TankLevelPanel() {
  const { result, currentTimeIndex } = useSimulationStore();
  const snapshot = result?.timeline[currentTimeIndex];

  if (!snapshot) return null;

  const dgTanks = Object.entries(snapshot.tanks).filter(([id]) => id.startsWith('DG'));
  const dmTanks = Object.entries(snapshot.tanks).filter(([id]) => id.startsWith('DMT'));

  return (
    <div className="card">
      <div className="card-header">Tank Levels</div>
      <div className="card-body space-y-6">
        {/* DG Tanks */}
        <div>
          <h4 className="text-sm font-medium text-slate-600 mb-3">Degasser Tanks</h4>
          <div className="grid grid-cols-2 gap-4">
            {dgTanks.map(([id, tank]) => {
              const levelColor = getLevelColor(
                tank.level,
                CONSTANTS.DG_MIN_LEVEL_M,
                CONSTANTS.DG_OVERFLOW_LEVEL_M,
                CONSTANTS.DG_WARNING_LOW_LEVEL_M,
                CONSTANTS.DG_WARNING_HIGH_LEVEL_M
              );
              const fillPercent = Math.min(100, Math.max(0, (tank.level / CONSTANTS.DG_HEIGHT_M) * 100));

              return (
                <div key={id} className="flex items-end gap-3">
                  {/* Tank Visual */}
                  <div className="relative w-16 h-24 border-2 border-slate-300 rounded-b-lg overflow-hidden bg-slate-100">
                    {/* Water Fill */}
                    <div
                      className="absolute bottom-0 left-0 right-0 transition-all duration-500"
                      style={{
                        height: `${fillPercent}%`,
                        backgroundColor: LEVEL_COLORS[levelColor],
                        opacity: 0.7,
                      }}
                    />
                    {/* Min/Max Lines */}
                    <div
                      className="absolute left-0 right-0 border-t border-dashed border-danger-400"
                      style={{ bottom: `${(CONSTANTS.DG_MIN_LEVEL_M / CONSTANTS.DG_HEIGHT_M) * 100}%` }}
                    />
                    <div
                      className="absolute left-0 right-0 border-t border-dashed border-warning-400"
                      style={{ bottom: `${(CONSTANTS.DG_OVERFLOW_LEVEL_M / CONSTANTS.DG_HEIGHT_M) * 100}%` }}
                    />
                  </div>
                  {/* Tank Info */}
                  <div className="flex-1">
                    <p className="font-medium text-slate-700">{id}</p>
                    <p className="text-2xl font-bold" style={{ color: LEVEL_COLORS[levelColor] }}>
                      {formatLevel(tank.level)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatPercentage(tank.levelPercentage)} capacity
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* DM Tanks */}
        <div>
          <h4 className="text-sm font-medium text-slate-600 mb-3">DM Storage Tanks</h4>
          <div className="space-y-3">
            {dmTanks.map(([id, tank]) => {
              const levelColor = getLevelColor(
                tank.level,
                CONSTANTS.DM_MIN_LEVEL_M,
                CONSTANTS.DM_OVERFLOW_LEVEL_M,
                CONSTANTS.DM_WARNING_LOW_LEVEL_M,
                CONSTANTS.DM_WARNING_HIGH_LEVEL_M
              );
              const fillPercent = Math.min(100, Math.max(0, (tank.level / CONSTANTS.DM_HEIGHT_M) * 100));

              return (
                <div key={id} className="flex items-center gap-3">
                  {/* Tank ID */}
                  <div className="w-16 flex-shrink-0">
                    <span className="font-medium text-slate-700">{id.replace('DMT-', '')}</span>
                    <span
                      className={`ml-2 badge ${
                        tank.status === 'SERVICE' ? 'badge-success' : 'badge-neutral'
                      }`}
                    >
                      {tank.status === 'SERVICE' ? 'SVC' : 'STB'}
                    </span>
                  </div>

                  {/* Bar */}
                  <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden relative">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                      style={{
                        width: `${fillPercent}%`,
                        backgroundColor: LEVEL_COLORS[levelColor],
                      }}
                    />
                    {/* Min Line */}
                    <div
                      className="absolute inset-y-0 w-0.5 bg-danger-400"
                      style={{ left: `${(CONSTANTS.DM_MIN_LEVEL_M / CONSTANTS.DM_HEIGHT_M) * 100}%` }}
                    />
                    {/* Max Line */}
                    <div
                      className="absolute inset-y-0 w-0.5 bg-warning-400"
                      style={{ left: `${(CONSTANTS.DM_OVERFLOW_LEVEL_M / CONSTANTS.DM_HEIGHT_M) * 100}%` }}
                    />
                  </div>

                  {/* Level */}
                  <div className="w-20 text-right">
                    <span
                      className="font-semibold"
                      style={{ color: LEVEL_COLORS[levelColor] }}
                    >
                      {formatLevel(tank.level)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
