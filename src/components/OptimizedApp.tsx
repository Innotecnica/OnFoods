import { lazy, Suspense, memo } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SecurityProvider } from '@/components/SecurityProvider';
import { ProductionGuard } from '@/components/ProductionGuard';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { CookieConsent } from '@/components/cookies/CookieConsent';
import { Navigation } from '@/components/layout/Navigation';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Footer } from '@/components/layout/Footer';
import { useIsMobile } from '@/hooks/useIsMobile';
import { usePerformanceMonitor, useMemoryMonitor, useNetworkMonitor } from '@/utils/performance';
import { performanceMonitor } from '@/utils/performance-enhanced';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load all major pages for better initial load
const Home = lazy(() => import('@/pages/Home'));
const Auth = lazy(() => import('@/pages/Auth'));
const Products = lazy(() => import('@/pages/Products'));
// Import DashboardRedirect directly since it's needed for auth flows
import { DashboardRedirect } from '@/components/DashboardRedirect';
import { ProtectedRoute } from '@/components/ProtectedRoute';
const ProductDetail = lazy(() => import('@/pages/ProductDetail'));
const Establishments = lazy(() => import('@/pages/Establishments'));
const EstablishmentDetail = lazy(() => import('@/pages/EstablishmentDetail'));
const EstablishmentDashboard = lazy(() => import('@/pages/EstablishmentDashboard'));
const Cart = lazy(() => import('@/pages/Cart'));
const Orders = lazy(() => import('@/pages/Orders'));
import { CartErrorBoundary } from '@/components/cart/CartErrorBoundary';
const Account = lazy(() => import('@/pages/Account'));
const Payment = lazy(() => import('@/pages/Payment'));
const EstablishmentSettings = lazy(() => import('@/pages/EstablishmentSettings'));

// Static pages can be bundled together
const StaticPages = lazy(() => import('@/components/StaticPagesBundle'));

// Loading component with better UX
const PageSkeleton = memo(() => (
  <div className="min-h-screen space-y-6 p-6">
    <Skeleton className="h-8 w-64" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-48 w-full" />
      ))}
    </div>
  </div>
));

const OptimizedApp = memo(() => {
  const { isMobile } = useIsMobile();
  
  // Performance monitoring
  usePerformanceMonitor('OptimizedApp');
  useMemoryMonitor();
  useNetworkMonitor();

  // Track app performance
  performanceMonitor.measureAsync('app-initialization', async () => {
    // App initialization complete
    console.log('App initialized');
  });

  return (
    <ErrorBoundary>
      <SecurityProvider>
        <ProductionGuard>
          <div className="min-h-screen bg-background">
            <Navigation />
            
            <main className="container mx-auto px-4 sm:px-6 py-6">
              <Suspense fallback={<PageSkeleton />}>
                <Routes>
                  {/* Core routes - highest priority */}
                  <Route path="/" element={<Home />} />
                  <Route path="/auth" element={
                    <ProtectedRoute requireAuth={false}>
                      <Auth />
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard-redirect" element={<DashboardRedirect />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/products/:id" element={<ProductDetail />} />
                  <Route path="/establishments" element={<Establishments />} />
                  <Route path="/establishments/:id" element={<EstablishmentDetail />} />
                  
                  {/* Dashboard routes - loaded on demand */}
                  <Route path="/establishment-dashboard" element={
                    <ProtectedRoute requireAuth={true} userType="establishment">
                      <EstablishmentDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/establishment-settings" element={
                    <ProtectedRoute requireAuth={true} userType="establishment">
                      <EstablishmentSettings />
                    </ProtectedRoute>
                  } />
                  
                  {/* User flow routes */}
                  <Route path="/cart" element={
                    <CartErrorBoundary>
                      <Cart />
                    </CartErrorBoundary>
                  } />
                  <Route path="/orders" element={
                    <ProtectedRoute requireAuth={true}>
                      <Orders />
                    </ProtectedRoute>
                  } />
                  <Route path="/account" element={
                    <ProtectedRoute requireAuth={true}>
                      <Account />
                    </ProtectedRoute>
                  } />
                  <Route path="/payment" element={
                    <ProtectedRoute requireAuth={true}>
                      <Payment />
                    </ProtectedRoute>
                  } />
                  
                  {/* Static pages bundle */}
                  <Route path="/about" element={<StaticPages page="about" />} />
                  <Route path="/contact" element={<StaticPages page="contact" />} />
                  <Route path="/help" element={<StaticPages page="help" />} />
                  <Route path="/terms" element={<StaticPages page="terms" />} />
                  <Route path="/privacy" element={<StaticPages page="privacy" />} />
                  <Route path="/cookies" element={<StaticPages page="cookies" />} />
                  <Route path="/lgpd" element={<StaticPages page="lgpd" />} />
                  <Route path="/how-it-works" element={<StaticPages page="how-it-works" />} />
                  <Route path="/careers" element={<StaticPages page="careers" />} />
                  <Route path="/press" element={<StaticPages page="press" />} />
                  <Route path="/blog" element={<StaticPages page="blog" />} />
                  <Route path="/report-problem" element={<StaticPages page="report-problem" />} />
                  <Route path="/talk-to-us" element={<StaticPages page="talk-to-us" />} />
                  <Route path="/system-status" element={<StaticPages page="system-status" />} />
                  <Route path="/workflow-analysis" element={<StaticPages page="workflow-analysis" />} />
                  <Route path="/search" element={<StaticPages page="search" />} />
                  <Route path="*" element={<StaticPages page="not-found" />} />
                </Routes>
              </Suspense>
            </main>
            
            <Footer />
            
            <PWAInstallPrompt />
            <CookieConsent />
          </div>
        </ProductionGuard>
      </SecurityProvider>
    </ErrorBoundary>
  );
});

OptimizedApp.displayName = 'OptimizedApp';

export default OptimizedApp;