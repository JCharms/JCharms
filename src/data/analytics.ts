import { supabase } from '@/lib/supabaseClient'
import { unwrap, unwrapList } from './_helpers'
import type { Database, OrderStatus } from '@/types/database'

/**
 * Admin dashboard analytics. All aggregation happens in SQL views (spec §6);
 * this repo just reads them so the dashboard stays fast as orders grow.
 */
type RevenueSummary = Database['public']['Views']['admin_revenue_summary']['Row']
type RevenueDaily = Database['public']['Views']['admin_revenue_daily']['Row']
type TopProduct = Database['public']['Views']['admin_top_products']['Row']

export interface DashboardData {
  summary: RevenueSummary
  ordersByStatus: Record<OrderStatus, number>
  revenueDaily: RevenueDaily[]
  topProducts: TopProduct[]
}

export async function getDashboard(): Promise<DashboardData> {
  const [summary, byStatus, daily, top] = await Promise.all([
    supabase.from('admin_revenue_summary').select('*').single(),
    supabase.from('admin_orders_by_status').select('*'),
    supabase.from('admin_revenue_daily').select('*'),
    supabase.from('admin_top_products').select('*'),
  ])

  const ordersByStatus = {
    placed: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  } as Record<OrderStatus, number>
  for (const row of unwrapList(byStatus, 'getDashboard.byStatus')) {
    if (row.order_status) ordersByStatus[row.order_status] = row.order_count ?? 0
  }

  return {
    summary: unwrap(summary, 'getDashboard.summary'),
    ordersByStatus,
    revenueDaily: unwrapList(daily, 'getDashboard.daily'),
    topProducts: unwrapList(top, 'getDashboard.top'),
  }
}
