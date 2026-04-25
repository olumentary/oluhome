'use client';

import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TopItem } from '@/lib/queries/analytics';

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

interface TopItemsChartProps {
  data: TopItem[];
}

export function TopItemsChart({ data }: TopItemsChartProps) {
  const router = useRouter();

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Items by Value</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          No valued items yet. Add valuations to see your top items.
        </CardContent>
      </Card>
    );
  }

  // Truncate long titles for y-axis
  const chartData = data.map((d) => ({
    ...d,
    shortTitle: d.title.length > 28 ? d.title.slice(0, 25) + '...' : d.title,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top {data.length} Items by Value</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              horizontal={false}
            />
            <XAxis
              type="number"
              tickFormatter={formatCurrency}
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="shortTitle"
              width={180}
              tick={{ fontSize: 11, fill: 'var(--text)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => [
                formatCurrency(Number(value)),
                'Value',
              ]}
              labelFormatter={(label) => {
                const item = chartData.find((d) => d.shortTitle === label);
                return item?.title ?? label;
              }}
              contentStyle={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
              }}
            />
            <Bar
              dataKey="value"
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              onClick={(_entry, index) => {
                const item = chartData[index];
                if (item?.id) router.push(`/items/${item.id}`);
              }}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill="var(--primary)" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
