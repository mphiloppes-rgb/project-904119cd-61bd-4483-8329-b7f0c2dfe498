import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { startAutoBackup } from "@/lib/auto-backup";
import { startAutoViewerSync } from "@/lib/viewer-sync";
import AppLayout from "@/components/AppLayout";
import PinLock from "@/components/PinLock";
import DashboardPage from "@/pages/DashboardPage";
import POSPage from "@/pages/POSPage";
import ProductsPage from "@/pages/ProductsPage";
import CustomersPage from "@/pages/CustomersPage";
import InvoicesPage from "@/pages/InvoicesPage";
import ExpensesPage from "@/pages/ExpensesPage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import SuppliersPage from "@/pages/SuppliersPage";
import PurchasesPage from "@/pages/PurchasesPage";
import NotFound from "@/pages/NotFound";
import RequireAdmin from "@/components/RequireAdmin";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    startAutoBackup();
    // ابدأ مزامنة العارض تلقائياً لو المستخدم فعّلها قبل كده
    if (typeof window !== 'undefined' && localStorage.getItem('pos_viewer_auto') === '1') {
      startAutoViewerSync(5000);
    }
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <HashRouter>
          <PinLock>
            <AppLayout>
              <Routes>
                <Route path="/" element={<RequireAdmin><DashboardPage /></RequireAdmin>} />
                <Route path="/pos" element={<POSPage />} />
                <Route path="/products" element={<RequireAdmin><ProductsPage /></RequireAdmin>} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/suppliers" element={<RequireAdmin><SuppliersPage /></RequireAdmin>} />
                <Route path="/purchases" element={<RequireAdmin><PurchasesPage /></RequireAdmin>} />
                <Route path="/invoices" element={<InvoicesPage />} />
                <Route path="/expenses" element={<RequireAdmin><ExpensesPage /></RequireAdmin>} />
                <Route path="/reports" element={<RequireAdmin><ReportsPage /></RequireAdmin>} />
                <Route path="/settings" element={<RequireAdmin><SettingsPage /></RequireAdmin>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          </PinLock>
        </HashRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
