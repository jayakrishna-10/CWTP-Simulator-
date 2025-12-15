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
  { id: 'dg', label: 'DG' },
  { id: 'dm', label: 'DM' },
  { id: 'sac', label: 'SAC' },
  { id: 'sba', label: 'SBA' },
  { id: 'mb', label: 'MB' },
  { id: 'flows', label: 'Flows' },
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
          point['SAC'] = snapshot.flows.sacTotalOutput;
          point['SBA'] = snapshot.flows.sbaTotalOutput;
          point['MB'] = snapshot.flows.mbTotalOutput;
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
    if (selectedTrendType === 'flows') return ['SAC', 'SBA', 'MB', 'Supply'];
    return [];
  };

  const getYAxisDomain = () => {
    if (selectedTrendType === 'dg') return [0, CONSTANTS.DG_HEIGHT_M];
    if (selectedTrendType === 'dm') return [0, CONSTANTS.DM_HEIGHT_M];
    if (['sac', 'sba', 'mb'].includes(selectedTrendType)) return [0, 110];
    return ['auto', 'auto'];
  };

  const getYAxisLabel = () => {
    if (selectedTrendType === 'dg' || selectedTrendType === 'dm') return 'm';
    if (['sac', 'sba', 'mb'].includes(selectedTrendType)) return '%';
    return 'm³/hr';
  };

  const getReferenceLines = () => {
    if (selectedTrendType === 'dg') {
      return (
        <>
          <ReferenceLine y={CONSTANTS.DG_MIN_LEVEL_M} stroke="#ef4444" strokeDasharray="3 3" />
          <ReferenceLine y={CONSTANTS.DG_OVERFLOW_LEVEL_M} stroke="#f59e0b" strokeDasharray="3 3" />
        </>
      );
    }
    if (selectedTrendType === 'dm') {
      return (
        <>
          <ReferenceLine y={CONSTANTS.DM_MIN_LEVEL_M} stroke="#ef4444" strokeDasharray="3 3" />
          <ReferenceLine y={CONSTANTS.DM_OVERFLOW_LEVEL_M} stroke="#f59e0b" strokeDasharray="3 3" />
        </>
      );
    }
    if (['sac', 'sba', 'mb'].includes(selectedTrendType)) {
      return (
        <>
          <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="3 3" />
          <ReferenceLine y={75} stroke="#f59e0b" strokeDasharray="3 3" />
        </>
      );
    }
    return null;
  };

  return (
    <div className="card h-full">
      <div className="card-header py-2 flex items-center justify-between">
        <span>Trends</span>
        {/* Compact Trend Type Selector */}
        <div className="flex gap-1">
          {TREND_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedTrendType(type.id)}
              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                selectedTrendType === type.id
                  ? 'bg-primary-100 text-primary-700 font-medium'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-2">
        {/* Chart */}
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="timeLabel"
                tick={{ fontSize: 9, fill: '#64748b' }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={getYAxisDomain()}
                tick={{ fontSize: 9, fill: '#64748b' }}
                tickLine={false}
                width={35}
                label={{
                  value: getYAxisLabel(),
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 9, fill: '#64748b' },
                  offset: 10,
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '10px',
                  padding: '4px 8px',
                }}
              />
              <Legend
                iconType="circle"
                iconSize={6}
                wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }}
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
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
