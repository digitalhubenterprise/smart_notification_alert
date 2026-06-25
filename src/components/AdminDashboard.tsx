import React, { useState } from "react";
import { Check, AlertTriangle } from "lucide-react";
import { User, AlertConfig, SubscriptionPlan } from "../types.ts";

// Import modular tab components
import SuperAdminDashboardTab from "./admin/SuperAdminDashboardTab.tsx";
import AdminSettingsTab from "./admin/AdminSettingsTab.tsx";
import AdminSubscribersTab from "./admin/AdminSubscribersTab.tsx";
import AdminPlansTab from "./admin/AdminPlansTab.tsx";
import AdminLogsTab from "./admin/AdminLogsTab.tsx";
import AdminBackupsTab from "./admin/AdminBackupsTab.tsx";

interface AdminDashboardProps {
  users: User[];
  config: AlertConfig | null;
  onRefreshData: () => void;
  activeTab?: "dashboard" | "settings" | "subscribers" | "logs" | "plans" | "backups";
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

  const isSmtpConfigured = !!(config?.smtp_host && config?.smtp_user && config?.smtp_pass);
  const isTelegramConfigured = !!config?.telegram_bot_token;
  const alertDelay = config?.alert_delay_checks || 3;

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    if (msg) setErrorMsg("");
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    if (msg) setSuccessMsg("");
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-2 md:px-4" id="admin-dashboard-container">
      {/* Global Status messages banner - Compact & Modern */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in shadow-2xs" id="global-success-banner">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 text-rose-800 p-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in shadow-2xs" id="global-error-banner">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
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
    </div>
  );
}
