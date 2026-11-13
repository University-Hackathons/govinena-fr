"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardPreview } from "@/features/dashboard/types";

export function PreviewChart({ data }: { data: DashboardPreview["trend"] }) {
  return (
    <figure>
      <div className="min-w-0" aria-hidden="true">
        <ResponsiveContainer
          width="100%"
          height={240}
          minWidth={0}
          initialDimension={{ width: 600, height: 240 }}
        >
          <AreaChart
            data={data}
            margin={{ top: 16, right: 12, left: -25, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <YAxis
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--chart-1)"
              fill="var(--chart-1)"
              fillOpacity={0.12}
              strokeWidth={2.5}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="sr-only">
        <table>
          <caption>
            Illustrative index values; these are not market observations.
          </caption>
          <thead>
            <tr>
              <th>Day</th>
              <th>Sample index</th>
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.label}>
                <td>{point.label}</td>
                <td>{point.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="mt-3 text-xs leading-5 text-muted-foreground">
        Illustrative index, 0–100. These sample values are not prices,
        forecasts, or market observations.
      </figcaption>
    </figure>
  );
}
