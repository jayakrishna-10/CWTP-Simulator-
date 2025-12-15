import { useSimulationStore } from '../../store/simulationStore';
import { getLoadColor } from '../../utils/formatters';
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

  const getStatusBadge = (status: EquipmentStatus) => {
    const colors = STATUS_COLORS[status];
    const label = status === 'SERVICE' ? 'SVC' :
                  status === 'STANDBY' ? 'STB' :
                  status === 'EXHAUST' ? 'EXH' :
                  status === 'REGENERATION' ? 'RGN' : 'MNT';
    return (
      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="card">
      <div className="card-header py-2">Exchanger Loads</div>
      <div className="card-body p-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {exchangerTypes.map((type) => {
            const exchangers = getExchangers(type);
            const config = result!.config.exchangers[type];
            const typeLabel = type === 'SAC' ? 'Cation' : type === 'SBA' ? 'Anion' : 'Mixed Bed';
            const inService = exchangers.filter(([, e]) => e.status === 'SERVICE').length;

            return (
              <div key={type} className="bg-slate-50 rounded-lg p-2">
                {/* Header */}
                <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700 text-sm">{type}</span>
                    <span className="text-[10px] text-slate-500">({typeLabel})</span>
                  </div>
                  <span className="text-xs text-slate-500">{inService} in SVC</span>
                </div>

                {/* Compact Table */}
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500">
                      <th className="text-left font-medium pb-1 w-12">Unit</th>
                      <th className="text-center font-medium pb-1 w-14">Status</th>
                      <th className="text-right font-medium pb-1">Load</th>
                      <th className="text-right font-medium pb-1 w-14">OBR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exchangers.map(([id, exchanger], index) => {
                      const obrLimit = config[index].obrLimit;
                      const loadColor = getLoadColor(exchanger.loadPercentage);
                      const letter = id.split('-')[1];

                      return (
                        <tr key={id} className="border-t border-slate-100">
                          <td className="py-1 font-medium text-slate-700">{letter}</td>
                          <td className="py-1 text-center">
                            {getStatusBadge(exchanger.status as EquipmentStatus)}
                          </td>
                          <td className="py-1 text-right">
                            <span
                              className="font-bold tabular-nums"
                              style={{ color: loadColor }}
                            >
                              {Math.round(exchanger.load)}
                            </span>
                          </td>
                          <td className="py-1 text-right text-slate-500 tabular-nums">
                            {obrLimit}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
