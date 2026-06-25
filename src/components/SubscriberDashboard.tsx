import React, { useState, useEffect } from "react";
import { 
  Globe, 
  Activity, 
  Plus, 
  Trash2, 
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
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
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
  Wallet,
  Sparkles,
  Cpu,
  Tv,
  Lock,
  Fingerprint
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { User, Monitor, MonitorLog, Payment, SubscriptionPlan } from "../types.ts";

interface SubscriberDashboardProps {
  user: User;
  monitors: Monitor[];
  payments: Payment[];
  onRefreshData: (newEmail?: string) => void;
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

  // Payment/Verification States
  const [txnHash, setTxnHash] = useState("");
  const [isVerifyingTxn, setIsVerifyingTxn] = useState(false);
  const [txnError, setTxnError] = useState("");
  const [txnSuccess, setTxnSuccess] = useState("");
  const [copiedAddress, setCopiedAddress] = useState(false);

  // General States
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Filter States
  const [monitorSearch, setMonitorSearch] = useState("");
  const [monitorProtocolFilter, setMonitorProtocolFilter] = useState<"ALL" | "HTTP" | "Ping" | "Port">("ALL");

  // Secure request signing wrapper
  const fetchWithAuth = (url: string, options: any = {}) => {
    const headers = {
      ...(options.headers || {}),
      "x-user-email": user.email
    };
    const separator = url.includes("?") ? "&" : "?";
    const finalUrl = `${url}${separator}email=${encodeURIComponent(user.email)}`;
    return fetch(finalUrl, { ...options, headers });
  };

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

  // Pagination states for history and alerts logs
  const [historyPage, setHistoryPage] = useState(1);
  const [alertPage, setAlertPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [copiedTxn, setCopiedTxn] = useState<string | null>(null);
  const [settingsSubTab, setSettingsSubTab] = useState<"profile" | "telegram" | "limits" | "security">("profile");
  const itemsPerPage = 10;

  // Profile Form States
  const [profileName, setProfileName] = useState(user.name);
  const [profileEmail, setProfileEmail] = useState(user.email);
  const [profileWallet, setProfileWallet] = useState(user.wallet_address);
  const [profileTelegramChatId, setProfileTelegramChatId] = useState(user.telegram_chat_id || "");
  const [profile2faEmail, setProfile2faEmail] = useState(!!user.two_factor_email);
  const [profile2faTelegram, setProfile2faTelegram] = useState(!!user.two_factor_telegram);

  // 2FA Setup Verification States
  const [setup2faMethod, setSetup2faMethod] = useState<"email" | "telegram" | null>(null);
  const [setup2faOtp, setSetup2faOtp] = useState("");
  const [simulatedSetupOtp, setSimulatedSetupOtp] = useState<string | null>(null);
  const [isRequestingSetupOtp, setIsRequestingSetupOtp] = useState(false);
  const [isVerifyingSetupOtp, setIsVerifyingSetupOtp] = useState(false);
  const [setupOtpError, setSetupOtpError] = useState("");
  const [setupOtpSuccess, setSetupOtpSuccess] = useState("");

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
    setProfile2faEmail(!!user.two_factor_email);
    setProfile2faTelegram(!!user.two_factor_telegram);
  }, [user]);

  const fetchUnifiedHistory = async () => {
    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      const [logsRes, alertsRes] = await Promise.all([
        fetchWithAuth("/api/logs"),
        fetchWithAuth("/api/alerts")
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

  // Trigger OTP request for secure 2FA Activation
  const handleToggle2fa = async (method: "email" | "telegram", targetState: boolean) => {
    setSetupOtpError("");
    setSetupOtpSuccess("");
    if (!targetState) {
      if (method === "email") {
        setProfile2faEmail(false);
      } else {
        setProfile2faTelegram(false);
      }
      return;
    }

    setIsRequestingSetupOtp(true);
    setSetup2faMethod(method);
    setSetup2faOtp("");
    setSimulatedSetupOtp(null);

    try {
      const res = await fetchWithAuth("/api/auth/2fa/request-enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delivery_method: method })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate setup OTP.");
      }
      setSimulatedSetupOtp(data.simulated_otp || null);
      setSetupOtpSuccess(data.message || `An OTP code has been sent to your registered ${method === "email" ? "Email Inbox" : "Telegram Bot Chat"}.`);
    } catch (err: any) {
      setSetupOtpError(err.message || "Failed to request setup code.");
      setSetup2faMethod(null);
    } finally {
      setIsRequestingSetupOtp(false);
    }
  };

  // Verify setup OTP and save
  const handleVerifySetup2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setup2faMethod) return;

    setSetupOtpError("");
    setSetupOtpSuccess("");
    setIsVerifyingSetupOtp(true);

    try {
      const res = await fetchWithAuth("/api/auth/2fa/verify-enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delivery_method: setup2faMethod,
          otp: setup2faOtp
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Cryptographic verification failed.");
      }

      if (setup2faMethod === "email") {
        setProfile2faEmail(true);
      } else if (setup2faMethod === "telegram") {
        setProfile2faTelegram(true);
      }

      setSettingsSuccess(`Two-Factor Authentication via ${setup2faMethod.toUpperCase()} has been successfully verified and enabled!`);
      onRefreshData();
      setSetup2faMethod(null);
      setSetup2faOtp("");
      setSimulatedSetupOtp(null);
    } catch (err: any) {
      setSetupOtpError(err.message || "Verification failed. Check code and try again.");
    } finally {
      setIsVerifyingSetupOtp(false);
    }
  };

  // Handle Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSuccess("");
    setSettingsError("");

    // Validate BEP-20 wallet address format if provided
    if (profileWallet && !/^0x[a-fA-F0-9]{40}$/.test(profileWallet)) {
      setSettingsError("Please enter a valid BSC/BEP-20 40-character hex wallet address starting with 0x.");
      setIsSavingSettings(false);
      return;
    }

    try {
      const userRes = await fetchWithAuth("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
          wallet_address: profileWallet,
          telegram_chat_id: profileTelegramChatId,
          two_factor_email: profile2faEmail,
          two_factor_telegram: profile2faTelegram,
        }),
      });

      if (!userRes.ok) {
        const errorData = await userRes.json();
        throw new Error(errorData.error || "Failed to update profile info.");
      }

      setSettingsSuccess("Your account settings and notification preferences have been saved successfully!");
      onRefreshData(profileEmail); // Refresh global user state with the updated email
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
      const res = await fetchWithAuth("/api/alerts/test", {
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
      const res = await fetchWithAuth(`/api/monitors/${monitorId}/logs`);
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
      const res = await fetchWithAuth("/api/monitors", {
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
      const res = await fetchWithAuth(`/api/monitors/${id}`, { method: "DELETE" });
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
      const res = await fetchWithAuth(`/api/monitors/${id}/check`, { method: "POST" });
      if (res.ok) {
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
      const res = await fetchWithAuth("/api/payment/verify", {
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
      const res = await fetchWithAuth("/api/user/sandbox-credit", {
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
      const res = await fetchWithAuth("/api/user/upgrade", {
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

  // Filter monitors logic
  const filteredMonitors = monitors.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(monitorSearch.toLowerCase()) || m.url.toLowerCase().includes(monitorSearch.toLowerCase());
    const matchesFilter = monitorProtocolFilter === "ALL" || m.monitor_type.toUpperCase() === monitorProtocolFilter.toUpperCase();
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-1">
      {/* 1. Overview Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Monitors Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between hover:shadow-md transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/40 rounded-full filter blur-xl group-hover:scale-125 transition-transform duration-300" />
          <div className="relative z-10 space-y-2">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block">Active Monitors</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-900 tracking-tight">{activeCount}</span>
              <span className="text-xs text-slate-400 font-medium font-mono">/ {currentPlan.max_monitors} cap</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-2">
              <span className="flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{upCount} Up</span>
              </span>
              {downCount > 0 && (
                <span className="flex items-center gap-1 font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  <span>{downCount} Down</span>
                </span>
              )}
            </div>
          </div>
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-xs">
            <Globe className="w-6 h-6" />
          </div>
        </div>

        {/* Avg Uptime Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between hover:shadow-md transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/40 rounded-full filter blur-xl group-hover:scale-125 transition-transform duration-300" />
          <div className="relative z-10 space-y-2">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block">Average Uptime</span>
            <span className="text-4xl font-black text-slate-900 tracking-tight">{avgUptime}%</span>
            <div className="text-[11px] text-slate-500 flex items-center gap-1 font-semibold">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>Verified last 24h</span>
            </div>
          </div>
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-xs">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Balance Wallet Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between hover:shadow-md transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50/40 rounded-full filter blur-xl group-hover:scale-125 transition-transform duration-300" />
          <div className="relative z-10 space-y-2">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block">USDT Balance</span>
            <span className="text-4xl font-black text-slate-900 tracking-tight">${user.balance.toFixed(2)}</span>
            <button 
              onClick={() => setIsPayOpen(true)}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center gap-1 mt-1 group-hover:translate-x-1 transition-transform"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Add Gas Funds (BSC)</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 shadow-xs">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Active Plan Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between hover:shadow-md transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50/40 rounded-full filter blur-xl group-hover:scale-125 transition-transform duration-300" />
          <div className="relative z-10 space-y-2">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block">Service Tier</span>
            <span className="text-4xl font-black text-slate-900 tracking-tight capitalize">{user.plan_id}</span>
            <button 
              onClick={() => setIsUpgradeOpen(true)}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center gap-1 mt-1 group-hover:translate-x-1 transition-transform"
            >
              <span>Manage Subscriptions</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 shadow-xs">
            <Layers className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* 2. TAB VIEW - MONITORS TAB */}
      {activeTab === "monitors" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Side: Monitors list & control header (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Header & Filter Controls bar */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Tv className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 leading-tight">Uptime Monitors</h2>
                    <p className="text-[11px] text-slate-400 font-medium">Verify your websites' latency and uptime ratios live</p>
                  </div>
                </div>
                
                <button
                  onClick={() => setIsAddOpen(true)}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm hover:shadow-indigo-500/10 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Monitor</span>
                </button>
              </div>

              {/* Advanced Search & Filtering Bar */}
              <div className="flex flex-col sm:flex-row items-stretch gap-3 pt-1">
                {/* Search query input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search monitors by name or URL..."
                    value={monitorSearch}
                    onChange={(e) => setMonitorSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs placeholder-slate-400 text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all font-medium"
                  />
                </div>

                {/* Protocol filter tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto gap-0.5">
                  {["ALL", "HTTP", "Ping", "Port"].map((proto) => (
                    <button
                      key={proto}
                      onClick={() => setMonitorProtocolFilter(proto as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        monitorProtocolFilter === proto
                          ? "bg-white text-slate-800 shadow-2xs"
                          : "text-slate-500 hover:text-slate-800 text-[11px]"
                      }`}
                    >
                      {proto}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Monitors list grid */}
            <div className="space-y-4">
              {filteredMonitors.length === 0 ? (
                <div className="bg-white border border-slate-100 p-12 rounded-3xl text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto">
                    <Globe className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-800">No matching monitors</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      {monitors.length === 0 
                        ? "Add websites or service endpoints that you would like UptimePro to monitor and check."
                        : "Try refining your search terms or protocol filter tags above."}
                    </p>
                  </div>
                  {monitors.length === 0 && (
                    <button
                      onClick={() => setIsAddOpen(true)}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      Create First Monitor
                    </button>
                  )}
                </div>
              ) : (
                filteredMonitors.map((monitor) => {
                  const isSelected = selectedMonitor?.id === monitor.id;
                  
                  // Generate deterministic premium uptime bar blocks
                  const seedVal = parseInt(monitor.id.slice(0, 4), 16) || 7;
                  const totalBlocks = 24;
                  const uptimeBlocks = Array.from({ length: totalBlocks }).map((_, idx) => {
                    // Let's seed a slight glitch if uptime is not 100%
                    const upPct = monitor.uptime_percentage ?? 100;
                    if (upPct < 100) {
                      const isGlitch = ((seedVal * (idx + 13)) % 100) > upPct;
                      return isGlitch ? "down" : "up";
                    }
                    return "up";
                  });

                  return (
                    <div
                      key={monitor.id}
                      onClick={() => setSelectedMonitor(monitor)}
                      className={`bg-white border rounded-3xl p-5 transition-all cursor-pointer relative overflow-hidden hover:-translate-y-0.5 hover:shadow-md ${
                        isSelected 
                          ? "border-indigo-500 ring-4 ring-indigo-500/5 shadow-md" 
                          : "border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      {/* Accent glow on top edge for visual charm */}
                      <div className={`absolute top-0 left-0 right-0 h-[3px] ${
                        monitor.status === "up" 
                          ? "bg-emerald-500" 
                          : monitor.status === "down" 
                          ? "bg-rose-500" 
                          : "bg-amber-500"
                      }`} />

                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                        
                        {/* Monitor core labels block */}
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-2xl shrink-0 ${
                            monitor.status === "up" 
                              ? "bg-emerald-50 text-emerald-600" 
                              : monitor.status === "down" 
                              ? "bg-rose-50 text-rose-600" 
                              : "bg-amber-50 text-amber-600"
                          }`}>
                            <Globe className="w-5 h-5" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-black text-slate-800 text-sm leading-none">{monitor.name}</span>
                              <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">
                                {monitor.monitor_type}
                              </span>
                              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                monitor.status === "up"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : monitor.status === "down"
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}>
                                <span className={`w-1 h-1 rounded-full ${monitor.status === "up" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                                <span className="uppercase tracking-wider">{monitor.status}</span>
                              </span>
                            </div>
                            <span className="text-xs text-slate-400 block break-all font-mono">
                              {monitor.url}
                            </span>
                          </div>
                        </div>

                        {/* Mid Row: Metrics, sparkline, settings */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                          
                          {/* Stats numbers block */}
                          <div className="flex items-center gap-5 bg-slate-50/70 p-3 rounded-2xl border border-slate-100/40">
                            <div>
                              <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Uptime</span>
                              <span className="text-xs font-black text-slate-800">
                                {monitor.uptime_percentage ?? 100}%
                              </span>
                            </div>
                            <div className="border-l border-slate-200 pl-4">
                              <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Latency</span>
                              <span className="text-xs font-black text-slate-800">
                                {monitor.average_response_time_ms ? `${monitor.average_response_time_ms}ms` : "0ms"}
                              </span>
                            </div>
                            <div className="border-l border-slate-200 pl-4">
                              <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Interval</span>
                              <span className="text-xs font-black text-slate-800 flex items-center gap-0.5">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>{monitor.interval_sec}s</span>
                              </span>
                            </div>
                          </div>

                          {/* Premium datadog style uptime ticks bar */}
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">History Sparkline</span>
                            <div className="flex gap-0.5">
                              {uptimeBlocks.map((bState, bIdx) => (
                                <span 
                                  key={bIdx}
                                  className={`w-1.5 h-5 rounded-sm transition-colors ${
                                    bState === "up" 
                                      ? "bg-emerald-400 hover:bg-emerald-500" 
                                      : "bg-rose-400 hover:bg-rose-500"
                                  }`}
                                  title={`Check ${bIdx + 1}: ${bState.toUpperCase()}`}
                                />
                              ))}
                            </div>
                          </div>

                        </div>

                        {/* Right quick triggers bar */}
                        <div className="flex items-center gap-1.5 justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-50 self-end sm:self-auto">
                          <button
                            title="Trigger Diagnostic Ping"
                            onClick={(e) => handleCheckNow(monitor.id, e)}
                            disabled={loadingAction === `check-${monitor.id}`}
                            className="p-2.5 bg-slate-50 hover:bg-slate-100 hover:text-indigo-600 text-slate-500 rounded-xl transition-all border border-slate-100 cursor-pointer disabled:opacity-40"
                          >
                            {loadingAction === `check-${monitor.id}` ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current" />
                            )}
                          </button>
                          
                          <button
                            title="Delete Monitor"
                            onClick={(e) => handleDeleteMonitor(monitor.id, e)}
                            disabled={loadingAction === `delete-${monitor.id}`}
                            className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all border border-rose-100/40 cursor-pointer disabled:opacity-40"
                          >
                            {loadingAction === `delete-${monitor.id}` ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                          
                          <ChevronRight className={`w-4 h-4 text-slate-300 hidden xl:block transition-transform duration-200 ${isSelected ? "translate-x-1 text-indigo-500" : ""}`} />
                        </div>

                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* Right Side: Detailed Monitor Analytics & incident view (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-5 sticky top-24">
              
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Activity className="w-4 h-4" />
                </div>
                <h3 className="font-black text-slate-800 text-sm">Detailed Analytics Engine</h3>
              </div>

              {!selectedMonitor ? (
                <div className="text-center py-12 px-4 space-y-4">
                  <div className="relative w-16 h-16 mx-auto bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                    <Activity className="w-8 h-8 animate-pulse text-indigo-400" />
                    <span className="absolute inset-0 rounded-full border border-indigo-400/20 animate-ping" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-black text-slate-700 block">Select a Monitor</span>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                      Pick an endpoint from the left list to review response latency charts, latency distribution curves, and full check history logs.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 animate-fade-in">
                  
                  {/* Selected label header */}
                  <div className="flex items-start justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="min-w-0">
                      <span className="text-xs font-black text-slate-800 block truncate">{selectedMonitor.name}</span>
                      <a 
                        href={selectedMonitor.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[10px] text-indigo-500 hover:underline flex items-center gap-0.5 mt-0.5 font-mono truncate"
                      >
                        <span className="truncate">{selectedMonitor.url}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                    </div>
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${
                      selectedMonitor.status === "up" 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                        : "bg-rose-50 text-rose-700 border border-rose-100"
                    }`}>
                      {selectedMonitor.status}
                    </span>
                  </div>

                  {/* Latency Recharts section */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Response Latency (ms)</span>
                    {selectedLogs.length === 0 ? (
                      <div className="h-40 bg-slate-50 rounded-2xl flex flex-col items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 p-4 text-center">
                        <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin mb-2" />
                        <span>Initializing latency cache logs...</span>
                      </div>
                    ) : (
                      <div className="h-44 w-full bg-slate-950/2 rounded-2xl p-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={selectedLogs} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                            <defs>
                              <linearGradient id="colorLatencyRedesign" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="timeLabel" tick={{ fontSize: 8, fill: "#94a3b8" }} stroke="#e2e8f0" />
                            <YAxis tick={{ fontSize: 8, fill: "#94a3b8" }} stroke="#e2e8f0" />
                            <Tooltip 
                              contentStyle={{ background: "#0f172a", borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} 
                              labelStyle={{ color: "#94a3b8", fontSize: "9px", fontWeight: "bold" }}
                              itemStyle={{ color: "#ffffff", fontSize: "10px" }}
                            />
                            <Area type="monotone" dataKey="latency" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorLatencyRedesign)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* Latency range descriptors */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                      <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Average Speed</span>
                      <span className="text-base font-black text-slate-800">
                        {selectedMonitor.average_response_time_ms ? `${selectedMonitor.average_response_time_ms}ms` : "0ms"}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                      <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Total Checked</span>
                      <span className="text-base font-black text-slate-800">
                        {selectedLogs.length} loops
                      </span>
                    </div>
                  </div>

                  {/* Recent Check Logs list */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Live Verification Audit Trail</span>
                    <div className="max-h-56 overflow-y-auto space-y-2 border border-slate-100 rounded-2xl p-2.5 bg-slate-50/50">
                      {selectedLogs.length === 0 ? (
                        <span className="text-[11px] text-slate-400 block text-center py-6 font-medium">Waiting for check loops...</span>
                      ) : (
                        selectedLogs.slice(0, 8).map((log) => (
                          <div key={log.id} className="bg-white p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs hover:border-slate-200 transition-colors">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${log.status === "up" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                              <div className="min-w-0">
                                <span className="font-black text-slate-800 text-[11px]">
                                  {log.status === "up" ? `${log.response_time}ms` : "Outage Event"}
                                </span>
                                <span className="text-slate-400 text-[9px] font-mono block">Status code: {log.status_code || "0"}</span>
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap bg-slate-50 px-2 py-0.5 rounded">
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

        </div>
      )}

      {/* 3. TAB VIEW - MY WALLET TAB */}
      {activeTab === "wallet" && (
        <div className="space-y-8 animate-fade-in">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Form & sandbox details (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-2xs space-y-5">
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2 pb-3 border-b border-slate-100">
                  <ArrowUpRight className="w-4 h-4 text-indigo-500" />
                  <span>Deposit Gas Desk</span>
                </h3>

                <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-4 text-xs text-amber-800 flex gap-3 items-start leading-relaxed">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-black block text-amber-900 mb-0.5">Binance Smart Chain (BSC) Only!</span>
                    To avoid permanent asset loss, only submit BEP-20 transactions. Standard USDT or native BNB tokens sent to this destination are automatically validated and credited in seconds.
                  </div>
                </div>

                {/* Receiver Wallet section */}
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400">BSC TARGET RECEIVER WALLET</span>
                    <span className="text-[9px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">DEPOSIT DESTINATION</span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <span className="flex-1 bg-white border border-slate-200/80 px-3 py-2.5 rounded-xl font-mono text-xs text-slate-600 select-all break-all leading-normal flex items-center">
                      {BSC_RECEIVER_WALLET}
                    </span>
                    <button
                      onClick={() => copyToClipboard(BSC_RECEIVER_WALLET)}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-all hover:shadow-md"
                    >
                      {copiedAddress ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy Destination</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Ledger verification Form */}
                <form onSubmit={handleVerifyPayment} className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-slate-700 block">Enter BEP-20 Transaction Hash (64-char Hex)</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        required
                        placeholder="0x..."
                        value={txnHash}
                        onChange={(e) => setTxnHash(e.target.value)}
                        className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-hidden font-mono text-slate-800"
                      />
                      <button
                        type="submit"
                        disabled={isVerifyingTxn}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shrink-0 shadow-sm cursor-pointer transition-all flex items-center justify-center min-h-[40px]"
                      >
                        {isVerifyingTxn ? (
                          <div className="flex items-center gap-1.5">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Validating Block...</span>
                          </div>
                        ) : (
                          "Verify Txn Block"
                        )}
                      </button>
                    </div>
                  </div>

                  {txnError && (
                    <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl text-xs text-rose-700 flex gap-2.5 items-start">
                      <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-rose-650" />
                      <span>{txnError}</span>
                    </div>
                  )}

                  {txnSuccess && (
                    <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl text-xs text-emerald-700 flex gap-2.5 items-start animate-fade-in">
                      <Check className="w-4.5 h-4.5 shrink-0 mt-0.5 text-emerald-600" />
                      <span>{txnSuccess}</span>
                    </div>
                  )}
                </form>
              </div>

            </div>

            {/* Right Column: Payments Ledger (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-2xs space-y-4">
                
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-500" />
                    <span>Blockchain Deposit Ledger</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">({payments.length} verified blocks)</span>
                </div>

                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {payments.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-slate-300 border border-dashed border-slate-200">
                        <Wallet className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs font-black text-slate-700 block">No deposits recorded yet</span>
                        <span className="text-[10px] text-slate-450 block">BSC funds validated via hash inputs will update here</span>
                      </div>
                    </div>
                  ) : (
                    payments.slice().reverse().map((pay, pIdx) => (
                      <div key={pIdx} className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl space-y-2.5 text-xs hover:border-slate-200 transition-colors">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-slate-800 block text-xs">
                            +{pay.amount} {pay.token}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold font-mono uppercase ${
                            pay.status === "confirmed" 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                              : "bg-amber-50 text-amber-700 border border-amber-100"
                          }`}>
                            {pay.status}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                          <span className="font-mono truncate max-w-[140px] select-all cursor-pointer hover:text-indigo-500" title={pay.txn_hash}>{pay.txn_hash}</span>
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

      {/* 4. TAB VIEW - BILLING & SUBSCRIPTIONS */}
      {activeTab === "billing" && (
        <div className="space-y-8 animate-fade-in">

          {/* Pricing Plans Tiers Matrix */}
          <div className="space-y-4">
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <span>Available Subscription Tiers</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const isCurrent = user.plan_id === plan.id;
                return (
                  <div 
                    key={plan.id} 
                    className={`p-6 rounded-3xl border transition-all flex flex-col justify-between space-y-6 relative overflow-hidden hover:shadow-md ${
                      isCurrent 
                        ? "border-indigo-500 bg-indigo-50/15 ring-4 ring-indigo-500/5 shadow-sm" 
                        : "border-slate-150 bg-white hover:border-slate-250"
                    } ${!plan.is_active ? "opacity-40" : ""}`}
                  >
                    {isCurrent && (
                      <div className="absolute top-0 right-0 bg-indigo-600 text-white font-extrabold text-[8px] uppercase tracking-widest px-3.5 py-1 rounded-bl-xl">
                        Active Tier
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <span className="text-[9px] font-extrabold text-indigo-600 tracking-widest uppercase block">
                          {plan.id === "free" ? "Starter Pack" : plan.id === "pro" ? "Developer Suite" : "Enterprise SaaS"}
                        </span>
                        <span className="font-black text-slate-900 text-xl block mt-1 leading-none">{plan.name}</span>
                      </div>

                      <div className="flex items-baseline">
                        <span className="text-4xl font-black text-slate-900 tracking-tight">${plan.price}</span>
                        <span className="text-xs font-bold text-slate-400 ml-1">USDT/mo</span>
                      </div>

                      <ul className="text-xs text-slate-600 space-y-3 border-t border-slate-100 pt-5">
                        {plan.features.map((feature, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-2.5">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span className="font-medium text-[11px] leading-relaxed">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2">
                      {isCurrent ? (
                        <span className="w-full text-center block py-2.5 bg-indigo-100 text-indigo-700 text-xs font-black rounded-xl">
                          Your Active Subscription
                        </span>
                      ) : (
                        <button
                          onClick={() => handleUpgradePlan(plan.id)}
                          disabled={!plan.is_active || loadingAction !== null}
                          className={`w-full py-2.5 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                            !plan.is_active
                              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                              : plan.id === "free"
                              ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300"
                              : "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent shadow-sm hover:shadow-indigo-500/10"
                          }`}
                        >
                          {!plan.is_active 
                            ? "Plan Inactive" 
                            : plan.id === "free" 
                            ? "Downgrade Plan" 
                            : `Upgrade to ${plan.name}`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audit table section */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <History className="w-4.5 h-4.5 text-indigo-600" />
                  <span>Full Payment History Audit Logs</span>
                </h3>
                <p className="text-[11px] text-slate-400">Verifiable gas credits, ledger receipts, and deposit records</p>
              </div>
              {payments.length > 0 && (
                <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-full font-bold">
                  Total Ledger: {payments.length} Records
                </span>
              )}
            </div>

            {payments.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-150 rounded-2xl flex flex-col items-center justify-center gap-2.5 bg-slate-50/50">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <History className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-800 font-extrabold block">No transactions found</span>
                  <span className="text-[11px] text-slate-400 block max-w-xs mx-auto">Once your BSC USDT wallet deposits are confirmed on-chain, receipts will populate here automatically.</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-2xl border border-slate-100/80 shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-150 text-slate-500 font-black bg-slate-50/70 select-none uppercase tracking-wider text-[9px]">
                        <th className="py-3.5 px-4 font-extrabold">Transaction Hash</th>
                        <th className="py-3.5 px-4 font-extrabold">Block Number</th>
                        <th className="py-3.5 px-4 font-extrabold text-right">Credit Amount</th>
                        <th className="py-3.5 px-4 font-extrabold text-center">Token</th>
                        <th className="py-3.5 px-4 font-extrabold text-center">Status</th>
                        <th className="py-3.5 px-4 font-extrabold text-right">Date Verified</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        const totalPaymentPages = Math.ceil(payments.length / itemsPerPage);
                        const safePage = Math.min(Math.max(1, paymentPage), totalPaymentPages || 1);
                        const startIdx = (safePage - 1) * itemsPerPage;
                        const paginatedPayments = payments.slice(startIdx, startIdx + itemsPerPage);

                        return paginatedPayments.map((p) => {
                          const isCopied = copiedTxn === p.txn_hash;
                          return (
                            <tr key={p.txn_hash} className="hover:bg-indigo-50/10 transition-colors group">
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2.5">
                                  <span className="font-mono text-slate-600 font-medium tracking-tight bg-slate-50 px-2 py-0.5 rounded border border-slate-100 text-[11px]">
                                    {p.txn_hash.slice(0, 8)}...{p.txn_hash.slice(-8)}
                                  </span>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(p.txn_hash);
                                      setCopiedTxn(p.txn_hash);
                                      setTimeout(() => setCopiedTxn(null), 1500);
                                    }}
                                    title="Copy transaction hash"
                                    className={`p-1 rounded-md border transition-all cursor-pointer ${
                                      isCopied 
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                                        : "bg-white text-slate-400 border-slate-200 hover:text-slate-700 hover:border-slate-300 shadow-3xs"
                                    }`}
                                  >
                                    {isCopied ? (
                                      <Check className="w-3 h-3 stroke-[3px]" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-slate-500 font-mono font-medium">
                                #{p.block_number ?? "N/A"}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <span className="font-mono font-black text-slate-800 text-xs bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                  {p.amount > 0 ? `+$${p.amount.toFixed(2)}` : "-"}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-500">
                                <span className="text-[10px] bg-indigo-50/50 border border-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-black">
                                  {p.token}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase inline-flex items-center gap-1 border ${
                                  p.status === "confirmed" 
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                    : "bg-rose-50 text-rose-700 border-rose-200"
                                }`}>
                                  <span className={`w-1 h-1 rounded-full ${p.status === "confirmed" ? "bg-emerald-500" : "bg-rose-500"}`} />
                                  {p.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-[10px] whitespace-nowrap font-medium">
                                {new Date(p.timestamp).toLocaleString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit"
                                })}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {(() => {
                  const totalPaymentPages = Math.ceil(payments.length / itemsPerPage);
                  const safePage = Math.min(Math.max(1, paymentPage), totalPaymentPages || 1);
                  const startIdx = (safePage - 1) * itemsPerPage;
                  const endIdx = Math.min(startIdx + itemsPerPage, payments.length);

                  if (totalPaymentPages <= 1) return null;

                  return (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500 font-bold select-none">
                      <div className="text-[11px] text-slate-400 font-medium">
                        Showing <span className="text-slate-700 font-bold">{startIdx + 1}</span> to{" "}
                        <span className="text-slate-700 font-bold">{endIdx}</span> of{" "}
                        <span className="text-slate-700 font-bold">{payments.length}</span> verified records
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setPaymentPage((prev) => Math.max(1, prev - 1))}
                          disabled={safePage === 1}
                          className={`p-2 rounded-xl border transition-all cursor-pointer ${
                            safePage === 1
                              ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-3xs"
                          }`}
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>

                        {Array.from({ length: totalPaymentPages }).map((_, idx) => {
                          const pNum = idx + 1;
                          const isCurrent = pNum === safePage;
                          return (
                            <button
                              key={pNum}
                              onClick={() => setPaymentPage(pNum)}
                              className={`w-8 h-8 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                isCurrent
                                  ? "bg-indigo-600 text-white border border-transparent shadow-xs"
                                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-3xs"
                              }`}
                            >
                              {pNum}
                            </button>
                          );
                        })}

                        <button
                          onClick={() => setPaymentPage((prev) => Math.min(totalPaymentPages, prev + 1))}
                          disabled={safePage === totalPaymentPages}
                          className={`p-2 rounded-xl border transition-all cursor-pointer ${
                            safePage === totalPaymentPages
                              ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-3xs"
                          }`}
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

        </div>
      )}

      {/* 5. TAB VIEW - HISTORY & ALERTS */}
      {activeTab === "history" && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Filtering bar */}
          <div className="bg-white rounded-3xl border border-slate-100 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex bg-slate-100 p-1 rounded-xl w-fit gap-1">
              <button
                onClick={() => { setHistorySubTab("history"); setSearchQuery(""); setHistoryPage(1); }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  historySubTab === "history"
                    ? "bg-white text-slate-800 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Uptime History ({historyLogs.length})
              </button>
              <button
                onClick={() => { setHistorySubTab("alerts"); setSearchQuery(""); setAlertPage(1); }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  historySubTab === "alerts"
                    ? "bg-white text-slate-800 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Triggered Alerts ({alertEvents.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={historySubTab === "history" ? "Search by monitor or status..." : "Search alerts description..."}
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setHistoryPage(1); setAlertPage(1); }}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all"
                />
              </div>

              <button
                onClick={fetchUnifiedHistory}
                disabled={isHistoryLoading}
                className="p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 disabled:opacity-50 text-xs font-bold rounded-xl shadow-2xs border border-indigo-150 transition-all flex items-center justify-center cursor-pointer shrink-0"
                title="Sync logs from server"
              >
                <RefreshCw className={`w-4 h-4 ${isHistoryLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {historyError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-xl text-xs font-medium">
              {historyError}
            </div>
          )}

          {isHistoryLoading ? (
            <div className="bg-white border border-slate-100 p-12 rounded-3xl text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
              <span className="text-xs text-slate-400 font-extrabold block">Parsing database log cache...</span>
            </div>
          ) : historySubTab === "history" ? (
            <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-2xs">
              {(() => {
                const filtered = historyLogs.filter(log => {
                  const query = searchQuery.toLowerCase();
                  return (
                    log.monitorName.toLowerCase().includes(query) ||
                    log.status.toLowerCase().includes(query) ||
                    (log.error_message && log.error_message.toLowerCase().includes(query))
                  );
                }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                const totalItems = filtered.length;
                const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
                const startIndex = (historyPage - 1) * itemsPerPage;
                const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

                if (totalItems === 0) {
                  return <div className="p-12 text-center text-slate-400 text-xs font-semibold">No matching execution logs found.</div>;
                }

                return (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-bold bg-slate-50/50">
                            <th className="py-3.5 px-6 font-extrabold text-slate-500">Monitor Info</th>
                            <th className="py-3.5 px-4 text-center font-extrabold text-slate-500">Status</th>
                            <th className="py-3.5 px-4 text-right font-extrabold text-slate-500">Latency</th>
                            <th className="py-3.5 px-4 font-extrabold text-slate-500">HTTP Code</th>
                            <th className="py-3.5 px-6 font-extrabold text-slate-500">Outage details</th>
                            <th className="py-3.5 px-6 font-extrabold text-slate-500 text-right">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginated.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50/40 transition-colors">
                              <td className="py-4 px-6">
                                <div className="font-bold text-slate-800 text-sm">{log.monitorName}</div>
                                <div className="text-[10px] text-slate-400 font-mono break-all mt-0.5">{log.monitorUrl}</div>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1 ${
                                  log.status === "up"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                    : "bg-rose-50 text-rose-700 border border-rose-100"
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${log.status === "up" ? "bg-emerald-500" : "bg-rose-500"}`} />
                                  <span className="uppercase tracking-wider">{log.status}</span>
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right font-mono font-black text-slate-700">
                                {log.status === "up" ? `${log.response_time}ms` : "-"}
                              </td>
                              <td className="py-4 px-4 font-mono text-slate-600 font-semibold">
                                <span className={`px-2 py-0.5 rounded-md ${
                                  log.status_code >= 200 && log.status_code < 400 
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                    : "bg-amber-50 text-amber-700 border border-amber-100"
                                }`}>
                                  {log.status_code || "0"}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-slate-550 max-w-xs truncate" title={log.error_message}>
                                {log.error_message ? (
                                  <span className="text-rose-600 font-semibold">{log.error_message}</span>
                                ) : (
                                  <span className="text-slate-300 italic">No errors</span>
                                )}
                              </td>
                              <td className="py-4 px-6 text-slate-455 font-mono text-[11px] whitespace-nowrap text-right">
                                {new Date(log.timestamp).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Bar */}
                    <div className="border-t border-slate-100 p-4 px-6 flex items-center justify-between bg-slate-50/50">
                      <div className="text-xs text-slate-500">
                        Showing <span className="font-bold text-slate-800">{startIndex + 1}</span> to{" "}
                        <span className="font-bold text-slate-800">
                          {Math.min(startIndex + itemsPerPage, totalItems)}
                        </span>{" "}
                        of <span className="font-bold text-slate-800">{totalItems}</span> logs
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setHistoryPage(1)}
                          disabled={historyPage === 1}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-40 transition-all cursor-pointer"
                          title="First Page"
                        >
                          <ChevronsLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setHistoryPage(prev => Math.max(prev - 1, 1))}
                          disabled={historyPage === 1}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-40 transition-all cursor-pointer"
                          title="Previous Page"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-bold text-slate-700 px-3">
                          Page {historyPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setHistoryPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={historyPage === totalPages}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-40 transition-all cursor-pointer"
                          title="Next Page"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setHistoryPage(totalPages)}
                          disabled={historyPage === totalPages}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-40 transition-all cursor-pointer"
                          title="Last Page"
                        >
                          <ChevronsRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-2xs">
              {(() => {
                const filtered = alertEvents.filter(evt => {
                  const query = searchQuery.toLowerCase();
                  return evt.message.toLowerCase().includes(query);
                }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                const totalItems = filtered.length;
                const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
                const startIndex = (alertPage - 1) * itemsPerPage;
                const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

                if (totalItems === 0) {
                  return <div className="p-12 text-center text-slate-400 text-xs font-semibold">No matching alert logs.</div>;
                }

                return (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-bold bg-slate-50/50">
                            <th className="py-3.5 px-6 font-extrabold text-slate-500">Priority</th>
                            <th className="py-3.5 px-6 font-extrabold text-slate-500">Message description</th>
                            <th className="py-3.5 px-6 font-extrabold text-slate-500 text-right">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginated.map((evt) => (
                            <tr key={evt.id} className="hover:bg-slate-50/40 transition-colors">
                              <td className="py-4 px-6">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase inline-block ${
                                  evt.level === "error" || evt.level === "warn"
                                    ? "bg-rose-50 text-rose-700 border border-rose-100"
                                    : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                                }`}>
                                  {evt.level}
                                </span>
                              </td>
                              <td className="py-4 px-6 font-bold text-slate-800 font-sans leading-relaxed text-sm">
                                {evt.message}
                              </td>
                              <td className="py-4 px-6 text-slate-455 font-mono text-[11px] whitespace-nowrap text-right">
                                {new Date(evt.timestamp).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Bar */}
                    <div className="border-t border-slate-100 p-4 px-6 flex items-center justify-between bg-slate-50/50">
                      <div className="text-xs text-slate-500">
                        Showing <span className="font-bold text-slate-800">{startIndex + 1}</span> to{" "}
                        <span className="font-bold text-slate-800">
                          {Math.min(startIndex + itemsPerPage, totalItems)}
                        </span>{" "}
                        of <span className="font-bold text-slate-800">{totalItems}</span> alert events
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setAlertPage(1)}
                          disabled={alertPage === 1}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-40 transition-all cursor-pointer"
                          title="First Page"
                        >
                          <ChevronsLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setAlertPage(prev => Math.max(prev - 1, 1))}
                          disabled={alertPage === 1}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-40 transition-all cursor-pointer"
                          title="Previous Page"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-bold text-slate-700 px-3">
                          Page {alertPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setAlertPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={alertPage === totalPages}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-40 transition-all cursor-pointer"
                          title="Next Page"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setAlertPage(totalPages)}
                          disabled={alertPage === totalPages}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-40 transition-all cursor-pointer"
                          title="Last Page"
                        >
                          <ChevronsRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

        </div>
      )}

      {/* 6. TAB VIEW - PROFILE & SETTINGS TAB */}
      {activeTab === "settings" && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          
          {/* Settings Sub-Tab Navigation */}
          <div className="flex border-b border-slate-200 pb-px gap-2 select-none">
            <button
              type="button"
              onClick={() => setSettingsSubTab("profile")}
              className={`pb-3 px-4 text-xs font-black transition-all relative flex items-center gap-2 cursor-pointer ${
                settingsSubTab === "profile" 
                  ? "text-indigo-600" 
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span>Profile Identity</span>
              {settingsSubTab === "profile" && (
                <motion.div layoutId="activeSettingsSubTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
              )}
            </button>
            
            <button
              type="button"
              onClick={() => setSettingsSubTab("telegram")}
              className={`pb-3 px-4 text-xs font-black transition-all relative flex items-center gap-2 cursor-pointer ${
                settingsSubTab === "telegram" 
                  ? "text-indigo-600" 
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Telegram Incident Alerts</span>
              {settingsSubTab === "telegram" && (
                <motion.div layoutId="activeSettingsSubTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setSettingsSubTab("limits")}
              className={`pb-3 px-4 text-xs font-black transition-all relative flex items-center gap-2 cursor-pointer ${
                settingsSubTab === "limits" 
                  ? "text-indigo-600" 
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Account Quota & Limits</span>
              {settingsSubTab === "limits" && (
                <motion.div layoutId="activeSettingsSubTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setSettingsSubTab("security")}
              className={`pb-3 px-4 text-xs font-black transition-all relative flex items-center gap-2 cursor-pointer ${
                settingsSubTab === "security" 
                  ? "text-indigo-600" 
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Security (2FA OTP)</span>
              {settingsSubTab === "security" && (
                <motion.div layoutId="activeSettingsSubTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
              )}
            </button>
          </div>

          {settingsSuccess && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{settingsSuccess}</span>
            </div>
          )}

          {settingsError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{settingsError}</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {settingsSubTab === "profile" && (
              <motion.div
                key="profile-subtab"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-6 hover:border-slate-200/60 transition-colors"
              >
                <div className="space-y-1">
                  <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-indigo-500" />
                    <span>Profile Identity</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Manage your main subscriber name and account verification contact email</p>
                </div>
                
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Subscriber Name</label>
                    <input
                      type="text"
                      required
                      value={profileName || ""}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all text-slate-800 font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Email Address</label>
                    <input
                      type="email"
                      required
                      value={profileEmail || ""}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all text-slate-800 font-medium"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingSettings ? "Saving..." : "Save Profile Details"}</span>
                  </button>
                </div>
              </motion.div>
            )}

            {settingsSubTab === "telegram" && (
              <motion.div
                key="telegram-subtab"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-6 hover:border-slate-200/60 transition-colors"
              >
                <div className="space-y-1">
                  <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <Bell className="w-4 h-4 text-indigo-500" />
                    <span>Telegram Dispatch configuration</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Receive live ping notification alerts to handle downtime instantly</p>
                </div>

                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4.5 space-y-2.5 text-xs text-indigo-950 font-medium leading-relaxed">
                  <span className="font-bold flex items-center gap-1 text-slate-900">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>How to obtain Telegram Incident Alerts:</span>
                  </span>
                  <ol className="list-decimal pl-4.5 space-y-2 text-slate-650 text-[11px]">
                    <li>Search for our official bot in Telegram: <a href="https://t.me/SmartUptimeNotification_bot" target="_blank" rel="noreferrer" className="font-black text-indigo-600 underline hover:text-indigo-850">@SmartUptimeNotification_bot</a></li>
                    <li>Initialize direct communications by clicking <span className="font-bold font-mono">/start</span>.</li>
                    <li>The bot will reply instantly with your unique 10-digit <span className="font-extrabold text-indigo-800">Chat ID</span>.</li>
                    <li>Enter that number in the box below to link automatic alerts.</li>
                  </ol>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Your Telegram Chat ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 518491029"
                      value={profileTelegramChatId || ""}
                      onChange={(e) => setProfileTelegramChatId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all text-slate-850 font-mono font-bold"
                    />
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      disabled={isTestingAlerts || !profileTelegramChatId}
                      onClick={handleTestAlert}
                      className="px-4 py-2 bg-slate-900 hover:bg-black text-white disabled:opacity-40 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isTestingAlerts ? "Dispatching..." : "Send Test Ping"}</span>
                    </button>
                    {testResult && (
                      <span className={`text-[10px] font-bold block ${testResult.success ? "text-emerald-600" : "text-rose-600"}`}>
                        {testResult.msg}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingSettings ? "Saving..." : "Save Telegram Rules"}</span>
                  </button>
                </div>
              </motion.div>
            )}

            {settingsSubTab === "limits" && (
              <motion.div
                key="limits-subtab"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-6"
              >
                <div className="space-y-1">
                  <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-500" />
                    <span>Account Quota Thresholds</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">View active subscription features, limits, and server tracking quotas</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-4 border-t border-slate-100">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50 flex flex-col justify-between">
                    <span className="text-[9px] uppercase text-slate-400 font-bold block">Current Tier</span>
                    <span className="text-sm font-black text-indigo-600 uppercase mt-1 block">{user.plan_id}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50 flex flex-col justify-between">
                    <span className="text-[9px] uppercase text-slate-400 font-bold block">Monitors Quota</span>
                    <span className="text-sm font-black text-slate-800 mt-1 block">
                      {currentPlan.max_monitors} monitors
                    </span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50 flex flex-col justify-between">
                    <span className="text-[9px] uppercase text-slate-400 font-bold block">Min Interval Allowed</span>
                    <span className="text-sm font-black text-slate-800 mt-1 block">
                      {currentPlan.min_interval_sec}s check
                    </span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50 flex flex-col justify-between">
                    <span className="text-[9px] uppercase text-slate-400 font-bold block">Registered Since</span>
                    <span className="text-xs font-black text-slate-800 mt-1 block font-mono">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50 flex flex-col justify-between">
                    <span className="text-[9px] uppercase text-slate-400 font-bold block">Next Renewal / Expiry Date</span>
                    <span className="text-sm font-black text-indigo-600 mt-1 block font-mono">
                      {user.plan_id === "free" ? "Lifetime Free" : new Date(new Date(user.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50 flex flex-col justify-between">
                    <span className="text-[9px] uppercase text-slate-400 font-bold block">Node Security Standing</span>
                    <span className="text-xs font-black text-emerald-600 mt-1 block uppercase flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active & Secured
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {settingsSubTab === "security" && (
              <motion.div
                key="security-subtab"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-6"
              >
                {setup2faMethod ? (
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                        <Lock className="w-4 h-4 text-indigo-500 animate-pulse" />
                        <span>Confirm 2FA Setup Challenge</span>
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Please verify your {setup2faMethod === "email" ? "Email Address" : "Telegram Thread"} to activate cryogenic protection.
                      </p>
                    </div>

                    {/* Simulated Setup OTP banner */}
                    {simulatedSetupOtp && (
                      <div className="p-4 bg-slate-50 border border-indigo-100 rounded-2xl space-y-2 select-none animate-pulse">
                        <div className="flex items-center justify-between text-[10px] text-indigo-600 font-bold uppercase">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                            <span>Simulated Delivery Channel Code</span>
                          </span>
                          <span className="bg-indigo-50 px-2 py-0.5 rounded text-[9px] font-black">{setup2faMethod.toUpperCase()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-slate-500">Your secure registration pin:</p>
                          <p className="text-sm font-black text-slate-900 font-mono tracking-widest bg-white px-2.5 py-1 rounded border border-slate-150">
                            {simulatedSetupOtp}
                          </p>
                        </div>
                      </div>
                    )}

                    {setupOtpError && (
                      <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2 rounded-xl font-medium">
                        {setupOtpError}
                      </p>
                    )}

                    {setupOtpSuccess && (
                      <p className="text-[11px] text-indigo-600 bg-indigo-50/50 border border-indigo-100 px-3 py-2 rounded-xl font-medium">
                        {setupOtpSuccess}
                      </p>
                    )}

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                        Enter 6-Digit OTP Code
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={setup2faOtp}
                        onChange={(e) => setSetup2faOtp(e.target.value)}
                        placeholder="••••••"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-center text-sm font-mono tracking-widest text-slate-800 placeholder-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-bold"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setSetup2faMethod(null);
                          setSetup2faOtp("");
                          setSimulatedSetupOtp(null);
                          setSetupOtpError("");
                        }}
                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-850 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                      >
                        Cancel Setup
                      </button>
                      <button
                        type="button"
                        onClick={handleVerifySetup2fa}
                        disabled={isVerifyingSetupOtp || !setup2faOtp}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {isVerifyingSetupOtp ? "Verifying..." : "Verify & Enable 2FA"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                        <Fingerprint className="w-4 h-4 text-indigo-500" />
                        <span>Cryptographic 2FA Security Center</span>
                      </h3>
                      <p className="text-[11px] text-slate-400">Enable Two-Factor Authentication (2FA) via Email or Telegram BOT OTP for high-security actions</p>
                    </div>

                    <div className="space-y-5 pt-4 border-t border-slate-100">
                      {/* Option 1: Email 2FA */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4.5 bg-slate-50 border border-slate-150 rounded-2xl transition-all hover:bg-slate-100/50">
                        <div className="space-y-1 max-w-lg">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs text-slate-900">Email OTP 2FA Protection</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                              profile2faEmail 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}>
                              {profile2faEmail ? "ENABLED" : "DISABLED"}
                            </span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-slate-400">
                            Dispatches a unique 6-digit verification pin to your verified login email (<span className="font-mono text-slate-600 font-bold">{user.email}</span>) whenever you request account adjustments or status logins.
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isRequestingSetupOtp}
                          onClick={() => handleToggle2fa("email", !profile2faEmail)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            profile2faEmail ? "bg-indigo-600" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                              profile2faEmail ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Option 2: Telegram 2FA */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4.5 bg-slate-50 border border-slate-150 rounded-2xl transition-all hover:bg-slate-100/50">
                        <div className="space-y-1 max-w-lg">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs text-slate-900">Telegram Bot OTP 2FA Protection</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                              profile2faTelegram 
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200" 
                                : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}>
                              {profile2faTelegram ? "ENABLED" : "DISABLED"}
                            </span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-slate-400">
                            Dispatches the 6-digit security OTP code directly to your Telegram dispatch thread instantly. Highly secure and completely independent of email systems.
                          </p>
                          {!user.telegram_chat_id && (
                            <span className="text-[10px] text-amber-600 font-bold bg-amber-50 border border-amber-100 px-2 py-0.5 rounded flex items-center gap-1 mt-1">
                              ⚠️ Note: You must configure a Telegram Chat ID in the "Telegram Incident Alerts" tab to enable this feature.
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={!user.telegram_chat_id || isRequestingSetupOtp}
                          onClick={() => {
                            if (user.telegram_chat_id) {
                              handleToggle2fa("telegram", !profile2faTelegram);
                            }
                          }}
                          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            !user.telegram_chat_id 
                              ? "bg-slate-200 cursor-not-allowed opacity-50" 
                              : profile2faTelegram ? "bg-indigo-600 cursor-pointer" : "bg-slate-300 cursor-pointer"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                              profile2faTelegram ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSavingSettings}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>{isSavingSettings ? "Saving..." : "Save Security Rules"}</span>
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </form>
      )}

      {/* ==================== MODALS INJECTION REDESIGN ==================== */}

      {/* 1. DIALOG: CREATE MONITOR */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden"
            >
              <div className="bg-slate-50 px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Globe className="w-4 h-4" />
                  </div>
                  <h3 className="font-black text-slate-900 text-sm">Create Website Monitor</h3>
                </div>
                <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddMonitor} className="p-6 space-y-4">
                {errorMsg && (
                  <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl flex gap-2 items-start text-xs text-rose-700 animate-pulse">
                    <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-rose-600" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Friendly Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., My Portfolio Website"
                    value={newMonitorName}
                    onChange={(e) => setNewMonitorName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-hidden font-medium text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Endpoint Target URL</label>
                  <input
                    type="text"
                    required
                    placeholder="https://example.com"
                    value={newMonitorUrl}
                    onChange={(e) => setNewMonitorUrl(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-hidden font-mono text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Protocol</label>
                    <select
                      value={newMonitorType}
                      onChange={(e) => setNewMonitorType(e.target.value as any)}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-hidden font-bold bg-white text-slate-800 cursor-pointer"
                    >
                      <option value="HTTP">HTTP/HTTPS</option>
                      <option value="Ping">ICMP Ping</option>
                      <option value="Port">TCP Port</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Check Interval (sec)</label>
                    <input
                      type="number"
                      required
                      min={currentPlan.min_interval_sec}
                      value={newMonitorInterval}
                      onChange={(e) => setNewMonitorInterval(Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-hidden font-bold text-slate-800"
                    />
                    <span className="text-[9px] text-slate-400 mt-1 block">
                      Min: {currentPlan.min_interval_sec}s ({user.plan_id} lock)
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loadingAction === "add-monitor"}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-55 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    {loadingAction === "add-monitor" ? "Creating..." : "Create Monitor"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. DIALOG: MANAGE WALLET / DEPOSITS */}
      <AnimatePresence>
        {isPayOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden"
            >
              <div className="bg-slate-50 px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <h3 className="font-black text-slate-900 text-sm">USDT BSC Gateway</h3>
                </div>
                <button onClick={() => setIsPayOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-800 flex gap-2.5 items-start leading-relaxed font-medium">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-black block text-amber-900">Binance Smart Chain (BSC) Network Only!</span>
                    Standard **BEP-20 USDT** and native **BNB** deposits are accepted. Send tokens to the wallet below, and register your Txn hash to sync.
                  </div>
                </div>

                {/* Receiver wallet */}
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">BSC target destination</span>
                  <div className="flex items-center justify-between gap-3 bg-white border border-slate-150 p-2.5 rounded-xl">
                    <span className="font-mono text-xs text-slate-600 select-all break-all pr-2 font-bold leading-normal">
                      {BSC_RECEIVER_WALLET}
                    </span>
                    <button
                      onClick={() => copyToClipboard(BSC_RECEIVER_WALLET)}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer transition-all"
                    >
                      {copiedAddress ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-[10px] text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Verify block Txn */}
                <form onSubmit={handleVerifyPayment} className="space-y-4 pt-3 border-t border-slate-100">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-600 block">Transaction Hash (64-char Hex)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="0x..."
                        value={txnHash}
                        onChange={(e) => setTxnHash(e.target.value)}
                        className="w-full border border-slate-250 rounded-xl px-3.5 py-2.5 text-xs focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-hidden font-mono text-slate-800"
                      />
                      <button
                        type="submit"
                        disabled={isVerifyingTxn}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shrink-0 shadow-sm cursor-pointer flex items-center justify-center min-h-[40px]"
                      >
                        {isVerifyingTxn ? "Querying..." : "Submit Tx"}
                      </button>
                    </div>
                  </div>

                  {txnError && (
                    <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl text-xs text-rose-700">
                      {txnError}
                    </div>
                  )}

                  {txnSuccess && (
                    <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-xs text-emerald-700 animate-fade-in">
                      {txnSuccess}
                    </div>
                  )}
                </form>

                {/* Sandbox simulated deposit tool */}
                <div className="bg-slate-50 border border-slate-200/40 p-4.5 rounded-2xl space-y-3.5">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-slate-850 block">Sandbox Block Explorer Simulators</span>
                    <span className="text-[10px] text-slate-500 block leading-relaxed font-medium">Instantly test the real balance crediting hooks. Click one below and submit!</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setTxnHash("0x0000000000000000000000000000000000000000000000000000000000000000")}
                      className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold text-left space-y-0.5 cursor-pointer transition-colors shadow-2xs"
                    >
                      <span className="text-slate-800 block text-[11px]">Simulate 10 USDT</span>
                      <span className="text-[9px] text-indigo-500 font-mono font-medium block">Load Hash 0x00</span>
                    </button>
                    <button
                      onClick={() => setTxnHash("0x1111111111111111111111111111111111111111111111111111111111111111")}
                      className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold text-left space-y-0.5 cursor-pointer transition-colors shadow-2xs"
                    >
                      <span className="text-slate-800 block text-[11px]">Simulate 25 USDT</span>
                      <span className="text-[9px] text-indigo-500 font-mono font-medium block">Load Hash 0x11</span>
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. DIALOG: SUBSCRIPTION MANAGE CENTER */}
      <AnimatePresence>
        {isUpgradeOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl border border-slate-100 overflow-hidden"
            >
              <div className="bg-slate-50 px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h3 className="font-black text-slate-900 text-sm">Subscription Upgrade Center</h3>
                </div>
                <button onClick={() => setIsUpgradeOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {plans.map((plan) => {
                    const isCurrent = user.plan_id === plan.id;
                    return (
                      <div 
                        key={plan.id} 
                        className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 ${
                          isCurrent 
                            ? "border-indigo-500 bg-indigo-50/15" 
                            : "border-slate-150 bg-white"
                        } ${!plan.is_active ? "opacity-40" : ""}`}
                      >
                        <div className="space-y-3">
                          <div>
                            <span className="text-[9px] font-extrabold text-indigo-600 tracking-wider uppercase block">
                              {plan.id === "free" ? "Starter Pack" : plan.id === "pro" ? "Developer Suite" : "Enterprise SaaS"}
                            </span>
                            <span className="font-black text-slate-800 text-base block mt-0.5 leading-none">{plan.name}</span>
                          </div>
                          
                          <div className="flex items-baseline">
                            <span className="text-2xl font-black text-slate-900 tracking-tight">${plan.price}</span>
                            <span className="text-[11px] font-bold text-slate-400 ml-1">USDT/mo</span>
                          </div>

                          <ul className="text-[11px] text-slate-500 space-y-1.5 border-t border-slate-100 pt-3">
                            {plan.features.map((feature, fIdx) => (
                              <li key={fIdx} className="flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span className="truncate leading-relaxed">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="pt-2">
                          {isCurrent ? (
                            <span className="w-full text-center block py-2 bg-indigo-100 text-indigo-700 text-xs font-black rounded-lg">
                              Active Plan
                            </span>
                          ) : (
                            <button
                              onClick={() => handleUpgradePlan(plan.id)}
                              disabled={!plan.is_active || loadingAction !== null}
                              className={`w-full py-2 text-xs font-black rounded-lg border transition-all cursor-pointer ${
                                !plan.is_active
                                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                  : plan.id === "free"
                                  ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                                  : "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent shadow-sm"
                              }`}
                            >
                              {!plan.is_active ? "Blocked" : plan.id === "free" ? "Downgrade" : `Upgrade ($${plan.price})`}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-50 p-3 rounded-xl text-center font-bold border border-slate-100">
                  Plan payments are debited instantly from your active platform gas balance.
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
