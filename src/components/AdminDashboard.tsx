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
  Plus
} from "lucide-react";
import { User, AlertConfig, SystemLog, SubscriptionPlan } from "../types.ts";

interface AdminDashboardProps {
  users: User[];
  config: AlertConfig | null;
  onRefreshData: () => void;
  activeTab?: "settings" | "subscribers" | "logs" | "plans";
  plans?: SubscriptionPlan[];
}

export default function AdminDashboard({
  users,
  config,
  onRefreshData,
  activeTab = "settings",
  plans = []
}: AdminDashboardProps) {
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
    <div className="space-y-8 max-w-7xl mx-auto px-1">
      
      {/* Executive Command Center Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Subscribers */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between hover:shadow-md transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/40 rounded-full filter blur-xl group-hover:scale-125 transition-transform duration-300" />
          <div className="relative z-10 space-y-2">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block">Total Subscribers</span>
            <span className="text-4xl font-black text-slate-900 tracking-tight">{totalSubscribers}</span>
            <div className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span>Full User Pools</span>
            </div>
          </div>
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-xs">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Global System Operations (Loop Worker counts) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between hover:shadow-md transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/40 rounded-full filter blur-xl group-hover:scale-125 transition-transform duration-300" />
          <div className="relative z-10 space-y-2">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block">System Loops Logged</span>
            <span className="text-4xl font-black text-slate-900 tracking-tight">{activeLogsCount}</span>
            <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Goroutines running loops</span>
            </div>
          </div>
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-xs">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Total Crypto Ledger Value secured */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between hover:shadow-md transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50/40 rounded-full filter blur-xl group-hover:scale-125 transition-transform duration-300" />
          <div className="relative z-10 space-y-2">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block">USDT Deposits Managed</span>
            <span className="text-4xl font-black text-slate-900 tracking-tight">${totalBalanceOverAll}</span>
            <div className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>BEP-20 ledger gas value</span>
            </div>
          </div>
          <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 shadow-xs">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Channels health */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between hover:shadow-md transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50/40 rounded-full filter blur-xl group-hover:scale-125 transition-transform duration-300" />
          <div className="relative z-10 space-y-1.5">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block">Gateway Gatekeepers</span>
            <div className="flex flex-col gap-1 text-[11px] font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isSmtpConfigured ? "bg-emerald-500 animate-pulse" : "bg-rose-450"}`} />
                <span>SMTP Outbound: {isSmtpConfigured ? "Online" : "Offline"}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isTelegramConfigured ? "bg-emerald-500 animate-pulse" : "bg-rose-450"}`} />
                <span>Telegram API: {isTelegramConfigured ? "Online" : "Offline"}</span>
              </span>
            </div>
          </div>
          <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 shadow-xs">
            <Cpu className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Global Status messages banner */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 text-rose-850 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ==================== 1. SETTINGS TAB PANELS REDESIGN ==================== */}
      {activeTab === "settings" && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base leading-tight">Global System Configurations</h3>
                <p className="text-[11px] text-slate-400 font-medium">Verify system parameters, cryptographic payment recipients, and messaging bot networks</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleUpdateConfig} className="space-y-6">
            
            {/* Horizontal subtabs for configuration segments */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl max-w-xl gap-1">
              {[
                { id: "general", label: "General Timing" },
                { id: "payment", label: "USDT Gateway Address" },
                { id: "notification", label: "Telegram Dispatcher" },
                { id: "email", label: "SMTP Mail Gate" }
              ].map((subtab) => (
                <button
                  key={subtab.id}
                  type="button"
                  onClick={() => setSettingsSubTab(subtab.id as any)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    settingsSubTab === subtab.id
                      ? "bg-white text-slate-800 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800 text-[11px]"
                  }`}
                >
                  {subtab.label}
                </button>
              ))}
            </div>

            {/* Subtab content renders with crisp clean grids */}
            <div className="pt-2">
              
              {/* SUBTAB 1: GENERAL TIMINGS */}
              {settingsSubTab === "general" && (
                <div className="space-y-5 max-w-xl animate-fade-in">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Failed Sequential Checks Delay Threshold</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={alertDelay}
                      onChange={(e) => setAlertDelay(Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-4 focus:ring-indigo-500/5 outline-hidden font-bold text-slate-800"
                    />
                    <span className="text-[10px] text-slate-400 block leading-relaxed font-medium">
                      Specifies the number of continuous failed loops before UptimePro flags a persistent incident outage event.
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-slate-150 bg-slate-50/40 rounded-2xl">
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-slate-800 block">System Dispatch Switch</span>
                      <span className="text-[10px] text-slate-400 block leading-relaxed font-medium">Activate or silence automatic messaging triggers entirely system-wide.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={alertsEnabled}
                        onChange={(e) => setAlertsEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>
              )}

              {/* SUBTAB 2: PAYMENT BSC ESCROWS */}
              {settingsSubTab === "payment" && (
                <div className="space-y-4 max-w-2xl animate-fade-in">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">BSC Receiver Wallet Address (BEP-20)</label>
                    <input
                      type="text"
                      required
                      pattern="^0x[a-fA-F0-9]{40}$"
                      value={receiverWallet}
                      onChange={(e) => setReceiverWallet(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-4 focus:ring-indigo-500/5 outline-hidden font-mono text-indigo-600 font-black"
                    />
                    <span className="text-[10px] text-slate-400 block leading-relaxed font-medium">
                      The authoritative blockchain address receiving incoming USDT transactions verified inside the subscriber portals.
                    </span>
                  </div>
                </div>
              )}

              {/* SUBTAB 3: TELEGRAM BOT DISPATCH DETAILS */}
              {settingsSubTab === "notification" && (
                <div className="space-y-5 animate-fade-in">
                  <div className="border border-slate-150 rounded-2xl p-5 bg-slate-50/50 space-y-4">
                    <div className="space-y-1">
                      <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <Send className="w-4 h-4 text-sky-500" />
                        <span>Telegram Broadcast Agent Config (@SmartUptimeNotification_bot)</span>
                      </span>
                      <span className="text-[10px] text-slate-400 block leading-relaxed font-medium">
                        Enter your Botfather authorization tokens below. This bot dispatches offline incident report payloads instantly.
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Telegram Bot token hash</label>
                        <input
                          type="password"
                          placeholder="bot123456789:ABC..."
                          value={tgBotToken}
                          onChange={(e) => setTgBotToken(e.target.value)}
                          className="w-full border border-slate-250 bg-white rounded-xl px-3 py-2 text-xs outline-hidden font-mono font-bold text-slate-850"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Admin Fallback Chat Identifier</label>
                        <input
                          type="text"
                          placeholder="-100xxxxxxxxx"
                          value={tgChatId}
                          onChange={(e) => setTgChatId(e.target.value)}
                          className="w-full border border-slate-250 bg-white rounded-xl px-3 py-2 text-xs outline-hidden font-mono font-bold text-slate-850"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 4: SMTP EMAIL DISPATCH SYSTEM */}
              {settingsSubTab === "email" && (
                <div className="space-y-5 animate-fade-in">
                  <div className="border border-slate-150 rounded-2xl p-5 bg-slate-50/50 space-y-5">
                    <div className="space-y-1">
                      <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-emerald-500" />
                        <span>SMTP Outbound Gateway credentials</span>
                      </span>
                      <span className="text-[10px] text-slate-400 block leading-relaxed font-medium">
                        Link custom mail servers to safely transmit automated alarm alerts straight to subscriber boxes.
                      </span>
                    </div>

                    {/* Preset helper dropdown */}
                    <div className="space-y-2 bg-white p-3.5 rounded-xl border border-slate-150">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block">Provider Quick Presets</label>
                      <select
                        value={smtpPreset}
                        onChange={(e) => handlePresetChange(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 cursor-pointer"
                      >
                        <option value="custom">Custom Configuration</option>
                        <option value="gmail">Gmail Host (smtp.gmail.com)</option>
                        <option value="cpanel">cPanel Native Mail (mail.domain.com)</option>
                        <option value="hosting">Commercial Hosting (Hostinger SMTP)</option>
                      </select>
                      
                      {smtpPreset === "gmail" && (
                        <div className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100 p-3 rounded-lg leading-relaxed font-medium">
                          <strong>🔑 Gmail App Password required:</strong>
                          <p className="mt-0.5">Google security measures block regular passwords. You must set up an "App Password" inside Google Account settings to verify SMTP connections successfully.</p>
                        </div>
                      )}
                      {smtpPreset === "cpanel" && (
                        <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 p-3 rounded-lg leading-relaxed font-medium">
                          <strong>🌐 cPanel Guidelines:</strong>
                          <p className="mt-0.5">Replace <code>mail.yourdomain.com</code> with your website domain. Standard ports are <code>465</code> (SSL) and <code>587</code> (TLS).</p>
                        </div>
                      )}
                      {smtpPreset === "hosting" && (
                        <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 p-3 rounded-lg leading-relaxed font-medium">
                          <strong>⚡ Hosting registrars:</strong>
                          <p className="mt-0.5">Use hoster-provided SMTP guidelines. Set port <code>465</code> (SSL) with username credentials for outbound transmissions.</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 font-mono">SMTP Host</label>
                        <input
                          type="text"
                          placeholder="smtp.example.com"
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                          className="w-full border border-slate-250 bg-white rounded-xl px-3 py-2 text-xs outline-hidden text-slate-850"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 font-mono">SMTP Port</label>
                        <input
                          type="number"
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(Number(e.target.value))}
                          className="w-full border border-slate-250 bg-white rounded-xl px-3 py-2 text-xs outline-hidden font-bold text-slate-850"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 font-mono">From Sender Address</label>
                        <input
                          type="email"
                          value={smtpFrom}
                          onChange={(e) => setSmtpFrom(e.target.value)}
                          className="w-full border border-slate-250 bg-white rounded-xl px-3 py-2 text-xs outline-hidden text-slate-850"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 font-mono">SMTP Username</label>
                        <input
                          type="text"
                          value={smtpUser}
                          onChange={(e) => setSmtpUser(e.target.value)}
                          className="w-full border border-slate-250 bg-white rounded-xl px-3 py-2 text-xs outline-hidden text-slate-850"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 font-mono">SMTP Password</label>
                        <input
                          type="password"
                          value={smtpPass}
                          onChange={(e) => setSmtpPass(e.target.value)}
                          className="w-full border border-slate-250 bg-white rounded-xl px-3 py-2 text-xs outline-hidden text-slate-850"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Persistent Global Save Button bar */}
            <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                <Lock className="w-3.5 h-3.5 text-indigo-500" />
                <span>On-chain variables encrypted via database schema safety</span>
              </span>
              <button
                type="submit"
                disabled={isUpdatingConfig}
                className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-55 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 hover:shadow-indigo-500/10"
              >
                {isUpdatingConfig && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isUpdatingConfig ? "Saving System Settings..." : "Save System Settings"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== 2. SUBSCRIBERS POOL TAB PANELS ==================== */}
      {activeTab === "subscribers" && (
        <div className="space-y-6">
          
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base leading-tight">Subscriber Database Management</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Override subscriber balances, adjust tiers, and verify registered BSC wallets</p>
                </div>
              </div>
              
              {/* Subscriber Live Search bar */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={subscriberSearch}
                  onChange={(e) => setSubscriberSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 text-slate-850 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 font-semibold transition-all"
                />
              </div>
            </div>

            <div className="space-y-3">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">No registered subscribers matching your query.</div>
              ) : (
                filteredUsers.map((u) => (
                  <div key={u.id} className="border border-slate-150/60 p-4 rounded-2xl hover:bg-slate-50/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-indigo-55/15 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0 border border-indigo-100">
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="font-black text-slate-800 text-xs block leading-none">{u.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold block mt-1.5">{u.email}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                      
                      <div className="bg-slate-50 border border-slate-100 p-2 px-3 rounded-xl min-w-[100px]">
                        <span className="text-[8px] uppercase text-slate-400 font-black block">Active Plan</span>
                        <span className="text-[11px] font-black text-indigo-600 uppercase block">{u.plan_id}</span>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 p-2 px-3 rounded-xl min-w-[100px]">
                        <span className="text-[8px] uppercase text-slate-400 font-black block">Platform Credit</span>
                        <span className="text-[11px] font-black text-slate-800 block">${u.balance.toFixed(2)} USDT</span>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 p-2 px-3 rounded-xl min-w-[120px]">
                        <span className="text-[8px] uppercase text-slate-400 font-black block">BSC Wallet</span>
                        <span className="text-[11px] font-mono font-bold text-slate-500 block">
                          {u.wallet_address ? `${u.wallet_address.slice(0, 6)}...${u.wallet_address.slice(-4)}` : "None"}
                        </span>
                      </div>

                      <button
                        onClick={() => startEditUser(u)}
                        className="px-4 py-2 bg-slate-900 hover:bg-indigo-600 hover:text-white border border-transparent text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs shrink-0 self-end md:self-auto"
                      >
                        Override Parameters
                      </button>

                    </div>

                  </div>
                ))
              )}
            </div>
          </div>

          {/* User parameters edit modal block */}
          {editingUser && (
            <div className="bg-slate-900 text-slate-100 p-6 rounded-3xl space-y-4 border border-slate-800 shadow-xl max-w-xl animate-fade-in">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h4 className="text-xs font-black text-indigo-400 flex items-center gap-2 uppercase">
                  <Shield className="w-4 h-4" />
                  <span>Override subscriber parameters: {editingUser.name}</span>
                </h4>
                <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-200 cursor-pointer p-0.5">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveUserEdit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold block uppercase">USDT Platform Gas Balance</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editUserBalance}
                      onChange={(e) => setEditUserBalance(Number(e.target.value))}
                      className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-black outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold block uppercase">Subscription Tier Override</label>
                    <select
                      value={editUserPlan}
                      onChange={(e) => setEditUserPlan(e.target.value as any)}
                      className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-black outline-hidden focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="free">Free Starter</option>
                      <option value="pro">Pro Developer</option>
                      <option value="enterprise">Enterprise Scale</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
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
        <div className="space-y-8">
          
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-2xs space-y-5">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2 pb-3 border-b border-slate-100">
              <Sliders className="w-5 h-5 text-indigo-500" />
              <span>Subscription Pricing Matrices Configuration</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div 
                  key={plan.id} 
                  className={`border p-5 rounded-2xl flex flex-col justify-between space-y-5 hover:shadow-md transition-all ${
                    plan.is_active 
                      ? "border-slate-200 bg-white" 
                      : "border-slate-100 bg-slate-50/50 opacity-70"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-mono uppercase font-black">
                          {plan.id}
                        </span>
                        <h4 className="font-black text-slate-850 text-sm mt-2">{plan.name}</h4>
                      </div>
                      <span className={`w-2.5 h-2.5 rounded-full ${plan.is_active ? "bg-emerald-500 animate-pulse" : "bg-rose-400"}`} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl font-bold text-slate-650">
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-extrabold">Price Rate</span>
                        <span className="font-black text-slate-800">${plan.price} USDT</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-extrabold">Max Quota</span>
                        <span className="font-black text-slate-800">{plan.max_monitors} targets</span>
                      </div>
                      <div className="mt-1">
                        <span className="text-[9px] text-slate-400 block uppercase font-extrabold">Min Interval</span>
                        <span className="font-black text-slate-800">{plan.min_interval_sec}s check</span>
                      </div>
                      <div className="mt-1">
                        <span className="text-[9px] text-slate-400 block uppercase font-extrabold">Availability</span>
                        <span className={`font-black ${plan.is_active ? "text-emerald-600" : "text-rose-500"}`}>
                          {plan.is_active ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 block font-extrabold uppercase">Configured Perks</span>
                      <ul className="text-[10px] text-slate-500 space-y-1.5 pl-1.5">
                        {plan.features.map((feat, i) => (
                          <li key={i} className="flex items-center gap-1.5 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                            <span className="truncate leading-none">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <button
                    onClick={() => startEditPlan(plan)}
                    className="w-full py-2 bg-slate-900 hover:bg-indigo-600 hover:text-white text-white text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Configure Plan Perks</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Edit Plan segment modal */}
          {editingPlan && (
            <div className="bg-slate-900 text-slate-100 p-6 rounded-3xl space-y-4 border border-slate-800 shadow-xl max-w-3xl animate-fade-in">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h4 className="text-xs font-black text-indigo-400 flex items-center gap-2 uppercase">
                  <Sliders className="w-4 h-4" />
                  <span>Configure plan constraints: {editingPlan.id.toUpperCase()}</span>
                </h4>
                <button onClick={() => setEditingPlan(null)} className="text-slate-400 hover:text-slate-200 cursor-pointer p-0.5">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavePlanEdit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 block font-bold uppercase">Plan Title</label>
                    <input
                      type="text"
                      required
                      value={editPlanName}
                      onChange={(e) => setEditPlanName(e.target.value)}
                      className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 block font-bold uppercase">Price Rate (USDT)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editPlanPrice}
                      onChange={(e) => setEditPlanPrice(Number(e.target.value))}
                      className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 block font-bold uppercase">Targets Cap</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={editPlanMaxMonitors}
                      onChange={(e) => setEditPlanMaxMonitors(Number(e.target.value))}
                      className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 block font-bold uppercase">Min Interval (sec)</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={editPlanMinInterval}
                      onChange={(e) => setEditPlanMinInterval(Number(e.target.value))}
                      className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 block font-bold uppercase">Plan Status</label>
                    <select
                      value={editPlanIsActive ? "true" : "false"}
                      onChange={(e) => setEditPlanIsActive(e.target.value === "true")}
                      className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white font-bold outline-hidden focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="true">Active & Visible</option>
                      <option value="false">Blocked / Suspended</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 block font-bold uppercase">Feature Perks (one per line)</label>
                  <textarea
                    rows={4}
                    value={editPlanFeaturesText}
                    onChange={(e) => setEditPlanFeaturesText(e.target.value)}
                    className="w-full bg-slate-850 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono outline-hidden focus:border-indigo-500"
                    placeholder="Enter feature lines..."
                  />
                </div>

                <div className="flex gap-3 justify-end pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingPlan(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPlan}
                    className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-55 text-white rounded-xl text-xs font-black shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    {isSavingPlan && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isSavingPlan ? "Saving perks..." : "Apply Plan Updates"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      )}

      {/* ==================== 4. LIVE RUNTIME WORKER TERMINAL PANELS ==================== */}
      {activeTab === "logs" && (
        <div className="bg-slate-950 text-slate-200 border border-slate-900 rounded-3xl p-5 md:p-6 shadow-2xl relative overflow-hidden">
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-900 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-slate-900 border border-slate-800 text-indigo-400 rounded-xl">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-100 flex items-center gap-1.5">
                  <span>Concurrent Check Workers Console Log Terminal (Goroutines simulated output)</span>
                </h3>
                <p className="text-[10px] text-slate-500 font-bold font-mono">UptimePro checking loops status output cache</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Live Logs</span>
              </div>
              <button
                onClick={handleClearLogs}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 hover:text-rose-400 border border-slate-800 text-slate-400 text-[10px] rounded-xl transition-all font-black cursor-pointer"
              >
                Clear Console Output
              </button>
            </div>
          </div>

          {/* Deep Black Console Screen */}
          <div className="h-96 overflow-y-auto font-mono text-xs space-y-2 bg-black/60 p-5 rounded-2xl border border-slate-900 select-text scrollbar-thin scrollbar-thumb-slate-800">
            {systemLogs.length === 0 ? (
              <span className="text-slate-600 italic block text-center py-28 font-medium">Initializing UptimePro loop logs...</span>
            ) : (
              systemLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 leading-relaxed hover:bg-white/2 p-1 rounded-md transition-colors">
                  <span className="text-slate-500 shrink-0 select-none font-mono">
                    [{new Date(log.timestamp).toLocaleTimeString()}]
                  </span>
                  <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-black select-none shrink-0 border ${
                    log.level === "error" 
                      ? "bg-rose-950 text-rose-400 border-rose-900" 
                      : log.level === "warn" 
                      ? "bg-amber-950 text-amber-400 border-amber-900" 
                      : "bg-slate-900 text-indigo-400 border-slate-800"
                  }`}>
                    {log.level.toUpperCase()}
                  </span>
                  <span className={`break-all ${
                    log.level === "error" 
                      ? "text-rose-300 font-bold" 
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

    </div>
  );
}
