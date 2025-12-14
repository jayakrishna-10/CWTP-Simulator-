import { useSimulationStore } from '../../store/simulationStore';
import { formatFlowRate, formatLevel } from '../../utils/formatters';
import { CONSTANTS } from '../../simulation/constants';
import { ArrowRight, Droplets, FlaskConical, Waves } from 'lucide-react';

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

  return (
    <div className="card">
      <div className="card-header">Process Overview</div>
      <div className="card-body space-y-4">
        {/* Process Flow Diagram */}
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
            {/* SAC */}
            <div className="flex flex-col items-center min-w-[60px]">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                sacInService > 0 ? 'bg-success-100' : 'bg-slate-200'
              }`}>
                <FlaskConical className={`w-6 h-6 ${
                  sacInService > 0 ? 'text-success-600' : 'text-slate-400'
                }`} />
              </div>
              <span className="text-xs font-medium mt-1">SAC</span>
              <span className="text-xs text-slate-500">{sacInService}/5</span>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />

            {/* DG */}
            <div className="flex flex-col items-center min-w-[60px]">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                dgLevel >= CONSTANTS.DG_MIN_LEVEL_M ? 'bg-blue-100' : 'bg-danger-100'
              }`}>
                <Waves className={`w-6 h-6 ${
                  dgLevel >= CONSTANTS.DG_MIN_LEVEL_M ? 'text-blue-600' : 'text-danger-600'
                }`} />
              </div>
              <span className="text-xs font-medium mt-1">DG</span>
              <span className="text-xs text-slate-500">{formatLevel(dgLevel)}</span>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />

            {/* SBA */}
            <div className="flex flex-col items-center min-w-[60px]">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                sbaInService > 0 ? 'bg-success-100' : 'bg-slate-200'
              }`}>
                <FlaskConical className={`w-6 h-6 ${
                  sbaInService > 0 ? 'text-success-600' : 'text-slate-400'
                }`} />
              </div>
              <span className="text-xs font-medium mt-1">SBA</span>
              <span className="text-xs text-slate-500">{sbaInService}/5</span>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />

            {/* MB */}
            <div className="flex flex-col items-center min-w-[60px]">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                mbInService > 0 ? 'bg-success-100' : 'bg-slate-200'
              }`}>
                <FlaskConical className={`w-6 h-6 ${
                  mbInService > 0 ? 'text-success-600' : 'text-slate-400'
                }`} />
              </div>
              <span className="text-xs font-medium mt-1">MB</span>
              <span className="text-xs text-slate-500">{mbInService}/5</span>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />

            {/* DM */}
            <div className="flex flex-col items-center min-w-[60px]">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                avgDMLevel >= CONSTANTS.DM_MIN_LEVEL_M ? 'bg-blue-100' : 'bg-danger-100'
              }`}>
                <Droplets className={`w-6 h-6 ${
                  avgDMLevel >= CONSTANTS.DM_MIN_LEVEL_M ? 'text-blue-600' : 'text-danger-600'
                }`} />
              </div>
              <span className="text-xs font-medium mt-1">DM</span>
              <span className="text-xs text-slate-500">{formatLevel(avgDMLevel)}</span>
            </div>
          </div>
        </div>

        {/* Flow Rates Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500">Production</p>
            <p className="text-lg font-semibold text-slate-700">
              {formatFlowRate(snapshot.flows.mbTotalOutput)}
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500">Supply Demand</p>
            <p className="text-lg font-semibold text-slate-700">
              {formatFlowRate(snapshot.flows.totalSupply)}
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500">DG Net Flow</p>
            <p className={`text-lg font-semibold ${
              snapshot.flows.dgNetFlow >= 0 ? 'text-success-600' : 'text-danger-600'
            }`}>
              {snapshot.flows.dgNetFlow >= 0 ? '+' : ''}{formatFlowRate(snapshot.flows.dgNetFlow)}
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500">DM Net Flow</p>
            <p className={`text-lg font-semibold ${
              snapshot.flows.dmNetFlow >= 0 ? 'text-success-600' : 'text-danger-600'
            }`}>
              {snapshot.flows.dmNetFlow >= 0 ? '+' : ''}{formatFlowRate(snapshot.flows.dmNetFlow)}
            </p>
          </div>
        </div>

        {/* Active Regenerations */}
        {activeRegens.length > 0 && (
          <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
            <p className="text-xs font-medium text-warning-600 mb-2">Active Regenerations</p>
            <div className="flex flex-wrap gap-2">
              {activeRegens.map((id) => (
                <span key={id} className="badge badge-warning">
                  {id} - {snapshot.regeneration.phases[id]}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
