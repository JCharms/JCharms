import { createBrowserRouter } from 'react-router-dom'

/**
 * Application router.
 *
 * Routes are registered as each feature lands. Storefront pages are wired now;
 * checkout, tracking, auth and admin trees are added in their phases.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    lazy: async () => {
      const { StorefrontLayout } = await import('@/components/layout/StorefrontLayout')
      return { Component: StorefrontLayout }
    },
    children: [
      {
        index: true,
        lazy: async () => {
          const { HomePage } = await import('@/features/products/pages/HomePage')
          return { Component: HomePage }
        },
      },
      {
        path: 'shop',
        lazy: async () => {
          const { ShopPage } = await import('@/features/products/pages/ShopPage')
          return { Component: ShopPage }
        },
      },
      {
        path: 'shop/:categorySlug',
        lazy: async () => {
          const { ShopPage } = await import('@/features/products/pages/ShopPage')
          return { Component: ShopPage }
        },
      },
      {
        path: 'product/:slug',
        lazy: async () => {
          const { ProductDetailPage } = await import(
            '@/features/products/pages/ProductDetailPage'
          )
          return { Component: ProductDetailPage }
        },
      },
      {
        path: 'checkout',
        lazy: async () => {
          const { CheckoutPage } = await import('@/features/checkout/CheckoutPage')
          return { Component: CheckoutPage }
        },
      },
      {
        path: 'order-confirmed/:orderNumber',
        lazy: async () => {
          const { OrderConfirmedPage } = await import(
            '@/features/checkout/OrderConfirmedPage'
          )
          return { Component: OrderConfirmedPage }
        },
      },
      {
        path: 'login',
        lazy: async () => {
          const { LoginPage } = await import('@/features/auth/pages/LoginPage')
          return { Component: LoginPage }
        },
      },
      {
        path: 'signup',
        lazy: async () => {
          const { SignupPage } = await import('@/features/auth/pages/SignupPage')
          return { Component: SignupPage }
        },
      },
      {
        path: 'verify-email',
        lazy: async () => {
          const { VerifyEmailPage } = await import('@/features/auth/pages/VerifyEmailPage')
          return { Component: VerifyEmailPage }
        },
      },
      {
        path: 'account',
        lazy: async () => {
          const { AccountPage } = await import('@/features/auth/pages/AccountPage')
          const { RequireAuth } = await import('@/features/auth/RequireAuth')
          return {
            Component: () => (
              <RequireAuth>
                <AccountPage />
              </RequireAuth>
            ),
          }
        },
      },
      {
        path: 'account/reset',
        lazy: async () => {
          const { ResetPasswordPage } = await import(
            '@/features/auth/pages/ResetPasswordPage'
          )
          return { Component: ResetPasswordPage }
        },
      },
      {
        path: 'track',
        lazy: async () => {
          const { TrackOrderPage } = await import('@/features/orders/pages/TrackOrderPage')
          return { Component: TrackOrderPage }
        },
      },
      {
        path: '*',
        lazy: async () => {
          const { NotFoundPage } = await import('@/components/layout/NotFoundPage')
          return { Component: NotFoundPage }
        },
      },
    ],
  },

  // ── Admin tree (guarded client-side by RequireAdmin; RLS enforces on the DB) ──
  {
    path: '/admin',
    lazy: async () => {
      const { AdminLayout } = await import('@/features/admin/AdminLayout')
      const { RequireAdmin } = await import('@/features/auth/RequireAuth')
      return {
        Component: () => (
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        ),
      }
    },
    children: [
      {
        index: true,
        lazy: async () => {
          const { DashboardPage } = await import('@/features/admin/dashboard/DashboardPage')
          return { Component: DashboardPage }
        },
      },
      {
        path: 'orders',
        lazy: async () => {
          const { OrdersListPage } = await import('@/features/admin/orders/OrdersListPage')
          return { Component: OrdersListPage }
        },
      },
      {
        path: 'orders/:id',
        lazy: async () => {
          const { OrderDetailPage } = await import('@/features/admin/orders/OrderDetailPage')
          return { Component: OrderDetailPage }
        },
      },
      {
        path: 'catalogue',
        lazy: async () => {
          const { CataloguePage } = await import('@/features/admin/catalogue/CataloguePage')
          return { Component: CataloguePage }
        },
      },
      {
        path: 'catalogue/new',
        lazy: async () => {
          const { ProductEditorPage } = await import(
            '@/features/admin/catalogue/ProductEditorPage'
          )
          return { Component: ProductEditorPage }
        },
      },
      {
        path: 'catalogue/:id',
        lazy: async () => {
          const { ProductEditorPage } = await import(
            '@/features/admin/catalogue/ProductEditorPage'
          )
          return { Component: ProductEditorPage }
        },
      },
      {
        path: 'reviews',
        lazy: async () => {
          const { ReviewsPage } = await import('@/features/admin/reviews/ReviewsPage')
          return { Component: ReviewsPage }
        },
      },
      {
        path: 'settings',
        lazy: async () => {
          const { SettingsPage } = await import('@/features/admin/settings/SettingsPage')
          return { Component: SettingsPage }
        },
      },
    ],
  },
])
