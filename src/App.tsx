import React, { useState, useEffect } from "react";
import { 
  Globe, 
  Shield, 
  Layers, 
  Clock, 
  RefreshCw, 
  Check, 
  AlertTriangle,
  User as UserIcon,
  HelpCircle,
  Network,
  Menu,
  X,
  Sliders,
  Users,
  Terminal,
  CreditCard,
  History,
  Settings,
  Wallet,
  LogOut,
  ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import SubscriberDashboard from "./components/SubscriberDashboard.tsx";
import AdminDashboard from "./components/AdminDashboard.tsx";
import { User, Monitor, Payment, AlertConfig, SubscriptionPlan } from "./types.ts";

export default function App() {
  // Session Login Status
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  // Active Role State ("subscriber" or "admin")
  const [activeRole, setActiveRole] = useState<"subscriber" | "admin">("subscriber");

  // Sub-tab Navigation States (persists selected sub-tabs when switching views)
  const [subscriberTab, setSubscriberTab] = useState<"monitors" | "wallet" | "billing" | "history" | "settings">("monitors");
  const [adminTab, setAdminTab] = useState<"settings" | "subscribers" | "logs" | "plans">("settings");

  // Mobile Sidebar Slide-Out Toggle State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Core Global States
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  // Status and Loaders
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Trigger global data refresh
  const loadPlatformData = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      // Parallel fetches for speed and reliability
      const [userRes, monitorsRes, paymentsRes, configRes, allUsersRes, plansRes] = await Promise.all([
        fetch("/api/user"),
        fetch("/api/monitors"),
        fetch("/api/payment/history"),
        fetch("/api/config"),
        fetch("/api/admin/users"),
        fetch("/api/plans")
      ]);

      if (!userRes.ok || !monitorsRes.ok || !paymentsRes.ok || !configRes.ok || !allUsersRes.ok || !plansRes.ok) {
        throw new Error("Failed to load server data. Server might be initializing...");
      }

      const [userData, monitorsData, paymentsData, configData, allUsersData, plansData] = await Promise.all([
        userRes.json(),
        monitorsRes.json(),
        paymentsRes.json(),
        configRes.json(),
        allUsersRes.json(),
        plansRes.json()
      ]);

      setUser(userData);
      setAllUsers(allUsersData);
      setMonitors(monitorsData);
      setPayments(paymentsData);
      setConfig(configData);
      setPlans(plansData);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to sync with UptimePro Express backend. Re-trying...");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // On first mount, boot data
  useEffect(() => {
    loadPlatformData();
  }, []);

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full select-none font-sans">
      {/* Sidebar Header Branding */}
      <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-white tracking-tight text-base">UptimePro</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mt-0.5" title="Live" />
            </div>
            <span className="text-[9px] text-slate-500 block font-bold leading-none tracking-wide uppercase">Monitoring SaaS</span>
          </div>
        </div>
        {/* Close Button on Mobile */}
        <button 
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Role / Workspace Toggle Switcher */}
      <div className="p-4 border-b border-slate-800/50 space-y-2">
        <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase block px-2">Console View</span>
        <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-850">
          <button
            onClick={() => {
              setActiveRole("subscriber");
              setIsSidebarOpen(false);
            }}
            className={`py-2 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
              activeRole === "subscriber"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Subscriber</span>
          </button>
          <button
            onClick={() => {
              setActiveRole("admin");
              setIsSidebarOpen(false);
            }}
            className={`py-2 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
              activeRole === "admin"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Super Admin</span>
          </button>
        </div>
      </div>

      {/* Dynamic Navigation Menu Items */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        <div className="space-y-2">
          <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase block px-2 font-mono">Menu Items</span>
          
          {activeRole === "subscriber" ? (
            <div className="space-y-1">
              <button
                onClick={() => {
                  setSubscriberTab("monitors");
                  setIsSidebarOpen(false);
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                  subscriberTab === "monitors"
                    ? "bg-slate-850 text-white border-l-4 border-indigo-500 font-bold"
                    : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                }`}
              >
                <Globe className={`w-4 h-4 ${subscriberTab === "monitors" ? "text-indigo-500" : ""}`} />
                <span>Monitors & Metrics</span>
              </button>

              <button
                onClick={() => {
                  setSubscriberTab("history");
                  setIsSidebarOpen(false);
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                  subscriberTab === "history"
                    ? "bg-slate-850 text-white border-l-4 border-indigo-500 font-bold"
                    : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                }`}
              >
                <History className={`w-4 h-4 ${subscriberTab === "history" ? "text-indigo-500" : ""}`} />
                <span>History & Alerts</span>
              </button>

              <button
                onClick={() => {
                  setSubscriberTab("wallet");
                  setIsSidebarOpen(false);
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                  subscriberTab === "wallet"
                    ? "bg-slate-850 text-white border-l-4 border-indigo-500 font-bold"
                    : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                }`}
              >
                <Wallet className={`w-4 h-4 ${subscriberTab === "wallet" ? "text-indigo-500" : ""}`} />
                <span>My Wallet</span>
              </button>

              <button
                onClick={() => {
                  setSubscriberTab("billing");
                  setIsSidebarOpen(false);
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                  subscriberTab === "billing"
                    ? "bg-slate-850 text-white border-l-4 border-indigo-500 font-bold"
                    : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                }`}
              >
                <CreditCard className={`w-4 h-4 ${subscriberTab === "billing" ? "text-indigo-500" : ""}`} />
                <span>Billing & Subscription</span>
              </button>

              <button
                onClick={() => {
                  setSubscriberTab("settings");
                  setIsSidebarOpen(false);
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                  subscriberTab === "settings"
                    ? "bg-slate-850 text-white border-l-4 border-indigo-500 font-bold"
                    : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                }`}
              >
                <Sliders className={`w-4 h-4 ${subscriberTab === "settings" ? "text-indigo-500" : ""}`} />
                <span>Account Settings</span>
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <button
                onClick={() => {
                  setAdminTab("settings");
                  setIsSidebarOpen(false);
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                  adminTab === "settings"
                    ? "bg-slate-850 text-white border-l-4 border-indigo-500 font-bold"
                    : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                }`}
              >
                <Settings className={`w-4 h-4 ${adminTab === "settings" ? "text-indigo-500" : ""}`} />
                <span>Settings</span>
              </button>

              <button
                onClick={() => {
                  setAdminTab("subscribers");
                  setIsSidebarOpen(false);
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                  adminTab === "subscribers"
                    ? "bg-slate-850 text-white border-l-4 border-indigo-500 font-bold"
                    : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                }`}
              >
                <Users className={`w-4 h-4 ${adminTab === "subscribers" ? "text-indigo-500" : ""}`} />
                <span>Subscriber Pool</span>
              </button>

              <button
                onClick={() => {
                  setAdminTab("logs");
                  setIsSidebarOpen(false);
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                  adminTab === "logs"
                    ? "bg-slate-850 text-white border-l-4 border-indigo-500 font-bold"
                    : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                }`}
              >
                <Terminal className={`w-4 h-4 ${adminTab === "logs" ? "text-indigo-500" : ""}`} />
                <span>Worker Terminal Logs</span>
              </button>

              <button
                onClick={() => {
                  setAdminTab("plans");
                  setIsSidebarOpen(false);
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                  adminTab === "plans"
                    ? "bg-slate-850 text-white border-l-4 border-indigo-500 font-bold"
                    : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                }`}
              >
                <CreditCard className={`w-4 h-4 ${adminTab === "plans" ? "text-indigo-500" : ""}`} />
                <span>Subscription Plans</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Footer Info block */}
      <div className="p-4 border-t border-slate-800/80 space-y-3 bg-slate-950/40 shrink-0">
        {user && (
          <div className="p-3 bg-slate-900 border border-slate-800/80 rounded-xl space-y-1">
            <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold uppercase tracking-wider">
              <span>Platform Credit</span>
              <span className="text-emerald-500 bg-emerald-950/50 px-1 py-0.5 rounded-sm font-mono font-bold">USDT</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-white">${user.balance.toFixed(2)}</span>
              <span className="text-[10px] text-slate-400 font-medium font-mono capitalize">({user.plan_id})</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-[9px] text-slate-500 uppercase font-mono tracking-wide">UptimePro v2.0</span>
          <button
            onClick={() => loadPlatformData()}
            disabled={isRefreshing}
            className="p-1.5 bg-slate-800 text-slate-400 hover:text-white hover:bg-indigo-600 rounded-lg transition-all cursor-pointer"
            title="Manual sync"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin text-white" : ""}`} />
          </button>
        </div>

        {/* Beautiful Logout / Sign Out Button */}
        <button
          onClick={() => {
            setIsLoggedIn(false);
            setIsSidebarOpen(false);
          }}
          className="w-full px-3 py-2.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 hover:text-rose-100 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border border-rose-950 hover:border-rose-900/50"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-400" />
          <span>Sign Out Session</span>
        </button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="space-y-4">
          {/* Glowing heartbeat pulse animation */}
          <div className="relative flex items-center justify-center w-16 h-16 mx-auto bg-indigo-100 rounded-full text-indigo-600 animate-pulse">
            <Globe className="w-8 h-8" />
            <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-20 animate-ping"></span>
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-black tracking-tight text-slate-800">UptimePro</h1>
            <p className="text-xs text-slate-500 font-medium">Booting monitors & verifying BSC blockchain nodes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-indigo-500/15 font-sans relative overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full filter blur-3xl -z-10 animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full filter blur-3xl -z-10 animate-pulse duration-4000" />

        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl relative z-10">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3.5 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20 mb-2">
              <Network className="w-8 h-8 animate-pulse" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">UptimePro Portal</h1>
            <p className="text-xs text-slate-400">Decoupled Latency & Node Monitoring Gateway</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Select Target Console View</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                <button
                  onClick={() => setActiveRole("subscriber")}
                  className={`py-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                    activeRole === "subscriber"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Subscriber</span>
                </button>
                <button
                  onClick={() => setActiveRole("admin")}
                  className={`py-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                    activeRole === "admin"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Super Admin</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-850 space-y-3">
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase">
                <span>Secure Node Connection</span>
                <span className="text-emerald-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping" />
                  <span>TLS 1.3 Active</span>
                </span>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    value={activeRole === "subscriber" ? "subscriber@uptimepro.io" : "admin@uptimepro.io"}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-400 font-medium outline-none cursor-not-allowed"
                  />
                </div>
                <div className="relative">
                  <input
                    type="password"
                    disabled
                    value="••••••••••••••••"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-400 font-mono outline-none cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setIsLoggedIn(true);
                loadPlatformData(true);
              }}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Connect Cryptographic Node</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-center">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold">UptimePro Secure Session Sandbox</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased flex selection:bg-indigo-500/10">
      
      {/* 1. DESKTOP PERMANENT SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-72 bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0 sticky top-0 h-screen z-40">
        {renderSidebarContent()}
      </aside>

      {/* 2. MOBILE RESPONSIVE SLIDE-OUT SIDEBAR DRAWER */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 lg:hidden" 
        />
      )}
      
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.25 }}
            className="fixed inset-y-0 left-0 w-72 bg-slate-900 text-slate-300 border-r border-slate-800 z-50 flex flex-col lg:hidden shadow-2xl"
          >
            {renderSidebarContent()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. MAIN WORKSPACE AREA */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        
        {/* Top Header Bar */}
        <header className="sticky top-0 bg-white border-b border-slate-100/80 z-30 backdrop-blur-md">
          <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            
            {/* Left side: Hamburger on mobile, active context title on desktop */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                title="Open Navigation Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block leading-none">
                  {activeRole === "subscriber" ? "Subscriber Workspace" : "Super Admin Panel"}
                </span>
                <span className="font-bold text-slate-800 text-sm block leading-none capitalize">
                  {activeRole === "subscriber" 
                    ? (subscriberTab === "monitors" ? "Monitors & Latency metrics" : subscriberTab === "wallet" ? "Secure Wallet & Deposits" : subscriberTab === "billing" ? "Billing & blockchain deposits" : subscriberTab === "history" ? "Monitor execution logs & triggered alerts" : "Configure notification channels & preferences")
                    : (adminTab === "settings" ? "Global Settings & Gateways" : adminTab === "subscribers" ? "Subscriber directory" : adminTab === "plans" ? "Manage Subscription Plans & Pricing" : "System concurrent logs")
                  }
                </span>
              </div>
            </div>

            {/* Right side: Refresh status controls & mini profile */}
            <div className="flex items-center gap-3">
              {user && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 font-mono text-[11px] font-bold">
                  <span className="text-slate-400 uppercase">Tier:</span>
                  <span className="text-indigo-600 uppercase">{user.plan_id}</span>
                  <span className="text-slate-200">|</span>
                  <span className="text-slate-400 uppercase">Balance:</span>
                  <span className="text-emerald-600">${user.balance.toFixed(2)}</span>
                </div>
              )}
              
              <button
                onClick={() => loadPlatformData()}
                disabled={isRefreshing}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all border border-slate-100/50 cursor-pointer disabled:opacity-50"
                title="Manual Platform Sync"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`} />
              </button>
              
              <div className="hidden md:block text-right">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase leading-none">Status</span>
                <span className="text-xs font-bold text-emerald-600 block mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping" />
                  <span>Engine Live</span>
                </span>
              </div>
            </div>

          </div>
        </header>

        {/* Workspace core canvas stage */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          
          {/* Error Connection Banner */}
          {error && (
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex gap-3 items-start mb-6 text-sm text-rose-700 animate-pulse">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <span className="font-bold block">Backend Sync Error</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Dynamic Route views based on active roles and tabs */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeRole}-${activeRole === "subscriber" ? subscriberTab : adminTab}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {activeRole === "subscriber" ? (
                user && (
                  <SubscriberDashboard
                    user={user}
                    monitors={monitors}
                    payments={payments}
                    onRefreshData={() => loadPlatformData(true)}
                    activeTab={subscriberTab}
                    plans={plans}
                    onCreditWallet={(amount) => {
                      if (user) {
                        setUser({ ...user, balance: user.balance + amount });
                      }
                    }}
                  />
                )
              ) : (
                <AdminDashboard
                  users={allUsers}
                  config={config}
                  activeTab={adminTab}
                  plans={plans}
                  onRefreshData={() => loadPlatformData(true)}
                />
              )}
            </motion.div>
          </AnimatePresence>

        </main>

        {/* Clean elegant page footer */}
        <footer className="border-t border-slate-100 bg-white py-8 mt-12 shrink-0">
          <div className="px-4 sm:px-6 lg:px-8 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-slate-400">
              <Globe className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-bold text-slate-500 font-mono">UptimePro Monitoring Engine v2.0</span>
            </div>
            <p className="text-[11px] text-slate-400 max-w-md mx-auto">
              Protected against Server-Side Request Forgery (SSRF) hostname filters. Verifying crypto subscription transactions over public BSC RPC networks.
            </p>
          </div>
        </footer>

      </div>

    </div>
  );
}
