import {
  SimulationConfig,
  SimulationState,
  SimulationResult,
  TimelineSnapshot,
  SimulationEvent,
  SimulationSummary,
  ExchangerState,
  RegenerationState,
  ExchangerType,
  FlowSnapshot,
} from './types';
import { CONSTANTS } from './constants';

// Initialize simulation state from config
export function initializeState(config: SimulationConfig): SimulationState {
  return {
    currentTime: 0,
    exchangers: {
      SAC: config.exchangers.SAC.map((e) => ({
        id: e.id,
        type: 'SAC' as ExchangerType,
        status: e.initialStatus,
        currentLoad: e.initialLoad,
        obrLimit: e.obrLimit,
        flowRate: e.flowRate,
        loadPercentage: (e.initialLoad / e.obrLimit) * 100,
      })),
      SBA: config.exchangers.SBA.map((e) => ({
        id: e.id,
        type: 'SBA' as ExchangerType,
        status: e.initialStatus,
        currentLoad: e.initialLoad,
        obrLimit: e.obrLimit,
        flowRate: e.flowRate,
        loadPercentage: (e.initialLoad / e.obrLimit) * 100,
      })),
      MB: config.exchangers.MB.map((e) => ({
        id: e.id,
        type: 'MB' as ExchangerType,
        status: e.initialStatus,
        currentLoad: e.initialLoad,
        obrLimit: e.obrLimit,
        flowRate: e.flowRate,
        loadPercentage: (e.initialLoad / e.obrLimit) * 100,
      })),
    },
    tanks: {
      DG: config.tanks.DG.map((t) => ({
        id: t.id,
        type: 'DG' as const,
        currentLevel: t.initialLevel,
        currentVolume: t.initialLevel * CONSTANTS.DG_AREA_M2,
        status: 'SERVICE' as const,
        levelPercentage: ((t.initialLevel - CONSTANTS.DG_MIN_LEVEL_M) /
          (CONSTANTS.DG_OVERFLOW_LEVEL_M - CONSTANTS.DG_MIN_LEVEL_M)) * 100,
      })),
      DM: config.tanks.DM.map((t) => ({
        id: t.id,
        type: 'DM' as const,
        currentLevel: t.initialLevel,
        currentVolume: t.initialLevel * CONSTANTS.DM_VOLUME_PER_METER,
        status: t.initialStatus,
        levelPercentage: ((t.initialLevel - CONSTANTS.DM_MIN_LEVEL_M) /
          (CONSTANTS.DM_OVERFLOW_LEVEL_M - CONSTANTS.DM_MIN_LEVEL_M)) * 100,
      })),
    },
    supply: { ...config.supply },
    regeneration: {
      SAC: null,
      SBA: null,
      MB: null,
    },
    regenerationQueue: {
      SAC: [],
      SBA: [],
      MB: [],
    },
    transfer: {
      active: false,
      sourceId: null,
      rate: 0,
    },
    streamOutOfService: null,
  };
}

// Calculate total output for an exchanger type
function calculateExchangerOutput(exchangers: ExchangerState[]): number {
  return exchangers
    .filter((e) => e.status === 'SERVICE')
    .reduce((sum, e) => sum + e.flowRate, 0);
}

// Update exchanger loads
function updateExchangerLoads(
  exchangers: ExchangerState[],
  deltaMinutes: number
): ExchangerState[] {
  return exchangers.map((e) => {
    if (e.status !== 'SERVICE') return e;
    const loadIncrease = (e.flowRate * deltaMinutes) / 60;
    const newLoad = e.currentLoad + loadIncrease;
    return {
      ...e,
      currentLoad: newLoad,
      loadPercentage: (newLoad / e.obrLimit) * 100,
    };
  });
}

