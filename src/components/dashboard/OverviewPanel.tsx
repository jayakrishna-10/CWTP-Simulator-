import { useSimulationStore } from '../../store/simulationStore';
import { formatFlowRate, formatLevel } from '../../utils/formatters';
import { CONSTANTS } from '../../simulation/constants';
import { ArrowRight, ArrowDown } from 'lucide-react';

export default function OverviewPanel() {
  const { result, currentTimeIndex } = useSimulationStore();
  const snapshot = result?.timeline[currentTimeIndex];

  if (!snapshot) return null;

  // Calculate stats
  const sacInService = Object.entries(snapshot.exchangers)
    .filter(([id, e]) => id.startsWith('SAC') && e.status === 'SERVICE').length;
  const sbaInService = Object.entries(snapshot.exchangers)
    .filter(([id, e]) => id.startsWith('SBA') && e.status === 'SERVICE').length;
  const mbInService = Object.entries(snapshot.exchangers)
    .filter(([id, e]) => id.startsWith('MB') && e.status === 'SERVICE').length;

  const dgLevel = snapshot.tanks['DG-A'].level;
  const dmServiceTanks = Object.entries(snapshot.tanks)
    .filter(([id, t]) => id.startsWith('DMT') && t.status === 'SERVICE');
  const avgDMLevel = dmServiceTanks.length > 0
    ? dmServiceTanks.reduce((sum, [, t]) => sum + t.level, 0) / dmServiceTanks.length
    : 0;

  const activeRegens = snapshot.regeneration.active;

  const getStatusColor = (count: number, isLevel: boolean = false, level?: number) => {
    if (isLevel && level !== undefined) {
      const min = CONSTANTS.DG_MIN_LEVEL_M;
      return level >= min ? 'text-success-600' : 'text-danger-600';
    }
    return count > 0 ? 'text-success-600' : 'text-slate-400';
  };

  return (
    <div className="card h-full">
      <div className="card-header py-2">Process Flow</div>
      <div className="card-body p-2 space-y-2">
        {/* Compact Process Flow */}
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="flex flex-col items-center gap-1 text-xs">
            {/* SAC -> DG */}
            <div className="flex items-center gap-2 w-full justify-center">
              <div className="text-center">
                <div className={`font-bold ${getStatusColor(sacInService)}`}>SAC</div>
                <div className="text-[10px] text-slate-500">{sacInService}/5</div>
              </div>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <div className="text-center">
                <div className={`font-bold ${getStatusColor(0, true, dgLevel)}`}>DG</div>
                <div className="text-[10px] text-slate-500">{formatLevel(dgLevel)}</div>
              </div>
            </div>

            <ArrowDown className="w-3 h-3 text-slate-400" />

            {/* SBA -> MB -> DM */}
            <div className="flex items-center gap-2 w-full justify-center">
              <div className="text-center">
                <div className={`font-bold ${getStatusColor(sbaInService)}`}>SBA</div>
                <div className="text-[10px] text-slate-500">{sbaInService}/5</div>
              </div>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <div className="text-center">
                <div className={`font-bold ${getStatusColor(mbInService)}`}>MB</div>
                <div className="text-[10px] text-slate-500">{mbInService}/5</div>
              </div>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <div className="text-center">
                <div className={`font-bold ${getStatusColor(0, true, avgDMLevel)}`}>DM</div>
                <div className="text-[10px] text-slate-500">{formatLevel(avgDMLevel)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Flow Rates - Compact Grid */}
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div className="bg-slate-50 rounded p-1.5">
            <p className="text-[10px] text-slate-500">Production</p>
            <p className="font-semibold text-slate-700">
              {formatFlowRate(snapshot.flows.mbTotalOutput)}
            </p>
          </div>
          <div className="bg-slate-50 rounded p-1.5">
            <p className="text-[10px] text-slate-500">Demand</p>
            <p className="font-semibold text-slate-700">
              {formatFlowRate(snapshot.flows.totalSupply)}
            </p>
          </div>
          <div className="bg-slate-50 rounded p-1.5">
            <p className="text-[10px] text-slate-500">DG Net</p>
            <p className={`font-semibold ${
              snapshot.flows.dgNetFlow >= 0 ? 'text-success-600' : 'text-danger-600'
            }`}>
              {snapshot.flows.dgNetFlow >= 0 ? '+' : ''}{formatFlowRate(snapshot.flows.dgNetFlow)}
            </p>
          </div>
          <div className="bg-slate-50 rounded p-1.5">
            <p className="text-[10px] text-slate-500">DM Net</p>
            <p className={`font-semibold ${
              snapshot.flows.dmNetFlow >= 0 ? 'text-success-600' : 'text-danger-600'
            }`}>
              {snapshot.flows.dmNetFlow >= 0 ? '+' : ''}{formatFlowRate(snapshot.flows.dmNetFlow)}
            </p>
          </div>
        </div>

        {/* Active Regenerations - Compact */}
        {activeRegens.length > 0 && (
          <div className="bg-warning-50 border border-warning-200 rounded p-1.5">
            <p className="text-[10px] font-medium text-warning-600 mb-1">Regenerating</p>
            <div className="flex flex-wrap gap-1">
              {activeRegens.map((id) => (
                <span key={id} className="text-[10px] px-1.5 py-0.5 bg-warning-100 text-warning-700 rounded">
                  {id}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
