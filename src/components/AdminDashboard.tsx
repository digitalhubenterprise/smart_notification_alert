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
  Lock
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
      setErrorMsg(err.message || "Failed to save plan.");
    } finally {
      setIsSavingPlan(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Warning Banner */}
      <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 border border-slate-800 flex items-center justify-between shadow-md">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded-md inline-block">
            Administrative Control Center
          </span>
          <h2 className="text-lg font-bold">UptimePro Super Admin Console</h2>
          <p className="text-xs text-slate-400">
            Override alert delay timings, monitor concurrent server loops, regulate subscriber balances, and watch BSC ledger confirmations.
          </p>
        </div>
        <Shield className="w-10 h-10 text-indigo-500 hidden md:block shrink-0" />
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs p-3.5 rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs p-3.5 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Settings Panel */}
      {activeTab === "settings" && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4 max-w-4xl mx-auto shadow-xs">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 pb-3 border-b border-slate-100">
            <Settings className="w-4 h-4 text-indigo-500" />
            <span>Super Admin Settings & System Configuration</span>
          </h3>

          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-1.5 text-xs text-indigo-900 font-sans">
            <span className="font-bold flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>Platform Gateways Dashboard</span>
            </span>
            <p className="text-slate-650 leading-relaxed">
              Configure global gateways: the **Telegram alert bot token**, outgoing **SMTP mail servers**, subscriber **outage count thresholds**, and the **BSC wallet address** for receiving subscriber USDT payments.
            </p>
          </div>

          <form onSubmit={handleUpdateConfig} className="space-y-5">
            
            {/* Submenu Tabs Navigation */}
            <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 pb-2">
              <button
                type="button"
                onClick={() => setSettingsSubTab("general")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  settingsSubTab === "general"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-150 shadow-3xs"
                    : "text-slate-500 hover:bg-slate-50 border border-transparent"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>General Settings</span>
              </button>
              <button
                type="button"
                onClick={() => setSettingsSubTab("payment")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  settingsSubTab === "payment"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-150 shadow-3xs"
                    : "text-slate-500 hover:bg-slate-50 border border-transparent"
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Payment Settings</span>
              </button>
              <button
                type="button"
                onClick={() => setSettingsSubTab("notification")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  settingsSubTab === "notification"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-150 shadow-3xs"
                    : "text-slate-500 hover:bg-slate-50 border border-transparent"
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Notification Settings</span>
              </button>
              <button
                type="button"
                onClick={() => setSettingsSubTab("email")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  settingsSubTab === "email"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-150 shadow-3xs"
                    : "text-slate-500 hover:bg-slate-50 border border-transparent"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email Settings</span>
              </button>
            </div>

            {/* Submenu Active Content */}
            <div className="pt-2 min-h-[180px]">
              {settingsSubTab === "general" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 block">Alert Delay (Checks Threshold)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={alertDelay}
                      onChange={(e) => setAlertDelay(Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-hidden font-medium"
                    />
                    <span className="text-[9px] text-slate-400 block">Number of failed sequential checks before system registers a persistent outage.</span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 border border-slate-100 bg-slate-50/50 rounded-xl">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-700 block">Global Alert Delivery Switch</span>
                      <span className="text-[10px] text-slate-400 block">Toggle whether incident alerts should actively dispatch to subscribers.</span>
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

              {settingsSubTab === "payment" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 block">BSC Receiver Wallet Address (BEP-20)</label>
                    <input
                      type="text"
                      required
                      pattern="^0x[a-fA-F0-9]{40}$"
                      value={receiverWallet}
                      onChange={(e) => setReceiverWallet(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-hidden font-mono text-indigo-600 font-bold"
                    />
                    <span className="text-[9px] text-slate-400 block">The standard BSC wallet address that handles subscriber automated deposits. Must be a valid 42-character hex address.</span>
                  </div>
                </div>
              )}

              {settingsSubTab === "notification" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 text-sky-500" />
                        <span>Telegram Incident Alerts Config (@SmartUptimeNotification_bot)</span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Configure the bot system. Users link to this bot to obtain their numeric chat ID and get instant offline uptime notification reports.
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase">Telegram Bot Token (e.g. for @SmartUptimeNotification_bot)</label>
                        <input
                          type="password"
                          placeholder="bot123456789:ABC..."
                          value={tgBotToken}
                          onChange={(e) => setTgBotToken(e.target.value)}
                          className="w-full border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-xs outline-hidden font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase">Admin Fallback Chat ID / Channel ID</label>
                        <input
                          type="text"
                          placeholder="-100xxxxxxxxx"
                          value={tgChatId}
                          onChange={(e) => setTgChatId(e.target.value)}
                          className="w-full border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-xs outline-hidden font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {settingsSubTab === "email" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-emerald-500" />
                        <span>SMTP Outbound Email Config</span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Configure the global SMTP mail server to transmit real-time alerts to registered email addresses.
                      </span>
                    </div>

                    {/* SMTP Preset Dropdown Selector */}
                    <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-150 shadow-3xs">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block">SMTP Service Provider Preset</label>
                      <select
                        value={smtpPreset}
                        onChange={(e) => handlePresetChange(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-750 outline-hidden focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="custom">Custom / Manual Configuration</option>
                        <option value="gmail">Gmail SMTP (smtp.gmail.com)</option>
                        <option value="cpanel">cPanel SMTP (mail.yourdomain.com)</option>
                        <option value="hosting">Hosting SMTP (e.g. Hostinger, Namecheap)</option>
                      </select>
                      
                      {smtpPreset === "gmail" && (
                        <div className="text-[10px] text-indigo-700 bg-indigo-50/75 border border-indigo-100/55 p-2 rounded-md font-medium leading-normal mt-1 flex flex-col gap-0.5 font-sans">
                          <span className="font-bold">🔑 Gmail Account configuration requirement:</span>
                          <p>Gmail blocks normal app passwords by default. You <strong>MUST</strong> use an "App Password" generated under your Google Account security settings. Regular login passwords will fail.</p>
                        </div>
                      )}
                      {smtpPreset === "cpanel" && (
                        <div className="text-[10px] text-amber-700 bg-amber-50/75 border border-amber-100/55 p-2 rounded-md font-medium leading-normal mt-1 flex flex-col gap-0.5 font-sans">
                          <span className="font-bold">🌐 cPanel mail instructions:</span>
                          <p>Remember to swap <code>mail.yourdomain.com</code> with your website domain. Standard ports are <code>465</code> (SSL) and <code>587</code> (TLS).</p>
                        </div>
                      )}
                      {smtpPreset === "hosting" && (
                        <div className="text-[10px] text-emerald-700 bg-emerald-50/75 border border-emerald-100/55 p-2 rounded-md font-medium leading-normal mt-1 flex flex-col gap-0.5 font-sans">
                          <span className="font-bold">⚡ Hosting server instructions:</span>
                          <p>Fill in SMTP details provided by your host registrar (e.g., Hostinger SMTP, Bluehost, GoDaddy Mail). Use port <code>465</code> for secure SSL links.</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 font-mono">SMTP Host</label>
                        <input
                          type="text"
                          placeholder="smtp.example.com"
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                          className="w-full border border-slate-200 bg-white rounded-lg px-2 py-1 text-xs outline-hidden"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 font-mono">SMTP Port</label>
                        <input
                          type="number"
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(Number(e.target.value))}
                          className="w-full border border-slate-200 bg-white rounded-lg px-2 py-1 text-xs outline-hidden"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 font-mono">From Email Address</label>
                        <input
                          type="email"
                          value={smtpFrom}
                          onChange={(e) => setSmtpFrom(e.target.value)}
                          className="w-full border border-slate-200 bg-white rounded-lg px-2 py-1 text-xs outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 font-mono">SMTP Username</label>
                        <input
                          type="text"
                          value={smtpUser}
                          onChange={(e) => setSmtpUser(e.target.value)}
                          className="w-full border border-slate-200 bg-white rounded-lg px-2 py-1.5 text-xs outline-hidden"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 font-mono">SMTP Password</label>
                        <input
                          type="password"
                          value={smtpPass}
                          onChange={(e) => setSmtpPass(e.target.value)}
                          className="w-full border border-slate-200 bg-white rounded-lg px-2 py-1.5 text-xs outline-hidden"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Persistent Global Save Button */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Encrypted on-chain configuration parameters</span>
              </span>
              <button
                type="submit"
                disabled={isUpdatingConfig}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isUpdatingConfig && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isUpdatingConfig ? "Saving Configs..." : "Save All System Settings"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subscriber Directory Panel */}
      {activeTab === "subscribers" && (
        <div className="space-y-6 max-w-4xl mx-auto">
          
          {/* Subscriber Users list */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 pb-3 border-b border-slate-100">
              <Users className="w-4 h-4 text-indigo-500" />
              <span>Subscriber Management Pool</span>
            </h3>

            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="border border-slate-100 p-3.5 rounded-xl space-y-2 hover:bg-slate-5/20 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-slate-850 text-xs block">{u.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium block">{u.email}</span>
                    </div>
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-md uppercase font-bold text-slate-500">
                      {u.plan_id}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-50 bg-slate-50/40 p-2 rounded-lg">
                    <div className="flex gap-4">
                      <div>
                        <span className="text-[9px] text-slate-400 block font-semibold uppercase">Wallet Credit</span>
                        <span className="font-bold text-slate-700">${u.balance.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block font-semibold uppercase">Address</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {u.wallet_address.slice(0, 6)}...{u.wallet_address.slice(-4)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => startEditUser(u)}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 border border-slate-200 rounded-md text-[10px] font-bold transition-all cursor-pointer"
                    >
                      Credit/Tier Override
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* User modifier card */}
          {editingUser && (
            <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl space-y-3 border border-slate-800 shadow-md">
              <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 uppercase">
                <Settings className="w-4 h-4" />
                <span>Override Subscriber parameters: {editingUser.name}</span>
              </h4>

              <form onSubmit={handleSaveUserEdit} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block">USDT Platform Balance</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editUserBalance}
                      onChange={(e) => setEditUserBalance(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-bold outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block">Subscription Tier</label>
                    <select
                      value={editUserPlan}
                      onChange={(e) => setEditUserPlan(e.target.value as any)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-bold outline-hidden cursor-pointer"
                    >
                      <option value="free">Free Starter</option>
                      <option value="pro">Pro Developer</option>
                      <option value="enterprise">Enterprise Scale</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Apply Changes
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Dynamic Subscription Plans Management Panel */}
      {activeTab === "plans" && (
        <div className="space-y-6 max-w-4xl mx-auto">
          
          <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 pb-3 border-b border-slate-100">
              <Sliders className="w-4 h-4 text-indigo-500" />
              <span>Subscription Plans Configuration</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <div key={plan.id} className={`border p-4 rounded-xl space-y-3 hover:shadow-3xs transition-all ${plan.is_active ? "border-slate-150 bg-white" : "border-slate-100 bg-slate-50/50 opacity-75"}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono uppercase font-semibold">
                        {plan.id}
                      </span>
                      <h4 className="font-bold text-slate-800 text-sm mt-1">{plan.name}</h4>
                    </div>
                    <span className={`w-2.5 h-2.5 rounded-full ${plan.is_active ? "bg-emerald-500" : "bg-rose-400"}`} title={plan.is_active ? "Active" : "Inactive"} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/60 p-2 rounded-lg font-medium text-slate-600">
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Monthly Cost</span>
                      <span className="font-bold text-slate-800">${plan.price} USDT</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Max Monitors</span>
                      <span className="font-bold text-slate-800">{plan.max_monitors} monitors</span>
                    </div>
                    <div className="mt-1">
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Min Interval</span>
                      <span className="font-bold text-slate-800">{plan.min_interval_sec} seconds</span>
                    </div>
                    <div className="mt-1">
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Status</span>
                      <span className={`font-bold ${plan.is_active ? "text-emerald-600" : "text-rose-500"}`}>
                        {plan.is_active ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-400 block font-bold uppercase">Configured Perks</span>
                    <ul className="text-[10px] text-slate-500 space-y-1 pl-1">
                      {plan.features.map((feat, i) => (
                        <li key={i} className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                          <span className="truncate">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => startEditPlan(plan)}
                    className="w-full py-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>Configure Plan</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Edit Plan Card Modal / Segment */}
          {editingPlan && (
            <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl space-y-4 border border-slate-800 shadow-md">
              <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 uppercase border-b border-slate-800 pb-2">
                <Sliders className="w-4 h-4" />
                <span>Configure Pricing & Features: {editingPlan.id.toUpperCase()} Plan</span>
              </h4>

              <form onSubmit={handleSavePlanEdit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-bold uppercase">Display Name</label>
                    <input
                      type="text"
                      required
                      value={editPlanName}
                      onChange={(e) => setEditPlanName(e.target.value)}
                      className="w-full bg-slate-850 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-bold outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-bold uppercase">USDT Monthly Price</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editPlanPrice}
                      onChange={(e) => setEditPlanPrice(Number(e.target.value))}
                      className="w-full bg-slate-850 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-bold outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-bold uppercase">Monitor Limit</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={editPlanMaxMonitors}
                      onChange={(e) => setEditPlanMaxMonitors(Number(e.target.value))}
                      className="w-full bg-slate-850 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-bold outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-bold uppercase">Min Interval (sec)</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={editPlanMinInterval}
                      onChange={(e) => setEditPlanMinInterval(Number(e.target.value))}
                      className="w-full bg-slate-850 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-bold outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 block font-bold uppercase">Plan Status</label>
                  <select
                    value={editPlanIsActive ? "true" : "false"}
                    onChange={(e) => setEditPlanIsActive(e.target.value === "true")}
                    className="w-full md:w-1/4 bg-slate-850 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-bold outline-hidden focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="true">Active & Available</option>
                    <option value="false">Disabled / Blocked</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 block font-bold uppercase flex justify-between">
                    <span>Feature Perks (One per line)</span>
                    <span className="text-[9px] text-slate-500 lowercase normal-case">Enter each feature on a separate line</span>
                  </label>
                  <textarea
                    rows={4}
                    value={editPlanFeaturesText}
                    onChange={(e) => setEditPlanFeaturesText(e.target.value)}
                    className="w-full bg-slate-850 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-mono outline-hidden focus:border-indigo-500"
                    placeholder="E.g. Up to 20 Monitors"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingPlan(null)}
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPlan}
                    className="px-5 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    {isSavingPlan && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isSavingPlan ? "Saving Plan..." : "Apply Plan Updates"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Worker System Logging Console Output Terminal */}
      {activeTab === "logs" && (
        <div className="bg-slate-950 text-slate-200 border border-slate-900 rounded-2xl p-5 shadow-inner">
        <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-3">
          <h3 className="font-bold text-sm flex items-center gap-1.5 text-indigo-400">
            <Terminal className="w-4 h-4" />
            <span>Concurrent Check Workers Console Log Terminal (Goroutines simulated output)</span>
          </h3>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Worker: Live</span>
            <button
              onClick={handleClearLogs}
              className="px-2 py-1 hover:bg-slate-900 hover:text-rose-500 border border-slate-900 text-slate-500 text-[10px] rounded-md transition-all font-bold cursor-pointer"
            >
              Clear Console Output
            </button>
          </div>
        </div>

        <div className="h-64 overflow-y-auto font-mono text-xs space-y-1.5 bg-black/40 p-4 rounded-xl border border-slate-900 select-text scrollbar-thin scrollbar-thumb-slate-800">
          {systemLogs.length === 0 ? (
            <span className="text-slate-600 italic block text-center py-16">Initializing UptimePro loop logs...</span>
          ) : (
            systemLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2.5 leading-relaxed">
                <span className="text-slate-500 shrink-0 select-none">
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>
                <span className={`px-1 rounded-sm text-[9px] font-bold select-none shrink-0 ${
                  log.level === "error" 
                    ? "bg-rose-950 text-rose-400 border border-rose-900" 
                    : log.level === "warn" 
                    ? "bg-amber-950 text-amber-400 border border-amber-900" 
                    : "bg-slate-900 text-indigo-400 border border-slate-800"
                }`}>
                  {log.level.toUpperCase()}
                </span>
                <span className={`break-all ${
                  log.level === "error" 
                    ? "text-rose-300 font-semibold" 
                    : log.level === "warn" 
                    ? "text-amber-200" 
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
