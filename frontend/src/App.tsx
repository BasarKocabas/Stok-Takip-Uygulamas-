import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/context/AuthContext';
import { Layout } from '@/components/layout/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import ProductList from '@/pages/products/ProductList';
import ProductDetail from '@/pages/products/ProductDetail';
import WorkOrderList from '@/pages/work-orders/WorkOrderList';
import WorkOrderForm from '@/pages/work-orders/WorkOrderForm';
import WorkOrderDetail from '@/pages/work-orders/WorkOrderDetail';
import StockMovements from '@/pages/stock/StockMovements';
import UserList from '@/pages/users/UserList';
import Reports from '@/pages/reports/Reports';

import { ThemeProvider } from '@/context/ThemeContext';
import Profile from '@/pages/Profile';
import Settings from '@/pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route element={<Layout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/products" element={<ProductList />} />
                  <Route path="/products/:id" element={<ProductDetail />} />
                  <Route path="/work-orders" element={<WorkOrderList />} />
                  <Route path="/work-orders/new" element={<WorkOrderForm />} />
                  <Route path="/work-orders/:id" element={<WorkOrderDetail />} />
                  <Route path="/stock-movements" element={<StockMovements />} />
                  <Route path="/users" element={<UserList />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
