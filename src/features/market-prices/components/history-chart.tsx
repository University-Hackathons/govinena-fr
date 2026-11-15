"use client";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { historyChartData, formatPrice, type History } from "../schema";
const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
export function PriceHistoryChart({ history }: { history: History }) {
  const data = historyChartData(history);
  return <figure className="space-y-3">
    <div aria-hidden="true" className="min-w-0"><ResponsiveContainer width="100%" height={300} minWidth={0} initialDimension={{ width: 700, height: 300 }}>
      <LineChart data={data.points} margin={{ top: 16, right: 16, bottom: 10, left: 6 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey="time" type="number" domain={["dataMin", "dataMax"]} scale="time" tickFormatter={(value) => new Intl.DateTimeFormat("en-LK", { timeZone: "Asia/Colombo", month: "short", day: "numeric" }).format(new Date(value))} tick={{ fontSize: 11 }} />
        <YAxis width={70} tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
        <Tooltip labelFormatter={(value) => new Intl.DateTimeFormat("en-LK", { timeZone: "Asia/Colombo", dateStyle: "medium" }).format(new Date(Number(value)))} formatter={(value) => typeof value === "number" ? formatPrice(value) : "Not reported"} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {data.series.map((series, index) => <Line key={series.key} name={series.label} type="linear" dataKey={series.key} connectNulls={false} stroke={colors[index % colors.length]} strokeDasharray={index >= 5 ? "5 3" : undefined} dot={{ r: 3 }} isAnimationActive={false} />)}
      </LineChart>
    </ResponsiveContainer></div>
    <figcaption className="text-xs leading-5 text-muted-foreground">LKR/kg. Sources and grades are separate series. Missing days and unreported prices break lines; no prices are interpolated or filled. The table below provides the observations.</figcaption>
    {data.totalSeries > data.series.length && <p role="status" className="text-sm text-destructive">Showing {data.series.length} of {data.totalSeries} series. Refine the source or quality filter to see a smaller selection.</p>}
  </figure>;
}
