interface HistoryEntry {
  month: string;
  amount: number;
}

export function getAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function getVariationPercent(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

export function getTrend(history: HistoryEntry[]): 'increasing' | 'stable' | 'decreasing' {
  if (history.length < 3) return 'stable';
  const last3 = history.slice(-3).map(h => h.amount);
  const diff1 = last3[1] - last3[0];
  const diff2 = last3[2] - last3[1];
  const avgDiff = (diff1 + diff2) / 2;
  const avgValue = getAverage(last3);
  const threshold = avgValue * 0.03;
  if (avgDiff > threshold) return 'increasing';
  if (avgDiff < -threshold) return 'decreasing';
  return 'stable';
}

export function getWeightedMovingAverage(history: HistoryEntry[], periods = 6): number {
  const values = history.slice(-periods).map(h => h.amount);
  if (values.length === 0) return 0;
  let weightSum = 0;
  let weightedSum = 0;
  for (let i = 0; i < values.length; i++) {
    const weight = i + 1;
    weightedSum += values[i] * weight;
    weightSum += weight;
  }
  return weightedSum / weightSum;
}

