# Water Treatment Plant Simulator - Technical Specification

## Document Version: 1.0
## Date: December 2024

---

# Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Plant Configuration](#3-plant-configuration)
4. [Equipment Specifications](#4-equipment-specifications)
5. [Process Flow Logic](#5-process-flow-logic)
6. [State Management](#6-state-management)
7. [Regeneration Sequences](#7-regeneration-sequences)
8. [Automatic Control Logic](#8-automatic-control-logic)
9. [Simulation Engine](#9-simulation-engine)
10. [Data Models](#10-data-models)
11. [User Interface Specification](#11-user-interface-specification)
12. [Technical Architecture](#12-technical-architecture)
13. [Implementation Roadmap](#13-implementation-roadmap)
14. [Appendices](#14-appendices)

---

# 1. Executive Summary

## 1.1 Project Purpose

This document specifies a web-based simulator for a Demineralized (DM) Water Treatment Plant. The simulator models water flow through ion exchange processes, enabling users to visualize plant behavior over an 8-hour operational shift.

## 1.2 Key Features

- **Timeline-based simulation**: 8-hour shift simulation viewable in approximately 5-10 minutes (50x speed)
- **State propagation**: Each time step calculates the next state based on current conditions
- **Automatic control**: System automatically handles regeneration scheduling, exchanger switching, and tank level management
- **Visual dashboard**: Real-time visualization of exchanger loads and tank levels
- **Responsive design**: Fully functional on mobile devices and desktop screens
- **Modular architecture**: Easy addition of upstream/downstream equipment in future

## 1.3 Scope

**In Scope (Phase 1):**
- 5 Strong Acid Cation (SAC) Exchangers
- 2 Degasser (DG) Tanks
- 5 Strong Base Anion (SBA) Exchangers
- 5 Mixed Bed (MB) Exchangers
- 5 DM Storage Tanks
- 3 DM Water Supply Lines (TPP, CDCP, Mills)

**Out of Scope (Future Phases):**
- Upstream raw water treatment
- Chemical dosing systems
- Detailed water quality parameters (conductivity, pH, silica)

---

# 2. System Overview

## 2.1 Process Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    WATER TREATMENT PLANT                                 │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                                         INLET WATER
                                              │
                                              ▼
                    ┌─────────────────────────────────────────────────┐
                    │              SAC EXCHANGERS (5 units)           │
                    │  ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐             │
                    │  │ A │  │ B │  │ C │  │ D │  │ E │             │
                    │  └─┬─┘  └─┬─┘  └─┬─┘  └─┬─┘  └─┬─┘             │
                    │    └──────┴──────┴──────┴──────┘                │
                    │                    │                            │
                    └────────────────────┼────────────────────────────┘
                                         │ Cumulative Flow
                                         ▼
                    ┌─────────────────────────────────────────────────┐
                    │              DG TANKS (2 units - Parallel)       │
                    │         ┌─────────┐     ┌─────────┐             │
                    │         │  DG-A   │     │  DG-B   │             │
                    │         │         │     │         │             │
                    │         └────┬────┘     └────┬────┘             │
                    │              └───────┬───────┘                  │
                    │                      │                          │
                    │    ◄── Regen water to SAC, SBA, MB              │
                    └──────────────────────┼──────────────────────────┘
                                           │
                                           ▼
                    ┌─────────────────────────────────────────────────┐
                    │              SBA EXCHANGERS (5 units)           │
                    │  ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐             │
                    │  │ A │  │ B │  │ C │  │ D │  │ E │             │
                    │  └─┬─┘  └─┬─┘  └─┬─┘  └─┬─┘  └─┬─┘             │
                    │    └──────┴──────┴──────┴──────┘                │
                    │                    │                            │
                    └────────────────────┼────────────────────────────┘
                                         │ Cumulative Flow
                                         ▼
                    ┌─────────────────────────────────────────────────┐
                    │              MB EXCHANGERS (5 units)            │
                    │  ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐             │
                    │  │ A │  │ B │  │ C │  │ D │  │ E │             │
                    │  └─┬─┘  └─┬─┘  └─┬─┘  └─┬─┘  └─┬─┘             │
                    │    └──────┴──────┴──────┴──────┘                │
                    │                    │                            │
                    └────────────────────┼────────────────────────────┘
                                         │ Cumulative Flow
                                         ▼
                    ┌─────────────────────────────────────────────────┐
                    │           DM STORAGE TANKS (5 units)            │
                    │  ┌───┐  ┌───┐  ┌───┐  ┌───┐  ┌───┐             │
                    │  │ A │  │ B │  │ C │  │ D │  │ E │             │
                    │  └─┬─┘  └─┬─┘  └─┬─┘  └─┬─┘  └─┬─┘             │
                    │    │      │      │      │      │                │
                    │    └──────┴──────┴──────┴──────┘                │
                    │              │     │                            │
                    │    ◄── Regen water to SBA, MB                   │
                    └──────────────┼─────┼────────────────────────────┘
                                   │     │
                    ┌──────────────┼─────┼────────────────────────────┐
                    │              ▼     ▼                            │
                    │         DM SUPPLY PUMPS                         │
                    │    ┌─────┐  ┌──────┐  ┌───────┐                 │
                    │    │ TPP │  │ CDCP │  │ Mills │                 │
                    │    └──┬──┘  └──┬───┘  └───┬───┘                 │
                    │       │        │          │                     │
                    └───────┼────────┼──────────┼─────────────────────┘
                            ▼        ▼          ▼
                      TO THERMAL   TO CDCP    TO MILLS
                      POWER PLANT
```

## 2.2 Water Balance Concept

The plant operates on a simple mass balance principle:

**For DG Tanks:**
```
DG Level Change = (SAC Output - SBA Intake - Regeneration Consumption) × Time / Tank Area
```

**For DM Tanks:**
```
DM Level Change = (MB Output - Supply Demand - Regeneration Consumption + Inter-tank Transfer) × Time / Tank Area
```

---

# 3. Plant Configuration

## 3.1 Equipment Inventory

| Equipment Type | Tag Names | Quantity | Operating Mode |
|---------------|-----------|----------|----------------|
| SAC Exchangers | SAC-A, SAC-B, SAC-C, SAC-D, SAC-E | 5 | Variable (Service/Standby/Regen/Maintenance) |
| DG Tanks | DG-A, DG-B | 2 | Always in Service, Parallel |
| SBA Exchangers | SBA-A, SBA-B, SBA-C, SBA-D, SBA-E | 5 | Variable (Service/Standby/Regen/Maintenance) |
| MB Exchangers | MB-A, MB-B, MB-C, MB-D, MB-E | 5 | Variable (Service/Standby/Regen/Maintenance) |
| DM Tanks | DMT-A, DMT-B, DMT-C, DMT-D, DMT-E | 5 | 2 in Service, 3 in Standby |
| Supply Lines | TPP, CDCP, Mills | 3 | Always Active |

## 3.2 Stream Concept

A "stream" is a complete water treatment train consisting of:
- 1 SAC Exchanger → 1 SBA Exchanger → 1 MB Exchanger

There are effectively 5 parallel streams (A through E), though they share common DG and DM tanks.

**Stream Mapping:**
| Stream | SAC | SBA | MB |
|--------|-----|-----|-----|
| Stream A | SAC-A | SBA-A | MB-A |
| Stream B | SAC-B | SBA-B | MB-B |
| Stream C | SAC-C | SBA-C | MB-C |
| Stream D | SAC-D | SBA-D | MB-D |
| Stream E | SAC-E | SBA-E | MB-E |

---

# 4. Equipment Specifications

## 4.1 Ion Exchangers (SAC, SBA, MB)

### 4.1.1 Common Specifications

| Parameter | SAC | SBA | MB | Unit |
|-----------|-----|-----|-----|------|
| Flow Rate Range | 60 - 160 | 60 - 160 | 60 - 160 | m³/hr |
| Default Flow Rate | 140 | 110 | 110 | m³/hr |
| Default OBR (Exhaustion Limit) | 1500 | 1100 | 7000 | m³ |
| Number of Units | 5 | 5 | 5 | - |

### 4.1.2 Exchanger States

| State | Code | Description | Water Processing | Can Change To |
|-------|------|-------------|------------------|---------------|
| Service | SVC | Active, processing water | YES | Standby, Regeneration, Maintenance |
| Standby | STB | Ready but not processing | NO | Service, Regeneration, Maintenance |
| Regeneration | RGN | Being regenerated | NO | Standby (automatic after completion) |
| Maintenance | MNT | Out for maintenance | NO | Standby (manual only) |

### 4.1.3 Load Calculation Formula

```
Load(t+1) = Load(t) + (FlowRate × Δt / 60)

Where:
- Load is in m³ (cumulative water processed since last regeneration)
- FlowRate is in m³/hr
- Δt is the time interval in minutes
```

**Example:**
- Current Load: 500 m³
- Flow Rate: 140 m³/hr
- Time Interval: 1 minute
- New Load = 500 + (140 × 1 / 60) = 500 + 2.33 = 502.33 m³

## 4.2 DG Tanks (Degasser Tanks)

### 4.2.1 Physical Specifications

| Parameter | Value | Unit |
|-----------|-------|------|
| Diameter | 7 | meters |
| Height | 4 | meters |
| Cross-sectional Area | 38.5 | m² |
| Volume per meter height | 38.5 | m³/m |
| Total Capacity | 154 | m³ |
| Overflow Level | 2.2 | meters |
| Minimum Operating Level | 0.8 | meters |
| Operating Volume Range | 30.8 - 84.7 | m³ |

### 4.2.2 Operating Mode

- Both DG tanks operate **in parallel** at all times
- Inlet flow is split equally between both tanks
- Outlet flow is drawn equally from both tanks
- Level should be maintained equal in both tanks (simplified model: treat as single combined tank)

### 4.2.3 Level Calculation Formula

```
Combined DG Volume = 2 × π × (3.5)² × Level = 77 × Level (m³)

Level Change (Δh) = ΔVolume / 77

Where:
ΔVolume = Inflow - Outflow - Regen Consumption (all in m³)
```

## 4.3 DM Storage Tanks

### 4.3.1 Physical Specifications

| Parameter | Value | Unit |
|-----------|-------|------|
| Capacity | 800 | m³ |
| Height | 8 | meters |
| Volume per meter height | 100 | m³/m |
| Overflow Level | 7.3 | meters |
| Minimum Operating Level | 0.8 | meters |
| Operating Volume Range | 80 - 730 | m³ |
| Inter-tank Transfer Rate | 400 | m³/hr |

### 4.3.2 Operating Mode

- **2 tanks in Service** at any time (parallel operation)
- **3 tanks in Standby** (can be brought into service or used for inter-tank transfer)
- User selects which 2 tanks are initially in service
- Equal inlet/outlet distribution between tanks in service

### 4.3.3 Level Calculation Formula

```
For tanks in service (2 tanks sharing load):
Level Change per tank (Δh) = ΔVolume / (2 × 100)

Where:
ΔVolume = MB Output - Supply Demand - Regen Consumption + Transfer In (all in m³)
```

## 4.4 DM Supply Lines

### 4.4.1 Specifications

| Supply Line | Tag | Flow Rate Range (m³/hr) | Default Flow Rate (m³/hr) |
|-------------|-----|------------------------|---------------------------|
| Thermal Power Plant | TPP | 150 - 400 | 250 |
| CDCP | CDCP | 100 - 250 | 150 |
| Mills | Mills | 3 - 20 | 10 |

### 4.4.2 Operating Mode

- All supply lines draw from tanks in service
- Flow rates are user-specified at simulation start
- Supply flow rates remain constant during simulation (no automatic adjustment)

---

# 5. Process Flow Logic

## 5.1 Normal Operation Flow

```
Step 1: SAC Processing
├── Each SAC in SERVICE processes water at its set flow rate
├── Cumulative SAC Output = Σ(Flow rate of all SACs in SERVICE)
└── SAC Load increases based on flow rate

Step 2: DG Tank Balance
├── Inflow = SAC Cumulative Output
├── Outflow = Water drawn by SBAs in SERVICE
├── Regen Draw = Water consumed by regenerating SAC, SBA, or MB
└── Level adjusts based on net flow

Step 3: SBA Processing
├── Each SBA in SERVICE processes water at its set flow rate
├── SBA intake equals SBA output (no loss)
├── Cumulative SBA Output = Σ(Flow rate of all SBAs in SERVICE)
└── SBA Load increases based on flow rate

Step 4: MB Processing
├── Each MB in SERVICE processes water at its set flow rate
├── MB intake equals MB output (no loss)
├── Cumulative MB Output = Σ(Flow rate of all MBs in SERVICE)
└── MB Load increases based on flow rate

Step 5: DM Tank Balance
├── Inflow = MB Cumulative Output
├── Outflow = TPP + CDCP + Mills demand
├── Regen Draw = Water consumed by regenerating SBA or MB
├── Transfer = Inter-tank transfer if triggered
└── Level adjusts based on net flow

Step 6: DM Supply
├── Water supplied to TPP, CDCP, Mills at set rates
└── Drawn from tanks in service
```

## 5.2 Flow Rate Constraints

### 5.2.1 Balance Requirements

For stable operation, the system should ideally maintain:

```
SAC Total Output ≥ SBA Total Intake + Regen Consumption
SBA Total Output = MB Total Intake (direct flow)
MB Total Output ≥ DM Supply Demand + Regen Consumption
```

### 5.2.2 Automatic Balancing

The simulator does NOT automatically balance flow rates. Instead:
- If DG level drops too low → Take SBA out of service (reduces outflow)
- If DM level drops too low → Draw from standby tanks
- If all DM tanks overflow → Take one stream out of service

---

# 6. State Management

## 6.1 Global Simulation State

```
SimulationState {
    currentTime: number (minutes from start, 0 to 480)
    simulationSpeed: number (default 50x)
    isRunning: boolean
    
    exchangers: {
        SAC: ExchangerState[5]
        SBA: ExchangerState[5]
        MB: ExchangerState[5]
    }
    
    tanks: {
        DG: TankState[2]
        DM: TankState[5]
    }
    
    supply: {
        TPP: SupplyState
        CDCP: SupplyState
        Mills: SupplyState
    }
    
    regenerationQueue: {
        SAC: RegenerationState | null
        SBA: RegenerationState | null
        MB: RegenerationState | null
    }
    
    history: TimelineSnapshot[]
}
```

## 6.2 Exchanger State Model

```
ExchangerState {
    id: string (e.g., "SAC-A")
    type: "SAC" | "SBA" | "MB"
    status: "SERVICE" | "STANDBY" | "REGENERATION" | "MAINTENANCE"
    currentLoad: number (m³)
    obrLimit: number (m³)
    flowRate: number (m³/hr)
    loadPercentage: number (currentLoad / obrLimit × 100)
}
```

## 6.3 Tank State Model

```
TankState {
    id: string (e.g., "DG-A", "DMT-A")
    type: "DG" | "DM"
    currentLevel: number (meters)
    currentVolume: number (m³)
    status: "SERVICE" | "STANDBY"
    levelPercentage: number (based on operating range)
}
```

## 6.4 Regeneration State Model

```
RegenerationState {
    exchangerId: string
    exchangerType: "SAC" | "SBA" | "MB"
    phase: "CHEMICAL" | "RINSE" | "COMPLETE"
    phaseStartTime: number
    phaseEndTime: number
    waterSource: "DG" | "DM" | "NONE"
    waterConsumptionRate: number (m³/hr)
}
```

## 6.5 Timeline Snapshot

```
TimelineSnapshot {
    timestamp: number (minutes from start)
    exchangerLoads: Map<string, number>
    exchangerStatuses: Map<string, string>
    tankLevels: Map<string, number>
    flowRates: {
        sacTotal: number
        sbaTotal: number
        mbTotal: number
        supplyTotal: number
    }
    events: string[] (e.g., "SAC-A started regeneration")
}
```

---

# 7. Regeneration Sequences

## 7.1 SAC Regeneration

| Phase | Duration | Water Source | Consumption Rate | Notes |
|-------|----------|--------------|------------------|-------|
| Chemical Injection | 150 min (2.5 hr) | DG Tank | 30 m³/hr | Total: 75 m³ from DG |
| Rinse | 30 min | None | 0 m³/hr | No external water consumption |
| **Total** | **180 min (3 hr)** | - | - | Ready for service after |

**Timeline:**
```
0 min ──────────────── 150 min ──────── 180 min
   │                      │                │
   │    CHEMICAL PHASE    │  RINSE PHASE   │
   │   (30 m³/hr from DG) │  (no water)    │
   │                      │                │
   └──────────────────────┴────────────────┘
                                           │
                                    → STANDBY
```

**Note:** After 150 minutes (chemical phase complete), another SAC can begin regeneration.

## 7.2 SBA Regeneration

| Phase | Duration | DG Consumption | DM Consumption | Notes |
|-------|----------|----------------|----------------|-------|
| Chemical Injection | 150 min (2.5 hr) | 30 m³/hr (first 20 min only) | 25 m³/hr | DG: 10 m³, DM: 62.5 m³ |
| Rinse | 20 min | 120 m³/hr | 0 m³/hr | DG: 40 m³ |
| **Total** | **170 min** | **50 m³** | **62.5 m³** | Ready for service after |

**Timeline:**
```
0 min ── 20 min ────────────────── 150 min ──── 170 min
   │        │                          │           │
   │  DG+DM │      DM ONLY             │   RINSE   │
   │ 30+25  │      25 m³/hr            │  120 m³/hr│
   │ m³/hr  │      from DM             │  from DG  │
   └────────┴──────────────────────────┴───────────┘
                                                   │
                                            → STANDBY
```

**Note:** After 150 minutes (chemical phase complete), another SBA can begin regeneration.

## 7.3 MB Regeneration

| Phase | Duration | DG Consumption | DM Consumption | Notes |
|-------|----------|----------------|----------------|-------|
| Chemical Injection | 150 min (2.5 hr) | 30 m³/hr (first 40 min only) | 25 m³/hr | DG: 20 m³, DM: 62.5 m³ |
| Rinse | 20 min | 120 m³/hr | 0 m³/hr | DG: 40 m³ |
| **Total** | **170 min** | **60 m³** | **62.5 m³** | Ready for service after |

**Timeline:**
```
0 min ──── 40 min ────────────────── 150 min ──── 170 min
   │          │                          │           │
   │  DG+DM   │       DM ONLY            │   RINSE   │
   │  30+25   │       25 m³/hr           │  120 m³/hr│
   │  m³/hr   │       from DM            │  from DG  │
   └──────────┴──────────────────────────┴───────────┘
                                                     │
                                              → STANDBY
```

**Note:** After 150 minutes (chemical phase complete), another MB can begin regeneration.

## 7.4 Regeneration Constraints

1. **Concurrent Regeneration Limits:**
   - Maximum 1 SAC regenerating at a time
   - Maximum 1 SBA regenerating at a time
   - Maximum 1 MB regenerating at a time
   - Different types CAN regenerate simultaneously

2. **Queue Management:**
   - If multiple exchangers of same type reach OBR, they queue
   - First exhausted = First regenerated
   - New regeneration starts when previous enters RINSE phase (150 min)

3. **Automatic Standby Activation:**
   - When exchanger starts regeneration, system finds exchanger of same type in STANDBY
   - That exchanger is automatically put into SERVICE
   - If no STANDBY available, system continues with reduced capacity

---

# 8. Automatic Control Logic

## 8.1 Exhaustion Detection and Regeneration Trigger

```
EVERY simulation tick:
    FOR each exchanger:
        IF exchanger.status == SERVICE AND exchanger.currentLoad >= exchanger.obrLimit:
            exchanger.status = PENDING_REGENERATION
            ADD to regenerationQueue[exchanger.type]
            
    FOR each type in [SAC, SBA, MB]:
        IF regenerationQueue[type] is not empty AND no active regeneration for type:
            START regeneration for first exchanger in queue
            FIND standby exchanger of same type
            IF found:
                PUT standby into SERVICE
```

## 8.2 Low DG Tank Level Response

```
IF DG combined level < 0.8 meters:
    FIND any SBA in SERVICE with lowest load
    SET that SBA to STANDBY
    LOG event: "SBA-X taken out of service due to low DG level"
    
    // This reduces DG outflow, allowing level to recover
    // The corresponding SAC and MB continue operating
```

## 8.3 Low DM Tank Level Response

```
IF any DM tank in SERVICE has level < 0.8 meters:
    FIND DM tanks in STANDBY with level > 1.0 meters
    FOR each suitable standby tank:
        INITIATE transfer at 400 m³/hr to tanks in service
        LOG event: "Drawing water from DMT-X to service tanks"
        
    // Transfer continues until:
    // - Service tank levels recover above 1.5 meters, OR
    // - Standby tank level drops to 0.8 meters
```

## 8.4 High DM Tank Level Response (Overflow Prevention)

```
IF ALL DM tanks (service + standby) have level > 7.3 meters:
    FIND stream with highest combined exchanger load
    SET that stream's SAC, SBA, MB to STANDBY
    LOG event: "Stream X taken out of service - all tanks at overflow"
    
    // This reduces DM inflow
    // Stream can be brought back when levels drop
```

## 8.5 Stream Out-of-Service Recovery

```
IF any stream is in STANDBY due to overflow AND any DM tank level < 6.5 meters:
    SET that stream's SAC, SBA, MB back to SERVICE
    LOG event: "Stream X returned to service"
```

## 8.6 Decision Priority Order

When multiple conditions are true, handle in this order:
1. Low DM level (safety critical - supply interruption)
2. Low DG level (affects downstream processing)
3. Exhaustion/Regeneration (normal operation)
4. High DM level (overflow prevention)

---

# 9. Simulation Engine

## 9.1 Time Management

| Parameter | Value |
|-----------|-------|
| Simulation Duration | 480 minutes (8 hours) |
| Calculation Interval | 1 minute |
| Display Update Interval | 1 minute (480 data points) |
| Playback Speed | 50x (8 hours in ~9.6 minutes real-time) |
| User Control | Play, Pause, Scrub timeline |

## 9.2 Simulation Loop Pseudocode

```
FUNCTION runSimulation(initialState):
    state = initialState
    history = []
    
    FOR t = 0 TO 480 (minutes):
        // Step 1: Calculate exchanger outputs
        sacOutput = calculateSACOutput(state)
        sbaOutput = calculateSBAOutput(state)
        mbOutput = calculateMBOutput(state)
        
        // Step 2: Calculate regeneration water consumption
        regenDGConsumption = calculateRegenDGConsumption(state)
        regenDMConsumption = calculateRegenDMConsumption(state)
        
        // Step 3: Calculate supply demand
        supplyDemand = state.supply.TPP + state.supply.CDCP + state.supply.Mills
        
        // Step 4: Calculate tank transfers (if any)
        dmTransfer = calculateDMTransfer(state)
        
        // Step 5: Update DG tank levels
        dgNetFlow = sacOutput - sbaOutput - regenDGConsumption
        state.tanks.DG = updateDGLevels(state.tanks.DG, dgNetFlow, 1)
        
        // Step 6: Update DM tank levels
        dmNetFlow = mbOutput - supplyDemand - regenDMConsumption + dmTransfer
        state.tanks.DM = updateDMLevels(state.tanks.DM, dmNetFlow, 1)
        
        // Step 7: Update exchanger loads
        state.exchangers = updateExchangerLoads(state.exchangers, 1)
        
        // Step 8: Process regeneration progress
        state.regenerationQueue = updateRegenerationProgress(state.regenerationQueue, 1)
        
        // Step 9: Check and apply automatic control logic
        state = applyAutomaticControls(state)
        
        // Step 10: Record snapshot
        history.push(createSnapshot(state, t))
    
    RETURN history
```

## 9.3 Calculation Functions

### 9.3.1 SAC Output Calculation

```
FUNCTION calculateSACOutput(state):
    totalOutput = 0
    FOR each sac in state.exchangers.SAC:
        IF sac.status == "SERVICE":
            totalOutput += sac.flowRate
    RETURN totalOutput  // m³/hr
```

### 9.3.2 Tank Level Update

```
FUNCTION updateDGLevels(dgTanks, netFlowRate, intervalMinutes):
    // Convert flow rate to volume for this interval
    volumeChange = netFlowRate * (intervalMinutes / 60)  // m³
    
    // Combined tank area = 2 × 38.5 = 77 m²
    levelChange = volumeChange / 77  // meters
    
    newLevel = dgTanks[0].currentLevel + levelChange
    
    // Clamp to physical limits
    newLevel = MAX(0, MIN(4.0, newLevel))
    
    // Update both tanks (parallel operation = same level)
    FOR each tank in dgTanks:
        tank.currentLevel = newLevel
        tank.currentVolume = newLevel * 38.5
    
    RETURN dgTanks
```

### 9.3.3 Exchanger Load Update

```
FUNCTION updateExchangerLoads(exchangers, intervalMinutes):
    FOR each type in [SAC, SBA, MB]:
        FOR each exchanger in exchangers[type]:
            IF exchanger.status == "SERVICE":
                loadIncrease = exchanger.flowRate * (intervalMinutes / 60)
                exchanger.currentLoad += loadIncrease
                exchanger.loadPercentage = (exchanger.currentLoad / exchanger.obrLimit) * 100
    
    RETURN exchangers
```

## 9.4 Pre-calculation vs Real-time

**Recommended Approach: Pre-calculation**

1. When user clicks "Start Simulation":
   - Run entire 480-minute simulation in one batch
   - Store all 480 snapshots in memory
   - Takes < 1 second on modern hardware

2. User interface then:
   - Plays through pre-calculated snapshots
   - Allows scrubbing to any point
   - No calculation delay during playback

**Benefits:**
- Smooth timeline scrubbing
- Instant navigation to any time point
- Consistent playback regardless of device performance

---

# 10. Data Models

## 10.1 Input Configuration Schema

```typescript
interface SimulationConfig {
    // Exchanger Initial States
    exchangers: {
        SAC: ExchangerConfig[];
        SBA: ExchangerConfig[];
        MB: ExchangerConfig[];
    };
    
    // Tank Initial States
    tanks: {
        DG: TankConfig[];
        DM: DMTankConfig[];
    };
    
    // Supply Configuration
    supply: {
        TPP: number;    // m³/hr (150-400)
        CDCP: number;   // m³/hr (100-250)
        Mills: number;  // m³/hr (3-20)
    };
}

interface ExchangerConfig {
    id: string;
    initialStatus: "SERVICE" | "STANDBY" | "MAINTENANCE";
    initialLoad: number;     // m³
    obrLimit: number;        // m³
    flowRate: number;        // m³/hr
}

interface TankConfig {
    id: string;
    initialLevel: number;    // meters
}

interface DMTankConfig extends TankConfig {
    initialStatus: "SERVICE" | "STANDBY";
}
```

## 10.2 Default Configuration Values

```typescript
const DEFAULT_CONFIG: SimulationConfig = {
    exchangers: {
        SAC: [
            { id: "SAC-A", initialStatus: "SERVICE", initialLoad: 0, obrLimit: 1500, flowRate: 140 },
            { id: "SAC-B", initialStatus: "SERVICE", initialLoad: 0, obrLimit: 1500, flowRate: 140 },
            { id: "SAC-C", initialStatus: "SERVICE", initialLoad: 0, obrLimit: 1500, flowRate: 140 },
            { id: "SAC-D", initialStatus: "STANDBY", initialLoad: 0, obrLimit: 1500, flowRate: 140 },
            { id: "SAC-E", initialStatus: "STANDBY", initialLoad: 0, obrLimit: 1500, flowRate: 140 },
        ],
        SBA: [
            { id: "SBA-A", initialStatus: "SERVICE", initialLoad: 0, obrLimit: 1100, flowRate: 110 },
            { id: "SBA-B", initialStatus: "SERVICE", initialLoad: 0, obrLimit: 1100, flowRate: 110 },
            { id: "SBA-C", initialStatus: "SERVICE", initialLoad: 0, obrLimit: 1100, flowRate: 110 },
            { id: "SBA-D", initialStatus: "STANDBY", initialLoad: 0, obrLimit: 1100, flowRate: 110 },
            { id: "SBA-E", initialStatus: "STANDBY", initialLoad: 0, obrLimit: 1100, flowRate: 110 },
        ],
        MB: [
            { id: "MB-A", initialStatus: "SERVICE", initialLoad: 0, obrLimit: 7000, flowRate: 110 },
            { id: "MB-B", initialStatus: "SERVICE", initialLoad: 0, obrLimit: 7000, flowRate: 110 },
            { id: "MB-C", initialStatus: "SERVICE", initialLoad: 0, obrLimit: 7000, flowRate: 110 },
            { id: "MB-D", initialStatus: "STANDBY", initialLoad: 0, obrLimit: 7000, flowRate: 110 },
            { id: "MB-E", initialStatus: "STANDBY", initialLoad: 0, obrLimit: 7000, flowRate: 110 },
        ],
    },
    tanks: {
        DG: [
            { id: "DG-A", initialLevel: 1.5 },
            { id: "DG-B", initialLevel: 1.5 },
        ],
        DM: [
            { id: "DMT-A", initialLevel: 4.0, initialStatus: "SERVICE" },
            { id: "DMT-B", initialLevel: 4.0, initialStatus: "SERVICE" },
            { id: "DMT-C", initialLevel: 4.0, initialStatus: "STANDBY" },
            { id: "DMT-D", initialLevel: 4.0, initialStatus: "STANDBY" },
            { id: "DMT-E", initialLevel: 4.0, initialStatus: "STANDBY" },
        ],
    },
    supply: {
        TPP: 250,
        CDCP: 150,
        Mills: 10,
    },
};
```

## 10.3 Output Data Structure

```typescript
interface SimulationResult {
    config: SimulationConfig;
    timeline: TimelineSnapshot[];
    summary: SimulationSummary;
}

interface TimelineSnapshot {
    timestamp: number;  // minutes from start
    
    exchangers: {
        [id: string]: {
            status: string;
            load: number;
            loadPercentage: number;
            flowRate: number;
        };
    };
    
    tanks: {
        [id: string]: {
            level: number;
            volume: number;
            status: string;
        };
    };
    
    flows: {
        sacTotalOutput: number;
        sbaTotalOutput: number;
        mbTotalOutput: number;
        totalSupply: number;
        dgNetFlow: number;
        dmNetFlow: number;
    };
    
    regeneration: {
        active: string[];  // IDs of exchangers in regeneration
        queue: string[];   // IDs waiting for regeneration
    };
    
    events: SimulationEvent[];
}

interface SimulationEvent {
    timestamp: number;
    type: "REGEN_START" | "REGEN_COMPLETE" | "STATUS_CHANGE" | "LEVEL_WARNING" | "TRANSFER_START";
    message: string;
    equipmentId: string;
}

interface SimulationSummary {
    totalWaterProduced: number;      // m³
    totalWaterSupplied: number;      // m³
    regenerationsCompleted: number;
    averageDGLevel: number;
    averageDMLevel: number;
    minDGLevel: number;
    minDMLevel: number;
    events: SimulationEvent[];
}
```

---

# 11. User Interface Specification

## 11.1 Screen Layout Overview

### 11.1.1 Desktop Layout (≥1024px)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  HEADER: Water Treatment Plant Simulator                    [Settings] [Reset]   │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────────┐   │
│  │      PROCESS OVERVIEW           │  │         TANK LEVELS                 │   │
│  │   (Simplified P&ID / Block)     │  │    (Bar charts - DG & DM tanks)     │   │
│  │                                 │  │                                     │   │
│  │   [SAC]──>[DG]──>[SBA]──>       │  │    DG-A  ████████░░  1.8m           │   │
│  │                  [MB]──>[DM]    │  │    DG-B  ████████░░  1.8m           │   │
│  │                                 │  │    DMT-A ██████████  5.2m           │   │
│  │   Status indicators on each     │  │    DMT-B █████████░  4.8m           │   │
│  │   equipment block               │  │    ...                              │   │
│  └─────────────────────────────────┘  └─────────────────────────────────────┘   │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                        EXCHANGER LOADS                                   │   │
│  │                                                                          │   │
│  │  SAC-A ████████████████████████░░░░░░  78%  (1170/1500 m³)              │   │
│  │  SAC-B █████████████████░░░░░░░░░░░░░  52%  (780/1500 m³)               │   │
│  │  SAC-C ████████████░░░░░░░░░░░░░░░░░░  35%  (525/1500 m³)  [REGEN]     │   │
│  │  ...                                                                     │   │
│  │                                                                          │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                         TREND CHARTS                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐    │   │
│  │  │  DG Tank Level Trend                                             │    │   │
│  │  │  2.2 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ (overflow)                       │    │   │
│  │  │      ╱╲    ╱╲                                                    │    │   │
│  │  │     ╱  ╲  ╱  ╲                                                   │    │   │
│  │  │  ──╱    ╲╱    ╲──────                                            │    │   │
│  │  │  0.8 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ (minimum)                        │    │   │
│  │  │  0hr    1hr    2hr    3hr    4hr    5hr    6hr    7hr    8hr     │    │   │
│  │  └─────────────────────────────────────────────────────────────────┘    │   │
│  │                                                                          │   │
│  │  [DG Level] [DM Levels] [SAC Loads] [SBA Loads] [MB Loads] [Flow Rates] │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
├──────────────────────────────────────────────────────────────────────────────────┤
│  TIMELINE CONTROL                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  ◄◄  ►  ►►  │  00:00:00 ════════════════════●═══════════════ 08:00:00  │   │
│  │             │                              ↑                            │   │
│  │  Speed: 50x │                         Current: 04:32:00                 │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  EVENT LOG (scrollable)                                                         │
│  ├ 04:32 - SAC-A reached OBR, regeneration started                             │
│  ├ 04:32 - SAC-D brought into service                                          │
│  ├ 03:15 - DG level dropped below 1.0m                                         │
│  └──────────────────────────────────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 11.1.2 Mobile Layout (<768px)

```
┌────────────────────────────┐
│  WTP Simulator    [≡ Menu] │
├────────────────────────────┤
│                            │
│  ┌────────────────────────┐│
│  │   CURRENT TIME         ││
│  │      04:32:00          ││
│  └────────────────────────┘│
│                            │
│  [Tanks] [Loads] [Trends]  │
│         ↓                  │
│  ┌────────────────────────┐│
│  │  (Selected tab content) ││
│  │                        ││
│  │  Scrollable vertically ││
│  │                        ││
│  │                        ││
│  │                        ││
│  └────────────────────────┘│
│                            │
│  ┌────────────────────────┐│
│  │ ◄◄ [►] ►►   50x        ││
│  │ ═════●════════════════ ││
│  │      04:32:00          ││
│  └────────────────────────┘│
│                            │
│  Events: SAC-A regen start │
└────────────────────────────┘
```

## 11.2 Configuration Screen

Before simulation starts, user must configure initial state:

### 11.2.1 Configuration Form Sections

**Section 1: Exchanger Configuration**

For each exchanger type (SAC, SBA, MB), show a table:

| Exchanger | Status | Initial Load (m³) | OBR (m³) | Flow Rate (m³/hr) |
|-----------|--------|-------------------|----------|-------------------|
| SAC-A | [Dropdown: Service/Standby/Maintenance] | [Input: 0] | [Input: 1500] | [Input: 140] |
| SAC-B | [Dropdown] | [Input] | [Input] | [Input] |
| ... | ... | ... | ... | ... |

**Section 2: Tank Configuration**

| Tank | Initial Level (m) | Status |
|------|-------------------|--------|
| DG-A | [Input: 1.5] | Always Service |
| DG-B | [Input: 1.5] | Always Service |
| DMT-A | [Input: 4.0] | [Dropdown: Service/Standby] |
| DMT-B | [Input: 4.0] | [Dropdown] |
| ... | ... | ... |

**Section 3: Supply Configuration**

| Supply Line | Flow Rate (m³/hr) | Range |
|-------------|-------------------|-------|
| TPP | [Slider/Input: 250] | 150-400 |
| CDCP | [Slider/Input: 150] | 100-250 |
| Mills | [Slider/Input: 10] | 3-20 |

**Validation Rules:**
- At least 2 exchangers of each type must be in SERVICE or STANDBY
- Exactly 2 DM tanks must be in SERVICE
- Initial loads must be less than OBR
- Tank levels must be between 0.8 and overflow level

## 11.3 Visual Components

### 11.3.1 Tank Level Indicator

```
         ┌─────┐
   7.3m ─┤     │─ Overflow
         │░░░░░│
         │░░░░░│ ← Current level
   Level │█████│   shown with
         │█████│   fill color
         │█████│
   0.8m ─┤█████│─ Minimum
         └─────┘
         
   Color coding:
   - Blue (normal): 1.5m - 6.0m
   - Yellow (caution): 0.8m - 1.5m OR 6.0m - 7.3m  
   - Red (critical): < 0.8m OR > 7.3m
```

### 11.3.2 Exchanger Load Bar

```
   SAC-A  ████████████████████░░░░░░░░  72%  (1080/1500 m³)  [SERVICE]
          ↑                   ↑          ↑          ↑            ↑
       Filled              Empty      Percent   Absolute      Status
       (green→             portion               values        badge
        yellow→
        red as
        approaches
        OBR)
```

### 11.3.3 Process Flow Diagram (Simplified)

Interactive block diagram showing:
- Each equipment block with color-coded status
- Flow arrows with current flow rates
- Animated flow when simulation is running
- Click on block shows details

### 11.3.4 Trend Chart

Line chart showing selected parameter over 8-hour timeline:
- X-axis: Time (0-8 hours)
- Y-axis: Parameter value (auto-scaled)
- Reference lines for limits (min, max, overflow)
- Vertical indicator line showing current playback position
- Multiple series support for comparing similar equipment

## 11.4 Interaction Patterns

### 11.4.1 Timeline Scrubbing

- Drag slider to jump to any point
- Click on chart to jump to that time
- Keyboard: Arrow keys for fine control
- Touch: Swipe on timeline area

### 11.4.2 Playback Controls

- Play/Pause toggle
- Speed adjustment (10x, 25x, 50x, 100x)
- Step forward/backward (1 minute increments)
- Jump to start/end

### 11.4.3 Data Inspection

- Hover on chart shows tooltip with exact values
- Click on equipment shows detail panel
- Event log items clickable to jump to that time

---

# 12. Technical Architecture

## 12.1 Technology Stack (Recommended)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | React 18+ | Component-based, excellent for interactive UIs |
| Language | TypeScript | Type safety for complex state management |
| Styling | Tailwind CSS | Rapid responsive design, utility-first |
| Charts | Recharts or Chart.js | React-native, performant, interactive |
| State Management | Zustand or Context + Reducer | Simpler than Redux for this scale |
| Build Tool | Vite | Fast development, optimized builds |
| Deployment | Static hosting (Vercel/Netlify) | No backend needed |

## 12.2 Project Structure

```
water-treatment-simulator/
├── public/
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Slider.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Card.tsx
│   │   ├── config/
│   │   │   ├── ConfigurationScreen.tsx
│   │   │   ├── ExchangerConfigTable.tsx
│   │   │   ├── TankConfigTable.tsx
│   │   │   └── SupplyConfigForm.tsx
│   │   ├── dashboard/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ProcessOverview.tsx
│   │   │   ├── TankLevelPanel.tsx
│   │   │   ├── ExchangerLoadPanel.tsx
│   │   │   └── TrendChart.tsx
│   │   ├── timeline/
│   │   │   ├── TimelineControl.tsx
│   │   │   ├── PlaybackControls.tsx
│   │   │   └── EventLog.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       ├── MobileNav.tsx
│   │       └── ResponsiveLayout.tsx
│   ├── simulation/
│   │   ├── engine.ts              # Main simulation loop
│   │   ├── exchangers.ts          # Exchanger calculations
│   │   ├── tanks.ts               # Tank calculations
│   │   ├── regeneration.ts        # Regeneration logic
│   │   ├── controls.ts            # Automatic control logic
│   │   └── types.ts               # TypeScript interfaces
│   ├── store/
│   │   ├── simulationStore.ts     # Zustand store
│   │   └── configStore.ts         # Configuration state
│   ├── utils/
│   │   ├── constants.ts           # Magic numbers, defaults
│   │   ├── formatters.ts          # Number/time formatting
│   │   └── validators.ts          # Input validation
│   ├── hooks/
│   │   ├── useSimulation.ts       # Simulation hook
│   │   ├── usePlayback.ts         # Timeline playback hook
│   │   └── useResponsive.ts       # Responsive breakpoints
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

## 12.3 Core Module Specifications

### 12.3.1 Simulation Engine (`simulation/engine.ts`)

```typescript
// Main entry point for simulation
export function runSimulation(config: SimulationConfig): SimulationResult {
    // Pre-calculates entire 480-minute simulation
    // Returns array of snapshots + summary
}

export function calculateNextState(
    currentState: SimulationState, 
    deltaMinutes: number
): SimulationState {
    // Single time-step calculation
}
```

### 12.3.2 Exchanger Module (`simulation/exchangers.ts`)

```typescript
export function calculateExchangerOutput(
    exchangers: ExchangerState[], 
    type: ExchangerType
): number {
    // Sum of flow rates for all exchangers in SERVICE
}

export function updateExchangerLoads(
    exchangers: ExchangerState[], 
    deltaMinutes: number
): ExchangerState[] {
    // Update loads for all exchangers in SERVICE
}

export function checkExhaustion(exchanger: ExchangerState): boolean {
    // Returns true if load >= OBR
}
```

### 12.3.3 Tank Module (`simulation/tanks.ts`)

```typescript
export function updateDGTankLevels(
    tanks: TankState[], 
    netFlow: number, 
    deltaMinutes: number
): TankState[] {
    // Update DG tank levels (parallel operation)
}

export function updateDMTankLevels(
    tanks: TankState[], 
    netFlow: number, 
    deltaMinutes: number,
    serviceTankIds: string[]
): TankState[] {
    // Update DM tank levels (only service tanks)
}

export function calculateInterTankTransfer(
    tanks: TankState[]
): TransferResult {
    // Determine if transfer needed and calculate rates
}
```

### 12.3.4 Regeneration Module (`simulation/regeneration.ts`)

```typescript
export function startRegeneration(
    exchanger: ExchangerState,
    currentTime: number
): RegenerationState {
    // Initialize regeneration state with phases
}

export function updateRegenerationProgress(
    regenState: RegenerationState,
    currentTime: number
): RegenerationState {
    // Progress through regeneration phases
}

export function getRegenerationWaterConsumption(
    regenState: RegenerationState
): { dgConsumption: number; dmConsumption: number } {
    // Current water consumption based on phase
}
```

### 12.3.5 Control Logic Module (`simulation/controls.ts`)

```typescript
export function applyAutomaticControls(
    state: SimulationState
): SimulationState {
    // Apply all automatic control rules in priority order
}

export function handleLowDGLevel(state: SimulationState): SimulationState {
    // Take SBA out of service if DG too low
}

export function handleLowDMLevel(state: SimulationState): SimulationState {
    // Initiate inter-tank transfer if DM too low
}

export function handleHighDMLevel(state: SimulationState): SimulationState {
    // Take stream out of service if all DM tanks at overflow
}

export function handleExhaustion(state: SimulationState): SimulationState {
    // Start regeneration and swap with standby
}
```

## 12.4 State Management

### 12.4.1 Zustand Store Structure

```typescript
interface SimulationStore {
    // Configuration
    config: SimulationConfig | null;
    setConfig: (config: SimulationConfig) => void;
    
    // Simulation Results
    result: SimulationResult | null;
    runSimulation: () => void;
    
    // Playback
    currentTimeIndex: number;
    isPlaying: boolean;
    playbackSpeed: number;
    setTimeIndex: (index: number) => void;
    togglePlayback: () => void;
    setPlaybackSpeed: (speed: number) => void;
    
    // Derived
    currentSnapshot: TimelineSnapshot | null;
    
    // Reset
    reset: () => void;
}
```

## 12.5 Performance Considerations

1. **Pre-calculation**: Entire simulation calculated upfront (< 100ms for 480 steps)

2. **Memoization**: Use `useMemo` for derived calculations in components

3. **Virtual scrolling**: For event log if it grows large

4. **Chart optimization**: 
   - Limit data points displayed (every 5 min = 96 points)
   - Use canvas-based charts for better performance

5. **Mobile optimization**:
   - Lazy load chart components
   - Reduce animation complexity
   - Use touch-optimized interactions

---

# 13. Implementation Roadmap

## 13.1 Phase 1: Foundation (Week 1)

### Deliverables:
- [ ] Project setup (Vite + React + TypeScript + Tailwind)
- [ ] Type definitions for all data models
- [ ] Constants and default values
- [ ] Basic responsive layout shell
- [ ] Configuration screen with all inputs
- [ ] Input validation

### Acceptance Criteria:
- User can input all initial values
- Validation prevents invalid configurations
- Responsive on mobile and desktop

## 13.2 Phase 2: Simulation Engine (Week 2)

### Deliverables:
- [ ] Exchanger calculations (output, load update)
- [ ] Tank calculations (level update, parallel operation)
- [ ] Regeneration state machine
- [ ] Automatic control logic
- [ ] Main simulation loop
- [ ] Unit tests for calculations

### Acceptance Criteria:
- Simulation produces 480 valid snapshots
- Regeneration sequences work correctly
- Automatic controls trigger appropriately
- Mass balance is maintained

## 13.3 Phase 3: Dashboard Core (Week 3)

### Deliverables:
- [ ] Tank level indicators (bar charts)
- [ ] Exchanger load bars
- [ ] Process overview diagram
- [ ] Basic trend chart (single series)
- [ ] Zustand store integration

### Acceptance Criteria:
- All values display correctly
- Status colors work
- Responsive layout functions

## 13.4 Phase 4: Timeline & Playback (Week 4)

### Deliverables:
- [ ] Timeline slider component
- [ ] Playback controls (play/pause/speed)
- [ ] Time display
- [ ] Event log component
- [ ] Keyboard shortcuts
- [ ] Timeline scrubbing

### Acceptance Criteria:
- Smooth playback at all speeds
- Scrubbing is responsive
- Events display at correct times

## 13.5 Phase 5: Polish & Enhancement (Week 5-6)

### Deliverables:
- [ ] Multi-series trend charts
- [ ] Chart tab switching
- [ ] Tooltip enhancements
- [ ] Mobile gestures
- [ ] Animation refinements
- [ ] Cross-browser testing
- [ ] Performance optimization
- [ ] Documentation

### Acceptance Criteria:
- Works on Chrome, Firefox, Safari, Edge
- Works on iOS and Android browsers
- Loads in < 3 seconds
- No UI jank during playback

## 13.6 Future Phases (Not in Initial Scope)

- **Phase 6**: Scenario comparison (run multiple configs side-by-side)
- **Phase 7**: Export functionality (CSV, PDF reports)
- **Phase 8**: Upstream equipment (clarifiers, filters)
- **Phase 9**: Water quality parameters (conductivity, pH)
- **Phase 10**: User accounts and saved configurations

---

# 14. Appendices

## 14.1 Appendix A: Physical Constants

```typescript
export const CONSTANTS = {
    // Time
    SIMULATION_DURATION_MINUTES: 480,
    DEFAULT_PLAYBACK_SPEED: 50,
    
    // DG Tank
    DG_DIAMETER_M: 7,
    DG_HEIGHT_M: 4,
    DG_AREA_M2: 38.5,  // π × 3.5²
    DG_VOLUME_PER_METER: 38.5,  // m³/m
    DG_OVERFLOW_LEVEL_M: 2.2,
    DG_MIN_LEVEL_M: 0.8,
    DG_TOTAL_CAPACITY_M3: 154,  // 38.5 × 4
    
    // DM Tank
    DM_CAPACITY_M3: 800,
    DM_HEIGHT_M: 8,
    DM_VOLUME_PER_METER: 100,  // m³/m
    DM_OVERFLOW_LEVEL_M: 7.3,
    DM_MIN_LEVEL_M: 0.8,
    DM_TRANSFER_RATE_M3HR: 400,
    
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
    CDCP_FLOW_MIN: 100,
    CDCP_FLOW_MAX: 250,
    MILLS_FLOW_MIN: 3,
    MILLS_FLOW_MAX: 20,
    
    // Regeneration - SAC
    SAC_REGEN_CHEMICAL_DURATION_MIN: 150,
    SAC_REGEN_RINSE_DURATION_MIN: 30,
    SAC_REGEN_DG_RATE_M3HR: 30,
    
    // Regeneration - SBA
    SBA_REGEN_CHEMICAL_DURATION_MIN: 150,
    SBA_REGEN_DG_DURATION_MIN: 20,
    SBA_REGEN_RINSE_DURATION_MIN: 20,
    SBA_REGEN_DG_RATE_M3HR: 30,
    SBA_REGEN_DM_RATE_M3HR: 25,
    SBA_REGEN_RINSE_DG_RATE_M3HR: 120,
    
    // Regeneration - MB
    MB_REGEN_CHEMICAL_DURATION_MIN: 150,
    MB_REGEN_DG_DURATION_MIN: 40,
    MB_REGEN_RINSE_DURATION_MIN: 20,
    MB_REGEN_DG_RATE_M3HR: 30,
    MB_REGEN_DM_RATE_M3HR: 25,
    MB_REGEN_RINSE_DG_RATE_M3HR: 120,
};
```

## 14.2 Appendix B: Regeneration Water Consumption Summary

### Total Water Consumption per Regeneration

| Exchanger | DG Water (m³) | DM Water (m³) | Total Time (min) |
|-----------|---------------|---------------|------------------|
| SAC | 75 | 0 | 180 |
| SBA | 50 | 62.5 | 170 |
| MB | 60 | 62.5 | 170 |

### Detailed Breakdown

**SAC:**
- Chemical: 30 m³/hr × 2.5 hr = 75 m³ from DG
- Rinse: 0 m³ (no consumption)

**SBA:**
- Chemical: 30 m³/hr × (20/60) hr = 10 m³ from DG
- Chemical: 25 m³/hr × 2.5 hr = 62.5 m³ from DM
- Rinse: 120 m³/hr × (20/60) hr = 40 m³ from DG
- Total DG: 50 m³

**MB:**
- Chemical: 30 m³/hr × (40/60) hr = 20 m³ from DG
- Chemical: 25 m³/hr × 2.5 hr = 62.5 m³ from DM
- Rinse: 120 m³/hr × (20/60) hr = 40 m³ from DG
- Total DG: 60 m³

## 14.3 Appendix C: Sample Scenarios for Testing

### Scenario 1: Normal Operation

- All exchangers in service, no initial load
- DG level: 1.5m, DM level: 4.0m
- Supply: TPP 250, CDCP 150, Mills 10
- Expected: Stable operation, no regenerations for several hours

### Scenario 2: Immediate Regeneration

- SAC-A load: 1490 m³ (close to OBR)
- All others normal
- Expected: SAC-A should trigger regeneration within first few minutes

### Scenario 3: Low DG Level Response

- DG level: 0.9m (close to minimum)
- High SAC output, high SBA intake
- Expected: System should take SBA out of service to recover level

### Scenario 4: Cascading Regenerations

- Multiple exchangers with high initial loads
- Expected: Queue management should handle one-at-a-time regeneration

### Scenario 5: DM Tank Transfer

- Two service DM tanks at 0.9m
- Standby tanks at 5.0m
- Expected: System should initiate inter-tank transfer

## 14.4 Appendix D: Glossary

| Term | Definition |
|------|------------|
| SAC | Strong Acid Cation exchanger - removes calcium, magnesium, and other cations |
| SBA | Strong Base Anion exchanger - removes sulfates, chlorides, and other anions |
| MB | Mixed Bed exchanger - polishing step with mixed cation/anion resins |
| DG | Degasser - removes dissolved gases (CO₂) from water |
| DM | Demineralized - water with minerals removed |
| OBR | Output Before Regeneration - throughput limit before resin exhaustion |
| Regeneration | Process of restoring ion exchange capacity using chemicals |
| Service | Equipment actively processing water |
| Standby | Equipment ready but not currently processing |
| Stream | Complete treatment train (SAC → SBA → MB) |

---

# Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 2024 | Claude (AI Assistant) | Initial specification |

---

**END OF SPECIFICATION**