// Get regeneration water consumption
function getRegenConsumption(
  regen: RegenerationState | null,
  currentTime: number,
  type: ExchangerType
): { dg: number; dm: number } {
  if (!regen || regen.phase === 'COMPLETE') return { dg: 0, dm: 0 };

  const timeInRegen = currentTime - regen.startTime;

  if (type === 'SAC') {
    if (regen.phase === 'CHEMICAL') {
      return { dg: CONSTANTS.SAC_REGEN_DG_RATE_M3HR, dm: 0 };
    }
    return { dg: 0, dm: 0 };
  }

  if (type === 'SBA') {
    if (regen.phase === 'CHEMICAL') {
      if (timeInRegen < CONSTANTS.SBA_REGEN_DG_DURATION_MIN) {
        return {
          dg: CONSTANTS.SBA_REGEN_DG_RATE_M3HR,
          dm: CONSTANTS.SBA_REGEN_DM_RATE_M3HR,
        };
      }
      return { dg: 0, dm: CONSTANTS.SBA_REGEN_DM_RATE_M3HR };
    }
    if (regen.phase === 'RINSE') {
      return { dg: CONSTANTS.SBA_REGEN_RINSE_DG_RATE_M3HR, dm: 0 };
    }
  }

  if (type === 'MB') {
    if (regen.phase === 'CHEMICAL') {
      if (timeInRegen < CONSTANTS.MB_REGEN_DG_DURATION_MIN) {
        return {
          dg: CONSTANTS.MB_REGEN_DG_RATE_M3HR,
          dm: CONSTANTS.MB_REGEN_DM_RATE_M3HR,
        };
      }
      return { dg: 0, dm: CONSTANTS.MB_REGEN_DM_RATE_M3HR };
    }
    if (regen.phase === 'RINSE') {
      return { dg: CONSTANTS.MB_REGEN_RINSE_DG_RATE_M3HR, dm: 0 };
    }
  }

  return { dg: 0, dm: 0 };
}

// Start regeneration for an exchanger
function startRegeneration(
  exchangerId: string,
  exchangerType: ExchangerType,
  currentTime: number
): RegenerationState {
  const chemicalDuration =
    exchangerType === 'SAC'
      ? CONSTANTS.SAC_REGEN_CHEMICAL_DURATION_MIN
      : exchangerType === 'SBA'
      ? CONSTANTS.SBA_REGEN_CHEMICAL_DURATION_MIN
      : CONSTANTS.MB_REGEN_CHEMICAL_DURATION_MIN;

  const totalDuration =
    exchangerType === 'SAC'
      ? CONSTANTS.SAC_REGEN_TOTAL_DURATION_MIN
      : exchangerType === 'SBA'
      ? CONSTANTS.SBA_REGEN_TOTAL_DURATION_MIN
      : CONSTANTS.MB_REGEN_TOTAL_DURATION_MIN;

  const dgDuration =
    exchangerType === 'SAC'
      ? CONSTANTS.SAC_REGEN_CHEMICAL_DURATION_MIN
      : exchangerType === 'SBA'
      ? CONSTANTS.SBA_REGEN_DG_DURATION_MIN
      : CONSTANTS.MB_REGEN_DG_DURATION_MIN;

  return {
    exchangerId,
    exchangerType,
    phase: 'CHEMICAL',
    startTime: currentTime,
    phaseStartTime: currentTime,
    chemicalEndTime: currentTime + chemicalDuration,
    totalEndTime: currentTime + totalDuration,
    dgConsumptionEndTime: currentTime + dgDuration,
  };
}

// Update regeneration progress
function updateRegenerationProgress(
  regen: RegenerationState | null,
  currentTime: number
): { regen: RegenerationState | null; completed: boolean; phaseChanged: boolean } {
  if (!regen) return { regen: null, completed: false, phaseChanged: false };

  if (currentTime >= regen.totalEndTime) {
    return { regen: { ...regen, phase: 'COMPLETE' }, completed: true, phaseChanged: true };
  }

  if (regen.phase === 'CHEMICAL' && currentTime >= regen.chemicalEndTime) {
    return {
      regen: { ...regen, phase: 'RINSE', phaseStartTime: currentTime },
      completed: false,
      phaseChanged: true,
    };
  }

  return { regen, completed: false, phaseChanged: false };
}

