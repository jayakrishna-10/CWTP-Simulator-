import { useState } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { CONSTANTS } from '../../simulation/constants';
import { createScenarioConfig } from '../../simulation/defaults';
import { ShiftType } from '../../simulation/types';
import { getShiftTimeRange } from '../../utils/formatters';
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
  Info,
  Clock,
} from 'lucide-react';

export default function ConfigurationScreen() {
  const { config, updateConfig, resetConfig, runSimulation, isSimulating } =
    useSimulationStore();

  const [expandedSections, setExpandedSections] = useState({
    obrLimits: true,
    exchangers: false,
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

  const handleOBRChange = (type: 'SAC' | 'SBA' | 'MB', value: number) => {
    updateConfig((cfg) => {
      const newConfig = { ...cfg };
      newConfig.exchangers = { ...cfg.exchangers };
      newConfig.exchangers[type] = cfg.exchangers[type].map((e) => ({
        ...e,
        obrLimit: value,
      }));
      return newConfig;
    });
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

  const handleShiftChange = (shift: ShiftType) => {
    updateConfig((cfg) => ({
      ...cfg,
      shift,
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

  // Get current OBR values (use first exchanger of each type as reference)
  const sacOBR = config.exchangers.SAC[0].obrLimit;
  const sbaOBR = config.exchangers.SBA[0].obrLimit;
  const mbOBR = config.exchangers.MB[0].obrLimit;

  // Count exchangers in service
  const sacInService = config.exchangers.SAC.filter(e => e.initialStatus === 'SERVICE').length;
  const sbaInService = config.exchangers.SBA.filter(e => e.initialStatus === 'SERVICE').length;
  const mbInService = config.exchangers.MB.filter(e => e.initialStatus === 'SERVICE').length;

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
                <Droplets className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">WTP Simulator</h1>
                <p className="text-xs text-slate-500">Configuration</p>
              </div>
            </div>
            <button
              onClick={resetConfig}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Reset to defaults"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* Shift Selection */}
        <div className="card border-2 border-primary-300">
          <div className="card-header py-2 flex items-center gap-2 bg-primary-50">
            <Clock className="w-4 h-4 text-primary-600" />
            <span className="text-primary-700 font-semibold">Select Shift</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-3">
              {(['A', 'B', 'C'] as ShiftType[]).map((shift) => {
                const isSelected = config.shift === shift;
                return (
                  <button
                    key={shift}
                    onClick={() => handleShiftChange(shift)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`text-lg font-bold ${isSelected ? 'text-primary-700' : 'text-slate-700'}`}>
                      {shift} Shift
                    </div>
                    <div className={`text-xs ${isSelected ? 'text-primary-600' : 'text-slate-500'}`}>
                      {getShiftTimeRange(shift)}
                    </div>
                    <div className={`text-[10px] mt-1 ${isSelected ? 'text-primary-500' : 'text-slate-400'}`}>
                      {shift === 'A' ? 'Morning' : shift === 'B' ? 'Afternoon' : 'Night'}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500 mt-3 text-center">
              Each simulation runs one complete 8-hour shift
            </p>
          </div>
        </div>

        {/* Quick Scenarios */}
        <div className="card">
          <div className="card-header py-2 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Quick Scenarios
          </div>
          <div className="p-3">
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
                  className="btn btn-secondary btn-sm text-xs"
                >
                  {scenario.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* OBR Limits - Primary Configuration */}
        <div className="card border-2 border-primary-200">
          <button
            onClick={() => toggleSection('obrLimits')}
            className="card-header py-2 w-full flex items-center justify-between bg-primary-50"
          >
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-primary-600" />
              <span className="text-primary-700 font-semibold">Expected Load (OBR) Limits</span>
            </div>
            {expandedSections.obrLimits ? (
              <ChevronUp className="w-4 h-4 text-primary-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-primary-600" />
            )}
          </button>

          {expandedSections.obrLimits && (
            <div className="p-4 space-y-4">
              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 flex gap-2">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium mb-1">Set the OBR (Operating Bed Regeneration) limit for each exchanger type:</p>
                  <ul className="list-disc ml-4 space-y-0.5">
                    <li><strong>SAC (Cation):</strong> Default 1500 m³ - Typically run 3 in service</li>
                    <li><strong>SBA (Anion):</strong> Default 1100 m³ - Typically run 3 in service</li>
                    <li><strong>MB (Mixed Bed):</strong> Default 7000 m³ - Typically run 3 in service</li>
                  </ul>
                </div>
              </div>

              {/* OBR Inputs Grid */}
              <div className="grid grid-cols-3 gap-4">
                {/* SAC OBR */}
                <div className="bg-slate-50 rounded-lg p-3">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    SAC (Cation)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={sacOBR}
                      onChange={(e) => handleOBRChange('SAC', Number(e.target.value))}
                      min={500}
                      max={5000}
                      step={100}
                      className="input text-sm py-1.5 w-full"
                    />
                    <span className="text-xs text-slate-500">m³</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{sacInService} in service</p>
                </div>

                {/* SBA OBR */}
                <div className="bg-slate-50 rounded-lg p-3">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    SBA (Anion)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={sbaOBR}
                      onChange={(e) => handleOBRChange('SBA', Number(e.target.value))}
                      min={500}
                      max={5000}
                      step={100}
                      className="input text-sm py-1.5 w-full"
                    />
                    <span className="text-xs text-slate-500">m³</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{sbaInService} in service</p>
                </div>

                {/* MB OBR */}
                <div className="bg-slate-50 rounded-lg p-3">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    MB (Mixed Bed)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={mbOBR}
                      onChange={(e) => handleOBRChange('MB', Number(e.target.value))}
                      min={1000}
                      max={15000}
                      step={500}
                      className="input text-sm py-1.5 w-full"
                    />
                    <span className="text-xs text-slate-500">m³</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{mbInService} in service</p>
                </div>
              </div>

              {/* Operational Guidance */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <p className="font-medium mb-1">Operational Logic:</p>
                <ul className="list-disc ml-4 space-y-0.5 text-amber-700">
                  <li>Low DM tank level → Take another Anion + MB into service</li>
                  <li>Low DG level → Take standby Cation into service (if available)</li>
                  <li>DG still falling after all Cations in service → Consider taking an Anion offline</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Exchangers Configuration */}
        <div className="card">
          <button
            onClick={() => toggleSection('exchangers')}
            className="card-header py-2 w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4" />
              Detailed Exchanger Settings
            </div>
            {expandedSections.exchangers ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {expandedSections.exchangers && (
            <div className="p-3 space-y-3">
              {/* Exchanger Type Tabs */}
              <div className="flex gap-1 border-b border-slate-200 pb-2">
                {(['SAC', 'SBA', 'MB'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveExchangerTab(type)}
                    className={`px-3 py-1 text-xs rounded-t ${
                      activeExchangerTab === type
                        ? 'bg-primary-100 text-primary-700 font-medium'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Exchanger Table */}
              <div className="overflow-x-auto -mx-3 px-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-500 border-b">
                      <th className="pb-2 font-medium">Unit</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Initial Load</th>
                      <th className="pb-2 font-medium">OBR</th>
                      <th className="pb-2 font-medium">Flow Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {config.exchangers[activeExchangerTab].map((exchanger, index) => (
                      <tr key={exchanger.id}>
                        <td className="py-2 font-medium">{exchanger.id}</td>
                        <td className="py-2">
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
                            className="select text-xs py-1"
                          >
                            <option value="SERVICE">Service</option>
                            <option value="STANDBY">Standby</option>
                            <option value="MAINTENANCE">Maintenance</option>
                          </select>
                        </td>
                        <td className="py-2">
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
                            className="input text-xs py-1 w-20"
                          />
                        </td>
                        <td className="py-2">
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
                            className="input text-xs py-1 w-20"
                          />
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-1">
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
                              className="input text-xs py-1 w-16"
                            />
                            <span className="text-slate-400">m³/hr</span>
                          </div>
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
            className="card-header py-2 w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Waves className="w-4 h-4" />
              Tank Levels
            </div>
            {expandedSections.tanks ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {expandedSections.tanks && (
            <div className="p-3 space-y-4">
              {/* DG and DM Tanks in Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* DG Tanks */}
                <div className="bg-slate-50 rounded-lg p-3">
                  <h4 className="font-medium text-slate-700 text-sm mb-2">
                    DG Tanks (Degasser)
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {config.tanks.DG.map((tank, index) => (
                      <div key={tank.id}>
                        <label className="block text-xs text-slate-500 mb-1">{tank.id}</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={tank.initialLevel}
                            onChange={(e) =>
                              handleDGTankChange(index, Number(e.target.value))
                            }
                            min={CONSTANTS.DG_MIN_LEVEL_M}
                            max={CONSTANTS.DG_OVERFLOW_LEVEL_M}
                            step={0.1}
                            className="input text-xs py-1 w-full"
                          />
                          <span className="text-xs text-slate-400">m</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">
                    Range: {CONSTANTS.DG_MIN_LEVEL_M} - {CONSTANTS.DG_OVERFLOW_LEVEL_M}m
                  </p>
                </div>

                {/* DM Tanks */}
                <div className="bg-slate-50 rounded-lg p-3">
                  <h4 className="font-medium text-slate-700 text-sm mb-2">
                    DM Storage Tanks
                  </h4>
                  <div className="space-y-2">
                    {config.tanks.DM.map((tank, index) => (
                      <div key={tank.id} className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-600 w-12">{tank.id.replace('DMT-', '')}</span>
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
                          className="input text-xs py-1 w-16"
                        />
                        <span className="text-[10px] text-slate-400">m</span>
                        <select
                          value={tank.initialStatus}
                          onChange={(e) =>
                            handleDMTankChange(index, 'initialStatus', e.target.value)
                          }
                          className="select text-xs py-1"
                        >
                          <option value="SERVICE">SVC</option>
                          <option value="STANDBY">STB</option>
                        </select>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">
                    Exactly 2 tanks must be in service
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Supply Configuration */}
        <div className="card">
          <button
            onClick={() => toggleSection('supply')}
            className="card-header py-2 w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Supply Demand
              <span className="text-xs text-slate-500 font-normal">
                (Total: {config.supply.TPP + config.supply.CDCP + config.supply.Mills} m³/hr)
              </span>
            </div>
            {expandedSections.supply ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {expandedSections.supply && (
            <div className="p-3">
              <div className="grid grid-cols-3 gap-4">
                {/* TPP */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    TPP
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={config.supply.TPP}
                      onChange={(e) => handleSupplyChange('TPP', Number(e.target.value))}
                      min={CONSTANTS.TPP_FLOW_MIN}
                      max={CONSTANTS.TPP_FLOW_MAX}
                      className="input text-xs py-1 w-full"
                    />
                    <span className="text-[10px] text-slate-400">m³/hr</span>
                  </div>
                </div>

                {/* CDCP */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    CDCP
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={config.supply.CDCP}
                      onChange={(e) => handleSupplyChange('CDCP', Number(e.target.value))}
                      min={CONSTANTS.CDCP_FLOW_MIN}
                      max={CONSTANTS.CDCP_FLOW_MAX}
                      className="input text-xs py-1 w-full"
                    />
                    <span className="text-[10px] text-slate-400">m³/hr</span>
                  </div>
                </div>

                {/* Mills */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Mills
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={config.supply.Mills}
                      onChange={(e) => handleSupplyChange('Mills', Number(e.target.value))}
                      min={CONSTANTS.MILLS_FLOW_MIN}
                      max={CONSTANTS.MILLS_FLOW_MAX}
                      className="input text-xs py-1 w-full"
                    />
                    <span className="text-[10px] text-slate-400">m³/hr</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Validation Errors */}
        {errors.length > 0 && (
          <div className="bg-danger-50 border border-danger-200 rounded-lg p-3">
            <h4 className="font-medium text-danger-600 text-sm mb-1">Configuration Errors</h4>
            <ul className="text-xs text-danger-600 space-y-0.5">
              {errors.map((error, i) => (
                <li key={i}>• {error}</li>
              ))}
            </ul>
          </div>
        )}
      </main>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 md:relative md:border-0 md:bg-transparent md:p-0">
        <div className="max-w-7xl mx-auto md:px-4 md:pb-6">
          <button
            onClick={runSimulation}
            disabled={errors.length > 0 || isSimulating}
            className="btn btn-primary w-full py-3 text-base gap-2"
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
