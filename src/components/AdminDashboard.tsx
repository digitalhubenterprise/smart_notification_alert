import React, { useState, useEffect } from "react";
import { 
  Settings, 
  Terminal, 
  Users, 
  Sliders, 
  Shield, 
  Send, 
  Mail, 
  Wallet, 
  Check, 
  AlertTriangle, 
  RefreshCw,
  Trash2,
  Lock,
  Cpu,
  TrendingUp,
  Activity,
  User as UserIcon,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ToggleLeft,
  X,
  Plus,
  Cloud,
  Database,
  UploadCloud,
  Download
} from "lucide-react";
import { User, AlertConfig, SystemLog, SubscriptionPlan } from "../types.ts";

interface AdminDashboardProps {
  users: User[];
  config: AlertConfig | null;
  onRefreshData: () => void;
  activeTab?: "settings" | "subscribers" | "logs" | "plans" | "backups";
  plans?: SubscriptionPlan[];
}

export default function AdminDashboard({
  users,
  config,
  onRefreshData,
  activeTab = "settings",
  plans = []
}: AdminDashboardProps) {
  // Backups tab state
  const [backupSettings, setBackupSettings] = useState<{
    enabled: boolean;
    cloudUrl: string;
    intervalHours: number;
    lastBackupAt?: string;
    lastBackupStatus?: "success" | "failed" | "pending";
    lastBackupMessage?: string;
  }>({ enabled: false, cloudUrl: "", intervalHours: 24 });
  const [backupSnapshots, setBackupSnapshots] = useState<any[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isSavingBackupSettings, setIsSavingBackupSettings] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isTestingCloud, setIsTestingCloud] = useState(false);
  const [newBackupName, setNewBackupName] = useState("");
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // System Log cache state
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Edit config states
  const [alertDelay, setAlertDelay] = useState(3);
  const [tgBotToken, setTgBotToken] = useState("");
  const [tgChatId, setTgChatId] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(2525);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [smtpPreset, setSmtpPreset] = useState("custom");
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [receiverWallet, setReceiverWallet] = useState("");
  const [settingsSubTab, setSettingsSubTab] = useState<"general" | "payment" | "notification" | "email">("general");

  // Filter States
  const [subscriberSearch, setSubscriberSearch] = useState("");

  // Editing User state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserBalance, setEditUserBalance] = useState(0);
  const [editUserPlan, setEditUserPlan] = useState<"free" | "pro" | "enterprise">("free");

  // Editing Plan state
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [editPlanName, setEditPlanName] = useState("");
  const [editPlanPrice, setEditPlanPrice] = useState(0);
  const [editPlanMaxMonitors, setEditPlanMaxMonitors] = useState(0);
  const [editPlanMinInterval, setEditPlanMinInterval] = useState(30);
  const [editPlanFeaturesText, setEditPlanFeaturesText] = useState("");
  const [editPlanIsActive, setEditPlanIsActive] = useState(true);
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  // Status banners
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);

  // Initialize config fields
  useEffect(() => {
    if (config) {
      setAlertDelay(config.alert_delay_checks);
      setTgBotToken(config.telegram_bot_token || "");
      setTgChatId(config.telegram_chat_id || "");
      const host = config.smtp_host || "";
      setSmtpHost(host);
      setSmtpPort(config.smtp_port || 2525);
      setSmtpUser(config.smtp_user || "");
      setSmtpPass(config.smtp_pass || "");
      setSmtpFrom(config.smtp_from || "");
      setAlertsEnabled(config.alerts_enabled);
      setReceiverWallet(config.receiver_wallet_address || "");

      // Detect preset
      let preset = "custom";
      if (host === "smtp.gmail.com") {
        preset = "gmail";
      } else if (host.startsWith("mail.")) {
        preset = "cpanel";
      } else if (host.includes("secureserver") || host.includes("hostinger") || host.includes("mailtrap")) {
        preset = "hosting";
      }
      setSmtpPreset(preset);
    }
  }, [config]);

  const handlePresetChange = (preset: string) => {
    setSmtpPreset(preset);
    if (preset === "gmail") {
      setSmtpHost("smtp.gmail.com");
      setSmtpPort(465);
    } else if (preset === "cpanel") {
      setSmtpHost("mail.yourdomain.com");
      setSmtpPort(465);
    } else if (preset === "hosting") {
      setSmtpHost("smtp.hostinger.com");
      setSmtpPort(465);
    }
  };

  // Fetch system logs on load
  useEffect(() => {
    fetchSystemLogs();
    const interval = setInterval(fetchSystemLogs, 4000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Backups settings & snapshots
  const fetchBackupSettings = async () => {
    setIsLoadingBackups(true);
    try {
      const res = await fetch("/api/admin/backup/settings");
      if (res.ok) {
        const data = await res.json();
        setBackupSettings(data.backupSettings);
        setBackupSnapshots(data.backupSnapshots);
      }
    } catch (err) {
      console.error("Failed to fetch backups:", err);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  useEffect(() => {
    if (activeTab === "backups") {
      fetchBackupSettings();
    }
  }, [activeTab]);

  const handleSaveBackupSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    setIsSavingBackupSettings(true);
    try {
      const res = await fetch("/api/admin/backup/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backupSettings)
      });
      if (res.ok) {
        const data = await res.json();
        setBackupSettings(data.backupSettings);
        setSuccessMsg("Backup settings saved successfully.");
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Failed to save backup settings.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error occurred.");
    } finally {
      setIsSavingBackupSettings(false);
    }
  };

  const handleCreateManualBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    setIsCreatingBackup(true);
    try {
      const res = await fetch("/api/admin/backup/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBackupName })
      });
      if (res.ok) {
        setSuccessMsg(`Backup snapshot created successfully!`);
        setNewBackupName("");
        fetchBackupSettings();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Failed to create manual backup.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error occurred.");
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleTestCloudBackup = async () => {
    setSuccessMsg("");
    setErrorMsg("");
    setIsTestingCloud(true);
    try {
      const res = await fetch("/api/admin/backup/test-cloud", {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setSuccessMsg(data.message || "Cloud connection test passed! Backup data uploaded successfully.");
        fetchBackupSettings();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Cloud upload failed. Please verify the backup server URL.");
        fetchBackupSettings();
      }
    } catch (err: any) {
      setErrorMsg(`Cloud endpoint error: ${err.message}`);
      fetchBackupSettings();
    } finally {
      setIsTestingCloud(false);
    }
  };

  const handleRestoreBackup = async (id: string, name: string) => {
    if (!window.confirm(`Are you absolutely sure you want to restore the system to "${name}"?\nThis will revert all current data to this snapshot!`)) {
      return;
    }
    setSuccessMsg("");
    setErrorMsg("");
    setRestoringId(id);
    try {
      const res = await fetch("/api/admin/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setSuccessMsg(`System restored successfully to "${name}"!`);
        onRefreshData();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Failed to restore backup snapshot.");
      }
    } catch (err: any) {
      setErrorMsg(`Restore error: ${err.message}`);
    } finally {
      setRestoringId(null);
    }
  };

  const handleDeleteBackup = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this backup snapshot? This cannot be undone.")) {
      return;
    }
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/admin/backup/delete/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setSuccessMsg("Backup snapshot deleted successfully.");
        fetchBackupSettings();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Failed to delete backup snapshot.");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const fetchSystemLogs = async () => {
    try {
      const res = await fetch("/api/admin/system-logs");
      if (res.ok) {
        const data = await res.json();
        setSystemLogs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit global configurations
  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    setIsUpdatingConfig(true);

    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alert_delay_checks: alertDelay,
          telegram_bot_token: tgBotToken,
          telegram_chat_id: tgChatId,
          smtp_host: smtpHost,
          smtp_port: smtpPort,
          smtp_user: smtpUser,
          smtp_pass: smtpPass,
          smtp_from: smtpFrom,
          alerts_enabled: alertsEnabled,
          receiver_wallet_address: receiverWallet
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update configurations");
      }

      setSuccessMsg("Global alert timings and credentials updated successfully!");
      onRefreshData();
      fetchSystemLogs();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save config.");
    } finally {
      setIsUpdatingConfig(false);
    }
  };

  // Select a subscriber to edit
  const startEditUser = (user: User) => {
    setEditingUser(user);
    setEditUserBalance(user.balance);
    setEditUserPlan(user.plan_id);
  };

  // Submit subscriber changes
  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          balance: editUserBalance,
          plan_id: editUserPlan
        })
      });

      if (res.ok) {
        setEditingUser(null);
        setSuccessMsg(`Successfully updated profile for user: ${editingUser.name}`);
        onRefreshData();
        fetchSystemLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Clear system log console cache
  const handleClearLogs = async () => {
    try {
      const res = await fetch("/api/admin/system-logs/clear", { method: "POST" });
      if (res.ok) {
        setSystemLogs([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setEditPlanName(plan.name);
    setEditPlanPrice(plan.price);
    setEditPlanMaxMonitors(plan.max_monitors);
    setEditPlanMinInterval(plan.min_interval_sec);
    setEditPlanFeaturesText(plan.features.join("\n"));
    setEditPlanIsActive(plan.is_active);
  };

  const handleSavePlanEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setIsSavingPlan(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const features = editPlanFeaturesText
        .split("\n")
        .map((f) => f.trim())
        .filter((f) => f.length > 0);

      const res = await fetch(`/api/admin/plans/${editingPlan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editPlanName,
          price: editPlanPrice,
          max_monitors: editPlanMaxMonitors,
          min_interval_sec: editPlanMinInterval,
          features,
          is_active: editPlanIsActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update subscription plan.");
      }

      setEditingPlan(null);
      setSuccessMsg(`Successfully updated subscription plan for "${editPlanName}"!`);
      onRefreshData();
      fetchSystemLogs();
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred saving plan.");
    } finally {
      setIsSavingPlan(false);
    }
  };

  // Filter subscribers list
  const filteredUsers = users.filter((u) => {
    const term = subscriberSearch.toLowerCase();
    return u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
  });

  // Calculate high-level summary metrics
  const totalSubscribers = users.length;
  const activeLogsCount = systemLogs.length;
  const totalBalanceOverAll = users.reduce((sum, u) => sum + u.balance, 0).toFixed(2);
  const isSmtpConfigured = !!(smtpHost && smtpUser && smtpPass);
  const isTelegramConfigured = !!tgBotToken;

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-2 md:px-4">
      
      {/* Executive Command Center Stats Row - Highly Compact & Premium */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Total Subscribers */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100/80 shadow-xs flex items-center justify-between hover:shadow-md transition-all duration-200 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50/30 rounded-full filter blur-lg group-hover:scale-125 transition-transform duration-300" />
          <div className="relative z-10 space-y-0.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Subscribers</span>
            <span className="text-2xl font-black text-slate-900 tracking-tight">{totalSubscribers}</span>
            <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span>Full User Pools</span>
            </div>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-xs">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Global System Operations */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100/80 shadow-xs flex items-center justify-between hover:shadow-md transition-all duration-200 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50/30 rounded-full filter blur-lg group-hover:scale-125 transition-transform duration-300" />
          <div className="relative z-10 space-y-0.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">System Loops Logged</span>
            <span className="text-2xl font-black text-slate-900 tracking-tight">{activeLogsCount}</span>
            <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Goroutines running loops</span>
            </div>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-xs">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* Total Crypto Ledger Value */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100/80 shadow-xs flex items-center justify-between hover:shadow-md transition-all duration-200 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-50/30 rounded-full filter blur-lg group-hover:scale-125 transition-transform duration-300" />
          <div className="relative z-10 space-y-0.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">USDT Deposits Managed</span>
            <span className="text-2xl font-black text-slate-900 tracking-tight">${totalBalanceOverAll}</span>
            <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>BEP-20 ledger gas value</span>
            </div>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 shadow-xs">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Channels health */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100/80 shadow-xs flex items-center justify-between hover:shadow-md transition-all duration-200 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-50/30 rounded-full filter blur-lg group-hover:scale-125 transition-transform duration-300" />
          <div className="relative z-10 space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Gateway Gatekeepers</span>
            <div className="flex flex-col gap-0.5 text-[10px] font-bold text-slate-600">
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isSmtpConfigured ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                <span>SMTP: {isSmtpConfigured ? "Online" : "Offline"}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isTelegramConfigured ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                <span>Telegram: {isTelegramConfigured ? "Online" : "Offline"}</span>
              </span>
            </div>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 shadow-xs">
            <Cpu className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Global Status messages banner - Compact & Modern */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in shadow-2xs">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 text-rose-800 p-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in shadow-2xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ==================== 1. SETTINGS TAB PANELS REDESIGN ==================== */}
      {activeTab === "settings" && (
        <div className="bg-white border border-slate-100/80 rounded-2xl p-4 md:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm leading-tight">Global System Configurations</h3>
                <p className="text-[10px] text-slate-400 font-bold">Configure parameters, payment recipients, and messaging bot networks</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleUpdateConfig} className="space-y-4">
            
            {/* Horizontal subtabs - Super Compact */}
            <div className="flex bg-slate-100 p-1 rounded-xl max-w-lg gap-0.5">
              {[
                { id: "general", label: "Timing" },
                { id: "payment", label: "USDT Gateway" },
                { id: "notification", label: "Telegram Dispatcher" },
                { id: "email", label: "SMTP Mail" }
              ].map((subtab) => (
                <button
                  key={subtab.id}
                  type="button"
                  onClick={() => setSettingsSubTab(subtab.id as any)}
                  className={`flex-1 py-1 px-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    settingsSubTab === subtab.id
                      ? "bg-white text-slate-900 shadow-3xs"
                      : "text-slate-500 hover:text-slate-800 text-[11px]"
                  }`}
                >
                  {subtab.label}
                </button>
              ))}
            </div>

            {/* Subtab content renders with crisp clean grids */}
            <div className="pt-1">
              
              {/* SUBTAB 1: GENERAL TIMINGS */}
              {settingsSubTab === "general" && (
                <div className="space-y-3.5 max-w-xl animate-fade-in">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Failed Checks Delay Threshold</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={alertDelay}
                      onChange={(e) => setAlertDelay(Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all font-bold text-slate-800"
                    />
                    <span className="text-[10px] text-slate-400 block leading-relaxed font-bold">
                      Specifies continuous failed check loops before Outage events trigger system-wide notification cascades.
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-slate-100 bg-slate-50/50 rounded-xl">
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-slate-800 block">System Notification Switch</span>
                      <span className="text-[10px] text-slate-400 block leading-relaxed font-bold">Globally toggle automatic messaging system alerts.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={alertsEnabled}
                        onChange={(e) => setAlertsEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>
              )}

              {/* SUBTAB 2: PAYMENT BSC ESCROWS */}
              {settingsSubTab === "payment" && (
                <div className="space-y-3 max-w-2xl animate-fade-in">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">BSC Receiver Wallet Address (BEP-20)</label>
                    <input
                      type="text"
                      required
                      pattern="^0x[a-fA-F0-9]{40}$"
                      value={receiverWallet}
                      onChange={(e) => setReceiverWallet(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all font-mono text-indigo-600 font-black"
                    />
                    <span className="text-[10px] text-slate-400 block leading-relaxed font-bold">
                      The authoritative address receiving incoming USDT transactions for user subscription credits.
                    </span>
                  </div>
                </div>
              )}

              {/* SUBTAB 3: TELEGRAM BOT DISPATCH DETAILS */}
              {settingsSubTab === "notification" && (
                <div className="space-y-3 animate-fade-in">
                  <div className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 space-y-3">
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <Send className="w-4 h-4 text-sky-500" />
                        <span>Telegram Broadcast Agent Config</span>
                      </span>
                      <span className="text-[10px] text-slate-400 block font-bold leading-relaxed">
                        Telegram authorization tokens. This dispatches incident alarms instantly to subscribers.
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Telegram Bot Token</label>
                        <input
                          type="password"
                          placeholder="bot123456789:ABC..."
                          value={tgBotToken}
                          onChange={(e) => setTgBotToken(e.target.value)}
                          className="w-full border border-slate-200 bg-white rounded-xl px-3 py-1.5 text-xs outline-none font-mono font-bold text-slate-800"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Admin Fallback Chat ID</label>
                        <input
                          type="text"
                          placeholder="-100xxxxxxxxx"
                          value={tgChatId}
                          onChange={(e) => setTgChatId(e.target.value)}
                          className="w-full border border-slate-200 bg-white rounded-xl px-3 py-1.5 text-xs outline-none font-mono font-bold text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 4: SMTP EMAIL DISPATCH SYSTEM */}
              {settingsSubTab === "email" && (
                <div className="space-y-3 animate-fade-in">
                  <div className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 space-y-3">
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-emerald-500" />
                        <span>SMTP Outbound Gateway Credentials</span>
                      </span>
                      <span className="text-[10px] text-slate-400 block font-bold leading-relaxed">
                        Outbound mail servers to transmit automated incident logs straight to subscriber email addresses.
                      </span>
                    </div>

                    {/* Preset helper dropdown - Compact */}
                    <div className="space-y-1.5 bg-white p-2.5 rounded-xl border border-slate-150">
                      <label className="text-[10px] uppercase font-black text-slate-400 block">Quick Provider Presets</label>
                      <select
                        value={smtpPreset}
                        onChange={(e) => handlePresetChange(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-700 outline-none cursor-pointer"
                      >
                        <option value="custom">Custom Configuration</option>
                        <option value="gmail">Gmail Host (smtp.gmail.com)</option>
                        <option value="cpanel">cPanel Native Mail (mail.domain.com)</option>
                        <option value="hosting">Commercial Hosting (Hostinger SMTP)</option>
                      </select>
                      
                      {smtpPreset === "gmail" && (
                        <div className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100/50 p-2 rounded-lg leading-normal font-bold">
                          🔑 Gmail App Password required. Use Google "App Passwords" settings to generate a valid SMTP verification hash.
                        </div>
                      )}
                      {smtpPreset === "cpanel" && (
                        <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100/50 p-2 rounded-lg leading-normal font-bold">
                          🌐 Standard cPanel ports are 465 (SSL) and 587 (TLS).
                        </div>
                      )}
                      {smtpPreset === "hosting" && (
                        <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100/50 p-2 rounded-lg leading-normal font-bold">
                          ⚡ Use hoster-provided SMTP guidelines. Set port 465 (SSL) with validated authentication.
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 font-mono">SMTP Host</label>
                        <input
                          type="text"
                          placeholder="smtp.example.com"
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                          className="w-full border border-slate-200 bg-white rounded-xl px-3 py-1.5 text-xs outline-none text-slate-800 font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 font-mono">SMTP Port</label>
                        <input
                          type="number"
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(Number(e.target.value))}
                          className="w-full border border-slate-200 bg-white rounded-xl px-3 py-1.5 text-xs outline-none font-bold text-slate-800"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 font-mono">Sender Mail (From)</label>
                        <input
                          type="email"
                          value={smtpFrom}
                          onChange={(e) => setSmtpFrom(e.target.value)}
                          className="w-full border border-slate-200 bg-white rounded-xl px-3 py-1.5 text-xs outline-none text-slate-800 font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 font-mono">SMTP Username</label>
                        <input
                          type="text"
                          value={smtpUser}
                          onChange={(e) => setSmtpUser(e.target.value)}
                          className="w-full border border-slate-200 bg-white rounded-xl px-3 py-1.5 text-xs outline-none text-slate-800 font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 font-mono">SMTP Password</label>
                        <input
                          type="password"
                          value={smtpPass}
                          onChange={(e) => setSmtpPass(e.target.value)}
                          className="w-full border border-slate-200 bg-white rounded-xl px-3 py-1.5 text-xs outline-none text-slate-800 font-medium"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Save Buttons Row - Compact */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-bold">
                <Lock className="w-3.5 h-3.5 text-indigo-500" />
                <span>On-chain variables sync-encrypted via db schemas</span>
              </span>
              <button
                type="submit"
                disabled={isUpdatingConfig}
                className="w-full sm:w-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-55 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 hover:shadow-indigo-500/10"
              >
                {isUpdatingConfig && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isUpdatingConfig ? "Saving settings..." : "Save System Settings"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== 2. SUBSCRIBERS POOL TAB PANELS ==================== */}
      {activeTab === "subscribers" && (
        <div className="space-y-4">
          
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm leading-tight">Subscriber Database Management</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Override subscriber balances, adjust tiers, and verify wallets</p>
                </div>
              </div>
              
              {/* Search bar - Compact */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search users by name/email..."
                  value={subscriberSearch}
                  onChange={(e) => setSubscriberSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 font-bold transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs font-bold">No registered subscribers matching query.</div>
              ) : (
                filteredUsers.map((u) => (
                  <div key={u.id} className="border border-slate-100 p-2.5 rounded-xl hover:bg-slate-50/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                    
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-[10px] shrink-0 border border-indigo-100/50">
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="font-black text-slate-800 text-xs block leading-none">{u.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold block mt-1">{u.email}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 md:gap-4">
                      
                      <div className="bg-slate-55 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg min-w-[85px]">
                        <span className="text-[8px] uppercase text-slate-400 font-black block leading-none mb-0.5">Active Plan</span>
                        <span className="text-[10px] font-black text-indigo-600 uppercase block">{u.plan_id}</span>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg min-w-[90px]">
                        <span className="text-[8px] uppercase text-slate-400 font-black block leading-none mb-0.5">Platform Credit</span>
                        <span className="text-[10px] font-black text-slate-800 block">${u.balance.toFixed(2)} USDT</span>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg min-w-[110px]">
                        <span className="text-[8px] uppercase text-slate-400 font-black block leading-none mb-0.5">BSC Wallet</span>
                        <span className="text-[10px] font-mono font-bold text-slate-500 block">
                          {u.wallet_address ? `${u.wallet_address.slice(0, 6)}...${u.wallet_address.slice(-4)}` : "None"}
                        </span>
                      </div>

                      <button
                        onClick={() => startEditUser(u)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-lg text-xs font-black transition-all cursor-pointer shadow-3xs shrink-0"
                      >
                        Override Parameters
                      </button>

                    </div>

                  </div>
                ))
              )}
            </div>
          </div>

          {/* User parameters edit card block - Extremely Compact */}
          {editingUser && (
            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl space-y-3.5 border border-slate-800 shadow-lg max-w-xl animate-fade-in mx-auto">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                <h4 className="text-[11px] font-black text-indigo-400 flex items-center gap-1.5 uppercase">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Override parameters: {editingUser.name}</span>
                </h4>
                <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-200 cursor-pointer p-0.5">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveUserEdit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 font-bold block uppercase">USDT Platform Credit</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editUserBalance}
                      onChange={(e) => setEditUserBalance(Number(e.target.value))}
                      className="w-full bg-slate-850 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-black outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 font-bold block uppercase">Subscription Tier</label>
                    <select
                      value={editUserPlan}
                      onChange={(e) => setEditUserPlan(e.target.value as any)}
                      className="w-full bg-slate-850 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-black outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="free">Free Starter</option>
                      <option value="pro">Pro Developer</option>
                      <option value="enterprise">Enterprise Scale</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2.5 border-t border-slate-800/60">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-black shadow-sm cursor-pointer"
                  >
                    Apply Changes
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      )}

      {/* ==================== 3. PRICING PLANS TAB PANELS ==================== */}
      {activeTab === "plans" && (
        <div className="space-y-4">
          
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs space-y-4">
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <Sliders className="w-4 h-4 text-indigo-500" />
              <span>Subscription Pricing Matrices Configuration</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {plans.map((plan) => (
                <div 
                  key={plan.id} 
                  className={`border p-3.5 rounded-xl flex flex-col justify-between space-y-4 hover:shadow-sm transition-all duration-200 ${
                    plan.is_active 
                      ? "border-slate-150 bg-white" 
                      : "border-slate-100 bg-slate-50/50 opacity-70"
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono uppercase font-black">
                          {plan.id}
                        </span>
                        <h4 className="font-black text-slate-800 text-xs mt-1.5">{plan.name}</h4>
                      </div>
                      <span className={`w-2 h-2 rounded-full ${plan.is_active ? "bg-emerald-500 animate-pulse" : "bg-rose-400"}`} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 p-2.5 rounded-xl font-bold text-slate-600">
                      <div>
                        <span className="text-[8px] text-slate-400 block uppercase font-black">Price Rate</span>
                        <span className="font-black text-slate-800">${plan.price} USDT</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 block uppercase font-black">Max Quota</span>
                        <span className="font-black text-slate-800">{plan.max_monitors} targets</span>
                      </div>
                      <div className="mt-0.5">
                        <span className="text-[8px] text-slate-400 block uppercase font-black">Min Interval</span>
                        <span className="font-black text-slate-800">{plan.min_interval_sec}s check</span>
                      </div>
                      <div className="mt-0.5">
                        <span className="text-[8px] text-slate-400 block uppercase font-black">Status</span>
                        <span className={`font-black ${plan.is_active ? "text-emerald-600" : "text-rose-500"}`}>
                          {plan.is_active ? "Active" : "Disabled"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[8px] text-slate-400 block font-black uppercase">Perks</span>
                      <ul className="text-[10px] text-slate-500 space-y-1 pl-1">
                        {plan.features.slice(0, 3).map((feat, i) => (
                          <li key={i} className="flex items-center gap-1 font-medium">
                            <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                            <span className="truncate leading-none">{feat}</span>
                          </li>
                        ))}
                        {plan.features.length > 3 && (
                          <li className="text-[9px] text-slate-400 font-bold italic">
                            + {plan.features.length - 3} more perks...
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                  <button
                    onClick={() => startEditPlan(plan)}
                    className="w-full py-1.5 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 shadow-3xs"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>Configure Perks</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Edit Plan segment modal - Compact */}
          {editingPlan && (
            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl space-y-3 border border-slate-800 shadow-lg max-w-2xl animate-fade-in mx-auto">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                <h4 className="text-[11px] font-black text-indigo-400 flex items-center gap-1.5 uppercase">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Configure plan constraints: {editingPlan.id.toUpperCase()}</span>
                </h4>
                <button onClick={() => setEditingPlan(null)} className="text-slate-400 hover:text-slate-200 cursor-pointer p-0.5">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavePlanEdit} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 block font-bold uppercase">Plan Title</label>
                    <input
                      type="text"
                      required
                      value={editPlanName}
                      onChange={(e) => setEditPlanName(e.target.value)}
                      className="w-full bg-slate-850 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 block font-bold uppercase">Price Rate (USDT)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editPlanPrice}
                      onChange={(e) => setEditPlanPrice(Number(e.target.value))}
                      className="w-full bg-slate-850 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 block font-bold uppercase">Targets Cap</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={editPlanMaxMonitors}
                      onChange={(e) => setEditPlanMaxMonitors(Number(e.target.value))}
                      className="w-full bg-slate-850 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 block font-bold uppercase">Min Interval (sec)</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={editPlanMinInterval}
                      onChange={(e) => setEditPlanMinInterval(Number(e.target.value))}
                      className="w-full bg-slate-850 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-1 md:col-span-1">
                    <label className="text-[9px] text-slate-400 block font-bold uppercase">Plan Status</label>
                    <select
                      value={editPlanIsActive ? "true" : "false"}
                      onChange={(e) => setEditPlanIsActive(e.target.value === "true")}
                      className="w-full bg-slate-850 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="true">Active & Visible</option>
                      <option value="false">Blocked / Suspended</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 block font-bold uppercase">Feature Perks (one per line)</label>
                  <textarea
                    rows={3}
                    value={editPlanFeaturesText}
                    onChange={(e) => setEditPlanFeaturesText(e.target.value)}
                    className="w-full bg-slate-850 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-indigo-500"
                    placeholder="Enter feature lines..."
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingPlan(null)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPlan}
                    className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-55 text-white rounded-lg text-xs font-black shadow-sm cursor-pointer flex items-center gap-1"
                  >
                    {isSavingPlan && <RefreshCw className="w-3 h-3 animate-spin" />}
                    <span>{isSavingPlan ? "Saving perks..." : "Apply Updates"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      )}

      {/* ==================== 4. LIVE RUNTIME WORKER TERMINAL PANELS ==================== */}
      {activeTab === "logs" && (
        <div className="bg-slate-950 text-slate-200 border border-slate-900 rounded-2xl p-4 shadow-xl relative overflow-hidden">
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-900 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-slate-900 border border-slate-800 text-indigo-400 rounded-xl">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-xs text-slate-100 flex items-center gap-1.5">
                  <span>Worker Console Terminal Logs</span>
                </h3>
                <p className="text-[10px] text-slate-500 font-bold font-mono">Simulated checking loops real-time activity</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Live Logs</span>
              </div>
              <button
                onClick={handleClearLogs}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 hover:text-rose-400 border border-slate-800 text-slate-400 text-[9px] rounded-lg transition-all font-black cursor-pointer"
              >
                Clear Output
              </button>
            </div>
          </div>

          {/* Console Screen - Compact Height */}
          <div className="h-80 overflow-y-auto font-mono text-[11px] space-y-1.5 bg-black/60 p-3.5 rounded-xl border border-slate-900 select-text scrollbar-thin">
            {systemLogs.length === 0 ? (
              <span className="text-slate-600 italic block text-center py-20 font-medium">Initializing UptimePro loop logs...</span>
            ) : (
              systemLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 leading-normal hover:bg-white/2 p-0.5 rounded transition-colors">
                  <span className="text-slate-500 shrink-0 select-none font-mono">
                    [{new Date(log.timestamp).toLocaleTimeString()}]
                  </span>
                  <span className={`px-1 py-0.2 rounded text-[8px] font-black select-none shrink-0 border ${
                    log.level === "error" 
                      ? "bg-rose-950/80 text-rose-400 border-rose-900/60" 
                      : log.level === "warn" 
                      ? "bg-amber-950/80 text-amber-400 border-amber-900/60" 
                      : "bg-slate-900/80 text-indigo-400 border-slate-800/60"
                  }`}>
                    {log.level.toUpperCase()}
                  </span>
                  <span className={`break-all ${
                    log.level === "error" 
                      ? "text-rose-300 font-semibold" 
                      : log.level === "warn" 
                      ? "text-amber-200 font-medium" 
                      : "text-slate-300"
                  }`}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================== 5. CLOUD & DATABASE BACKUPS ==================== */}
      {activeTab === "backups" && (
        <div className="space-y-4">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Left Column: Cloud Backup - Compact */}
            <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl p-4 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-xs">Cloud Auto Backup</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Auto cloud destinations & connection test</p>
                </div>
              </div>

              <form onSubmit={handleSaveBackupSettings} className="space-y-4">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100/50">
                  <div>
                    <span className="block font-bold text-slate-700 text-xs">Auto Cloud Backup</span>
                    <span className="block text-[9px] text-slate-400 font-bold">Transmit backup JSON automatically</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBackupSettings({ ...backupSettings, enabled: !backupSettings.enabled })}
                    className="cursor-pointer"
                  >
                    {backupSettings.enabled ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-lg border border-indigo-100/50">
                        <Check className="w-2.5 h-2.5" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-400 text-[9px] font-bold rounded-lg border border-slate-200">
                        Inactive
                      </span>
                    )}
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] uppercase tracking-wider font-black text-slate-400">
                    Cloud Backup Server Endpoint URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://your-cloud-endpoint/api/backup"
                    value={backupSettings.cloudUrl}
                    onChange={(e) => setBackupSettings({ ...backupSettings, cloudUrl: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-mono text-slate-700"
                  />
                  <p className="text-[9px] text-slate-400 font-medium">
                    The system will POST secure JSON state snapshots to this absolute URL destination.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] uppercase tracking-wider font-black text-slate-400">
                    Sync Interval (Hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={backupSettings.intervalHours}
                    onChange={(e) => setBackupSettings({ ...backupSettings, intervalHours: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                  />
                </div>

                {/* Compact Cloud Status Block */}
                <div className="p-3 bg-slate-900 text-slate-300 rounded-xl border border-slate-800 space-y-1.5 font-mono">
                  <div className="flex justify-between items-center text-[8px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-800/60 pb-1">
                    <span>Cloud Sync State</span>
                    <span>Target Active</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] leading-relaxed">
                    <div>
                      <span className="text-slate-500 block text-[8px]">Last Backup:</span>
                      <span className="font-bold text-slate-200">
                        {backupSettings.lastBackupAt ? new Date(backupSettings.lastBackupAt).toLocaleString() : "Never"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[8px]">Sync Status:</span>
                      {backupSettings.lastBackupStatus ? (
                        <span className={`px-1 py-0.2 rounded text-[8px] font-black uppercase border ${
                          backupSettings.lastBackupStatus === "success" 
                            ? "bg-emerald-950 border-emerald-900 text-emerald-400" 
                            : "bg-rose-950 border-rose-900 text-rose-400"
                        }`}>
                          {backupSettings.lastBackupStatus}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-bold">None</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isSavingBackupSettings}
                    className="flex-1 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-lg text-xs font-black transition-all cursor-pointer shadow-3xs"
                  >
                    {isSavingBackupSettings ? "Saving..." : "Save Config"}
                  </button>

                  <button
                    type="button"
                    onClick={handleTestCloudBackup}
                    disabled={isTestingCloud || !backupSettings.cloudUrl}
                    className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 disabled:opacity-50 text-indigo-600 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1"
                  >
                    {isTestingCloud ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <UploadCloud className="w-3 h-3" />
                    )}
                    <span>Test Upload</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Database State Snapshots - Compact */}
            <div className="lg:col-span-7 bg-white border border-slate-100 rounded-2xl p-4 shadow-xs space-y-4 flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-50 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-slate-50 text-slate-600 rounded-xl">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-xs">Database Snapshots</h3>
                    <p className="text-[10px] text-slate-400 font-bold">Create and restore system state snapshots</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50/50 rounded-lg border border-indigo-50 text-indigo-600 font-mono text-[9px] font-bold">
                  <span>PostgreSQL (Active)</span>
                </div>
              </div>

              {/* Create Snap Form */}
              <form onSubmit={handleCreateManualBackup} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100/50 flex flex-col sm:flex-row gap-2 shrink-0">
                <input
                  type="text"
                  required
                  placeholder="Snapshot name (e.g., Before pricing tweaks)..."
                  value={newBackupName}
                  onChange={(e) => setNewBackupName(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:border-indigo-500 transition-all outline-none"
                />
                <button
                  type="submit"
                  disabled={isCreatingBackup}
                  className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg text-xs font-black transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1 shrink-0"
                >
                  {isCreatingBackup ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>Snapshot</span>
                </button>
              </form>

              {/* Snapshots Scrollable Box - Compact */}
              <div className="flex-1 overflow-y-auto max-h-[220px] pr-1 space-y-2.5 shrink-0 scrollbar-thin">
                {isLoadingBackups ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
                    <span className="text-xs text-slate-400 font-medium">Loading snapshots...</span>
                  </div>
                ) : backupSnapshots.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-100 rounded-xl">
                    <p className="text-xs text-slate-400 font-medium">No snapshots available. Create one above!</p>
                  </div>
                ) : (
                  backupSnapshots.map((snapshot) => (
                    <div key={snapshot.id} className="p-2.5 bg-white hover:bg-slate-50/30 border border-slate-100 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="block font-bold text-slate-800 text-xs">{snapshot.name}</span>
                        <div className="flex flex-wrap items-center gap-x-2 text-[9px] text-slate-400 font-mono">
                          <span className="font-bold text-slate-600 bg-slate-100 px-1 py-0.2 rounded">ID: {snapshot.id}</span>
                          <span>|</span>
                          <span>{new Date(snapshot.timestamp).toLocaleString()}</span>
                          <span>|</span>
                          <span className="font-bold text-slate-500">{(snapshot.sizeBytes / 1024).toFixed(2)} KB</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRestoreBackup(snapshot.id, snapshot.name)}
                          disabled={restoringId !== null}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-600 border border-indigo-100/50 text-[10px] rounded-lg font-black transition-all cursor-pointer flex items-center gap-1"
                        >
                          {restoringId === snapshot.id ? (
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          ) : (
                            <Download className="w-2.5 h-2.5" />
                          )}
                          <span>Restore</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteBackup(snapshot.id)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Compact Warning block */}
              <div className="p-2 bg-amber-50/50 border border-amber-100/30 rounded-xl text-[9px] text-amber-800 leading-normal font-bold flex gap-1.5 shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>
                  <strong>WARNING:</strong> Restoring database snapshots overwrites all active monitor targets, subscriber profiles, balances, and parameters. Use with caution.
                </span>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
