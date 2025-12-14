export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export function formatTimeWithSeconds(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
}

export function formatNumber(value: number, decimals: number = 1): string {
  return value.toFixed(decimals);
}

export function formatPercentage(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatLevel(meters: number): string {
  return `${meters.toFixed(2)}m`;
}

export function formatVolume(m3: number): string {
  if (m3 >= 1000) {
    return `${(m3 / 1000).toFixed(1)}k m³`;
  }
  return `${m3.toFixed(0)} m³`;
}

export function formatFlowRate(m3hr: number): string {
  return `${m3hr.toFixed(0)} m³/hr`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getLevelColor(
  level: number,
  minLevel: number,
  maxLevel: number,
  warningLow: number,
  warningHigh: number
): 'normal' | 'caution' | 'critical' {
  if (level < minLevel || level > maxLevel) return 'critical';
  if (level < warningLow || level > warningHigh) return 'caution';
  return 'normal';
}

export function getLoadColor(percentage: number): string {
  if (percentage >= 90) return '#ef4444'; // red
  if (percentage >= 75) return '#f59e0b'; // yellow
  return '#22c55e'; // green
}