// Calculate next state
function calculateNextState(
  state: SimulationState,
  deltaMinutes: number,
  events: SimulationEvent[]
): SimulationState {
  const newState = JSON.parse(JSON.stringify(state)) as SimulationState;
  newState.currentTime += deltaMinutes;

  // Step 1: Calculate exchanger outputs
  const sacOutput = calculateExchangerOutput(newState.exchangers.SAC);
  const sbaOutput = calculateExchangerOutput(newState.exchangers.SBA);
  const mbOutput = calculateExchangerOutput(newState.exchangers.MB);

  // Step 2: Calculate regeneration water consumption
  let dgRegenConsumption = 0;
  let dmRegenConsumption = 0;

  for (const type of ['SAC', 'SBA', 'MB'] as ExchangerType[]) {
    const consumption = getRegenConsumption(
      newState.regeneration[type],
      newState.currentTime,
      type
    );
    dgRegenConsumption += consumption.dg;
    dmRegenConsumption += consumption.dm;
  }

  // Step 3: Calculate supply demand
  const supplyDemand = newState.supply.TPP + newState.supply.CDCP + newState.supply.Mills;

  // Step 4: Calculate DM transfer
  let transferVolume = 0;
  if (newState.transfer.active && newState.transfer.sourceId) {
    transferVolume = (newState.transfer.rate * deltaMinutes) / 60;
  }

  // Step 5: Update DG tank levels
  const dgNetFlow = sacOutput - sbaOutput - dgRegenConsumption;
  const dgVolumeChange = (dgNetFlow * deltaMinutes) / 60;
  const dgLevelChange = dgVolumeChange / CONSTANTS.DG_COMBINED_AREA_M2;

  let newDGLevel = newState.tanks.DG[0].currentLevel + dgLevelChange;
  newDGLevel = Math.max(0, Math.min(CONSTANTS.DG_HEIGHT_M, newDGLevel));

  newState.tanks.DG = newState.tanks.DG.map((tank) => ({
    ...tank,
    currentLevel: newDGLevel,
    currentVolume: newDGLevel * CONSTANTS.DG_AREA_M2,
    levelPercentage: ((newDGLevel - CONSTANTS.DG_MIN_LEVEL_M) /
      (CONSTANTS.DG_OVERFLOW_LEVEL_M - CONSTANTS.DG_MIN_LEVEL_M)) * 100,
  }));

  // Step 6: Update DM tank levels
  const serviceDMTanks = newState.tanks.DM.filter((t) => t.status === 'SERVICE');
  const numServiceDM = serviceDMTanks.length || 1;
  const dmNetFlow = mbOutput - supplyDemand - dmRegenConsumption;
  const dmVolumeChangePerTank = ((dmNetFlow * deltaMinutes) / 60 + transferVolume) / numServiceDM;
  const dmLevelChangePerTank = dmVolumeChangePerTank / CONSTANTS.DM_VOLUME_PER_METER;

  newState.tanks.DM = newState.tanks.DM.map((tank) => {
    if (tank.status !== 'SERVICE') {
      // Handle transfer from standby tank
      if (newState.transfer.active && tank.id === newState.transfer.sourceId) {
        const sourceVolumeChange = (newState.transfer.rate * deltaMinutes) / 60;
        const sourceLevelChange = sourceVolumeChange / CONSTANTS.DM_VOLUME_PER_METER;
        const newLevel = Math.max(0, tank.currentLevel - sourceLevelChange);
        return {
          ...tank,
          currentLevel: newLevel,
          currentVolume: newLevel * CONSTANTS.DM_VOLUME_PER_METER,
          levelPercentage: ((newLevel - CONSTANTS.DM_MIN_LEVEL_M) /
            (CONSTANTS.DM_OVERFLOW_LEVEL_M - CONSTANTS.DM_MIN_LEVEL_M)) * 100,
        };
      }
      return tank;
    }

    let newLevel = tank.currentLevel + dmLevelChangePerTank;
    newLevel = Math.max(0, Math.min(CONSTANTS.DM_HEIGHT_M, newLevel));

    return {
      ...tank,
      currentLevel: newLevel,
      currentVolume: newLevel * CONSTANTS.DM_VOLUME_PER_METER,
      levelPercentage: ((newLevel - CONSTANTS.DM_MIN_LEVEL_M) /
        (CONSTANTS.DM_OVERFLOW_LEVEL_M - CONSTANTS.DM_MIN_LEVEL_M)) * 100,
    };
  });

  // Step 7: Update exchanger loads
  newState.exchangers.SAC = updateExchangerLoads(newState.exchangers.SAC, deltaMinutes);
  newState.exchangers.SBA = updateExchangerLoads(newState.exchangers.SBA, deltaMinutes);
  newState.exchangers.MB = updateExchangerLoads(newState.exchangers.MB, deltaMinutes);

  // Step 8: Process regeneration progress
  for (const type of ['SAC', 'SBA', 'MB'] as ExchangerType[]) {
    const result = updateRegenerationProgress(newState.regeneration[type], newState.currentTime);

    if (result.phaseChanged && result.regen) {
      if (result.completed) {
        // Reset exchanger and move to standby
        const exchanger = newState.exchangers[type].find(
          (e) => e.id === result.regen!.exchangerId
        );
        if (exchanger) {
          exchanger.status = 'STANDBY';
          exchanger.currentLoad = 0;
          exchanger.loadPercentage = 0;
        }
        events.push({
          timestamp: newState.currentTime,
          type: 'REGEN_COMPLETE',
          message: `${result.regen.exchangerId} regeneration complete`,
          equipmentId: result.regen.exchangerId,
          severity: 'info',
        });
        newState.regeneration[type] = null;

        // Start next in queue if available
        if (newState.regenerationQueue[type].length > 0) {
          const nextId = newState.regenerationQueue[type].shift()!;
          const nextExchanger = newState.exchangers[type].find((e) => e.id === nextId);
          if (nextExchanger) {
            nextExchanger.status = 'REGENERATION';
            newState.regeneration[type] = startRegeneration(nextId, type, newState.currentTime);
            events.push({
              timestamp: newState.currentTime,
              type: 'REGEN_START',
              message: `${nextId} regeneration started`,
              equipmentId: nextId,
              severity: 'info',
            });
          }
        }
      } else if (result.regen.phase === 'RINSE') {
        events.push({
          timestamp: newState.currentTime,
          type: 'REGEN_PHASE_CHANGE',
          message: `${result.regen.exchangerId} entered rinse phase`,
          equipmentId: result.regen.exchangerId,
          severity: 'info',
        });
        // Check if another can start (chemical phase complete)
        if (newState.regenerationQueue[type].length > 0) {
          const nextId = newState.regenerationQueue[type].shift()!;
          const nextExchanger = newState.exchangers[type].find((e) => e.id === nextId);
          if (nextExchanger) {
            nextExchanger.status = 'REGENERATION';
            // Create a second regeneration slot (overlapping rinse)
            events.push({
              timestamp: newState.currentTime,
              type: 'REGEN_START',
              message: `${nextId} regeneration started`,
              equipmentId: nextId,
              severity: 'info',
            });
          }
        }
      }
    }
    newState.regeneration[type] = result.regen;
  }

  // Step 9: Check exhaustion and trigger regeneration
  for (const type of ['SAC', 'SBA', 'MB'] as ExchangerType[]) {
    for (const exchanger of newState.exchangers[type]) {
      if (
        exchanger.status === 'SERVICE' &&
        exchanger.currentLoad >= exchanger.obrLimit
      ) {
        events.push({
          timestamp: newState.currentTime,
          type: 'EXHAUSTION',
          message: `${exchanger.id} reached OBR limit`,
          equipmentId: exchanger.id,
          severity: 'warning',
        });

        // Find standby to put into service
        const standby = newState.exchangers[type].find(
          (e) => e.status === 'STANDBY' && e.id !== exchanger.id
        );
        if (standby) {
          standby.status = 'SERVICE';
          events.push({
            timestamp: newState.currentTime,
            type: 'STATUS_CHANGE',
            message: `${standby.id} put into service`,
            equipmentId: standby.id,
            severity: 'info',
          });
        }

        // Start or queue regeneration
        if (!newState.regeneration[type]) {
          exchanger.status = 'REGENERATION';
          newState.regeneration[type] = startRegeneration(
            exchanger.id,
            type,
            newState.currentTime
          );
          events.push({
            timestamp: newState.currentTime,
            type: 'REGEN_START',
            message: `${exchanger.id} regeneration started`,
            equipmentId: exchanger.id,
            severity: 'info',
          });
        } else {
          exchanger.status = 'STANDBY';
          newState.regenerationQueue[type].push(exchanger.id);
          events.push({
            timestamp: newState.currentTime,
            type: 'STATUS_CHANGE',
            message: `${exchanger.id} queued for regeneration`,
            equipmentId: exchanger.id,
            severity: 'info',
          });
        }
      }
    }
  }

  // Step 10: Apply automatic controls

  // Low DG level response
  if (newDGLevel < CONSTANTS.DG_MIN_LEVEL_M) {
    const sbaInService = newState.exchangers.SBA.filter((e) => e.status === 'SERVICE');
    if (sbaInService.length > 1) {
      const lowestLoad = sbaInService.reduce((min, e) =>
        e.currentLoad < min.currentLoad ? e : min
      );
      lowestLoad.status = 'STANDBY';
      events.push({
        timestamp: newState.currentTime,
        type: 'LEVEL_WARNING',
        message: `${lowestLoad.id} taken out of service due to low DG level`,
        equipmentId: lowestLoad.id,
        severity: 'warning',
      });
    }
  }

  // Low DM level response - initiate transfer
  const serviceDMTanksAfter = newState.tanks.DM.filter((t) => t.status === 'SERVICE');
  const anyLowDM = serviceDMTanksAfter.some(
    (t) => t.currentLevel < CONSTANTS.DM_MIN_LEVEL_M
  );

  if (anyLowDM && !newState.transfer.active) {
    const standbyWithWater = newState.tanks.DM.find(
      (t) => t.status === 'STANDBY' && t.currentLevel > CONSTANTS.DM_TRANSFER_TRIGGER_LEVEL_M
    );
    if (standbyWithWater) {
      newState.transfer = {
        active: true,
        sourceId: standbyWithWater.id,
        rate: CONSTANTS.DM_TRANSFER_RATE_M3HR,
      };
      events.push({
        timestamp: newState.currentTime,
        type: 'TRANSFER_START',
        message: `Drawing water from ${standbyWithWater.id} to service tanks`,
        equipmentId: standbyWithWater.id,
        severity: 'warning',
      });
    }
  }

  // Stop transfer if service tanks recovered or source empty
  if (newState.transfer.active) {
    const serviceTanksRecovered = serviceDMTanksAfter.every(
      (t) => t.currentLevel > CONSTANTS.DM_WARNING_LOW_LEVEL_M
    );
    const sourceTank = newState.tanks.DM.find((t) => t.id === newState.transfer.sourceId);
    const sourceEmpty = sourceTank && sourceTank.currentLevel <= CONSTANTS.DM_TRANSFER_STOP_LEVEL_M;

    if (serviceTanksRecovered || sourceEmpty) {
      events.push({
        timestamp: newState.currentTime,
        type: 'TRANSFER_END',
        message: `Transfer from ${newState.transfer.sourceId} stopped`,
        equipmentId: newState.transfer.sourceId || '',
        severity: 'info',
      });
      newState.transfer = { active: false, sourceId: null, rate: 0 };
    }
  }

  // High DM level response
  const allDMHigh = newState.tanks.DM.every(
    (t) => t.currentLevel > CONSTANTS.DM_OVERFLOW_LEVEL_M
  );
  if (allDMHigh && !newState.streamOutOfService) {
    // Find stream with highest combined load
    let maxLoad = 0;
    let streamIndex = 0;
    for (let i = 0; i < 5; i++) {
      const sac = newState.exchangers.SAC[i];
      const sba = newState.exchangers.SBA[i];
      const mb = newState.exchangers.MB[i];
      const totalLoad =
        (sac.status === 'SERVICE' ? sac.currentLoad : 0) +
        (sba.status === 'SERVICE' ? sba.currentLoad : 0) +
        (mb.status === 'SERVICE' ? mb.currentLoad : 0);
      if (totalLoad > maxLoad) {
        maxLoad = totalLoad;
        streamIndex = i;
      }
    }

    const streamLabel = ['A', 'B', 'C', 'D', 'E'][streamIndex];
    newState.exchangers.SAC[streamIndex].status = 'STANDBY';
    newState.exchangers.SBA[streamIndex].status = 'STANDBY';
    newState.exchangers.MB[streamIndex].status = 'STANDBY';
    newState.streamOutOfService = streamLabel;

    events.push({
      timestamp: newState.currentTime,
      type: 'LEVEL_WARNING',
      message: `Stream ${streamLabel} taken out of service - all tanks at overflow`,
      equipmentId: `Stream-${streamLabel}`,
      severity: 'error',
    });
  }

  // Stream recovery
  if (newState.streamOutOfService) {
    const anyDMRecovered = newState.tanks.DM.some(
      (t) => t.currentLevel < CONSTANTS.DM_RECOVERY_LEVEL_M
    );
    if (anyDMRecovered) {
      const streamIndex = ['A', 'B', 'C', 'D', 'E'].indexOf(newState.streamOutOfService);
      if (streamIndex >= 0) {
        const sac = newState.exchangers.SAC[streamIndex];
        const sba = newState.exchangers.SBA[streamIndex];
        const mb = newState.exchangers.MB[streamIndex];
        if (sac.status === 'STANDBY') sac.status = 'SERVICE';
        if (sba.status === 'STANDBY') sba.status = 'SERVICE';
        if (mb.status === 'STANDBY') mb.status = 'SERVICE';

        events.push({
          timestamp: newState.currentTime,
          type: 'STATUS_CHANGE',
          message: `Stream ${newState.streamOutOfService} returned to service`,
          equipmentId: `Stream-${newState.streamOutOfService}`,
          severity: 'info',
        });
        newState.streamOutOfService = null;
      }
    }
  }

  return newState;
}

