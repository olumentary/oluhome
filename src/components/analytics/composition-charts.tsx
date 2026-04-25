'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CompositionEntry } from '@/lib/queries/analytics';

const COLORS = [
  'var(--primary)',
  'var(--primary-light)',
  'var(--success)',
  'var(--warning)',
  'var(--danger)',
  'var(--chart-5)',
  'var(--chart-2)',
  'var(--chart-3)',
];

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

interface DonutChartProps {
  title: string;
  data: CompositionEntry[];
}

function DonutChart({ title, data }: DonutChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8 text-xs text-muted-foreground">
          No data
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              dataKey="totalValue"
              nameKey="value"
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={72}
              paddingAngle={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatCurrency(Number(value))}
              contentStyle={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Legend */}
        <div className="mt-2 space-y-1">
          {data.slice(0, 6).map((entry, i) => (
            <div
              key={entry.value}
              className="flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block size-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-muted-foreground truncate max-w-[120px]">
                  {entry.value}
                </span>
              </div>
              <span className="tabular-nums text-foreground">
                {entry.count}
              </span>
            </div>
          ))}
          {data.length > 6 && (
            <p className="text-[10px] text-muted-foreground">
              +{data.length - 6} more
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface CompositionChartsProps {
  byType: CompositionEntry[];
  byPeriod: CompositionEntry[];
  byRoom: CompositionEntry[];
  byCondition: CompositionEntry[];
}

export function CompositionCharts({
  byType,
  byPeriod,
  byRoom,
  byCondition,
}: CompositionChartsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <DonutChart title="By Type" data={byType} />
      <DonutChart title="By Period" data={byPeriod} />
      <DonutChart title="By Room" data={byRoom} />
      <DonutChart title="By Condition" data={byCondition} />
    </div>
  );
}
