import React, { useState } from "react";
import { Check, AlertTriangle, X, Info } from "lucide-react";
import { User, AlertConfig, SubscriptionPlan } from "../types.ts";

// Import modular tab components
import SuperAdminDashboardTab from "./admin/SuperAdminDashboardTab.tsx";
import AdminSettingsTab from "./admin/AdminSettingsTab.tsx";
import AdminSubscribersTab from "./admin/AdminSubscribersTab.tsx";
import AdminPlansTab from "./admin/AdminPlansTab.tsx";
import AdminLogsTab from "./admin/AdminLogsTab.tsx";
import AdminBackupsTab from "./admin/AdminBackupsTab.tsx";
import AdminMonitorsTab from "./admin/AdminMonitorsTab.tsx";

interface AdminDashboardProps {
  users: User[];
  config: AlertConfig | null;
  onRefreshData: () => void;
  activeTab?: "dashboard" | "settings" | "subscribers" | "logs" | "plans" | "backups" | "monitors";
  plans?: SubscriptionPlan[];
}

export default function AdminDashboard({
  users,
  config,
  onRefreshData,
  activeTab = "dashboard",
  plans = []
}: AdminDashboardProps) {
  // Global status banners
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Toast notifications state
  const [toasts, setToasts] = useState<{ id: string; message: string; type: "success" | "error" | "info" }[]>([]);

  const addToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const isSmtpConfigured = !!(config?.smtp_host && config?.smtp_user && config?.smtp_pass);
  const isTelegramConfigured = !!config?.telegram_bot_token;
  const alertDelay = config?.alert_delay_checks || 3;

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    if (msg) {
      setErrorMsg("");
      addToast(msg, "success");
    }
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    if (msg) {
      setSuccessMsg("");
      addToast(msg, "error");
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-2 md:px-4" id="admin-dashboard-container">
      {/* Toast Notification Container with elegant slide-in animations */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none max-w-sm w-full" id="admin-global-toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl border animate-in slide-in-from-right duration-300 ${
              t.type === "success"
                ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                : t.type === "error"
                ? "bg-rose-50 border-rose-100 text-rose-800"
                : "bg-blue-50 border-blue-100 text-blue-800"
            }`}
            id={`admin-toast-${t.id}`}
          >
            {t.type === "success" ? (
              <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 animate-bounce" />
            ) : t.type === "error" ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="text-xs font-black font-sans leading-relaxed">{t.message}</p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
              className="text-slate-400 hover:text-slate-600 rounded-lg p-0.5 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Global Status messages banner - Compact & Modern */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-between gap-2 animate-fade-in shadow-2xs" id="global-success-banner">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 text-rose-800 p-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-between gap-2 animate-fade-in shadow-2xs" id="global-error-banner">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg("")} className="text-rose-600 hover:text-rose-800 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Render modular views based on activeTab */}
      {activeTab === "dashboard" && (
        <SuperAdminDashboardTab
          users={users}
          isSmtpConfigured={isSmtpConfigured}
          isTelegramConfigured={isTelegramConfigured}
          alertDelay={alertDelay}
        />
      )}

      {activeTab === "settings" && (
        <AdminSettingsTab
          config={config}
          onRefreshData={onRefreshData}
          onSuccess={showSuccess}
          onError={showError}
        />
      )}

      {activeTab === "subscribers" && (
        <AdminSubscribersTab
          users={users}
          plans={plans}
          onRefreshData={onRefreshData}
          onSuccess={showSuccess}
          onError={showError}
        />
      )}

      {activeTab === "plans" && (
        <AdminPlansTab
          plans={plans}
          onRefreshData={onRefreshData}
          onSuccess={showSuccess}
          onError={showError}
        />
      )}

      {activeTab === "logs" && (
        <AdminLogsTab
          onSuccess={showSuccess}
          onError={showError}
        />
      )}

      {activeTab === "backups" && (
        <AdminBackupsTab
          onRefreshData={onRefreshData}
          onSuccess={showSuccess}
          onError={showError}
        />
      )}

      {activeTab === "monitors" && (
        <AdminMonitorsTab
          onSuccess={showSuccess}
          onError={showError}
        />
      )}
    </div>
  );
}