// Create timeline snapshot
function createSnapshot(state: SimulationState, events: SimulationEvent[]): TimelineSnapshot {
  const sacOutput = calculateExchangerOutput(state.exchangers.SAC);
  const sbaOutput = calculateExchangerOutput(state.exchangers.SBA);
  const mbOutput = calculateExchangerOutput(state.exchangers.MB);
  const supplyTotal = state.supply.TPP + state.supply.CDCP + state.supply.Mills;

  let dgRegenConsumption = 0;
  let dmRegenConsumption = 0;
  for (const type of ['SAC', 'SBA', 'MB'] as ExchangerType[]) {
    const consumption = getRegenConsumption(state.regeneration[type], state.currentTime, type);
    dgRegenConsumption += consumption.dg;
    dmRegenConsumption += consumption.dm;
  }

  const flows: FlowSnapshot = {
    sacTotalOutput: sacOutput,
    sbaTotalOutput: sbaOutput,
    mbTotalOutput: mbOutput,
    totalSupply: supplyTotal,
    dgNetFlow: sacOutput - sbaOutput - dgRegenConsumption,
    dmNetFlow: mbOutput - supplyTotal - dmRegenConsumption,
    dgRegenConsumption,
    dmRegenConsumption,
  };

  const exchangers: TimelineSnapshot['exchangers'] = {};
  for (const type of ['SAC', 'SBA', 'MB'] as ExchangerType[]) {
    for (const e of state.exchangers[type]) {
      exchangers[e.id] = {
        status: e.status,
        load: e.currentLoad,
        loadPercentage: e.loadPercentage,
        flowRate: e.flowRate,
      };
    }
  }

  const tanks: TimelineSnapshot['tanks'] = {};
  for (const type of ['DG', 'DM'] as const) {
    for (const t of state.tanks[type]) {
      tanks[t.id] = {
        level: t.currentLevel,
        volume: t.currentVolume,
        status: t.status,
        levelPercentage: t.levelPercentage,
      };
    }
  }

  const activeRegens: string[] = [];
  const regenPhases: Record<string, RegenerationState['phase']> = {};
  for (const type of ['SAC', 'SBA', 'MB'] as ExchangerType[]) {
    if (state.regeneration[type]) {
      activeRegens.push(state.regeneration[type]!.exchangerId);
      regenPhases[state.regeneration[type]!.exchangerId] = state.regeneration[type]!.phase;
    }
  }

  const queuedRegens = [
    ...state.regenerationQueue.SAC,
    ...state.regenerationQueue.SBA,
    ...state.regenerationQueue.MB,
  ];

  return {
    timestamp: state.currentTime,
    exchangers,
    tanks,
    flows,
    regeneration: {
      active: activeRegens,
      queue: queuedRegens,
      phases: regenPhases,
    },
    events,
  };
}

