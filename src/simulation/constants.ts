export const CONSTANTS = {
  // Time
  SIMULATION_DURATION_MINUTES: 480, // 8 hours = one shift
  DEFAULT_PLAYBACK_SPEED: 50,
  CALCULATION_INTERVAL_MINUTES: 1,

  // Shift Configuration
  SHIFT_A_START_HOUR: 6,   // 6:00 AM
  SHIFT_A_END_HOUR: 14,    // 2:00 PM
  SHIFT_B_START_HOUR: 14,  // 2:00 PM
  SHIFT_B_END_HOUR: 22,    // 10:00 PM
  SHIFT_C_START_HOUR: 22,  // 10:00 PM
  SHIFT_C_END_HOUR: 6,     // 6:00 AM (next day)

  // DG Tank
  DG_DIAMETER_M: 7,
  DG_HEIGHT_M: 4,
  DG_AREA_M2: 38.5,
  DG_VOLUME_PER_METER: 38.5,
  DG_COMBINED_AREA_M2: 77,
  DG_OVERFLOW_LEVEL_M: 2.2,
  DG_MIN_LEVEL_M: 0.8,
  DG_TOTAL_CAPACITY_M3: 154,
  DG_WARNING_LOW_LEVEL_M: 1.0,
  DG_WARNING_HIGH_LEVEL_M: 2.0,
  // New threshold for exchanger service logic
  DG_LOW_THRESHOLD_M: 1.0,  // If DG < 1m, run all available cations

  // DM Tank
  DM_CAPACITY_M3: 800,
  DM_HEIGHT_M: 8,
  DM_VOLUME_PER_METER: 100,
  DM_OVERFLOW_LEVEL_M: 7.3,
  DM_MIN_LEVEL_M: 0.8,
  DM_TRANSFER_RATE_M3HR: 400,
  DM_WARNING_LOW_LEVEL_M: 1.5,
  DM_WARNING_HIGH_LEVEL_M: 6.5,
  DM_RECOVERY_LEVEL_M: 6.5,
  DM_TRANSFER_TRIGGER_LEVEL_M: 1.0,
  DM_TRANSFER_STOP_LEVEL_M: 0.8,
  // New threshold for exchanger service logic
  DM_LOW_THRESHOLD_M: 7.0,  // If DM < 7m, run all available anions (when DG > 0.8m)
  DM_CRITICAL_LEVEL_M: 0.8, // Critical level for emergency transfer
  DM_SERVICE_MIN_FOR_FILLING_M: 3.0, // Service tanks must be > 3m to fill standby
  DM_STANDBY_FILL_TARGET_M: 7.0, // Fill standby tanks up to 7m
  DM_STANDBY_FILL_RATE_M3HR: 100, // Fill rate for standby tanks

  // DG Critical threshold
  DG_CRITICAL_LEVEL_M: 0.8,  // Critical DG level for anion reduction

  // Maximum exchangers in service for each type
  MAX_EXCHANGERS_IN_SERVICE: 4,

  // Exchangers
  EXCHANGER_FLOW_MIN: 60,
  EXCHANGER_FLOW_MAX: 160,

  // Default Flow Rates
  DEFAULT_SAC_FLOW: 140,
  DEFAULT_SBA_FLOW: 110,
  DEFAULT_MB_FLOW: 110,

  // Default OBR Values
  DEFAULT_SAC_OBR: 1500,
  DEFAULT_SBA_OBR: 1100,
  DEFAULT_MB_OBR: 7000,

  // Supply Ranges
  TPP_FLOW_MIN: 150,
  TPP_FLOW_MAX: 400,
  TPP_FLOW_DEFAULT: 250,
  CDCP_FLOW_MIN: 100,
  CDCP_FLOW_MAX: 250,
  CDCP_FLOW_DEFAULT: 150,
  MILLS_FLOW_MIN: 3,
  MILLS_FLOW_MAX: 20,
  MILLS_FLOW_DEFAULT: 10,

  // Regeneration - SAC
  SAC_REGEN_CHEMICAL_DURATION_MIN: 150,
  SAC_REGEN_RINSE_DURATION_MIN: 30,
  SAC_REGEN_TOTAL_DURATION_MIN: 180,
  SAC_REGEN_DG_RATE_M3HR: 30,

  // Regeneration - SBA
  SBA_REGEN_CHEMICAL_DURATION_MIN: 150,
  SBA_REGEN_DG_DURATION_MIN: 20,
  SBA_REGEN_RINSE_DURATION_MIN: 20,
  SBA_REGEN_TOTAL_DURATION_MIN: 170,
  SBA_REGEN_DG_RATE_M3HR: 30,
  SBA_REGEN_DM_RATE_M3HR: 25,
  SBA_REGEN_RINSE_DG_RATE_M3HR: 120,

  // Regeneration - MB
  MB_REGEN_CHEMICAL_DURATION_MIN: 150,
  MB_REGEN_DG_DURATION_MIN: 40,
  MB_REGEN_RINSE_DURATION_MIN: 20,
  MB_REGEN_TOTAL_DURATION_MIN: 170,
  MB_REGEN_DG_RATE_M3HR: 30,
  MB_REGEN_DM_RATE_M3HR: 25,
  MB_REGEN_RINSE_DG_RATE_M3HR: 120,

  // Number of units
  NUM_SAC: 5,
  NUM_SBA: 5,
  NUM_MB: 5,
  NUM_DG: 2,
  NUM_DM: 5,
  NUM_DM_IN_SERVICE: 2,
};

export const EXCHANGER_LABELS = ['A', 'B', 'C', 'D', 'E'];

// Shift Information
export const SHIFT_INFO = {
  A: { type: 'A' as const, name: 'A Shift (Morning)', startHour: 6, endHour: 14 },
  B: { type: 'B' as const, name: 'B Shift (Afternoon)', startHour: 14, endHour: 22 },
  C: { type: 'C' as const, name: 'C Shift (Night)', startHour: 22, endHour: 6 },
};

export const STATUS_COLORS = {
  SERVICE: { bg: 'bg-success-100', text: 'text-success-600', fill: '#22c55e' },
  STANDBY: { bg: 'bg-slate-100', text: 'text-slate-600', fill: '#64748b' },
  REGENERATION: { bg: 'bg-warning-100', text: 'text-warning-600', fill: '#f59e0b' },
  MAINTENANCE: { bg: 'bg-danger-100', text: 'text-danger-600', fill: '#ef4444' },
};

export const LEVEL_COLORS = {
  normal: '#3b82f6',
  caution: '#f59e0b',
  critical: '#ef4444',
};
