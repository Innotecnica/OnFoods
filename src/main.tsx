import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import OptimizedApp from "./components/OptimizedApp";
import i18n from "./i18n";
import { initializeSystemOptimization, logPerformanceMetrics } from "./utils/systemConsolidation";
import "./index.css";

// Initialize system optimization
initializeSystemOptimization();


// Performance optimizations
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Log performance metrics shortly after load
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    setTimeout(logPerformanceMetrics, 1000);
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <BrowserRouter>
          <HelmetProvider>
            <AuthProvider>
              <OptimizedApp />
              <Toaster />
            </AuthProvider>
          </HelmetProvider>
        </BrowserRouter>
      </I18nextProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
