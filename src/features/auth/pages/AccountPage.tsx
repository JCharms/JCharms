import { useNavigate } from 'react-router-dom'
import { LogOut, Package } from 'lucide-react'
import { useMyOrders } from '@/features/orders/hooks'
import { OrderCard } from '@/features/orders/components/OrderCard'
import { useAuthStore } from '@/features/auth/authStore'
import { signOut } from '@/data/auth'
import { Button, LoadingBlock, EmptyState } from '@/components/ui'
import { RunningStitch } from '@/components/ui/RunningStitch'
import { toast } from '@/store/ui'

export function AccountPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { data: orders, isLoading } = useMyOrders()

  async function handleSignOut() {
    await signOut()
    toast.success('Signed out. See you soon!')
    navigate('/')
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-indigo">My orders</h1>
          <RunningStitch className="mt-3 max-w-[120px] text-pink" />
          <p className="mt-2 text-sm text-ink-muted">{user?.email}</p>
        </div>
        <Button variant="outline" onClick={handleSignOut}>
          <LogOut size={16} /> Sign out
        </Button>
      </div>

      <div className="mt-8 space-y-5">
        {isLoading ? (
          <LoadingBlock label="Fetching your orders…" />
        ) : orders && orders.length > 0 ? (
          orders.map((order) => <OrderCard key={order.id} order={order} />)
        ) : (
          <EmptyState
            icon={Package}
            title="No orders yet"
            description="When you place an order, it'll show up here with live status."
            action={
              <Button onClick={() => navigate('/shop')}>Start shopping</Button>
            }
          />
        )}
      </div>
    </div>
  )
}
