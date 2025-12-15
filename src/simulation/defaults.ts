import { SimulationConfig } from './types';
import { CONSTANTS, EXCHANGER_LABELS } from './constants';

export const createDefaultConfig = (): SimulationConfig => ({
  exchangers: {
    SAC: EXCHANGER_LABELS.map((label, index) => ({
      id: `SAC-${label}`,
      initialStatus: index < 3 ? 'SERVICE' : 'STANDBY',
      initialLoad: 0,
      obrLimit: CONSTANTS.DEFAULT_SAC_OBR,
      flowRate: CONSTANTS.DEFAULT_SAC_FLOW,
    })),
    SBA: EXCHANGER_LABELS.map((label, index) => ({
      id: `SBA-${label}`,
      initialStatus: index < 3 ? 'SERVICE' : 'STANDBY',
      initialLoad: 0,
      obrLimit: CONSTANTS.DEFAULT_SBA_OBR,
      flowRate: CONSTANTS.DEFAULT_SBA_FLOW,
    })),
    MB: EXCHANGER_LABELS.map((label, index) => ({
      id: `MB-${label}`,
      initialStatus: index < 3 ? 'SERVICE' : 'STANDBY',
      initialLoad: 0,
      obrLimit: CONSTANTS.DEFAULT_MB_OBR,
      flowRate: CONSTANTS.DEFAULT_MB_FLOW,
    })),
  },
  tanks: {
    DG: [
      { id: 'DG-A', initialLevel: 1.5 },
      { id: 'DG-B', initialLevel: 1.5 },
    ],
    DM: EXCHANGER_LABELS.map((label, index) => ({
      id: `DMT-${label}`,
      initialLevel: 4.0,
      initialStatus: index < 2 ? 'SERVICE' : 'STANDBY',
    })),
  },
  supply: {
    TPP: CONSTANTS.TPP_FLOW_DEFAULT,
    CDCP: CONSTANTS.CDCP_FLOW_DEFAULT,
    Mills: CONSTANTS.MILLS_FLOW_DEFAULT,
  },
  shift: 'A', // Default to A shift (6 AM - 2 PM)
});

export const createScenarioConfig = (scenario: 'normal' | 'immediate-regen' | 'low-dg' | 'cascade' | 'transfer'): SimulationConfig => {
  const base = createDefaultConfig();

  switch (scenario) {
    case 'normal':
      return base;

    case 'immediate-regen':
      return {
        ...base,
        exchangers: {
          ...base.exchangers,
          SAC: base.exchangers.SAC.map((sac, i) =>
            i === 0 ? { ...sac, initialLoad: 1490 } : sac
          ),
        },
      };

    case 'low-dg':
      return {
        ...base,
        tanks: {
          ...base.tanks,
          DG: base.tanks.DG.map((dg) => ({ ...dg, initialLevel: 0.9 })),
        },
      };

    case 'cascade':
      return {
        ...base,
        exchangers: {
          SAC: base.exchangers.SAC.map((sac, i) => ({
            ...sac,
            initialLoad: i < 3 ? 1400 - i * 100 : 0,
          })),
          SBA: base.exchangers.SBA.map((sba, i) => ({
            ...sba,
            initialLoad: i < 3 ? 1000 - i * 100 : 0,
          })),
          MB: base.exchangers.MB,
        },
      };

    case 'transfer':
      return {
        ...base,
        tanks: {
          ...base.tanks,
          DM: base.tanks.DM.map((dm, i) =>
            i < 2
              ? { ...dm, initialLevel: 0.9, initialStatus: 'SERVICE' as const }
              : { ...dm, initialLevel: 5.0, initialStatus: 'STANDBY' as const }
          ),
        },
      };

    default:
      return base;
  }
};
