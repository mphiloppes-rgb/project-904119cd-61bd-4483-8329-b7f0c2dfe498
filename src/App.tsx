import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <HashRouter>
        <PinLock>
          <AppLayout>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/pos" element={<POSPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/purchases" element={<PurchasesPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </PinLock>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
