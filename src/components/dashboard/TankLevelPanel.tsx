import { useSimulationStore } from '../../store/simulationStore';
import { formatLevel, getLevelColor } from '../../utils/formatters';
import { CONSTANTS, LEVEL_COLORS } from '../../simulation/constants';

export default function TankLevelPanel() {
  const { result, currentTimeIndex } = useSimulationStore();
  const snapshot = result?.timeline[currentTimeIndex];

  if (!snapshot) return null;

  const dgTanks = Object.entries(snapshot.tanks).filter(([id]) => id.startsWith('DG'));
  const dmTanks = Object.entries(snapshot.tanks).filter(([id]) => id.startsWith('DMT'));

  const getCompactTankDisplay = (
    id: string,
    level: number,
    status: string | undefined,
    isDG: boolean
  ) => {
    const minLevel = isDG ? CONSTANTS.DG_MIN_LEVEL_M : CONSTANTS.DM_MIN_LEVEL_M;
    const maxLevel = isDG ? CONSTANTS.DG_OVERFLOW_LEVEL_M : CONSTANTS.DM_OVERFLOW_LEVEL_M;
    const warnLow = isDG ? CONSTANTS.DG_WARNING_LOW_LEVEL_M : CONSTANTS.DM_WARNING_LOW_LEVEL_M;
    const warnHigh = isDG ? CONSTANTS.DG_WARNING_HIGH_LEVEL_M : CONSTANTS.DM_WARNING_HIGH_LEVEL_M;
    const height = isDG ? CONSTANTS.DG_HEIGHT_M : CONSTANTS.DM_HEIGHT_M;

    const levelColor = getLevelColor(level, minLevel, maxLevel, warnLow, warnHigh);
    const fillPercent = Math.min(100, Math.max(0, (level / height) * 100));
    const letter = id.replace('DG-', '').replace('DMT-', '');

    return (
      <div key={id} className="flex flex-col items-center">
        {/* Mini Tank Visual */}
        <div className="relative w-8 h-12 border border-slate-300 rounded-b bg-slate-100 overflow-hidden">
          <div
            className="absolute bottom-0 left-0 right-0 transition-all duration-300"
            style={{
              height: `${fillPercent}%`,
              backgroundColor: LEVEL_COLORS[levelColor],
              opacity: 0.8,
            }}
          />
          {/* Min line */}
          <div
            className="absolute left-0 right-0 border-t border-dashed border-danger-400"
            style={{ bottom: `${(minLevel / height) * 100}%` }}
          />
        </div>
        {/* Label */}
        <span className="text-[10px] font-medium text-slate-600 mt-1">{letter}</span>
        {/* Level */}
        <span
          className="text-xs font-bold tabular-nums"
          style={{ color: LEVEL_COLORS[levelColor] }}
        >
          {level.toFixed(1)}
        </span>
        {/* Status badge for DM */}
        {status && (
          <span className={`text-[8px] px-1 rounded ${
            status === 'SERVICE' ? 'bg-success-100 text-success-700' : 'bg-slate-200 text-slate-500'
          }`}>
            {status === 'SERVICE' ? 'S' : 'B'}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="card">
      <div className="card-header py-2">Tank Levels (m)</div>
      <div className="card-body p-3">
        <div className="flex gap-4">
          {/* DG Section */}
          <div className="flex-shrink-0">
            <div className="text-[10px] font-semibold text-slate-500 text-center mb-2 pb-1 border-b border-slate-200">
              DG (Degasser)
            </div>
            <div className="flex gap-3 justify-center">
              {dgTanks.map(([id, tank]) =>
                getCompactTankDisplay(id, tank.level, undefined, true)
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px bg-slate-200 self-stretch" />

          {/* DM Section */}
          <div className="flex-1">
            <div className="text-[10px] font-semibold text-slate-500 text-center mb-2 pb-1 border-b border-slate-200">
              DM Storage
            </div>
            <div className="flex gap-2 justify-center">
              {dmTanks.map(([id, tank]) =>
                getCompactTankDisplay(id, tank.level, tank.status, false)
              )}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-3 pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between items-center bg-slate-50 rounded px-2 py-1">
            <span className="text-slate-500">Avg DG:</span>
            <span className="font-semibold text-slate-700">
              {formatLevel(dgTanks.reduce((sum, [, t]) => sum + t.level, 0) / dgTanks.length)}
            </span>
          </div>
          <div className="flex justify-between items-center bg-slate-50 rounded px-2 py-1">
            <span className="text-slate-500">DM in SVC:</span>
            <span className="font-semibold text-slate-700">
              {formatLevel(
                dmTanks.filter(([, t]) => t.status === 'SERVICE')
                  .reduce((sum, [, t]) => sum + t.level, 0) /
                Math.max(1, dmTanks.filter(([, t]) => t.status === 'SERVICE').length)
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
