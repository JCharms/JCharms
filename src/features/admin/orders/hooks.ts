import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  adminListOrders,
  adminGetOrder,
  adminUpdateOrderStatus,
  adminSetTracking,
  adminUpdatePaymentStatus,
  adminUpdateOrderNote,
  type AdminOrderFilters,
} from '@/data/orders'
import { queryKeys } from '@/lib/queryClient'
import { toast } from '@/store/ui'
import type { Order, OrderStatus, PaymentStatus } from '@/types/database'

export function useAdminOrders(filters: AdminOrderFilters) {
  return useQuery({
    queryKey: queryKeys.adminOrders(filters),
    queryFn: () => adminListOrders(filters),
  })
}

export function useAdminOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.adminOrder(id),
    queryFn: () => adminGetOrder(id),
    enabled: !!id,
  })
}

function useOrderInvalidation() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
    qc.invalidateQueries({ queryKey: ['admin', 'order'] })
    qc.invalidateQueries({ queryKey: queryKeys.adminAnalytics })
  }
}

export function useUpdateOrderStatus() {
  const invalidate = useOrderInvalidation()
  return useMutation({
    mutationFn: ({ order, to }: { order: Pick<Order, 'id' | 'order_status'>; to: OrderStatus }) =>
      adminUpdateOrderStatus(order, to),
    onSuccess: () => {
      toast.success('Order status updated — customer notified.')
      invalidate()
    },
    onError: (e) => toast.error((e as Error).message),
  })
}

export function useSetTracking() {
  const invalidate = useOrderInvalidation()
  return useMutation({
    mutationFn: ({
      order,
      trackingNumber,
      courier,
    }: {
      order: Pick<Order, 'id' | 'order_status'>
      trackingNumber: string
      courier: string
    }) => adminSetTracking(order, trackingNumber, courier),
    onSuccess: () => {
      toast.success('Tracking saved — shipped email sent.')
      invalidate()
    },
    onError: (e) => toast.error((e as Error).message),
  })
}

export function useUpdatePaymentStatus() {
  const invalidate = useOrderInvalidation()
  return useMutation({
    mutationFn: ({ id, to }: { id: string; to: PaymentStatus }) =>
      adminUpdatePaymentStatus(id, to),
    onSuccess: () => {
      toast.success('Payment status updated.')
      invalidate()
    },
    onError: (e) => toast.error((e as Error).message),
  })
}

export function useUpdateOrderNote() {
  const invalidate = useOrderInvalidation()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => adminUpdateOrderNote(id, note),
    onSuccess: () => {
      toast.success('Note saved.')
      invalidate()
    },
    onError: (e) => toast.error((e as Error).message),
  })
}
