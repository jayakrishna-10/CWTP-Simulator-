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
  LogsheetEntry,
  LogsheetActionType,
  ShiftInfo,
  RegenerationDetail,
} from './types';
import { CONSTANTS, SHIFT_INFO } from './constants';

// Helper function to format time for logsheet
function formatActualTime(minutesIntoShift: number, shiftStartHour: number): string {
  const totalMinutes = shiftStartHour * 60 + minutesIntoShift;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Helper function to create logsheet entry
function createLogsheetEntry(
  timestamp: number,
  shiftStartHour: number,
  action: LogsheetActionType,
  equipmentId: string,
  reason: string,
  operatorAction: string,
  dgLevel?: number,
  dmLevel?: number
): LogsheetEntry {
  return {
    timestamp,
    actualTime: formatActualTime(timestamp, shiftStartHour),
    action,
    equipmentId,
    reason,
    operatorAction,
    dgLevel,
    dmLevel,
  };
}

// Helper function to get average DM level
function getAverageDMLevel(state: SimulationState): number {
  const serviceDM = state.tanks.DM.filter(t => t.status === 'SERVICE');
  if (serviceDM.length === 0) return 0;
  return serviceDM.reduce((sum, t) => sum + t.currentLevel, 0) / serviceDM.length;
}

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
        lastStatusChange: 0, // Initialize at time 0
      })),
      SBA: config.exchangers.SBA.map((e) => ({
        id: e.id,
        type: 'SBA' as ExchangerType,
        status: e.initialStatus,
        currentLoad: e.initialLoad,
        obrLimit: e.obrLimit,
        flowRate: e.flowRate,
        loadPercentage: (e.initialLoad / e.obrLimit) * 100,
        lastStatusChange: 0, // Initialize at time 0
      })),
      MB: config.exchangers.MB.map((e) => ({
        id: e.id,
        type: 'MB' as ExchangerType,
        status: e.initialStatus,
        currentLoad: e.initialLoad,
        obrLimit: e.obrLimit,
        flowRate: e.flowRate,
        loadPercentage: (e.initialLoad / e.obrLimit) * 100,
        lastStatusChange: 0, // Initialize at time 0
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
      mode: null,
      sourceId: null,
      targetId: null,
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
  events: SimulationEvent[],
  logsheet: LogsheetEntry[],
  shiftStartHour: number
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

  // Step 4: Calculate DM transfer volumes
  let transferToServiceVolume = 0;  // Volume transferred TO service tanks (from standby)
  let fillStandbyVolume = 0;        // Volume diverted to fill standby tanks (from MB outlet)

  if (newState.transfer.active) {
    if (newState.transfer.mode === 'DRAW_FROM_STANDBY' && newState.transfer.sourceId) {
      // Transfer from standby to service
      transferToServiceVolume = (newState.transfer.rate * deltaMinutes) / 60;
    } else if (newState.transfer.mode === 'FILL_STANDBY' && newState.transfer.targetId) {
      // Divert MB output to fill standby tank
      fillStandbyVolume = (newState.transfer.rate * deltaMinutes) / 60;
    }
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
  // MB output going to service tanks is reduced when filling standby
  const mbOutputToService = mbOutput - (fillStandbyVolume * 60 / deltaMinutes);
  const dmNetFlow = mbOutputToService - supplyDemand - dmRegenConsumption;
  const dmVolumeChangePerTank = ((dmNetFlow * deltaMinutes) / 60 + transferToServiceVolume) / numServiceDM;
  const dmLevelChangePerTank = dmVolumeChangePerTank / CONSTANTS.DM_VOLUME_PER_METER;

  newState.tanks.DM = newState.tanks.DM.map((tank) => {
    if (tank.status !== 'SERVICE') {
      // Handle standby tank operations
      if (newState.transfer.active) {
        // Drawing FROM this standby tank
        if (newState.transfer.mode === 'DRAW_FROM_STANDBY' && tank.id === newState.transfer.sourceId) {
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
        // Filling INTO this standby tank
        if (newState.transfer.mode === 'FILL_STANDBY' && tank.id === newState.transfer.targetId) {
          const fillLevelChange = fillStandbyVolume / CONSTANTS.DM_VOLUME_PER_METER;
          const newLevel = Math.min(CONSTANTS.DM_HEIGHT_M, tank.currentLevel + fillLevelChange);
          return {
            ...tank,
            currentLevel: newLevel,
            currentVolume: newLevel * CONSTANTS.DM_VOLUME_PER_METER,
            levelPercentage: ((newLevel - CONSTANTS.DM_MIN_LEVEL_M) /
              (CONSTANTS.DM_OVERFLOW_LEVEL_M - CONSTANTS.DM_MIN_LEVEL_M)) * 100,
          };
        }
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
        // Reset exchanger load
        const exchanger = newState.exchangers[type].find(
          (e) => e.id === result.regen!.exchangerId
        );
        if (exchanger) {
          exchanger.currentLoad = 0;
          exchanger.loadPercentage = 0;

          // Determine if this bed should go into SERVICE or STANDBY
          // Check current conditions to decide if the bed is needed in service
          const currentDGLevel = newState.tanks.DG[0].currentLevel;
          const serviceDM = newState.tanks.DM.filter(t => t.status === 'SERVICE');
          const currentDMLevel = serviceDM.length > 0
            ? serviceDM.reduce((sum, t) => sum + t.currentLevel, 0) / serviceDM.length
            : 0;

          const inServiceCount = newState.exchangers[type].filter(e => e.status === 'SERVICE').length;
          let shouldBeInService = false;

          if (type === 'SAC') {
            // SAC should be in service if DG < 2.0m and we have capacity
            shouldBeInService = currentDGLevel < CONSTANTS.DG_SAC_SERVICE_THRESHOLD_M &&
                               inServiceCount < CONSTANTS.MAX_EXCHANGERS_IN_SERVICE;
          } else if (type === 'SBA') {
            // SBA should be in service if DM < 6.8m and DG > 1.0m
            shouldBeInService = currentDMLevel < CONSTANTS.DM_SBA_SERVICE_THRESHOLD_M &&
                               currentDGLevel > CONSTANTS.DG_SBA_MIN_THRESHOLD_M &&
                               inServiceCount < CONSTANTS.MAX_EXCHANGERS_IN_SERVICE;
          } else if (type === 'MB') {
            // MB should match SBA count
            const sbaInService = newState.exchangers.SBA.filter(e => e.status === 'SERVICE').length;
            shouldBeInService = inServiceCount < sbaInService;
          }

          if (shouldBeInService) {
            exchanger.status = 'SERVICE';
            exchanger.lastStatusChange = newState.currentTime;
            events.push({
              timestamp: newState.currentTime,
              type: 'REGEN_COMPLETE',
              message: `${result.regen.exchangerId} regeneration complete - put into service`,
              equipmentId: result.regen.exchangerId,
              severity: 'info',
            });
            events.push({
              timestamp: newState.currentTime,
              type: 'STATUS_CHANGE',
              message: `${exchanger.id} put into service after regeneration`,
              equipmentId: exchanger.id,
              severity: 'info',
            });
          } else {
            exchanger.status = 'STANDBY';
            exchanger.lastStatusChange = newState.currentTime;
            events.push({
              timestamp: newState.currentTime,
              type: 'REGEN_COMPLETE',
              message: `${result.regen.exchangerId} regeneration complete`,
              equipmentId: result.regen.exchangerId,
              severity: 'info',
            });
          }
        }
        newState.regeneration[type] = null;

        // Start next in queue if available (EXHAUST beds waiting for regeneration)
        if (newState.regenerationQueue[type].length > 0) {
          const nextId = newState.regenerationQueue[type].shift()!;
          const nextExchanger = newState.exchangers[type].find((e) => e.id === nextId);
          if (nextExchanger) {
            nextExchanger.status = 'REGENERATION';
            nextExchanger.lastStatusChange = newState.currentTime;
            newState.regeneration[type] = startRegeneration(nextId, type, newState.currentTime);
            events.push({
              timestamp: newState.currentTime,
              type: 'REGEN_START',
              message: `${nextId} regeneration started (from exhaust queue)`,
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
        // Update the regeneration state for phase change (not completion)
        newState.regeneration[type] = result.regen;
      }
    } else if (result.regen && !result.completed) {
      // Update regeneration state only if not completed (completion is handled above)
      newState.regeneration[type] = result.regen;
    }
  }

  // Step 9: Check exhaustion and trigger regeneration
  // Note: Exhaustion is a forced changeover - no cooldown applies since the exchanger is depleted
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
          standby.lastStatusChange = newState.currentTime;
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
          exchanger.lastStatusChange = newState.currentTime;
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
          // Set to EXHAUST state - bed is exhausted and waiting for regeneration
          exchanger.status = 'EXHAUST';
          exchanger.lastStatusChange = newState.currentTime;
          newState.regenerationQueue[type].push(exchanger.id);
          events.push({
            timestamp: newState.currentTime,
            type: 'STATUS_CHANGE',
            message: `${exchanger.id} exhausted, queued for regeneration`,
            equipmentId: exchanger.id,
            severity: 'warning',
          });
        }
      }
    }
  }

  // Step 10: Apply automatic controls with refined exchanger service logic
  // Key constraints:
  // 1. Anions in service >= Cations in service (SBA >= SAC)
  // 2. Minimize changeovers using hysteresis and cooldown periods
  // 3. Maintain DG levels properly

  const avgDMLevel = getAverageDMLevel(newState);

  // Helper to get available (STANDBY) exchangers
  // Only STANDBY beds can be taken into service - excludes EXHAUST beds which need regeneration
  const getAvailableExchangers = (exchangers: ExchangerState[]) =>
    exchangers.filter((e) => e.status === 'STANDBY');

  // Helper to get in-service exchangers
  const getInServiceExchangers = (exchangers: ExchangerState[]) =>
    exchangers.filter((e) => e.status === 'SERVICE');

  // Helper to find lowest load exchanger from a list
  const findLowestLoad = (exchangers: ExchangerState[]) =>
    exchangers.reduce((min, e) => (e.currentLoad < min.currentLoad ? e : min));

  // Helper to check if exchanger can change status (respects cooldown period)
  // Returns true if enough time has passed since last status change
  const canChangeStatus = (exchanger: ExchangerState, currentTime: number): boolean => {
    const timeSinceLastChange = currentTime - exchanger.lastStatusChange;
    return timeSinceLastChange >= CONSTANTS.MIN_TIME_IN_STATE_MINUTES;
  };

  // Helper to get available exchangers that can change status (respects cooldown)
  const getAvailableExchangersWithCooldown = (exchangers: ExchangerState[], currentTime: number) =>
    exchangers.filter((e) => e.status === 'STANDBY' && canChangeStatus(e, currentTime));

  // Rule 1: SAC goes to SERVICE if DG < hysteresis threshold (max 4)
  // Uses lower hysteresis threshold to avoid hunting
  // Also checks anion-cation balance: can only add SAC if there are enough SBAs
  if (newDGLevel < CONSTANTS.DG_SAC_SERVICE_HYSTERESIS_LOW_M) {
    const availableSAC = getAvailableExchangersWithCooldown(newState.exchangers.SAC, newState.currentTime);
    const inServiceSAC = getInServiceExchangers(newState.exchangers.SAC);
    const currentSBAInService = getInServiceExchangers(newState.exchangers.SBA).length;

    // Put available SAC into service (up to max 4 total in service)
    // CONSTRAINT: Anions >= Cations - only add SAC if we have enough SBAs
    for (const sac of availableSAC) {
      if (inServiceSAC.length >= CONSTANTS.MAX_EXCHANGERS_IN_SERVICE) break;

      // Check anion-cation balance: after adding this SAC, would SBA count still be >= SAC count?
      const newSACCount = inServiceSAC.length + 1;
      if (currentSBAInService < newSACCount) {
        // Cannot add SAC - would violate anion >= cation constraint
        // Log this constraint violation for visibility
        events.push({
          timestamp: newState.currentTime,
          type: 'STATUS_CHANGE',
          message: `Cannot add ${sac.id} to service - would violate anion >= cation balance (SBA: ${currentSBAInService}, SAC would be: ${newSACCount})`,
          equipmentId: sac.id,
          severity: 'info',
        });
        break;
      }

      sac.status = 'SERVICE';
      sac.lastStatusChange = newState.currentTime;
      inServiceSAC.push(sac);

      const reason = `DG level at ${newDGLevel.toFixed(2)}m (below ${CONSTANTS.DG_SAC_SERVICE_HYSTERESIS_LOW_M}m threshold). Putting cation exchanger into service to increase DG inflow. Anion-cation balance maintained (SBA: ${currentSBAInService}, SAC: ${newSACCount}).`;
      events.push({
        timestamp: newState.currentTime,
        type: 'STATUS_CHANGE',
        message: `${sac.id} put into service - DG below ${CONSTANTS.DG_SAC_SERVICE_HYSTERESIS_LOW_M}m`,
        equipmentId: sac.id,
        severity: 'warning',
      });
      logsheet.push(createLogsheetEntry(
        newState.currentTime,
        shiftStartHour,
        'EXCHANGER_TO_SERVICE',
        sac.id,
        reason,
        `Put ${sac.id} into service`,
        newDGLevel,
        avgDMLevel
      ));
    }
  }

  // Rule 1b: SAC goes to STANDBY if DG > hysteresis high threshold (keep at least 1 in service)
  // Uses higher hysteresis threshold to avoid hunting
  if (newDGLevel > CONSTANTS.DG_SAC_STANDBY_HYSTERESIS_HIGH_M) {
    const inServiceSAC = getInServiceExchangers(newState.exchangers.SAC);
    // Filter for those that can change status (cooldown check)
    const canChangeSAC = inServiceSAC.filter(e => canChangeStatus(e, newState.currentTime));

    // Put excess SAC on standby (keep at least 1 in service)
    // Only consider exchangers that have passed the cooldown period
    while (inServiceSAC.length > CONSTANTS.MIN_EXCHANGERS_IN_SERVICE && canChangeSAC.length > 0) {
      // Find lowest load among those that can change
      const lowestLoadSAC = findLowestLoad(canChangeSAC);

      // Don't remove if it would leave us below minimum
      if (inServiceSAC.length <= CONSTANTS.MIN_EXCHANGERS_IN_SERVICE) break;

      lowestLoadSAC.status = 'STANDBY';
      lowestLoadSAC.lastStatusChange = newState.currentTime;

      // Remove from tracking arrays
      const idx = inServiceSAC.indexOf(lowestLoadSAC);
      if (idx > -1) inServiceSAC.splice(idx, 1);
      const canChangeIdx = canChangeSAC.indexOf(lowestLoadSAC);
      if (canChangeIdx > -1) canChangeSAC.splice(canChangeIdx, 1);

      const reason = `DG level at ${newDGLevel.toFixed(2)}m (above ${CONSTANTS.DG_SAC_STANDBY_HYSTERESIS_HIGH_M}m threshold). Putting cation exchanger on standby. Selected ${lowestLoadSAC.id} (lowest load: ${lowestLoadSAC.currentLoad.toFixed(0)}).`;
      events.push({
        timestamp: newState.currentTime,
        type: 'STATUS_CHANGE',
        message: `${lowestLoadSAC.id} put on standby - DG above ${CONSTANTS.DG_SAC_STANDBY_HYSTERESIS_HIGH_M}m`,
        equipmentId: lowestLoadSAC.id,
        severity: 'info',
      });
      logsheet.push(createLogsheetEntry(
        newState.currentTime,
        shiftStartHour,
        'EXCHANGER_TO_STANDBY',
        lowestLoadSAC.id,
        reason,
        `Put ${lowestLoadSAC.id} on standby (lowest load)`,
        newDGLevel,
        avgDMLevel
      ));
    }
  }

  // Rule 2: SBA goes to STANDBY if DM > hysteresis high threshold OR DG < critical (keep at least 1 in service)
  // CONSTRAINT: Anions >= Cations - cannot remove SBA if it would make SBA < SAC
  // Uses higher hysteresis threshold for DM to avoid hunting
  // DG critical is an emergency condition - no hysteresis needed
  const sbaShouldStandby = avgDMLevel > CONSTANTS.DM_SBA_STANDBY_HYSTERESIS_HIGH_M ||
                          newDGLevel < CONSTANTS.DG_SBA_CRITICAL_THRESHOLD_M;

  if (sbaShouldStandby) {
    const inServiceSBA = getInServiceExchangers(newState.exchangers.SBA);
    const currentSACInService = getInServiceExchangers(newState.exchangers.SAC).length;
    // Filter for those that can change status (cooldown check)
    const canChangeSBA = inServiceSBA.filter(e => canChangeStatus(e, newState.currentTime));

    // Put excess SBA on standby (keep at least 1 in service)
    // CONSTRAINT: Cannot go below SAC count (anion >= cation)
    const minSBARequired = Math.max(CONSTANTS.MIN_EXCHANGERS_IN_SERVICE, currentSACInService);

    while (inServiceSBA.length > minSBARequired && canChangeSBA.length > 0) {
      const lowestLoadSBA = findLowestLoad(canChangeSBA);

      // Double-check constraint
      if (inServiceSBA.length <= minSBARequired) break;

      lowestLoadSBA.status = 'STANDBY';
      lowestLoadSBA.lastStatusChange = newState.currentTime;

      // Remove from tracking arrays
      const idx = inServiceSBA.indexOf(lowestLoadSBA);
      if (idx > -1) inServiceSBA.splice(idx, 1);
      const canChangeIdx = canChangeSBA.indexOf(lowestLoadSBA);
      if (canChangeIdx > -1) canChangeSBA.splice(canChangeIdx, 1);

      const standbyReason = newDGLevel < CONSTANTS.DG_SBA_CRITICAL_THRESHOLD_M
        ? `DG level CRITICAL at ${newDGLevel.toFixed(2)}m (below ${CONSTANTS.DG_SBA_CRITICAL_THRESHOLD_M}m)`
        : `DM level at ${avgDMLevel.toFixed(2)}m (above ${CONSTANTS.DM_SBA_STANDBY_HYSTERESIS_HIGH_M}m)`;

      const reason = `${standbyReason}. Putting anion exchanger on standby. Selected ${lowestLoadSBA.id} (lowest load: ${lowestLoadSBA.currentLoad.toFixed(0)}). Anion-cation balance maintained (SBA: ${inServiceSBA.length}, SAC: ${currentSACInService}).`;
      events.push({
        timestamp: newState.currentTime,
        type: 'STATUS_CHANGE',
        message: `${lowestLoadSBA.id} put on standby - ${standbyReason}`,
        equipmentId: lowestLoadSBA.id,
        severity: 'warning',
      });
      logsheet.push(createLogsheetEntry(
        newState.currentTime,
        shiftStartHour,
        'EXCHANGER_TO_STANDBY',
        lowestLoadSBA.id,
        reason,
        `Put ${lowestLoadSBA.id} on standby (lowest load)`,
        newDGLevel,
        avgDMLevel
      ));
    }
  }

  // Rule 3: SBA goes to SERVICE if DM < hysteresis low threshold AND DG > 1.0m (max 4)
  // Adding SBA to service helps maintain anion >= cation balance
  // Uses lower hysteresis threshold for DM to avoid hunting
  if (avgDMLevel < CONSTANTS.DM_SBA_SERVICE_HYSTERESIS_LOW_M && newDGLevel > CONSTANTS.DG_SBA_MIN_THRESHOLD_M) {
    const availableSBA = getAvailableExchangersWithCooldown(newState.exchangers.SBA, newState.currentTime);
    const inServiceSBA = getInServiceExchangers(newState.exchangers.SBA);

    // Put available SBA into service (up to max 4 total in service)
    for (const sba of availableSBA) {
      if (inServiceSBA.length >= CONSTANTS.MAX_EXCHANGERS_IN_SERVICE) break;
      sba.status = 'SERVICE';
      sba.lastStatusChange = newState.currentTime;
      inServiceSBA.push(sba);

      const reason = `DM level at ${avgDMLevel.toFixed(2)}m (below ${CONSTANTS.DM_SBA_SERVICE_HYSTERESIS_LOW_M}m) AND DG level at ${newDGLevel.toFixed(2)}m (above ${CONSTANTS.DG_SBA_MIN_THRESHOLD_M}m). Putting anion exchanger into service to increase DM production.`;
      events.push({
        timestamp: newState.currentTime,
        type: 'STATUS_CHANGE',
        message: `${sba.id} put into service - DM below ${CONSTANTS.DM_SBA_SERVICE_HYSTERESIS_LOW_M}m, DG safe`,
        equipmentId: sba.id,
        severity: 'warning',
      });
      logsheet.push(createLogsheetEntry(
        newState.currentTime,
        shiftStartHour,
        'EXCHANGER_TO_SERVICE',
        sba.id,
        reason,
        `Put ${sba.id} into service`,
        newDGLevel,
        avgDMLevel
      ));
    }
  }

  // Rule 4: Number of MBs in service should equal number of anions (SBA)
  // MB matching doesn't need cooldown check since it follows SBA changes
  // The cooldown is already applied when SBA count changes
  const updatedSbaInServiceCount = getInServiceExchangers(newState.exchangers.SBA).length;
  const updatedMbInServiceCount = getInServiceExchangers(newState.exchangers.MB).length;

  if (updatedMbInServiceCount < updatedSbaInServiceCount) {
    // Need to add more MBs to match SBA count
    const availableMB = getAvailableExchangers(newState.exchangers.MB);
    let needed = updatedSbaInServiceCount - updatedMbInServiceCount;

    for (const mb of availableMB) {
      if (needed <= 0) break;
      mb.status = 'SERVICE';
      mb.lastStatusChange = newState.currentTime;
      needed--;

      const reason = `Matching MB count to SBA count. SBA in service: ${updatedSbaInServiceCount}, MB was: ${updatedMbInServiceCount}. Putting MB into service to maintain balance.`;
      events.push({
        timestamp: newState.currentTime,
        type: 'STATUS_CHANGE',
        message: `${mb.id} put into service - matching SBA count`,
        equipmentId: mb.id,
        severity: 'info',
      });
      logsheet.push(createLogsheetEntry(
        newState.currentTime,
        shiftStartHour,
        'EXCHANGER_TO_SERVICE',
        mb.id,
        reason,
        `Put ${mb.id} into service (matching SBA count)`,
        newDGLevel,
        avgDMLevel
      ));
    }
  } else if (updatedMbInServiceCount > updatedSbaInServiceCount && updatedSbaInServiceCount > 0) {
    // Need to reduce MBs to match SBA count - put lowest load on standby
    const mbInService = getInServiceExchangers(newState.exchangers.MB);
    let excess = updatedMbInServiceCount - updatedSbaInServiceCount;

    while (excess > 0 && mbInService.length > updatedSbaInServiceCount) {
      const lowestLoadMB = findLowestLoad(mbInService);
      lowestLoadMB.status = 'STANDBY';
      lowestLoadMB.lastStatusChange = newState.currentTime;
      const idx = mbInService.indexOf(lowestLoadMB);
      if (idx > -1) mbInService.splice(idx, 1);
      excess--;

      const reason = `Matching MB count to SBA count. SBA in service: ${updatedSbaInServiceCount}, MB was: ${updatedMbInServiceCount + excess + 1}. Selected ${lowestLoadMB.id} (lowest load: ${lowestLoadMB.currentLoad.toFixed(0)}) for standby.`;
      events.push({
        timestamp: newState.currentTime,
        type: 'STATUS_CHANGE',
        message: `${lowestLoadMB.id} put on standby - matching SBA count`,
        equipmentId: lowestLoadMB.id,
        severity: 'info',
      });
      logsheet.push(createLogsheetEntry(
        newState.currentTime,
        shiftStartHour,
        'EXCHANGER_TO_STANDBY',
        lowestLoadMB.id,
        reason,
        `Put ${lowestLoadMB.id} on standby (matching SBA count, lowest load)`,
        newDGLevel,
        avgDMLevel
      ));
    }
  }

  // Get tank status for transfer logic
  const serviceDMTanksAfter = newState.tanks.DM.filter((t) => t.status === 'SERVICE');
  const standbyDMTanks = newState.tanks.DM.filter((t) => t.status === 'STANDBY');
  const avgServiceDMLevel = serviceDMTanksAfter.length > 0
    ? serviceDMTanksAfter.reduce((sum, t) => sum + t.currentLevel, 0) / serviceDMTanksAfter.length
    : 0;

  // Rule 5: If DM < 0.8m AND DG < 0.8m, draw water from standby tank
  const dmCritical = avgServiceDMLevel < CONSTANTS.DM_CRITICAL_LEVEL_M;
  const dgCritical = newDGLevel < CONSTANTS.DG_CRITICAL_LEVEL_M;

  if (dmCritical && dgCritical && !newState.transfer.active) {
    const standbyWithWater = standbyDMTanks.find(
      (t) => t.currentLevel > CONSTANTS.DM_TRANSFER_TRIGGER_LEVEL_M
    );
    if (standbyWithWater) {
      newState.transfer = {
        active: true,
        mode: 'DRAW_FROM_STANDBY',
        sourceId: standbyWithWater.id,
        targetId: null,
        rate: CONSTANTS.DM_TRANSFER_RATE_M3HR,
      };
      const reason = `EMERGENCY: Both DM (${avgServiceDMLevel.toFixed(2)}m) and DG (${newDGLevel.toFixed(2)}m) critically low (below ${CONSTANTS.DM_CRITICAL_LEVEL_M}m). Drawing water from standby tank ${standbyWithWater.id} at ${standbyWithWater.currentLevel.toFixed(2)}m.`;
      events.push({
        timestamp: newState.currentTime,
        type: 'TRANSFER_START',
        message: `EMERGENCY: Drawing water from ${standbyWithWater.id} - both DM and DG critical`,
        equipmentId: standbyWithWater.id,
        severity: 'error',
      });
      logsheet.push(createLogsheetEntry(
        newState.currentTime,
        shiftStartHour,
        'TRANSFER_STARTED',
        standbyWithWater.id,
        reason,
        `Started emergency transfer from ${standbyWithWater.id} at ${CONSTANTS.DM_TRANSFER_RATE_M3HR} m³/hr`,
        newDGLevel,
        avgServiceDMLevel
      ));
    }
  }

  // Rule 6: If all standby tanks < 7m AND service DM tanks > 3m, fill standby tanks at 100 m³/hr (one by one)
  const allStandbyBelowTarget = standbyDMTanks.every(t => t.currentLevel < CONSTANTS.DM_STANDBY_FILL_TARGET_M);
  const allServiceAboveMin = serviceDMTanksAfter.every(t => t.currentLevel > CONSTANTS.DM_SERVICE_MIN_FOR_FILLING_M);

  if (allStandbyBelowTarget && allServiceAboveMin && !newState.transfer.active) {
    // Find the standby tank with lowest level to fill first
    const tankToFill = standbyDMTanks.reduce((lowest, t) =>
      t.currentLevel < lowest.currentLevel ? t : lowest
    );

    if (tankToFill && tankToFill.currentLevel < CONSTANTS.DM_STANDBY_FILL_TARGET_M) {
      newState.transfer = {
        active: true,
        mode: 'FILL_STANDBY',
        sourceId: null,
        targetId: tankToFill.id,
        rate: CONSTANTS.DM_STANDBY_FILL_RATE_M3HR,
      };
      const reason = `Service DM tanks healthy (all above ${CONSTANTS.DM_SERVICE_MIN_FOR_FILLING_M}m). Standby tanks below ${CONSTANTS.DM_STANDBY_FILL_TARGET_M}m target. Filling ${tankToFill.id} (current: ${tankToFill.currentLevel.toFixed(2)}m) from MB outlet at ${CONSTANTS.DM_STANDBY_FILL_RATE_M3HR} m³/hr.`;
      events.push({
        timestamp: newState.currentTime,
        type: 'TRANSFER_START',
        message: `Filling standby tank ${tankToFill.id} from MB outlet`,
        equipmentId: tankToFill.id,
        severity: 'info',
      });
      logsheet.push(createLogsheetEntry(
        newState.currentTime,
        shiftStartHour,
        'STANDBY_FILL_STARTED',
        tankToFill.id,
        reason,
        `Started filling ${tankToFill.id} at ${CONSTANTS.DM_STANDBY_FILL_RATE_M3HR} m³/hr`,
        newDGLevel,
        avgServiceDMLevel
      ));
    }
  }

  // Handle transfer stop conditions
  if (newState.transfer.active) {
    if (newState.transfer.mode === 'DRAW_FROM_STANDBY') {
      // Stop drawing from standby if service tanks recovered or source empty
      const serviceTanksRecovered = serviceDMTanksAfter.every(
        (t) => t.currentLevel > CONSTANTS.DM_WARNING_LOW_LEVEL_M
      );
      const sourceTank = newState.tanks.DM.find((t) => t.id === newState.transfer.sourceId);
      const sourceEmpty = sourceTank && sourceTank.currentLevel <= CONSTANTS.DM_TRANSFER_STOP_LEVEL_M;

      if (serviceTanksRecovered || sourceEmpty) {
        const reason = serviceTanksRecovered
          ? `Service tanks recovered above ${CONSTANTS.DM_WARNING_LOW_LEVEL_M}m. Transfer no longer needed.`
          : `Source tank ${newState.transfer.sourceId} depleted to ${sourceTank?.currentLevel.toFixed(2)}m. Stopping transfer.`;
        events.push({
          timestamp: newState.currentTime,
          type: 'TRANSFER_END',
          message: `Transfer from ${newState.transfer.sourceId} stopped`,
          equipmentId: newState.transfer.sourceId || '',
          severity: 'info',
        });
        logsheet.push(createLogsheetEntry(
          newState.currentTime,
          shiftStartHour,
          'TRANSFER_STOPPED',
          newState.transfer.sourceId || '',
          reason,
          `Stopped transfer from ${newState.transfer.sourceId}`,
          newDGLevel,
          getAverageDMLevel(newState)
        ));
        newState.transfer = { active: false, mode: null, sourceId: null, targetId: null, rate: 0 };
      }
    } else if (newState.transfer.mode === 'FILL_STANDBY') {
      // Stop filling standby if target reached or service tanks dropped too low
      const targetTank = newState.tanks.DM.find((t) => t.id === newState.transfer.targetId);
      const targetReached = targetTank && targetTank.currentLevel >= CONSTANTS.DM_STANDBY_FILL_TARGET_M;
      const serviceTanksLow = serviceDMTanksAfter.some(
        (t) => t.currentLevel <= CONSTANTS.DM_SERVICE_MIN_FOR_FILLING_M
      );

      if (targetReached || serviceTanksLow) {
        const reason = targetReached
          ? `${newState.transfer.targetId} reached target level of ${CONSTANTS.DM_STANDBY_FILL_TARGET_M}m. Filling complete.`
          : `Service tank levels dropped below ${CONSTANTS.DM_SERVICE_MIN_FOR_FILLING_M}m. Stopping standby fill to preserve service supply.`;
        events.push({
          timestamp: newState.currentTime,
          type: 'TRANSFER_END',
          message: targetReached
            ? `${newState.transfer.targetId} filled to target level`
            : `Standby fill stopped - service tanks need priority`,
          equipmentId: newState.transfer.targetId || '',
          severity: 'info',
        });
        logsheet.push(createLogsheetEntry(
          newState.currentTime,
          shiftStartHour,
          'STANDBY_FILL_COMPLETED',
          newState.transfer.targetId || '',
          reason,
          targetReached
            ? `Completed filling ${newState.transfer.targetId} to ${CONSTANTS.DM_STANDBY_FILL_TARGET_M}m`
            : `Stopped filling ${newState.transfer.targetId} - service tanks low`,
          newDGLevel,
          getAverageDMLevel(newState)
        ));
        newState.transfer = { active: false, mode: null, sourceId: null, targetId: null, rate: 0 };
      }
    }
  }

  // High DM level response - stream shutdown
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
    newState.exchangers.SAC[streamIndex].lastStatusChange = newState.currentTime;
    newState.exchangers.SBA[streamIndex].status = 'STANDBY';
    newState.exchangers.SBA[streamIndex].lastStatusChange = newState.currentTime;
    newState.exchangers.MB[streamIndex].status = 'STANDBY';
    newState.exchangers.MB[streamIndex].lastStatusChange = newState.currentTime;
    newState.streamOutOfService = streamLabel;

    const reason = `All DM tanks above overflow level (${CONSTANTS.DM_OVERFLOW_LEVEL_M}m). Shutting down Stream ${streamLabel} (highest combined load: ${maxLoad.toFixed(0)}) to prevent overflow.`;
    events.push({
      timestamp: newState.currentTime,
      type: 'LEVEL_WARNING',
      message: `Stream ${streamLabel} taken out of service - all tanks at overflow`,
      equipmentId: `Stream-${streamLabel}`,
      severity: 'error',
    });
    logsheet.push(createLogsheetEntry(
      newState.currentTime,
      shiftStartHour,
      'STREAM_SHUTDOWN',
      `Stream-${streamLabel}`,
      reason,
      `Shut down Stream ${streamLabel} (SAC-${streamLabel}, SBA-${streamLabel}, MB-${streamLabel})`,
      newDGLevel,
      getAverageDMLevel(newState)
    ));
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
        if (sac.status === 'STANDBY') {
          sac.status = 'SERVICE';
          sac.lastStatusChange = newState.currentTime;
        }
        if (sba.status === 'STANDBY') {
          sba.status = 'SERVICE';
          sba.lastStatusChange = newState.currentTime;
        }
        if (mb.status === 'STANDBY') {
          mb.status = 'SERVICE';
          mb.lastStatusChange = newState.currentTime;
        }

        const reason = `DM level dropped below ${CONSTANTS.DM_RECOVERY_LEVEL_M}m. Restoring Stream ${newState.streamOutOfService} to service.`;
        events.push({
          timestamp: newState.currentTime,
          type: 'STATUS_CHANGE',
          message: `Stream ${newState.streamOutOfService} returned to service`,
          equipmentId: `Stream-${newState.streamOutOfService}`,
          severity: 'info',
        });
        logsheet.push(createLogsheetEntry(
          newState.currentTime,
          shiftStartHour,
          'STREAM_RESTORED',
          `Stream-${newState.streamOutOfService}`,
          reason,
          `Restored Stream ${newState.streamOutOfService} to service`,
          newDGLevel,
          getAverageDMLevel(newState)
        ));
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
  const regenDetails: Record<string, RegenerationDetail> = {};

  for (const type of ['SAC', 'SBA', 'MB'] as ExchangerType[]) {
    const regen = state.regeneration[type];
    if (regen) {
      activeRegens.push(regen.exchangerId);
      regenPhases[regen.exchangerId] = regen.phase;

      const totalDuration = regen.totalEndTime - regen.startTime;
      const elapsedMinutes = state.currentTime - regen.startTime;
      const remainingMinutes = Math.max(0, regen.totalEndTime - state.currentTime);

      regenDetails[regen.exchangerId] = {
        exchangerId: regen.exchangerId,
        exchangerType: regen.exchangerType,
        phase: regen.phase,
        startTime: regen.startTime,
        elapsedMinutes,
        remainingMinutes,
        totalDuration,
        chemicalEndTime: regen.chemicalEndTime,
        totalEndTime: regen.totalEndTime,
      };
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
      details: regenDetails,
    },
    events,
  };
}

// Main simulation function
export function runSimulation(config: SimulationConfig): SimulationResult {
  const timeline: TimelineSnapshot[] = [];
  const allEvents: SimulationEvent[] = [];
  const logsheet: LogsheetEntry[] = [];
  let state = initializeState(config);

  // Get shift info
  const shiftInfo: ShiftInfo = SHIFT_INFO[config.shift];
  const shiftStartHour = shiftInfo.startHour;

  // Record initial state
  timeline.push(createSnapshot(state, []));

  // Run simulation for one complete shift (8 hours = 480 minutes)
  for (let t = 1; t <= CONSTANTS.SIMULATION_DURATION_MINUTES; t++) {
    const stepEvents: SimulationEvent[] = [];
    state = calculateNextState(
      state,
      CONSTANTS.CALCULATION_INTERVAL_MINUTES,
      stepEvents,
      logsheet,
      shiftStartHour
    );
    allEvents.push(...stepEvents);
    timeline.push(createSnapshot(state, stepEvents));
  }

  // Add logsheet entries for regenerations that completed during the shift
  for (const event of allEvents) {
    if (event.type === 'REGEN_START') {
      logsheet.push(createLogsheetEntry(
        event.timestamp,
        shiftStartHour,
        'REGENERATION_STARTED',
        event.equipmentId,
        `${event.equipmentId} reached OBR limit and requires regeneration.`,
        `Started regeneration of ${event.equipmentId}`,
        undefined,
        undefined
      ));
    } else if (event.type === 'REGEN_COMPLETE') {
      logsheet.push(createLogsheetEntry(
        event.timestamp,
        shiftStartHour,
        'REGENERATION_COMPLETED',
        event.equipmentId,
        `${event.equipmentId} regeneration cycle completed. Exchanger ready for standby.`,
        `Completed regeneration of ${event.equipmentId}`,
        undefined,
        undefined
      ));
    }
  }

  // Sort logsheet by timestamp
  logsheet.sort((a, b) => a.timestamp - b.timestamp);

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
    logsheet,
    shiftInfo,
  };
}
