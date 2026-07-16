import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { IndianRupee, ShoppingBag, TrendingUp, Trophy } from 'lucide-react'
import { useDashboard } from './hooks'
import { Card, LoadingBlock } from '@/components/ui'
import { formatINR } from '@/lib/format'
import { ORDER_STATUS_LABEL } from '@/data/orderStateMachine'
import type { OrderStatus } from '@/types/database'

export function DashboardPage() {
  const { data, isLoading } = useDashboard()

  if (isLoading || !data) return <LoadingBlock label="Crunching the numbers…" />

  const { summary, ordersByStatus, revenueDaily, topProducts } = data
  const chartData = revenueDaily
    .filter((d): d is typeof d & { day: string } => !!d.day)
    .map((d) => ({
      day: new Date(d.day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      revenue: Number(d.revenue ?? 0),
      orders: Number(d.order_count ?? 0),
    }))

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl text-indigo">At a glance</h1>

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={IndianRupee} label="Revenue (paid)" value={formatINR(Number(summary.total_revenue ?? 0))} tone="pink" />
        <Stat icon={ShoppingBag} label="Total orders" value={String(summary.total_orders ?? 0)} tone="indigo" />
        <Stat icon={TrendingUp} label="Avg order value" value={formatINR(Number(summary.avg_order_value ?? 0))} tone="marigold" />
        <Stat icon={Trophy} label="Paid orders" value={String(summary.paid_orders ?? 0)} tone="sage" />
      </div>

      {/* Status breakdown */}
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-6">
          <h2 className="mb-4 font-display text-xl text-indigo">Last 30 days</h2>
          {chartData.length === 0 ? (
            <p className="py-16 text-center text-sm text-ink-faint">No orders in the last 30 days yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ left: -12 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#EEE3CD" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#8A8AA3' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#8A8AA3' }} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(v: number, name) => (name === 'revenue' ? formatINR(v) : v)}
                  contentStyle={{ borderRadius: 12, border: '1px solid #EEE3CD', fontSize: 13 }}
                />
                <Bar dataKey="revenue" fill="#F2618B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-display text-xl text-indigo">Orders by status</h2>
          <ul className="space-y-2">
            {(Object.keys(ordersByStatus) as OrderStatus[]).map((status) => (
              <li key={status} className="flex items-center justify-between text-sm">
                <span className="text-ink-muted">{ORDER_STATUS_LABEL[status]}</span>
                <span className="font-mono font-semibold text-indigo">{ordersByStatus[status]}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Top products */}
      <Card className="p-6">
        <h2 className="mb-4 font-display text-xl text-indigo">Best sellers</h2>
        {topProducts.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-faint">No sales yet.</p>
        ) : (
          <ul className="divide-y divide-ivory-300/70">
            {topProducts.map((p, i) => (
              <li key={p.product_id ?? i} className="flex items-center justify-between py-3 text-sm">
                <span className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-marigold-100 font-mono text-xs text-marigold-500">
                    {i + 1}
                  </span>
                  {p.product_name}
                </span>
                <span className="text-ink-muted">
                  <span className="font-mono font-semibold text-indigo">{p.units_sold}</span> sold ·{' '}
                  {formatINR(Number(p.revenue ?? 0))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof IndianRupee
  label: string
  value: string
  tone: 'pink' | 'indigo' | 'marigold' | 'sage'
}) {
  const tones = {
    pink: 'bg-pink-50 text-pink-600',
    indigo: 'bg-indigo-100 text-indigo',
    marigold: 'bg-marigold-100 text-marigold-500',
    sage: 'bg-sage-100 text-sage-400',
  }
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon size={20} />
      </span>
      <div>
        <p className="text-xs text-ink-faint">{label}</p>
        <p className="font-mono text-xl font-semibold text-indigo">{value}</p>
      </div>
    </Card>
  )
}
