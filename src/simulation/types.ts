// Equipment Types
export type ExchangerType = 'SAC' | 'SBA' | 'MB';
export type TankType = 'DG' | 'DM';
export type EquipmentStatus = 'SERVICE' | 'STANDBY' | 'REGENERATION' | 'MAINTENANCE';
export type TankStatus = 'SERVICE' | 'STANDBY';
export type RegenerationPhase = 'CHEMICAL' | 'RINSE' | 'COMPLETE';

// Shift Types
export type ShiftType = 'A' | 'B' | 'C';

// Shift Configuration
export interface ShiftInfo {
  type: ShiftType;
  name: string;
  startHour: number; // 24-hour format
  endHour: number;   // 24-hour format
}

// Event Types
export type EventType =
  | 'REGEN_START'
  | 'REGEN_PHASE_CHANGE'
  | 'REGEN_COMPLETE'
  | 'STATUS_CHANGE'
  | 'LEVEL_WARNING'
  | 'TRANSFER_START'
  | 'TRANSFER_END'
  | 'EXHAUSTION';

// Logsheet Action Types
export type LogsheetActionType =
  | 'EXCHANGER_TO_SERVICE'
  | 'EXCHANGER_TO_STANDBY'
  | 'REGENERATION_STARTED'
  | 'REGENERATION_COMPLETED'
  | 'TRANSFER_STARTED'
  | 'TRANSFER_STOPPED'
  | 'STANDBY_FILL_STARTED'
  | 'STANDBY_FILL_COMPLETED'
  | 'STREAM_SHUTDOWN'
  | 'STREAM_RESTORED';

// Logsheet Entry - for automated actions log
export interface LogsheetEntry {
  timestamp: number;           // Minutes from shift start
  actualTime: string;          // Actual clock time (e.g., "06:30")
  action: LogsheetActionType;
  equipmentId: string;
  reason: string;              // Detailed reason for the action
  dgLevel?: number;            // DG level at time of action
  dmLevel?: number;            // Average DM level at time of action
  operatorAction: string;      // Human-readable action description
}

// Configuration Interfaces
export interface ExchangerConfig {
  id: string;
  initialStatus: Exclude<EquipmentStatus, 'REGENERATION'>;
  initialLoad: number;
  obrLimit: number;
  flowRate: number;
}

export interface TankConfig {
  id: string;
  initialLevel: number;
}

export interface DMTankConfig extends TankConfig {
  initialStatus: TankStatus;
}

export interface SupplyConfig {
  TPP: number;
  CDCP: number;
  Mills: number;
}

export interface SimulationConfig {
  exchangers: {
    SAC: ExchangerConfig[];
    SBA: ExchangerConfig[];
    MB: ExchangerConfig[];
  };
  tanks: {
    DG: TankConfig[];
    DM: DMTankConfig[];
  };
  supply: SupplyConfig;
  shift: ShiftType;
}

// State Interfaces
export interface ExchangerState {
  id: string;
  type: ExchangerType;
  status: EquipmentStatus;
  currentLoad: number;
  obrLimit: number;
  flowRate: number;
  loadPercentage: number;
}

export interface TankState {
  id: string;
  type: TankType;
  currentLevel: number;
  currentVolume: number;
  status: TankStatus;
  levelPercentage: number;
}

export interface RegenerationState {
  exchangerId: string;
  exchangerType: ExchangerType;
  phase: RegenerationPhase;
  startTime: number;
  phaseStartTime: number;
  chemicalEndTime: number;
  totalEndTime: number;
  dgConsumptionEndTime: number;
}

// Transfer modes
export type TransferMode = 'DRAW_FROM_STANDBY' | 'FILL_STANDBY';

export interface TransferState {
  active: boolean;
  mode: TransferMode | null;
  sourceId: string | null;  // For DRAW_FROM_STANDBY: standby tank being drawn from
  targetId: string | null;  // For FILL_STANDBY: standby tank being filled
  rate: number;
}

export interface SimulationState {
  currentTime: number;
  exchangers: {
    SAC: ExchangerState[];
    SBA: ExchangerState[];
    MB: ExchangerState[];
  };
  tanks: {
    DG: TankState[];
    DM: TankState[];
  };
  supply: SupplyConfig;
  regeneration: {
    SAC: RegenerationState | null;
    SBA: RegenerationState | null;
    MB: RegenerationState | null;
  };
  regenerationQueue: {
    SAC: string[];
    SBA: string[];
    MB: string[];
  };
  transfer: TransferState;
  streamOutOfService: string | null;
}

// Event and Snapshot Interfaces
export interface SimulationEvent {
  timestamp: number;
  type: EventType;
  message: string;
  equipmentId: string;
  severity: 'info' | 'warning' | 'error';
}

export interface FlowSnapshot {
  sacTotalOutput: number;
  sbaTotalOutput: number;
  mbTotalOutput: number;
  totalSupply: number;
  dgNetFlow: number;
  dmNetFlow: number;
  dgRegenConsumption: number;
  dmRegenConsumption: number;
}

export interface TimelineSnapshot {
  timestamp: number;
  exchangers: Record<string, {
    status: EquipmentStatus;
    load: number;
    loadPercentage: number;
    flowRate: number;
  }>;
  tanks: Record<string, {
    level: number;
    volume: number;
    status: TankStatus;
    levelPercentage: number;
  }>;
  flows: FlowSnapshot;
  regeneration: {
    active: string[];
    queue: string[];
    phases: Record<string, RegenerationPhase>;
  };
  events: SimulationEvent[];
}

export interface SimulationSummary {
  totalWaterProduced: number;
  totalWaterSupplied: number;
  regenerationsCompleted: number;
  regenerationsStarted: number;
  averageDGLevel: number;
  averageDMLevel: number;
  minDGLevel: number;
  minDMLevel: number;
  maxDGLevel: number;
  maxDMLevel: number;
  criticalEvents: number;
  warnings: number;
}

export interface SimulationResult {
  config: SimulationConfig;
  timeline: TimelineSnapshot[];
  summary: SimulationSummary;
  allEvents: SimulationEvent[];
  logsheet: LogsheetEntry[];
  shiftInfo: ShiftInfo;
}
