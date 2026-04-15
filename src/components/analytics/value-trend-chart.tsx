'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ValueOverTimeEntry } from '@/lib/queries/analytics';

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

type Granularity = 'monthly' | 'quarterly' | 'yearly';

interface ValueTrendChartProps {
  data: Record<Granularity, ValueOverTimeEntry[]>;
}

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export function ValueTrendChart({ data }: ValueTrendChartProps) {
  const [granularity, setGranularity] = useState<Granularity>('monthly');
  const chartData = data[granularity];

  if (Object.values(data).every((d) => d.length === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Value Trend</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          No valuation data over time. Add dated valuations to see trends.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Value Trend</CardTitle>
        <div className="flex gap-1">
          {GRANULARITY_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={granularity === opt.value ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setGranularity(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
            />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value, name) => [
                formatCurrency(Number(value)),
                name === 'estimated'
                  ? 'Estimated Value'
                  : name === 'insured'
                    ? 'Insured Value'
                    : 'Acquisition Cost',
              ]}
              contentStyle={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
              }}
            />
            <Legend
              formatter={(value) =>
                value === 'estimated'
                  ? 'Estimated Value'
                  : value === 'insured'
                    ? 'Insured Value'
                    : 'Acquisition Cost'
              }
            />
            <Line
              type="monotone"
              dataKey="estimated"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="insured"
              stroke="var(--primary-light)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="cost"
              stroke="var(--text-muted)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
