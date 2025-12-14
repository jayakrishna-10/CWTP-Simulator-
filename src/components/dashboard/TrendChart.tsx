import { useMemo } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { CONSTANTS } from '../../simulation/constants';
import { formatTime } from '../../utils/formatters';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

const TREND_TYPES = [
  { id: 'dg', label: 'DG Level' },
  { id: 'dm', label: 'DM Levels' },
  { id: 'sac', label: 'SAC Loads' },
  { id: 'sba', label: 'SBA Loads' },
  { id: 'mb', label: 'MB Loads' },
  { id: 'flows', label: 'Flow Rates' },
] as const;

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function TrendChart() {
  const { result, currentTimeIndex, selectedTrendType, setSelectedTrendType } =
    useSimulationStore();

  const chartData = useMemo(() => {
    if (!result) return [];

    // Sample every 5 minutes for performance
    const sampledData = result.timeline
      .filter((_, i) => i % 5 === 0 || i === currentTimeIndex)
      .map((snapshot) => {
        const point: Record<string, number | string> = {
          time: snapshot.timestamp,
          timeLabel: formatTime(snapshot.timestamp),
        };

        if (selectedTrendType === 'dg') {
          point['DG-A'] = snapshot.tanks['DG-A'].level;
          point['DG-B'] = snapshot.tanks['DG-B'].level;
        } else if (selectedTrendType === 'dm') {
          Object.entries(snapshot.tanks)
            .filter(([id]) => id.startsWith('DMT'))
            .forEach(([id, tank]) => {
              point[id] = tank.level;
            });
        } else if (selectedTrendType === 'sac') {
          Object.entries(snapshot.exchangers)
            .filter(([id]) => id.startsWith('SAC'))
            .forEach(([id, ex]) => {
              point[id] = ex.loadPercentage;
            });
        } else if (selectedTrendType === 'sba') {
          Object.entries(snapshot.exchangers)
            .filter(([id]) => id.startsWith('SBA'))
            .forEach(([id, ex]) => {
              point[id] = ex.loadPercentage;
            });
        } else if (selectedTrendType === 'mb') {
          Object.entries(snapshot.exchangers)
            .filter(([id]) => id.startsWith('MB'))
            .forEach(([id, ex]) => {
              point[id] = ex.loadPercentage;
            });
        } else if (selectedTrendType === 'flows') {
          point['SAC Output'] = snapshot.flows.sacTotalOutput;
          point['SBA Output'] = snapshot.flows.sbaTotalOutput;
          point['MB Output'] = snapshot.flows.mbTotalOutput;
          point['Supply'] = snapshot.flows.totalSupply;
        }

        return point;
      });

    return sampledData;
  }, [result, selectedTrendType, currentTimeIndex]);

  const getDataKeys = () => {
    if (selectedTrendType === 'dg') return ['DG-A', 'DG-B'];
    if (selectedTrendType === 'dm') return ['DMT-A', 'DMT-B', 'DMT-C', 'DMT-D', 'DMT-E'];
    if (selectedTrendType === 'sac') return ['SAC-A', 'SAC-B', 'SAC-C', 'SAC-D', 'SAC-E'];
    if (selectedTrendType === 'sba') return ['SBA-A', 'SBA-B', 'SBA-C', 'SBA-D', 'SBA-E'];
    if (selectedTrendType === 'mb') return ['MB-A', 'MB-B', 'MB-C', 'MB-D', 'MB-E'];
    if (selectedTrendType === 'flows') return ['SAC Output', 'SBA Output', 'MB Output', 'Supply'];
    return [];
  };

  const getYAxisDomain = () => {
    if (selectedTrendType === 'dg') return [0, CONSTANTS.DG_HEIGHT_M];
    if (selectedTrendType === 'dm') return [0, CONSTANTS.DM_HEIGHT_M];
    if (['sac', 'sba', 'mb'].includes(selectedTrendType)) return [0, 110];
    return ['auto', 'auto'];
  };

  const getYAxisLabel = () => {
    if (selectedTrendType === 'dg' || selectedTrendType === 'dm') return 'Level (m)';
    if (['sac', 'sba', 'mb'].includes(selectedTrendType)) return 'Load (%)';
    return 'Flow (m³/hr)';
  };

  const getReferenceLines = () => {
    if (selectedTrendType === 'dg') {
      return (
        <>
          <ReferenceLine y={CONSTANTS.DG_MIN_LEVEL_M} stroke="#ef4444" strokeDasharray="5 5" />
          <ReferenceLine y={CONSTANTS.DG_OVERFLOW_LEVEL_M} stroke="#f59e0b" strokeDasharray="5 5" />
        </>
      );
    }
    if (selectedTrendType === 'dm') {
      return (
        <>
          <ReferenceLine y={CONSTANTS.DM_MIN_LEVEL_M} stroke="#ef4444" strokeDasharray="5 5" />
          <ReferenceLine y={CONSTANTS.DM_OVERFLOW_LEVEL_M} stroke="#f59e0b" strokeDasharray="5 5" />
        </>
      );
    }
    if (['sac', 'sba', 'mb'].includes(selectedTrendType)) {
      return (
        <>
          <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="5 5" />
          <ReferenceLine y={75} stroke="#f59e0b" strokeDasharray="5 5" />
        </>
      );
    }
    return null;
  };

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between flex-wrap gap-2">
        <span>Trend Charts</span>
      </div>
      <div className="p-4 space-y-4">
        {/* Trend Type Selector */}
        <div className="flex flex-wrap gap-2">
          {TREND_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedTrendType(type.id)}
              className={`tab ${
                selectedTrendType === type.id ? 'tab-active' : 'tab-inactive'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="timeLabel"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={getYAxisDomain()}
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                width={40}
                label={{
                  value: getYAxisLabel(),
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 10, fill: '#64748b' },
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '11px' }}
              />
              {getReferenceLines()}
              {/* Current Time Indicator */}
              <ReferenceLine
                x={formatTime(currentTimeIndex)}
                stroke="#6366f1"
                strokeWidth={2}
              />
              {getDataKeys().map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
