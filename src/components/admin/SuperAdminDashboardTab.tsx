import { apiFetch } from "../../lib/api";
import React, { useState, useEffect } from "react";
import { 
  Shield, 
  RefreshCw, 
  Users, 
  Wallet, 
  Cpu, 
  AlertTriangle, 
  Terminal, 
  ArrowUpRight, 
  Sparkles, 
  Clock, 
  Activity,
  Server,
  Database,
  Trash2,
  Wrench,
  Check,
  CheckCircle2,
  Layers,
  HardDrive
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { User } from "../../types.ts";

interface SuperAdminDashboardTabProps {
  users: User[];
  isSmtpConfigured: boolean;
  isTelegramConfigured: boolean;
  alertDelay: number;
}

interface AdminStats {
  totalUsers: number;
  totalMonitors: number;
  totalLogs: number;
  globalBalance: number;
  activeMonitorsCount: number;
  failedMonitorsCount: number;
  totalPayments: number;
  paymentsVolume: number;
  averageLatency: number;
}

export default function SuperAdminDashboardTab({
  users,
  isSmtpConfigured,
  isTelegramConfigured,
  alertDelay
}: SuperAdminDashboardTabProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState("");

  // Advanced telemetry & control states
  const [healthData, setHealthData] = useState<any>(null);
  const [isFetchingHealth, setIsFetchingHealth] = useState(false);
  const [diagnosticTrace, setDiagnosticTrace] = useState<string[]>([]);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [retentionDays, setRetentionDays] = useState(30);
  const [cleanupResult, setCleanupResult] = useState<any>(null);
  const [isCleaning, setIsCleaning] = useState(false);

  const fetchStats = async () => {
    setIsLoadingStats(true);
    setStatsError("");
    try {
      const res = await apiFetch("/api/admin/stats");
      if (!res.ok) {
        throw new Error("Failed to fetch dashboard metrics");
      }
      const data = await res.json();
      setStats(data);
    } catch (err: any) {
      setStatsError(err.message || "Failed to load dashboard statistics");
    } finally {
      setIsLoadingStats(false);
    }
  };

  const fetchHealthMetrics = async () => {
    setIsFetchingHealth(true);
    try {
      const res = await apiFetch("/api/admin/health-metrics");
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
      }
    } catch (err) {
      console.error("Failed to load health metrics", err);
    } finally {
      setIsFetchingHealth(false);
    }
  };

  const runDiagnostics = async () => {
    setIsDiagnosing(true);
    setDiagnosticTrace(["[Handshake diagnostic engine booting up...]"]);
    try {
      const res = await apiFetch("/api/admin/diagnose-gateways", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setDiagnosticTrace(data.trace);
      } else {
        setDiagnosticTrace(prev => [...prev, "❌ Failed to complete diagnostic handshake."]);
      }
    } catch (err: any) {
      setDiagnosticTrace(prev => [...prev, `❌ Exception: ${err.message}`]);
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handlePruneLogs = async () => {
    setIsCleaning(true);
    setCleanupResult(null);
    try {
      const res = await apiFetch("/api/admin/cleanup-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: retentionDays }),
      });
      if (res.ok) {
        const data = await res.json();
        setCleanupResult(data);
        fetchStats();
        fetchHealthMetrics();
      } else {
        const errorData = await res.json();
        setCleanupResult({ error: errorData.error || "Failed to prune logs" });
      }
    } catch (err: any) {
      setCleanupResult({ error: err.message || "Request failed" });
    } finally {
      setIsCleaning(false);
    }
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) return "0s";
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}s`);
    return parts.join(" ");
  };

  useEffect(() => {
    fetchStats();
    fetchHealthMetrics();
    const interval = setInterval(() => {
      fetchStats();
      fetchHealthMetrics();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in" id="super-admin-dashboard-tab">
      {/* Header section with manual refresh button and stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-3xs" id="admin-header-panel">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600 animate-pulse" />
            <span>Super Admin Executive Dashboard</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Real-time operational metrics, platform state telemetry, and BSC node verification channels.
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={isLoadingStats}
          className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          id="sync-dashboard-btn"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStats ? "animate-spin" : ""}`} />
          <span>{isLoadingStats ? "Syncing..." : "Sync Dashboard"}</span>
        </button>
      </div>

      {statsError && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 px-4 py-3 rounded-xl font-bold" id="stats-error-msg">
          ⚠️ {statsError}
        </p>
      )}

      {/* 8 Card Grid (4x2 layout on desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="stats-grid">
        
        {/* Card 1: Total Subscribers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100/90 shadow-3xs flex flex-col justify-between hover:shadow-sm transition-all duration-300 relative overflow-hidden group" id="stat-card-subscribers">
          <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50/20 rounded-full filter blur-xl group-hover:scale-125 transition-transform duration-300" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Total Subscribers</span>
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                {stats ? stats.totalUsers : users.length}
              </span>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-500 font-bold">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span>Live Database Pool</span>
            </span>
            <span className="text-indigo-600">Sync Live</span>
          </div>
        </div>

        {/* Card 2: Wallet Fund Pool */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100/90 shadow-3xs flex flex-col justify-between hover:shadow-sm transition-all duration-300 relative overflow-hidden group" id="stat-card-funds">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50/20 rounded-full filter blur-xl group-hover:scale-125 transition-transform duration-300" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Managed Wallet Funds</span>
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                ${(stats ? stats.globalBalance : users.reduce((sum, u) => sum + u.balance, 0)).toFixed(2)}
              </span>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-500 font-bold">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>USDT Deposits</span>
            </span>
            <span className="text-emerald-600">100% Secured</span>
          </div>
        </div>

        {/* Card 3: Active Monitors */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100/90 shadow-3xs flex flex-col justify-between hover:shadow-sm transition-all duration-300 relative overflow-hidden group" id="stat-card-monitors">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50/20 rounded-full filter blur-xl group-hover:scale-125 transition-transform duration-300" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Active Web Monitors</span>
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                {stats ? stats.activeMonitorsCount : 0}
              </span>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-500 font-bold">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>UP & Healthy</span>
            </span>
            <span className="text-blue-600">Active</span>
          </div>
        </div>

        {/* Card 4: Failed Monitors */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100/90 shadow-3xs flex flex-col justify-between hover:shadow-sm transition-all duration-300 relative overflow-hidden group" id="stat-card-failed">
          <div className="absolute top-0 right-0 w-20 h-20 bg-rose-50/20 rounded-full filter blur-xl group-hover:scale-125 transition-transform duration-300" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Outages Detected</span>
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                {stats ? stats.failedMonitorsCount : 0}
              </span>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-500 font-bold">
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${(stats?.failedMonitorsCount || 0) > 0 ? "bg-rose-500 animate-ping" : "bg-slate-300"}`} />
              <span>DOWN / Alerts Active</span>
            </span>
            <span className="text-rose-600 font-black">{(stats?.failedMonitorsCount || 0) > 0 ? "OUTAGE" : "None"}</span>
          </div>
        </div>

        {/* Card 5: Goroutine Execution Loops */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100/90 shadow-3xs flex flex-col justify-between hover:shadow-sm transition-all duration-300 relative overflow-hidden group" id="stat-card-loops">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-50/20 rounded-full filter blur-xl group-hover:scale-125 transition-transform duration-300" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Execution Checks Logged</span>
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                {stats ? stats.totalLogs : 0}
              </span>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Terminal className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-500 font-bold">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>System Loops</span>
            </span>
            <span className="text-amber-600">Polling</span>
          </div>
        </div>

        {/* Card 6: Total Payments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100/90 shadow-3xs flex flex-col justify-between hover:shadow-sm transition-all duration-300 relative overflow-hidden group" id="stat-card-payments">
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-50/20 rounded-full filter blur-xl group-hover:scale-125 transition-transform duration-300" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Wallet Deposits</span>
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                {stats ? stats.totalPayments : 0}
              </span>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-500 font-bold">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              <span>Invoices Settled</span>
            </span>
            <span className="text-purple-600">Verified</span>
          </div>
        </div>

        {/* Card 7: Deposits Volume */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100/90 shadow-3xs flex flex-col justify-between hover:shadow-sm transition-all duration-300 relative overflow-hidden group" id="stat-card-volume">
          <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-50/20 rounded-full filter blur-xl group-hover:scale-125 transition-transform duration-300" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Deposited USDT Volume</span>
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                ${(stats ? stats.paymentsVolume : 0).toFixed(2)}
              </span>
            </div>
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-500 font-bold">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
              <span>BSC Ledger Value</span>
            </span>
            <span className="text-cyan-600">BEP-20 API</span>
          </div>
        </div>

        {/* Card 8: Average response time latency */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100/90 shadow-3xs flex flex-col justify-between hover:shadow-sm transition-all duration-300 relative overflow-hidden group" id="stat-card-latency">
          <div className="absolute top-0 right-0 w-20 h-20 bg-orange-50/20 rounded-full filter blur-xl group-hover:scale-125 transition-transform duration-300" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Average System Latency</span>
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                {stats ? stats.averageLatency : 0} <span className="text-sm font-medium text-slate-500">ms</span>
              </span>
            </div>
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-500 font-bold">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Under 500ms target</span>
            </span>
            <span className="text-orange-600">Excellent</span>
          </div>
        </div>

      </div>

      {/* Additional details: System gateways & active config summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-bottom-grid">
        
        {/* System Status Panel */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100/90 shadow-3xs space-y-4 lg:col-span-2" id="directives-panel">
          <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            <span>Super Admin Quick Directives</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
              <span className="font-bold text-slate-800 block">Gateway Dispatch Statuses</span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                UptimePro uses custom SMTP presets and instant Telegram dispatchers to notify subscribers during downtime outages.
              </p>
              <div className="flex gap-4 pt-2 font-mono text-[10px] text-slate-600 font-bold">
                <span className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${isSmtpConfigured ? "bg-emerald-500" : "bg-rose-500"}`} />
                  <span>SMTP: {isSmtpConfigured ? "Live" : "No Creds"}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${isTelegramConfigured ? "bg-emerald-500" : "bg-rose-500"}`} />
                  <span>Telegram: {isTelegramConfigured ? "Live" : "No Creds"}</span>
                </span>
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
              <span className="font-bold text-slate-800 block">Outage Detection Settings</span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Outages trigger alerts only after <span className="font-bold text-indigo-600">{alertDelay} consecutive failures</span> are logged by the background monitoring runners.
              </p>
              <div className="pt-1">
                <span className="text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md">
                  Delay: {alertDelay} checks
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick stats distribution info */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100/90 shadow-3xs space-y-4" id="tier-distribution-panel">
          <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Active Subscription Tiers</span>
          </h3>
          <div className="space-y-2">
            {["free", "pro", "enterprise"].map((tier) => {
              const count = users.filter((u) => u.plan_id === tier).length;
              const total = users.length || 1;
              const percentage = Math.round((count / total) * 100);
              const colors: Record<string, string> = {
                free: "bg-slate-400",
                pro: "bg-indigo-500",
                enterprise: "bg-amber-500"
              };
              return (
                <div key={tier} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="capitalize font-bold text-slate-700">{tier} Tier</span>
                    <span className="text-slate-500 font-mono text-[11px]">{count} users ({percentage}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${colors[tier]}`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* SECTION A: Live Latency performance history (Recharts) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-3xs space-y-4" id="latency-performance-graph-container">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div className="space-y-1">
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              <span>24-Hour Average Platform Latency (Core Pollers)</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Moving average latency calculated from concurrent service checks. Updates automatically.
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 p-1 px-2.5 rounded-lg text-[10px] text-slate-500 font-bold font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span>Target Threshold &lt; 500ms</span>
          </div>
        </div>

        <div className="h-64 w-full" id="latency-wave-chart">
          {healthData && healthData.latencyHistory ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={healthData.latencyHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} unit="ms" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                  labelStyle={{ color: '#818cf8', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="latency" name="Latency" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorLatency)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <div className="text-center space-y-2">
                <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin mx-auto" />
                <span className="text-[11px] text-slate-400 font-bold">Synchronizing telemetry streams...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION B: Health Telemetry & DB Optimization Control */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-bottom-grid">
        
        {/* System Status & Server Resource Telemetry */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100/90 shadow-3xs space-y-5 lg:col-span-2" id="telemetry-panel">
          <div className="flex justify-between items-center border-b border-slate-50 pb-3">
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-600" />
              <span>Container Resource & Process Telemetry</span>
            </h3>
            <span className="text-[9px] uppercase font-mono font-black tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md">
              Process ID: {healthData ? "Node.js VM" : "Resolving"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs" id="telemetry-gauges">
            
            {/* Memory breakdown */}
            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Node.js Memory Footprint</span>
                </span>
                <span className="font-mono text-[10px] text-slate-400 font-extrabold">Live RAM</span>
              </div>

              {healthData && healthData.memoryUsage ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-medium text-slate-600">
                      <span>Heap Used</span>
                      <span className="font-mono font-bold text-slate-900">{healthData.memoryUsage.heapUsed} MB</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200/60 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-500" 
                        style={{ width: `${Math.min(100, (healthData.memoryUsage.heapUsed / healthData.memoryUsage.heapTotal) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-medium text-slate-600">
                      <span>Heap Total Allocated</span>
                      <span className="font-mono font-bold text-slate-900">{healthData.memoryUsage.heapTotal} MB</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200/60 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-slate-400 transition-all duration-500" 
                        style={{ width: `${Math.min(100, (healthData.memoryUsage.heapTotal / 256) * 100)}%` }} // 256MB sandbox scale
                      />
                    </div>
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-500 pt-1 font-bold font-mono">
                    <span>Resident Set (RSS):</span>
                    <span className="text-indigo-600">{healthData.memoryUsage.rss} MB</span>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 font-bold text-[11px]">Loading RAM metrics...</div>
              )}
            </div>

            {/* Environment telemetry */}
            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
              <div>
                <span className="font-bold text-slate-800 flex items-center gap-1.5 block mb-3">
                  <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                  <span>OS Environment & Runtime</span>
                </span>
                
                {healthData && healthData.os ? (
                  <div className="grid grid-cols-2 gap-x-2 gap-y-2.5 text-[11px] text-slate-600 font-semibold">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Engine Platform</span>
                      <span className="text-slate-800 capitalize">{healthData.os.platform} ({healthData.os.arch})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">CPU Threads</span>
                      <span className="text-slate-800 font-mono">{healthData.os.numCores} Cores</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Process Uptime</span>
                      <span className="text-indigo-600 font-mono">{formatUptime(healthData.processUptime)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Load Average</span>
                      <span className="text-slate-800 font-mono">[{healthData.os.loadAvg.map((l: number) => l.toFixed(2)).join(", ")}]</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-slate-400 font-bold text-[11px]">Resolving environment...</div>
                )}
              </div>

              {healthData && healthData.os && (
                <div className="text-[10px] text-slate-400 border-t border-slate-200/50 pt-2 font-mono font-bold truncate">
                  Model: {healthData.os.cpuModel}
                </div>
              )}
            </div>

          </div>

          {/* Database connection status details */}
          <div className="p-4 bg-slate-900 text-slate-300 rounded-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs font-mono">
            <div className="space-y-1">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Database className="w-4 h-4 text-indigo-400" />
                <span>PostgreSQL Persistent Database Bridge</span>
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans font-medium">
                Active Pool Host: <span className="text-indigo-300 font-mono">{(healthData?.dbPool?.databaseUrl) || "FALLBACK (Ephemeral SQLite/File)"}</span>
              </p>
            </div>
            
            <div className="shrink-0 flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${healthData?.dbPool?.isPgConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
              <span className="font-extrabold uppercase text-[10px]">
                {healthData?.dbPool?.isPgConnected ? "SSL Pool Live" : "No Ext DB Connected"}
              </span>
            </div>
          </div>
        </div>

        {/* Database Command Center & Log Pruning Widget */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100/90 shadow-3xs flex flex-col justify-between" id="db-optimizer-panel">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-50 pb-3">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>DB Optimizer & Space Cleaner</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Admin command</span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Manually optimize database size by deleting old service records. This prevents memory degradation and speeds up analytical latency queries.
            </p>

            <div className="space-y-3 pt-2">
              <div className="space-y-1 text-xs">
                <label className="font-extrabold text-slate-400 uppercase tracking-wide text-[10px] block">Retention Threshold</label>
                <select 
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-2.5 rounded-xl text-xs font-bold focus:border-indigo-500 focus:outline-hidden"
                >
                  <option value={7}>Keep last 7 Days of Logs</option>
                  <option value={14}>Keep last 14 Days of Logs</option>
                  <option value={30}>Keep last 30 Days of Logs</option>
                  <option value={90}>Keep last 90 Days of Logs</option>
                </select>
              </div>

              <button
                onClick={handlePruneLogs}
                disabled={isCleaning}
                className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 mt-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isCleaning ? "Optimizing Schema..." : "Prune Old Records Now"}</span>
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-50" id="prune-status-box">
            {cleanupResult ? (
              cleanupResult.error ? (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-[11px] font-bold">
                  ⚠️ Error: {cleanupResult.error}
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl space-y-1 animate-fade-in text-[11px]">
                  <span className="font-extrabold flex items-center gap-1 text-emerald-950">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Schema Space Liberated!</span>
                  </span>
                  <p className="text-[10px] text-emerald-700">
                    Cleared <strong>{cleanupResult.logsCleaned}</strong> execution records and <strong>{cleanupResult.sysLogsCleaned}</strong> system events from persistent storage.
                  </p>
                </div>
              )
            ) : (
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono font-bold">
                <span>Last Optimization Run:</span>
                <span>Ready</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* SECTION C: Active Alert Gateway Handshake Tester */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-3xs space-y-4" id="gateway-diagnostic-handshake-section">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="space-y-1">
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Wrench className="w-4 h-4 text-indigo-600" />
              <span>Instant Mail Relay & Alert Gateway Handshake Tester</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Initiates a deep trace of SMTP server ports, database connection latency, and Telegram APIs to verify platform deliverability.
            </p>
          </div>

          <button
            onClick={runDiagnostics}
            disabled={isDiagnosing}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            id="run-diagnostics-btn"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>{isDiagnosing ? "Tracing handshakes..." : "Run Deliverability Trace"}</span>
          </button>
        </div>

        {/* Styled Simulated Linux Terminal Wrapper */}
        <div className="bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden shadow-lg" id="diagnostic-terminal">
          {/* Terminal Window Header chrome */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-950/40">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
            <span className="text-[10px] font-black text-slate-500 font-mono uppercase tracking-widest">Gateway Diagnostic Console</span>
            <div className="w-12" />
          </div>

          {/* Terminal stream */}
          <div className="p-4 font-mono text-[11px] text-indigo-200/90 space-y-1.5 max-h-56 overflow-y-auto select-all selection:bg-indigo-500/20">
            {diagnosticTrace.length === 0 ? (
              <p className="text-slate-600 italic select-none">No diagnostic traces recorded. Hit "Run Deliverability Trace" above to establish handshakes.</p>
            ) : (
              diagnosticTrace.map((line, idx) => {
                let colorClass = "text-indigo-200/90";
                if (line.includes("✅")) {
                  colorClass = "text-emerald-400 font-bold";
                } else if (line.includes("⚠️")) {
                  colorClass = "text-amber-400 font-bold";
                } else if (line.includes("❌")) {
                  colorClass = "text-rose-400 font-extrabold";
                } else if (idx === 0) {
                  colorClass = "text-slate-400 font-semibold italic";
                }
                return (
                  <div key={idx} className={`flex items-start gap-1 leading-relaxed ${colorClass}`}>
                    <span className="text-slate-700 shrink-0 select-none">&gt;</span>
                    <span>{line}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
