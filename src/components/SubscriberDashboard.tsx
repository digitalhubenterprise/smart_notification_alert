import React, { useState, useEffect } from "react";
import { 
  Globe, 
  Activity, 
  Plus, 
  Trash2, 
  Edit3, 
  Play, 
  CreditCard, 
  ArrowUpRight, 
  History, 
  Layers, 
  Copy, 
  Check, 
  AlertTriangle, 
  Clock, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  X,
  Smartphone,
  Sliders,
  Search,
  Bell,
  Save,
  Send,
  User as UserIcon,
  ShieldCheck,
  RefreshCw,
  Wallet
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { User, Monitor, MonitorLog, Payment, SubscriptionPlan } from "../types.ts";

interface SubscriberDashboardProps {
  user: User;
  monitors: Monitor[];
  payments: Payment[];
  onRefreshData: () => void;
  onCreditWallet: (amount: number) => void;
  activeTab?: "monitors" | "wallet" | "billing" | "history" | "settings";
  plans?: SubscriptionPlan[];
}

export default function SubscriberDashboard({
  user,
  monitors,
  payments,
  onRefreshData,
  onCreditWallet,
  activeTab = "monitors",
  plans = []
}: SubscriberDashboardProps) {
  // UI States
  const [selectedMonitor, setSelectedMonitor] = useState<Monitor | null>(null);
  const [selectedLogs, setSelectedLogs] = useState<MonitorLog[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  // Form States
  const [newMonitorName, setNewMonitorName] = useState("");
  const [newMonitorUrl, setNewMonitorUrl] = useState("https://");
  const [newMonitorType, setNewMonitorType] = useState<"HTTP" | "Ping" | "Port">("HTTP");
  const [newMonitorInterval, setNewMonitorInterval] = useState(30);

  // Payment States
  const [txnHash, setTxnHash] = useState("");
  const [isVerifyingTxn, setIsVerifyingTxn] = useState(false);
  const [txnError, setTxnError] = useState("");
  const [txnSuccess, setTxnSuccess] = useState("");
  const [copiedAddress, setCopiedAddress] = useState(false);

  // General States
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const currentPlan = plans.find((p) => p.id === user.plan_id) || {
    id: user.plan_id,
    name: user.plan_id === "free" ? "Starter" : user.plan_id === "pro" ? "Developer" : "SaaS / Enterprise",
    price: user.plan_id === "free" ? 0 : user.plan_id === "pro" ? 10 : 50,
    max_monitors: user.plan_id === "free" ? 3 : user.plan_id === "pro" ? 20 : 100,
    min_interval_sec: user.plan_id === "free" ? 30 : user.plan_id === "pro" ? 10 : 5,
    is_active: true,
    features: []
  };

  // History & Alerts States
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [alertEvents, setAlertEvents] = useState<any[]>([]);
  const [historySubTab, setHistorySubTab] = useState<"history" | "alerts">("history");
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Profile Form States
  const [profileName, setProfileName] = useState(user.name);
  const [profileEmail, setProfileEmail] = useState(user.email);
  const [profileWallet, setProfileWallet] = useState(user.wallet_address);
  const [profileTelegramChatId, setProfileTelegramChatId] = useState(user.telegram_chat_id || "");

  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [isTestingAlerts, setIsTestingAlerts] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  // Sync profile state when user prop changes
  useEffect(() => {
    setProfileName(user.name);
    setProfileEmail(user.email);
    setProfileWallet(user.wallet_address);
    setProfileTelegramChatId(user.telegram_chat_id || "");
  }, [user]);

  const fetchUnifiedHistory = async () => {
    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      const [logsRes, alertsRes] = await Promise.all([
        fetch("/api/logs"),
        fetch("/api/alerts")
      ]);
      if (!logsRes.ok || !alertsRes.ok) {
        throw new Error("Failed to load historical data.");
      }
      const [logsData, alertsData] = await Promise.all([
        logsRes.json(),
        alertsRes.json()
      ]);
      setHistoryLogs(logsData);
      setAlertEvents(alertsData);
    } catch (err: any) {
      console.error(err);
      setHistoryError(err.message || "Failed to fetch logs.");
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // Trigger loading when entering tabs
  useEffect(() => {
    if (activeTab === "history") {
      fetchUnifiedHistory();
    }
  }, [activeTab]);

  // Handle Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSuccess("");
    setSettingsError("");
    try {
      // Update Profile Information
      const userRes = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
          wallet_address: profileWallet,
          telegram_chat_id: profileTelegramChatId,
        }),
      });

      if (!userRes.ok) {
        const errorData = await userRes.json();
        throw new Error(errorData.error || "Failed to update profile info.");
      }

      setSettingsSuccess("Your account settings and notification preferences have been saved successfully!");
      onRefreshData(); // Refresh global user state
    } catch (err: any) {
      setSettingsError(err.message || "An unexpected error occurred while saving.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Handle Test Alert
  const handleTestAlert = async () => {
    setIsTestingAlerts(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/alerts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram_chat_id: profileTelegramChatId,
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to invoke test alert endpoint.");
      }
      const data = await res.json();
      if (data.success) {
        let channelStatus = "";
        if (data.telegram && data.email) channelStatus = "Telegram (via global bot) and SMTP Email gateways verified!";
        else if (data.telegram) channelStatus = "Telegram bot ping verified successfully!";
        else if (data.email) channelStatus = "SMTP Email dispatch logs verified successfully!";
        else channelStatus = "No channels were tested because details are incomplete.";
        
        setTestResult({
          success: true,
          msg: `Success: ${channelStatus}`
        });
      } else {
        throw new Error("Alert dispatcher verification failed.");
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        msg: `Error: ${err.message || "Connection refused."}`
      });
    } finally {
      setIsTestingAlerts(false);
    }
  };

  // Stats
  const activeCount = monitors.length;
  const upCount = monitors.filter((m) => m.status === "up").length;
  const downCount = monitors.filter((m) => m.status === "down").length;
  const avgUptime = monitors.length > 0 
    ? (monitors.reduce((sum, m) => sum + (m.uptime_percentage || 100), 0) / monitors.length).toFixed(2)
    : "100";

  // BSC Receiving wallet from default configs
  const BSC_RECEIVER_WALLET = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

  // Fetch log history for selected monitor
  useEffect(() => {
    if (selectedMonitor) {
      fetchLogs(selectedMonitor.id);
    }
  }, [selectedMonitor]);

  // Sync monitors lists periodically (every 5s)
  useEffect(() => {
    const timer = setInterval(() => {
      onRefreshData();
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const fetchLogs = async (monitorId: string) => {
    try {
      const res = await fetch(`/api/monitors/${monitorId}/logs`);
      if (res.ok) {
        const data = await res.json();
        // format time for chart
        const formatted = data.map((l: MonitorLog) => ({
          ...l,
          timeLabel: new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          latency: l.status === "up" ? l.response_time : 0
        }));
        setSelectedLogs(formatted);
      }
    } catch (e) {
      console.error("Failed to load logs for monitor", monitorId);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  // Add Monitor submission
  const handleAddMonitor = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoadingAction("add-monitor");

    try {
      const res = await fetch("/api/monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMonitorName,
          url: newMonitorUrl,
          monitor_type: newMonitorType,
          interval_sec: newMonitorInterval
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add monitor.");
      }

      // Success Reset
      setNewMonitorName("");
      setNewMonitorUrl("https://");
      setNewMonitorInterval(30);
      setIsAddOpen(false);
      onRefreshData();
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoadingAction(null);
    }
  };

  // Delete Monitor
  const handleDeleteMonitor = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this monitor? All historical metrics will be erased.")) return;
    setLoadingAction(`delete-${id}`);
    try {
      const res = await fetch(`/api/monitors/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (selectedMonitor?.id === id) {
          setSelectedMonitor(null);
        }
        onRefreshData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(null);
    }
  };

  // Immediate check now trigger
  const handleCheckNow = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadingAction(`check-${id}`);
    try {
      const res = await fetch(`/api/monitors/${id}/check`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        onRefreshData();
        if (selectedMonitor?.id === id) {
          fetchLogs(id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(null);
    }
  };

  // Verify BSC payment hash
  const handleVerifyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txnHash.trim()) return;

    setTxnError("");
    setTxnSuccess("");
    setIsVerifyingTxn(true);

    try {
      const res = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txn_hash: txnHash.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }

      setTxnSuccess(data.message || "Payment verified and credited!");
      setTxnHash("");
      onRefreshData();
    } catch (err: any) {
      setTxnError(err.message || "Blockchain validation failed. Try one of our simulation hashes.");
    } finally {
      setIsVerifyingTxn(false);
    }
  };

  // Credit custom sandbox money
  const handleSimulatePayment = async (amount: number) => {
    setLoadingAction(`simulate-${amount}`);
    try {
      const res = await fetch("/api/user/sandbox-credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount })
      });
      if (res.ok) {
        onRefreshData();
        setTxnSuccess(`Successfully simulated sandbox credit of ${amount} USDT!`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(null);
    }
  };

  // Upgrade user plan
  const handleUpgradePlan = async (plan: "free" | "pro" | "enterprise") => {
    setLoadingAction(`upgrade-${plan}`);
    try {
      const res = await fetch("/api/user/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: plan })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error);
      } else {
        setIsUpgradeOpen(false);
        onRefreshData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Monitors */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Monitors</span>
            <span className="text-3xl font-bold text-slate-800">{activeCount}</span>
            <div className="mt-2 text-xs text-slate-500 flex gap-2">
              <span className="text-emerald-500 font-medium">● {upCount} Up</span>
              {downCount > 0 && <span className="text-rose-500 font-medium">● {downCount} Down</span>}
            </div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Globe className="w-6 h-6" />
          </div>
        </div>

        {/* Avg Uptime */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Average Uptime</span>
            <span className="text-3xl font-bold text-slate-800">{avgUptime}%</span>
            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>Last 24 hours</span>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Balance Wallet */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">USDT Balance</span>
            <span className="text-3xl font-bold text-slate-800">${user.balance.toFixed(2)}</span>
            <button 
              onClick={() => setIsPayOpen(true)}
              className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-0.5"
            >
              <CreditCard className="w-3.5 h-3.5 inline mr-1" />
              <span>Add Funds (BSC)</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-3 bg-slate-50 text-slate-600 rounded-xl">
            <Layers className="w-6 h-6 text-amber-500" />
          </div>
        </div>

        {/* Active Plan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Service Plan</span>
            <span className="text-3xl font-bold text-slate-800 capitalize">{user.plan_id}</span>
            <button 
              onClick={() => setIsUpgradeOpen(true)}
              className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-0.5"
            >
              <span>Manage Subscriptions</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {activeTab === "monitors" && (
        /* Main Content Split: Monitors List & Monitor details panel */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Monitors List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center bg-slate-50/50 p-3 rounded-xl border border-slate-100">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-500" />
              <span>Monitors List</span>
            </h2>
            <button
              onClick={() => setIsAddOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Monitor</span>
            </button>
          </div>

          <div className="space-y-3">
            {monitors.length === 0 ? (
              <div className="bg-white border border-slate-100 p-12 rounded-2xl text-center">
                <Globe className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700 mb-1">No Active Monitors</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                  Add websites or endpoints that you would like UptimePro to monitor and check for uptime alerts.
                </p>
                <button
                  onClick={() => setIsAddOpen(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Create First Monitor
                </button>
              </div>
            ) : (
              monitors.map((monitor) => {
                const isSelected = selectedMonitor?.id === monitor.id;
                return (
                  <div
                    key={monitor.id}
                    onClick={() => setSelectedMonitor(monitor)}
                    className={`bg-white border rounded-2xl p-4 transition-all hover:shadow-xs cursor-pointer ${
                      isSelected ? "border-indigo-500 ring-2 ring-indigo-500/10" : "border-slate-100"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Monitor Name and URL */}
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-xl mt-0.5 ${
                          monitor.status === "up" 
                            ? "bg-emerald-50 text-emerald-600" 
                            : monitor.status === "down" 
                            ? "bg-rose-50 text-rose-600" 
                            : "bg-amber-50 text-amber-600"
                        }`}>
                          <Globe className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">{monitor.name}</span>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md">
                              {monitor.monitor_type}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              monitor.status === "up"
                                ? "bg-emerald-50 text-emerald-700"
                                : monitor.status === "down"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-amber-50 text-amber-700"
                            }`}>
                              {monitor.status.toUpperCase()}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 block break-all font-mono">
                            {monitor.url}
                          </span>
                        </div>
                      </div>

                      {/* Middle: Metrics and Stats */}
                      <div className="flex items-center gap-4 md:gap-8 bg-slate-50/50 p-2 rounded-xl border border-slate-100/50 self-start md:self-center">
                        <div className="text-center">
                          <span className="text-[10px] text-slate-400 block font-medium">Uptime</span>
                          <span className="text-xs font-bold text-slate-700">
                            {monitor.uptime_percentage ?? 100}%
                          </span>
                        </div>
                        <div className="text-center border-l border-slate-200/60 pl-4 md:pl-8">
                          <span className="text-[10px] text-slate-400 block font-medium">Latency</span>
                          <span className="text-xs font-bold text-slate-700">
                            {monitor.average_response_time_ms ? `${monitor.average_response_time_ms}ms` : "N/A"}
                          </span>
                        </div>
                        <div className="text-center border-l border-slate-200/60 pl-4 md:pl-8">
                          <span className="text-[10px] text-slate-400 block font-medium">Interval</span>
                          <span className="text-xs font-bold text-slate-700 flex items-center justify-center gap-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{monitor.interval_sec}s</span>
                          </span>
                        </div>
                      </div>

                      {/* Right: Quick Action Controls */}
                      <div className="flex items-center gap-1.5 justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-50">
                        <button
                          title="Ping Now"
                          onClick={(e) => handleCheckNow(monitor.id, e)}
                          disabled={loadingAction === `check-${monitor.id}`}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-50 text-slate-500 rounded-lg transition-all border border-slate-100 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          title="Delete Monitor"
                          onClick={(e) => handleDeleteMonitor(monitor.id, e)}
                          disabled={loadingAction === `delete-${monitor.id}`}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 disabled:opacity-50 rounded-lg transition-all border border-rose-100/50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-slate-400 hidden md:block" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 1 Column: Monitor Logs Graph & Details View */}
        <div className="space-y-4">
          <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-500" />
              <span>Detailed Monitor View</span>
            </h2>
          </div>

          {!selectedMonitor ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-slate-400">
              <Activity className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-xs">Select any monitor from the left to view active latency graphs and incident check history logs.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 shadow-2xs">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">{selectedMonitor.name}</h3>
                  <a 
                    href={selectedMonitor.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-xs text-indigo-500 hover:underline flex items-center gap-0.5 mt-0.5 break-all font-mono"
                  >
                    <span>{selectedMonitor.url}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                  selectedMonitor.status === "up" 
                    ? "bg-emerald-50 text-emerald-700" 
                    : "bg-rose-50 text-rose-700"
                }`}>
                  {selectedMonitor.status}
                </span>
              </div>

              {/* Latency Chart */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Response Latency (ms)</span>
                {selectedLogs.length === 0 ? (
                  <div className="h-40 bg-slate-50 rounded-xl flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200">
                    No historical check data available yet.
                  </div>
                ) : (
                  <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={selectedLogs} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                        <defs>
                          <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="timeLabel" tick={{ fontSize: 9 }} stroke="#cbd5e1" />
                        <YAxis tick={{ fontSize: 9 }} stroke="#cbd5e1" />
                        <Tooltip 
                          contentStyle={{ background: "#1e293b", borderRadius: "8px", border: "none" }} 
                          labelStyle={{ color: "#94a3b8", fontSize: "10px", fontWeight: "bold" }}
                          itemStyle={{ color: "#ffffff", fontSize: "11px" }}
                        />
                        <Area type="monotone" dataKey="latency" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorLatency)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Recent Checks List */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Recent Check Log History</span>
                <div className="max-h-52 overflow-y-auto space-y-1.5 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
                  {selectedLogs.length === 0 ? (
                    <span className="text-xs text-slate-400 block text-center py-4">Waiting for first check trigger...</span>
                  ) : (
                    selectedLogs.slice(0, 10).map((log) => (
                      <div key={log.id} className="bg-white p-2 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${log.status === "up" ? "bg-emerald-500" : "bg-rose-500"}`} />
                          <span className="font-semibold text-slate-700">
                            {log.status === "up" ? `${log.response_time}ms` : "Outage"}
                          </span>
                          <span className="text-slate-400 font-mono text-[10px]">HTTP {log.status_code || "0"}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {activeTab === "wallet" && (
        <div className="space-y-6">
          {/* Header Hero Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full filter blur-3xl -z-10" />
            <div className="space-y-2 relative z-10">
              <div className="inline-flex items-center gap-1.5 bg-indigo-500/20 px-2.5 py-0.5 rounded-full border border-indigo-500/30 text-indigo-300 font-bold text-[10px] uppercase tracking-wider">
                <Wallet className="w-3.5 h-3.5" />
                <span>BSC Decentralized Treasury</span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">USDT Decentralized Deposit Desk</h2>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                Fund your UptimePro platform account directly from your Binance Smart Chain wallet. Your balance will be automatically debited monthly based on your selected plan.
              </p>
            </div>
            
            {/* Quick balance display card */}
            <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl w-full md:w-auto md:min-w-[240px] space-y-1">
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-extrabold uppercase tracking-widest font-mono">
                <span>Platform Credit</span>
                <span className="text-emerald-500 bg-emerald-950/40 border border-emerald-900/50 px-1.5 py-0.5 rounded-md text-[9px] font-bold">BEP-20 USDT</span>
              </div>
              <div className="flex items-baseline gap-1 pt-1">
                <span className="text-2xl font-black text-white">${user.balance.toFixed(2)}</span>
                <span className="text-xs text-slate-400 font-mono capitalize">({user.plan_id})</span>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[130px]">{user.wallet_address || "0x..."}</span>
                <button
                  onClick={() => copyToClipboard(user.wallet_address || "0x742d35Cc6634C0532925a3b844Bc454e4438f44e")}
                  className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                >
                  Copy Address
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Deposit Desk Form (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Box 1: BSC Crypto Instructions */}
              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-4">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-indigo-500" />
                  <span>Funding Instructions</span>
                </h3>

                <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-4 text-xs text-amber-800 flex gap-2.5 items-start leading-relaxed">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-bold block text-amber-900">Binance Smart Chain (BSC) Network Only!</span>
                    To avoid loss of funds, only submit BEP-20 transactions. Standard USDT or native BNB tokens sent to this destination are automatically parsed and credited.
                  </div>
                </div>

                {/* Receiving Address */}
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">BSC RECEIVER WALLET ADDRESS</span>
                    <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md font-bold font-mono">DEPOSIT DESTINATION</span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <span className="flex-1 bg-white border border-slate-200/80 px-3 py-2.5 rounded-xl font-mono text-xs text-slate-600 select-all break-all leading-normal flex items-center">
                      {BSC_RECEIVER_WALLET}
                    </span>
                    <button
                      onClick={() => copyToClipboard(BSC_RECEIVER_WALLET)}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-all"
                    >
                      {copiedAddress ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy Address</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Verification Form */}
                <form onSubmit={handleVerifyPayment} className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">Enter BEP-20 Transaction Hash (64-char Hex)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="0x..."
                        value={txnHash}
                        onChange={(e) => setTxnHash(e.target.value)}
                        className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden font-mono"
                      />
                      <button
                        type="submit"
                        disabled={isVerifyingTxn}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shrink-0 shadow-sm cursor-pointer transition-all flex items-center justify-center"
                      >
                        {isVerifyingTxn ? "Validating Block..." : "Verify Block"}
                      </button>
                    </div>
                  </div>

                  {txnError && (
                    <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl text-xs text-rose-700 flex gap-2 items-start">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                      <span>{txnError}</span>
                    </div>
                  )}

                  {txnSuccess && (
                    <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-xs text-emerald-700 flex gap-2 items-start">
                      <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                      <span>{txnSuccess}</span>
                    </div>
                  )}
                </form>
              </div>

              {/* Sandbox Simulators Panel */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-5 space-y-4">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Sandbox Payment Simulators</span>
                  <span className="text-[11px] text-slate-500">Test the real balance crediting and listener triggers without spending gas.</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setTxnHash("0x0000000000000000000000000000000000000000000000000000000000000000");
                      setTxnSuccess("");
                      setTxnError("");
                    }}
                    className="p-3 bg-white hover:bg-slate-100 border border-slate-150 rounded-2xl text-left space-y-1 transition-all cursor-pointer group"
                  >
                    <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 block">Simulate 10 USDT Deposit</span>
                    <span className="text-[10px] text-slate-400 font-mono block">Load Hash: 0x00...</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setTxnHash("0x1111111111111111111111111111111111111111111111111111111111111111");
                      setTxnSuccess("");
                      setTxnError("");
                    }}
                    className="p-3 bg-white hover:bg-slate-100 border border-slate-150 rounded-2xl text-left space-y-1 transition-all cursor-pointer group"
                  >
                    <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 block">Simulate 25 USDT Deposit</span>
                    <span className="text-[10px] text-slate-400 font-mono block">Load Hash: 0x11...</span>
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-slate-500 font-medium">
                  <span>Instantly inject raw test money:</span>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                      onClick={() => handleSimulatePayment(50)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-600 rounded-xl text-xs font-bold cursor-pointer transition-all animate-none"
                    >
                      + 50 USDT
                    </button>
                    <button 
                      onClick={() => handleSimulatePayment(100)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-600 rounded-xl text-xs font-bold cursor-pointer transition-all animate-none"
                    >
                      + 100 USDT
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Payments Ledger (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <History className="w-4 h-4 text-indigo-500" />
                    <span>Blockchain Ledger</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold font-mono">({payments.length} Txns)</span>
                </div>

                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {payments.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-slate-300">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold block">No deposits recorded yet</span>
                      <span className="text-[10px] text-slate-400 block">Funds added via the deposit desk will appear here</span>
                    </div>
                  ) : (
                    payments.slice().reverse().map((pay, pIdx) => (
                      <div key={pIdx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-700 block text-xs">
                            +{pay.amount} {pay.token}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold font-mono uppercase ${
                            pay.status === "confirmed" 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                              : pay.status === "pending"
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : "bg-rose-50 text-rose-700 border border-rose-100"
                          }`}>
                            {pay.status}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                          <span className="font-mono truncate max-w-[150px]">{pay.txn_hash}</span>
                          <span>{new Date(pay.timestamp).toLocaleDateString()} {new Date(pay.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "billing" && (
        <div className="space-y-6">
          {/* Billing Dashboard Welcome Hero */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] bg-white/20 px-2.5 py-0.5 rounded-md font-bold uppercase tracking-widest text-white/95">
                Billing Dashboard
              </span>
              <h2 className="text-lg font-bold">Manage your UptimePro Subscription & Balances</h2>
              <p className="text-xs text-indigo-100 max-w-xl">
                Add BEP-20 USDT funds over Binance Smart Chain or upgrade your plan instantly. Your balance is debited automatically every month.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsPayOpen(true)}
                className="px-4 py-2 bg-white text-indigo-600 hover:bg-slate-50 text-xs font-bold rounded-xl shadow-sm cursor-pointer transition-all flex items-center gap-1.5"
              >
                <CreditCard className="w-4 h-4" />
                <span>Add Funds (BSC)</span>
              </button>
            </div>
          </div>

          {/* Subscription plans inline */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-500" />
              <span>Available Subscription Tiers</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const isCurrent = user.plan_id === plan.id;
                return (
                  <div key={plan.id} className={`p-4 rounded-xl border ${isCurrent ? "border-indigo-500 bg-indigo-50/20" : "border-slate-100 bg-white"} ${!plan.is_active ? "opacity-50" : ""} space-y-3`}>
                    <div>
                      <span className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase block">
                        {plan.id === "free" ? "Starter" : plan.id === "pro" ? "Developer" : "SaaS / Enterprise"}
                      </span>
                      <span className="font-bold text-slate-800 text-lg block mt-0.5">{plan.name}</span>
                    </div>
                    <div className="text-2xl font-black text-slate-800">
                      ${plan.price}<span className="text-xs font-normal text-slate-400">/mo</span>
                    </div>
                    <ul className="text-[11px] text-slate-500 space-y-2 border-t border-slate-100 pt-3">
                      {plan.features.map((feature, fIdx) => (
                        <li key={fIdx} className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {isCurrent ? (
                      <span className="w-full text-center block py-1.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg">
                        Active Plan
                      </span>
                    ) : (
                      <button
                        onClick={() => handleUpgradePlan(plan.id)}
                        disabled={!plan.is_active}
                        className={`w-full py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          !plan.is_active
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            : plan.id === "free"
                            ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent shadow-sm"
                        }`}
                      >
                        {!plan.is_active ? "Disabled" : plan.id === "free" ? "Downgrade to Free" : `Upgrade ($${plan.price} USDT)`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Transaction billing log history */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 mb-4">
              <History className="w-4 h-4 text-slate-500" />
              <span>Billing & Deposit History (BEP-20 Audit Logs)</span>
            </h3>

            {payments.length === 0 ? (
              <span className="text-xs text-slate-400 block text-center py-6 border border-dashed border-slate-150 rounded-xl">No recorded payment history.</span>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold bg-slate-50/50">
                      <th className="py-2.5 px-3">Transaction Hash</th>
                      <th className="py-2.5 px-3">Block Number</th>
                      <th className="py-2.5 px-3 text-right">Credit Amount</th>
                      <th className="py-2.5 px-3">Token</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => (
                      <tr key={p.txn_hash} className="hover:bg-slate-50/30">
                        <td className="py-2.5 px-3 font-mono text-slate-500 break-all select-all">
                          {p.txn_hash.slice(0, 10)}...{p.txn_hash.slice(-10)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 font-mono">
                          {p.block_number ?? "N/A"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-700">
                          {p.amount > 0 ? `+$${p.amount.toFixed(2)}` : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 font-mono">
                          {p.token}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            p.status === "confirmed" 
                              ? "bg-emerald-50 text-emerald-700" 
                              : p.status === "failed" 
                              ? "bg-rose-50 text-rose-700" 
                              : "bg-amber-50 text-amber-700"
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">
                          {new Date(p.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2.5 py-0.5 rounded-md font-bold uppercase tracking-widest">
                Audit Trail
              </span>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                <span>Execution Logs & Alert Events</span>
              </h2>
              <p className="text-xs text-slate-400 max-w-xl">
                Inspect historical uptime monitor ping responses, HTTP status code logs, and automated notifications sent across custom Telegram or Email channels.
              </p>
            </div>
            <button
              onClick={fetchUnifiedHistory}
              disabled={isHistoryLoading}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isHistoryLoading ? "animate-spin" : ""}`} />
              <span>Fetch Latest Audit</span>
            </button>
          </div>

          {/* Navigation Sub-Tabs & Filter Section */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
              <button
                onClick={() => { setHistorySubTab("history"); setSearchQuery(""); }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  historySubTab === "history"
                    ? "bg-white text-slate-800 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Uptime History Logs ({historyLogs.length})
              </button>
              <button
                onClick={() => { setHistorySubTab("alerts"); setSearchQuery(""); }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  historySubTab === "alerts"
                    ? "bg-white text-slate-800 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Dispatched Alert Notifications ({alertEvents.length})
              </button>
            </div>

            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={historySubTab === "history" ? "Filter by monitor name or status..." : "Filter by alert message..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all"
              />
            </div>
          </div>

          {/* Sub-Tab Panels */}
          {historyError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-xl text-xs font-medium">
              {historyError}
            </div>
          )}

          {isHistoryLoading ? (
            <div className="bg-white border border-slate-100 p-12 rounded-2xl text-center space-y-2">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
              <span className="text-xs text-slate-400 font-bold block">Parsing local database log cache...</span>
            </div>
          ) : historySubTab === "history" ? (
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-2xs">
              {historyLogs.filter(log => {
                const query = searchQuery.toLowerCase();
                return (
                  log.monitorName.toLowerCase().includes(query) ||
                  log.status.toLowerCase().includes(query) ||
                  (log.error_message && log.error_message.toLowerCase().includes(query))
                );
              }).length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No matching execution logs found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold bg-slate-50/50">
                        <th className="py-3 px-4">Monitor Info</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Latency</th>
                        <th className="py-3 px-4">HTTP Code</th>
                        <th className="py-3 px-4">Details / Errors</th>
                        <th className="py-3 px-4">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyLogs
                        .filter(log => {
                          const query = searchQuery.toLowerCase();
                          return (
                            log.monitorName.toLowerCase().includes(query) ||
                            log.status.toLowerCase().includes(query) ||
                            (log.error_message && log.error_message.toLowerCase().includes(query))
                          );
                        })
                        .map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/20">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-800">{log.monitorName}</div>
                              <div className="text-[10px] text-slate-400 font-mono break-all">{log.monitorUrl}</div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                log.status === "up"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                  : "bg-rose-50 text-rose-700 border border-rose-100"
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${log.status === "up" ? "bg-emerald-500" : "bg-rose-500"}`} />
                                <span className="uppercase">{log.status}</span>
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                              {log.status === "up" ? `${log.response_time}ms` : "-"}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-500">
                              {log.status_code || "0"}
                            </td>
                            <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={log.error_message}>
                              {log.error_message || <span className="text-slate-300 italic">No errors</span>}
                            </td>
                            <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-2xs">
              {alertEvents.filter(evt => {
                const query = searchQuery.toLowerCase();
                return evt.message.toLowerCase().includes(query);
              }).length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No matching alert notifications found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold bg-slate-50/50">
                        <th className="py-3 px-4">Level</th>
                        <th className="py-3 px-4">Message Description</th>
                        <th className="py-3 px-4">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {alertEvents
                        .filter(evt => {
                          const query = searchQuery.toLowerCase();
                          return evt.message.toLowerCase().includes(query);
                        })
                        .map((evt) => (
                          <tr key={evt.id} className="hover:bg-slate-50/20">
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase inline-block ${
                                evt.level === "error" || evt.level === "warn"
                                  ? "bg-rose-50 text-rose-700 border border-rose-100"
                                  : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                              }`}>
                                {evt.level}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-700 font-sans">
                              {evt.message}
                            </td>
                            <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                              {new Date(evt.timestamp).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "settings" && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Welcome Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2.5 py-0.5 rounded-md font-bold uppercase tracking-widest">
                Subscriber Panel
              </span>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <span>Account & Alert Channels Configuration</span>
              </h2>
              <p className="text-xs text-slate-400 max-w-xl">
                Edit your platform profile name, update your BEP-20 verification wallet, and personalize your SMTP / Telegram alert bot credentials.
              </p>
            </div>
            <button
              type="submit"
              disabled={isSavingSettings}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingSettings ? "Saving Settings..." : "Save All Settings"}</span>
            </button>
          </div>

          {/* Feedback Messages */}
          {settingsSuccess && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-xl text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{settingsSuccess}</span>
            </div>
          )}

          {settingsError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{settingsError}</span>
            </div>
          )}

          {/* Settings Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1 */}
            <div className="space-y-6">
              {/* Card 1: Identity & Credentials */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-2xs space-y-4">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-50 pb-3">
                  <UserIcon className="w-4 h-4 text-indigo-500" />
                  <span>Profile Credentials</span>
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Subscriber Name</label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Web3 Verification Address */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-2xs space-y-4">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-50 pb-3">
                  <Smartphone className="w-4 h-4 text-indigo-500" />
                  <span>Web3 Settlement Address</span>
                </h3>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">BEP-20 Wallet Address (Binance Smart Chain)</label>
                  <input
                    type="text"
                    required
                    pattern="^0x[a-fA-F0-9]{40}$"
                    title="Please enter a valid BSC/BEP-20 40-character hex wallet address starting with 0x"
                    value={profileWallet}
                    onChange={(e) => setProfileWallet(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400 block">
                    This wallet is used to settle USDT plan subscriptions, refunds, and verify Binance Smart Chain payments.
                  </span>
                </div>
              </div>

              {/* Card 3: Subscription Limits Overview */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-2xs space-y-3">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-50 pb-3">
                  <ShieldCheck className="w-4 h-4 text-indigo-500" />
                  <span>Tier Quota Limits</span>
                </h3>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">Plan Level</span>
                    <span className="text-sm font-extrabold text-indigo-600 uppercase mt-0.5 block">{user.plan_id}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">Monitors Cap</span>
                    <span className="text-sm font-extrabold text-slate-800 mt-0.5 block">
                      {currentPlan.max_monitors} monitors
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">Min Interval</span>
                    <span className="text-sm font-extrabold text-slate-800 mt-0.5 block">
                      {currentPlan.min_interval_sec}s
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">Joined Time</span>
                    <span className="text-xs font-extrabold text-slate-800 mt-0.5 block font-mono">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-6">
              {/* Card 4: Telegram Bot Alert configs */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-2xs space-y-4">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-50 pb-3">
                  <Bell className="w-4 h-4 text-indigo-500" />
                  <span>Telegram Incident Alerts</span>
                </h3>

                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-2 text-xs text-indigo-900">
                  <span className="font-bold block">How to receive Telegram notifications:</span>
                  <ol className="list-decimal pl-4 space-y-1.5 text-slate-650 leading-relaxed font-sans">
                    <li>Open Telegram and search for our global bot: <a href="https://t.me/SmartUptimeNotification_bot" target="_blank" rel="noreferrer" className="font-black text-indigo-600 underline hover:text-indigo-800">@SmartUptimeNotification_bot</a></li>
                    <li>Start the bot by sending the <span className="font-mono bg-indigo-100 px-1.5 py-0.5 rounded text-indigo-700 font-bold">/start</span> command.</li>
                    <li>The bot will instantly display your unique <span className="font-bold">Telegram Chat ID</span>.</li>
                    <li>Paste that Chat ID in the field below and click <span className="font-bold">Save All Settings</span> to link it!</li>
                  </ol>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Your Telegram Chat ID</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 518491029"
                      value={profileTelegramChatId}
                      onChange={(e) => setProfileTelegramChatId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all text-slate-800 font-mono"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isTestingAlerts || !profileTelegramChatId}
                      onClick={handleTestAlert}
                      className="px-3.5 py-1.5 bg-slate-900 text-white disabled:opacity-50 text-xs font-bold rounded-lg hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>{isTestingAlerts ? "Verifying with Bot..." : "Send Test Ping"}</span>
                    </button>
                    {testResult && (
                      <span className={`text-[10px] font-semibold block mt-2 ${testResult.success ? "text-emerald-600" : "text-rose-600"}`}>
                        {testResult.msg}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* MODAL: ADD MONITOR */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden"
            >
              <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-indigo-500" />
                  <span>Create Website Monitor</span>
                </h3>
                <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddMonitor} className="p-5 space-y-4">
                {errorMsg && (
                  <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl flex gap-2 items-start text-xs text-rose-700">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Monitor Friendly Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., My Portfolio Website"
                    value={newMonitorName}
                    onChange={(e) => setNewMonitorName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Target Endpoint URL</label>
                  <input
                    type="text"
                    required
                    placeholder="https://example.com"
                    value={newMonitorUrl}
                    onChange={(e) => setNewMonitorUrl(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Check Protocol</label>
                    <select
                      value={newMonitorType}
                      onChange={(e) => setNewMonitorType(e.target.value as any)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden font-medium bg-white"
                    >
                      <option value="HTTP">HTTP/HTTPS</option>
                      <option value="Ping">ICMP Ping</option>
                      <option value="Port">TCP Port</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Check Interval (Seconds)</label>
                    <input
                      type="number"
                      required
                      min={currentPlan.min_interval_sec}
                      value={newMonitorInterval}
                      onChange={(e) => setNewMonitorInterval(Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden font-medium"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Min: {currentPlan.min_interval_sec}s ({user.plan_id} limit)
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loadingAction === "add-monitor"}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    {loadingAction === "add-monitor" ? "Creating..." : "Add Monitor"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD FUNDS (BSC CRYPTO GATEWAY) */}
      <AnimatePresence>
        {isPayOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden"
            >
              <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-500" />
                  <span>BSC BEP-20 Payment Gateway</span>
                </h3>
                <button onClick={() => setIsPayOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 flex gap-2 items-start leading-relaxed">
                  <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-bold block">Binance Smart Chain (BSC) payments only!</span>
                    We accept standard **BEP-20 USDT** and native **BNB** tokens. To fund your dashboard, send tokens to the receiving wallet below, then enter your transaction hash.
                  </div>
                </div>

                {/* Receiving Address */}
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl space-y-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">BSC Receiving Wallet Address</span>
                  <div className="flex items-center justify-between gap-2 bg-white border border-slate-150 p-2 rounded-lg">
                    <span className="font-mono text-xs text-slate-600 select-all break-all pr-2">
                      {BSC_RECEIVER_WALLET}
                    </span>
                    <button
                      onClick={() => copyToClipboard(BSC_RECEIVER_WALLET)}
                      className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-md border border-slate-200 text-xs font-medium flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {copiedAddress ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-[10px] text-emerald-600 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Txn Hash form */}
                <form onSubmit={handleVerifyPayment} className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Transaction Hash (64-char Hex)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="0x..."
                        value={txnHash}
                        onChange={(e) => setTxnHash(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden font-mono"
                      />
                      <button
                        type="submit"
                        disabled={isVerifyingTxn}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shrink-0 shadow-sm cursor-pointer"
                      >
                        {isVerifyingTxn ? "Querying..." : "Submit"}
                      </button>
                    </div>
                  </div>

                  {txnError && (
                    <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-xl text-xs text-rose-700">
                      {txnError}
                    </div>
                  )}

                  {txnSuccess && (
                    <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl text-xs text-emerald-700">
                      {txnSuccess}
                    </div>
                  )}
                </form>

                {/* Sandbox Mock Options for testing */}
                <div className="bg-slate-50 border border-slate-100/50 p-4 rounded-xl space-y-3">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">Sandbox Payment Simulators</span>
                    <span className="text-[10px] text-slate-400">Instantly test the real balance crediting and listener triggers without spending gas.</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => {
                        setTxnHash("0x0000000000000000000000000000000000000000000000000000000000000000");
                      }}
                      className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold text-left space-y-0.5 cursor-pointer"
                    >
                      <span className="text-slate-800 block">Simulate 10 USDT</span>
                      <span className="text-[9px] text-indigo-500 block">Load Mock Hash 0x00</span>
                    </button>
                    <button
                      onClick={() => {
                        setTxnHash("0x1111111111111111111111111111111111111111111111111111111111111111");
                      }}
                      className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold text-left space-y-0.5 cursor-pointer"
                    >
                      <span className="text-slate-800 block">Simulate 25 USDT</span>
                      <span className="text-[9px] text-indigo-500 block">Load Mock Hash 0x11</span>
                    </button>
                  </div>
                  
                  <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center text-[10px] text-slate-400 font-medium">
                    <span>Or inject pure sandbox credit:</span>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleSimulatePayment(50)}
                        className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-md font-bold cursor-pointer"
                      >
                        + $50
                      </button>
                      <button 
                        onClick={() => handleSimulatePayment(100)}
                        className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-md font-bold cursor-pointer"
                      >
                        + $100
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: MANAGE SUBSCRIPTION (UPGRADE PLAN) */}
      <AnimatePresence>
        {isUpgradeOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-slate-100 overflow-hidden"
            >
              <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  <span>Subscription Upgrade Center</span>
                </h3>
                <button onClick={() => setIsUpgradeOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans.map((plan) => {
                    const isCurrent = user.plan_id === plan.id;
                    return (
                      <div key={plan.id} className={`p-4 rounded-xl border ${isCurrent ? "border-indigo-500 bg-indigo-50/20" : "border-slate-100 bg-white"} ${!plan.is_active ? "opacity-50" : ""} space-y-3`}>
                        <div>
                          <span className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase block">
                            {plan.id === "free" ? "Starter" : plan.id === "pro" ? "Developer" : "SaaS / Enterprise"}
                          </span>
                          <span className="font-bold text-slate-800 text-lg block mt-0.5">{plan.name}</span>
                        </div>
                        <div className="text-2xl font-black text-slate-800">
                          ${plan.price}<span className="text-xs font-normal text-slate-400">/mo</span>
                        </div>
                        <ul className="text-[11px] text-slate-500 space-y-2 border-t border-slate-100 pt-3">
                          {plan.features.map((feature, fIdx) => (
                            <li key={fIdx} className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                        {isCurrent ? (
                          <span className="w-full text-center block py-1.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg">
                            Active Plan
                          </span>
                        ) : (
                          <button
                            onClick={() => handleUpgradePlan(plan.id)}
                            disabled={!plan.is_active}
                            className={`w-full py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                              !plan.is_active
                                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                : plan.id === "free"
                                ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                                : "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent shadow-sm"
                            }`}
                          >
                            {!plan.is_active ? "Disabled" : plan.id === "free" ? "Downgrade to Free" : `Upgrade ($${plan.price} USDT)`}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded-lg text-center font-medium mt-2">
                  Plan payments are deducted instantly from your UptimePro platform balance.
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transaction billing history is rendered dynamically in the activeTab === "billing" state */}
    </div>
  );
}
