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
  Activity 
} from "lucide-react";
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

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 6000);
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

    </div>
  );
}