// Main simulation function
export function runSimulation(config: SimulationConfig): SimulationResult {
  const timeline: TimelineSnapshot[] = [];
  const allEvents: SimulationEvent[] = [];
  let state = initializeState(config);

  // Record initial state
  timeline.push(createSnapshot(state, []));

  // Run simulation
  for (let t = 1; t <= CONSTANTS.SIMULATION_DURATION_MINUTES; t++) {
    const stepEvents: SimulationEvent[] = [];
    state = calculateNextState(state, CONSTANTS.CALCULATION_INTERVAL_MINUTES, stepEvents);
    allEvents.push(...stepEvents);
    timeline.push(createSnapshot(state, stepEvents));
  }

  // Calculate summary
  const dgLevels = timeline.map((s) => s.tanks['DG-A'].level);
  const dmLevels = timeline.flatMap((s) =>
    Object.entries(s.tanks)
      .filter(([id]) => id.startsWith('DMT'))
      .map(([, t]) => t.level)
  );

  const summary: SimulationSummary = {
    totalWaterProduced: timeline.reduce((sum, s) => sum + s.flows.mbTotalOutput / 60, 0),
    totalWaterSupplied: timeline.reduce((sum, s) => sum + s.flows.totalSupply / 60, 0),
    regenerationsCompleted: allEvents.filter((e) => e.type === 'REGEN_COMPLETE').length,
    regenerationsStarted: allEvents.filter((e) => e.type === 'REGEN_START').length,
    averageDGLevel: dgLevels.reduce((a, b) => a + b, 0) / dgLevels.length,
    averageDMLevel: dmLevels.reduce((a, b) => a + b, 0) / dmLevels.length,
    minDGLevel: Math.min(...dgLevels),
    minDMLevel: Math.min(...dmLevels),
    maxDGLevel: Math.max(...dgLevels),
    maxDMLevel: Math.max(...dmLevels),
    criticalEvents: allEvents.filter((e) => e.severity === 'error').length,
    warnings: allEvents.filter((e) => e.severity === 'warning').length,
  };

  return {
    config,
    timeline,
    summary,
    allEvents,
  };
}
