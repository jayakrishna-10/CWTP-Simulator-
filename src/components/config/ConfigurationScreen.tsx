import { useState } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { CONSTANTS } from '../../simulation/constants';
import { createScenarioConfig } from '../../simulation/defaults';
import {
  Droplets,
  Play,
  Settings,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Zap,
  FlaskConical,
  Waves,
} from 'lucide-react';

export default function ConfigurationScreen() {
  const { config, updateConfig, resetConfig, runSimulation, isSimulating } =
    useSimulationStore();

  const [expandedSections, setExpandedSections] = useState({
    exchangers: true,
    tanks: true,
    supply: true,
  });

  const [activeExchangerTab, setActiveExchangerTab] = useState<'SAC' | 'SBA' | 'MB'>('SAC');

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const loadScenario = (scenario: 'normal' | 'immediate-regen' | 'low-dg' | 'cascade' | 'transfer') => {
    const newConfig = createScenarioConfig(scenario);
    useSimulationStore.setState({ config: newConfig });
  };

  const handleExchangerChange = (
    type: 'SAC' | 'SBA' | 'MB',
    index: number,
    field: string,
    value: string | number
  ) => {
    updateConfig((cfg) => {
      const newConfig = { ...cfg };
      newConfig.exchangers = { ...cfg.exchangers };
      newConfig.exchangers[type] = [...cfg.exchangers[type]];
      newConfig.exchangers[type][index] = {
        ...cfg.exchangers[type][index],
        [field]: value,
      };
      return newConfig;
    });
  };

  const handleDMTankChange = (index: number, field: string, value: string | number) => {
    updateConfig((cfg) => {
      const newConfig = { ...cfg };
      newConfig.tanks = { ...cfg.tanks };
      newConfig.tanks.DM = [...cfg.tanks.DM];
      newConfig.tanks.DM[index] = {
        ...cfg.tanks.DM[index],
        [field]: value,
      };
      return newConfig;
    });
  };

  const handleDGTankChange = (index: number, level: number) => {
    updateConfig((cfg) => {
      const newConfig = { ...cfg };
      newConfig.tanks = { ...cfg.tanks };
      newConfig.tanks.DG = cfg.tanks.DG.map((t, i) =>
        i === index ? { ...t, initialLevel: level } : t
      );
      return newConfig;
    });
  };

  const handleSupplyChange = (field: 'TPP' | 'CDCP' | 'Mills', value: number) => {
    updateConfig((cfg) => ({
      ...cfg,
      supply: { ...cfg.supply, [field]: value },
    }));
  };

  // Validation
  const validateConfig = () => {
    const errors: string[] = [];

    // Check at least 2 exchangers in service or standby per type
    for (const type of ['SAC', 'SBA', 'MB'] as const) {
      const available = config.exchangers[type].filter(
        (e) => e.initialStatus !== 'MAINTENANCE'
      ).length;
      if (available < 2) {
        errors.push(`At least 2 ${type} exchangers must be available`);
      }
    }

    // Check exactly 2 DM tanks in service
    const dmInService = config.tanks.DM.filter((t) => t.initialStatus === 'SERVICE').length;
    if (dmInService !== 2) {
      errors.push('Exactly 2 DM tanks must be in service');
    }

    // Check initial loads less than OBR
    for (const type of ['SAC', 'SBA', 'MB'] as const) {
      for (const e of config.exchangers[type]) {
        if (e.initialLoad >= e.obrLimit) {
          errors.push(`${e.id} initial load must be less than OBR`);
        }
      }
    }

    return errors;
  };

  const errors = validateConfig();

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
                <Droplets className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">WTP Simulator</h1>
                <p className="text-xs text-slate-500">Water Treatment Plant</p>
              </div>
            </div>
            <button
              onClick={resetConfig}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Scenarios */}
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Quick Scenarios
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'normal', label: 'Normal Operation' },
                { id: 'immediate-regen', label: 'Immediate Regen' },
                { id: 'low-dg', label: 'Low DG Level' },
                { id: 'cascade', label: 'Cascade Regen' },
                { id: 'transfer', label: 'DM Transfer' },
              ].map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => loadScenario(scenario.id as any)}
                  className="btn btn-secondary btn-sm"
                >
                  {scenario.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Exchangers Configuration */}
        <div className="card">
          <button
            onClick={() => toggleSection('exchangers')}
            className="card-header w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4" />
              Exchangers Configuration
            </div>
            {expandedSections.exchangers ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {expandedSections.exchangers && (
            <div className="p-4 space-y-4">
              {/* Exchanger Type Tabs */}
              <div className="flex gap-2 border-b border-slate-200 pb-2">
                {(['SAC', 'SBA', 'MB'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveExchangerTab(type)}
                    className={`tab ${
                      activeExchangerTab === type ? 'tab-active' : 'tab-inactive'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Exchanger Table */}
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b">
                      <th className="pb-2 font-medium">Unit</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Load (m³)</th>
                      <th className="pb-2 font-medium">OBR (m³)</th>
                      <th className="pb-2 font-medium">Flow (m³/hr)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {config.exchangers[activeExchangerTab].map((exchanger, index) => (
                      <tr key={exchanger.id}>
                        <td className="py-3 font-medium">{exchanger.id}</td>
                        <td className="py-3">
                          <select
                            value={exchanger.initialStatus}
                            onChange={(e) =>
                              handleExchangerChange(
                                activeExchangerTab,
                                index,
                                'initialStatus',
                                e.target.value
                              )
                            }
                            className="select text-sm py-1"
                          >
                            <option value="SERVICE">Service</option>
                            <option value="STANDBY">Standby</option>
                            <option value="MAINTENANCE">Maintenance</option>
                          </select>
                        </td>
                        <td className="py-3">
                          <input
                            type="number"
                            value={exchanger.initialLoad}
                            onChange={(e) =>
                              handleExchangerChange(
                                activeExchangerTab,
                                index,
                                'initialLoad',
                                Number(e.target.value)
                              )
                            }
                            min={0}
                            max={exchanger.obrLimit - 1}
                            className="input text-sm py-1 w-24"
                          />
                        </td>
                        <td className="py-3">
                          <input
                            type="number"
                            value={exchanger.obrLimit}
                            onChange={(e) =>
                              handleExchangerChange(
                                activeExchangerTab,
                                index,
                                'obrLimit',
                                Number(e.target.value)
                              )
                            }
                            min={100}
                            className="input text-sm py-1 w-24"
                          />
                        </td>
                        <td className="py-3">
                          <input
                            type="number"
                            value={exchanger.flowRate}
                            onChange={(e) =>
                              handleExchangerChange(
                                activeExchangerTab,
                                index,
                                'flowRate',
                                Number(e.target.value)
                              )
                            }
                            min={CONSTANTS.EXCHANGER_FLOW_MIN}
                            max={CONSTANTS.EXCHANGER_FLOW_MAX}
                            className="input text-sm py-1 w-24"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Tanks Configuration */}
        <div className="card">
          <button
            onClick={() => toggleSection('tanks')}
            className="card-header w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Waves className="w-4 h-4" />
              Tanks Configuration
            </div>
            {expandedSections.tanks ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {expandedSections.tanks && (
            <div className="p-4 space-y-6">
              {/* DG Tanks */}
              <div>
                <h4 className="font-medium text-slate-700 mb-3">
                  DG Tanks (Degasser)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {config.tanks.DG.map((tank, index) => (
                    <div key={tank.id} className="space-y-2">
                      <label className="label">{tank.id} Level (m)</label>
                      <input
                        type="number"
                        value={tank.initialLevel}
                        onChange={(e) =>
                          handleDGTankChange(index, Number(e.target.value))
                        }
                        min={CONSTANTS.DG_MIN_LEVEL_M}
                        max={CONSTANTS.DG_OVERFLOW_LEVEL_M}
                        step={0.1}
                        className="input"
                      />
                      <p className="text-xs text-slate-500">
                        Range: {CONSTANTS.DG_MIN_LEVEL_M} - {CONSTANTS.DG_OVERFLOW_LEVEL_M}m
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* DM Tanks */}
              <div>
                <h4 className="font-medium text-slate-700 mb-3">
                  DM Storage Tanks
                </h4>
                <div className="overflow-x-auto -mx-4 px-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 border-b">
                        <th className="pb-2 font-medium">Tank</th>
                        <th className="pb-2 font-medium">Level (m)</th>
                        <th className="pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {config.tanks.DM.map((tank, index) => (
                        <tr key={tank.id}>
                          <td className="py-3 font-medium">{tank.id}</td>
                          <td className="py-3">
                            <input
                              type="number"
                              value={tank.initialLevel}
                              onChange={(e) =>
                                handleDMTankChange(
                                  index,
                                  'initialLevel',
                                  Number(e.target.value)
                                )
                              }
                              min={CONSTANTS.DM_MIN_LEVEL_M}
                              max={CONSTANTS.DM_OVERFLOW_LEVEL_M}
                              step={0.1}
                              className="input text-sm py-1 w-24"
                            />
                          </td>
                          <td className="py-3">
                            <select
                              value={tank.initialStatus}
                              onChange={(e) =>
                                handleDMTankChange(index, 'initialStatus', e.target.value)
                              }
                              className="select text-sm py-1"
                            >
                              <option value="SERVICE">Service</option>
                              <option value="STANDBY">Standby</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Note: Exactly 2 tanks must be in service
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Supply Configuration */}
        <div className="card">
          <button
            onClick={() => toggleSection('supply')}
            className="card-header w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Supply Configuration
            </div>
            {expandedSections.supply ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {expandedSections.supply && (
            <div className="p-4 space-y-4">
              {/* TPP */}
              <div>
                <label className="label">
                  TPP (Thermal Power Plant) - {config.supply.TPP} m³/hr
                </label>
                <input
                  type="range"
                  value={config.supply.TPP}
                  onChange={(e) => handleSupplyChange('TPP', Number(e.target.value))}
                  min={CONSTANTS.TPP_FLOW_MIN}
                  max={CONSTANTS.TPP_FLOW_MAX}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>{CONSTANTS.TPP_FLOW_MIN}</span>
                  <span>{CONSTANTS.TPP_FLOW_MAX}</span>
                </div>
              </div>

              {/* CDCP */}
              <div>
                <label className="label">CDCP - {config.supply.CDCP} m³/hr</label>
                <input
                  type="range"
                  value={config.supply.CDCP}
                  onChange={(e) => handleSupplyChange('CDCP', Number(e.target.value))}
                  min={CONSTANTS.CDCP_FLOW_MIN}
                  max={CONSTANTS.CDCP_FLOW_MAX}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>{CONSTANTS.CDCP_FLOW_MIN}</span>
                  <span>{CONSTANTS.CDCP_FLOW_MAX}</span>
                </div>
              </div>

              {/* Mills */}
              <div>
                <label className="label">Mills - {config.supply.Mills} m³/hr</label>
                <input
                  type="range"
                  value={config.supply.Mills}
                  onChange={(e) => handleSupplyChange('Mills', Number(e.target.value))}
                  min={CONSTANTS.MILLS_FLOW_MIN}
                  max={CONSTANTS.MILLS_FLOW_MAX}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>{CONSTANTS.MILLS_FLOW_MIN}</span>
                  <span>{CONSTANTS.MILLS_FLOW_MAX}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <p className="text-sm text-slate-600">
                  <strong>Total Supply Demand:</strong>{' '}
                  {config.supply.TPP + config.supply.CDCP + config.supply.Mills} m³/hr
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Validation Errors */}
        {errors.length > 0 && (
          <div className="bg-danger-50 border border-danger-200 rounded-lg p-4">
            <h4 className="font-medium text-danger-600 mb-2">Configuration Errors</h4>
            <ul className="text-sm text-danger-600 space-y-1">
              {errors.map((error, i) => (
                <li key={i}>• {error}</li>
              ))}
            </ul>
          </div>
        )}
      </main>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 md:relative md:border-0 md:bg-transparent md:p-0">
        <div className="max-w-7xl mx-auto md:px-4 md:pb-8">
          <button
            onClick={runSimulation}
            disabled={errors.length > 0 || isSimulating}
            className="btn btn-primary w-full py-4 text-lg gap-2"
          >
            {isSimulating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Start Simulation
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
