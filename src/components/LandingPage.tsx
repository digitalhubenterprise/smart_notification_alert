import React, { useState, useEffect } from "react";
import { 
  Globe, 
  Shield, 
  Zap, 
  Clock, 
  Bell, 
  Send, 
  Wallet, 
  CreditCard, 
  Activity, 
  History, 
  Server, 
  Cpu, 
  CheckCircle2, 
  ArrowRight, 
  Lock, 
  Database, 
  ListChecks, 
  MessageSquare,
  Sparkles,
  ChevronRight,
  HelpCircle,
  Network,
  LogIn,
  UserPlus
} from "lucide-react";
import { motion } from "motion/react";
import { SubscriptionPlan } from "../types.ts";

interface LandingPageProps {
  onLoginClick: () => void;
  onRegisterClick?: () => void;
  plans?: SubscriptionPlan[];
}

export default function LandingPage({ onLoginClick, onRegisterClick, plans = [] }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 15) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Default plans if none loaded from database yet
  const displayPlans = plans.length > 0 ? plans : [
    {
      id: "free",
      name: "Starter / Free",
      price: 0,
      max_monitors: 3,
      min_interval_sec: 30,
      is_active: true,
      features: [
        "Up to 3 endpoints",
        "30s check interval",
        "Standard Telegram logs",
        "24h history logs retention",
        "Dual SMTP email relays"
      ]
    },
    {
      id: "pro",
      name: "Developer / Pro",
      price: 10,
      max_monitors: 20,
      min_interval_sec: 10,
      is_active: true,
      features: [
        "Up to 20 endpoints",
        "10s hyper frequency check",
        "Premium Telegram instant bot alerts",
        "30-day metrics archive",
        "Custom SMTP relay integration",
        "Priority support"
      ]
    },
    {
      id: "enterprise",
      name: "SaaS / Enterprise",
      price: 50,
      max_monitors: 100,
      min_interval_sec: 5,
      is_active: true,
      features: [
        "Up to 100 endpoints",
        "5s ultra-frequency polling",
        "Custom dedicated server nodes",
        "Unlimited logs history",
        "Full Slack/Webhook sync payloads",
        "SLA guarantee (99.99%)"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/20 relative overflow-hidden flex flex-col">
      {/* Decorative background grids and ambient glow blobs */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.15),rgba(255,255,255,0))]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.005)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.005)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_60%,transparent_100%)] opacity-30 pointer-events-none" />
      
      {/* Glow circles */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-500/10 rounded-full filter blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-[20%] right-[-10%] w-[40vw] h-[40vw] bg-purple-500/10 rounded-full filter blur-[100px] pointer-events-none -z-10" />

      {/* 1. TOP NAVBAR */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
        scrolled 
          ? "bg-slate-950/85 backdrop-blur-md border-slate-900 shadow-xl shadow-slate-950/35 py-3" 
          : "bg-transparent border-transparent py-5"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20">
              <Network className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-white tracking-tight text-base">UptimePro</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping mt-0.5" />
              </div>
              <span className="text-[9px] text-slate-500 block font-mono font-bold leading-none uppercase tracking-widest">SaaS Engine</span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-400">
            <a href="#features" className="hover:text-slate-100 transition-colors">Key Features</a>
            <a href="#how-it-works" className="hover:text-slate-100 transition-colors">Blockchain Ledger</a>
            <a href="#pricing" className="hover:text-slate-100 transition-colors">Pricing Tiers</a>
          </nav>

          {/* Login | Register CTAs */}
          <div className="flex items-center gap-2 sm:gap-4 bg-slate-900/60 border border-slate-850 p-1 rounded-2xl">
            <button
              onClick={onLoginClick}
              className="px-3.5 py-2 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 hover:bg-slate-800/40"
            >
              <LogIn className="w-3.5 h-3.5 text-indigo-400" />
              <span>Login</span>
            </button>
            <span className="w-[1px] h-4 bg-slate-800" />
            <button
              onClick={onRegisterClick || onLoginClick}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Tagline pill */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-950/50 border border-indigo-900 rounded-full text-indigo-300 text-[10px] font-bold uppercase tracking-wider mb-6 shadow-sm"
        >
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span>Enterprise Performance & Latency Monitor</span>
        </motion.div>

        {/* Big Display Heading */}
        <motion.h1 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.1] max-w-4xl"
        >
          Real-Time Server & Latency <br className="hidden md:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-300">
            Monitoring on Autopilot
          </span>
        </motion.h1>

        {/* Description */}
        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed font-medium"
        >
          High-frequency status logs, intelligent custom alert relays, and flexible prepaid account credits. Track network response times down to the millisecond and keep your services reliable.
        </motion.p>

        {/* Action Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
        >
          <button
            onClick={onLoginClick}
            className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black transition-all shadow-xl shadow-indigo-600/30 cursor-pointer flex items-center justify-center gap-2 group"
          >
            <span>Launch Dashboard Console</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <a
            href="#pricing"
            className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center"
          >
            Explore Plans & Pricing
          </a>
        </motion.div>

        {/* 3. MOCK REALTIME METRICS DASHBOARD DEMO PREVIEW (CRAFTSMANSHIP SHOWCASE) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="w-full max-w-4xl mt-16 bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative"
        >
          {/* Header of Mock Window */}
          <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-850 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-slate-500 font-bold font-mono ml-2 uppercase">UptimePro Live Dashboard Workspace</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-900 font-bold font-mono uppercase">
                SANDBOX PREVIEW
              </span>
            </div>
          </div>

          {/* Main Body of Mock Window */}
          <div className="p-6 text-left grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-900">
            {/* Monitor 1 */}
            <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-2xl space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-black text-white">Google DNS Endpoint</h4>
                  <span className="text-[9px] text-slate-500 font-mono font-bold uppercase block mt-0.5">IP: 8.8.8.8</span>
                </div>
                <span className="text-[9px] bg-emerald-950/60 text-emerald-400 border border-emerald-900 px-2 py-0.5 rounded-md font-extrabold uppercase">
                  ACTIVE
                </span>
              </div>
              
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-xl font-bold text-slate-100">12 ms</span>
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                  <span>99.98% SLA</span>
                </span>
              </div>
              
              {/* Fake Live History Bar */}
              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 font-bold font-mono block">LIVE TIMELINE (INTERVAL: 5S)</span>
                <div className="flex gap-[2px]">
                  {[...Array(24)].map((_, i) => (
                    <span 
                      key={i} 
                      className={`flex-1 h-3 rounded-xs ${
                        i === 15 ? "bg-amber-500" : i === 7 ? "bg-indigo-500" : "bg-emerald-500"
                      }`} 
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Monitor 2 */}
            <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-2xl space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-black text-white">Binance Smart Chain RPC</h4>
                  <span className="text-[9px] text-slate-500 font-mono font-bold uppercase block mt-0.5">URL: bsc-dataseed.binance.org</span>
                </div>
                <span className="text-[9px] bg-emerald-950/60 text-emerald-400 border border-emerald-900 px-2 py-0.5 rounded-md font-extrabold uppercase">
                  ACTIVE
                </span>
              </div>
              
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-xl font-bold text-slate-100">45 ms</span>
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                  <span>100.00% SLA</span>
                </span>
              </div>
              
              {/* Fake Live History Bar */}
              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 font-bold font-mono block">LIVE TIMELINE (INTERVAL: 5S)</span>
                <div className="flex gap-[2px]">
                  {[...Array(24)].map((_, i) => (
                    <span key={i} className="flex-1 h-3 rounded-xs bg-emerald-500" />
                  ))}
                </div>
              </div>
            </div>

            {/* Monitor 3 */}
            <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-2xl space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-black text-white">Backup SMTP Relay</h4>
                  <span className="text-[9px] text-slate-500 font-mono font-bold uppercase block mt-0.5">HOST: smtp.relay.net</span>
                </div>
                <span className="text-[9px] bg-indigo-950/60 text-indigo-400 border border-indigo-900 px-2 py-0.5 rounded-md font-extrabold uppercase">
                  PENDING
                </span>
              </div>
              
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-xl font-bold text-slate-400">Offline</span>
                <span className="text-[10px] text-indigo-400 font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-indigo-500 animate-spin" />
                  <span>Queued Checks</span>
                </span>
              </div>
              
              {/* Fake Live History Bar */}
              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 font-bold font-mono block">LIVE TIMELINE (INTERVAL: 5S)</span>
                <div className="flex gap-[2px]">
                  {[...Array(24)].map((_, i) => (
                    <span 
                      key={i} 
                      className={`flex-1 h-3 rounded-xs ${
                        i >= 18 ? "bg-slate-800" : "bg-emerald-500"
                      }`} 
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 4. DETAILED FEATURES GRID */}
      <section id="features" className="py-20 bg-slate-900/40 border-t border-b border-slate-900 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono">POWERFUL SPECIFICATIONS</span>
            <h2 className="text-3xl font-black text-white tracking-tight">Fully Loaded Latency Monitoring Suite</h2>
            <p className="text-xs text-slate-400 max-w-xl mx-auto leading-relaxed">
              Every detail is designed to give you instant visibility into node status and minimize downtimes before they affect your endpoints.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-3xl space-y-4">
              <div className="p-3 bg-indigo-600/10 text-indigo-400 rounded-2xl w-fit border border-indigo-900/50">
                <Zap className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-white">Granular Polling Intervals</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Support check frequencies down to a hyper-precise 5 seconds. Get instant notifications of transient connectivity drops and network micro-failures.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-3xl space-y-4">
              <div className="p-3 bg-indigo-600/10 text-indigo-400 rounded-2xl w-fit border border-indigo-900/50">
                <Bell className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-white">Dual Notifications Channels</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Receive instant system alerts via Telegram Custom Bots or robust SMTP email relays, configured globally or individually per monitor.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-3xl space-y-4">
              <div className="p-3 bg-indigo-600/10 text-indigo-400 rounded-2xl w-fit border border-indigo-900/50">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-white">Prepaid Balance Desk</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Avoid subscription and billing lockups. Credit your balance using secure, flexible prepaid methods, configured inside your sandbox workspace with automatic instant validation.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-3xl space-y-4">
              <div className="p-3 bg-indigo-600/10 text-indigo-400 rounded-2xl w-fit border border-indigo-900/50">
                <Activity className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-white">Interactive Latency Curves</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Track response history logs with clean Area Charts detailing spike metrics, packet loss, average latency, and historical execution results.
                </p>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-3xl space-y-4">
              <div className="p-3 bg-indigo-600/10 text-indigo-400 rounded-2xl w-fit border border-indigo-900/50">
                <Shield className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-white">SSRF Security Protections</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Includes secure internal DNS loopback and private hostname filter guards protecting local networks from hazardous SSRF endpoint requests.
                </p>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-3xl space-y-4">
              <div className="p-3 bg-indigo-600/10 text-indigo-400 rounded-2xl w-fit border border-indigo-900/50">
                <Cpu className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-white">Super Admin Director Panel</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Dedicated backend view to alter global alert rules, dispatch test notifications, monitor system worker logs, and override subscriber balances.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PREPAID BALANCE PLATFORM DESCRIPTION */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono">FLEXIBLE BILLING</span>
            <h2 className="text-3xl font-black text-white tracking-tight leading-tight">Prepaid Account Credit Balance</h2>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            To ensure maximum operational flexibility and zero downtime, UptimePro utilizes prepaid account credits. Users maintain an individual, persistent platform balance that covers their active monitors. 
          </p>
          
          <div className="space-y-3.5">
            <div className="flex gap-3 items-start text-xs">
              <div className="p-1 bg-emerald-950/80 text-emerald-400 border border-emerald-900 rounded-lg mt-0.5 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-200 block">Automated Ledger Logging</span>
                <span className="text-slate-400">Our ledger system automatically processes submitted deposit transaction hashes and instantly credits your balance.</span>
              </div>
            </div>

            <div className="flex gap-3 items-start text-xs">
              <div className="p-1 bg-emerald-950/80 text-emerald-400 border border-emerald-900 rounded-lg mt-0.5 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-200 block">Durable Balance Persistence</span>
                <span className="text-slate-400">Monthly subscription rates are automatically deducted from your credit pool. Downtimes occur only if your balance reaches zero.</span>
              </div>
            </div>

            <div className="flex gap-3 items-start text-xs">
              <div className="p-1 bg-emerald-950/80 text-emerald-400 border border-emerald-900 rounded-lg mt-0.5 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-200 block">Simulated Sandbox Playground</span>
                <span className="text-slate-400">Need to test? Use our simulated ledger validator to instantly generate sandbox funds and try out monitors with built-in tools.</span>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={onLoginClick}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white rounded-2xl text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>Test Deposit Simulator</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Isometric visual panel representing deposit verify flow */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full filter blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="text-xs font-black text-white">Deposit Flow Diagram</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">100% Automated</span>
          </div>

          {/* Steps list */}
          <div className="space-y-4 relative">
            <div className="absolute top-2.5 bottom-2.5 left-4.5 w-[1px] bg-slate-800" />

            {/* Step 1 */}
            <div className="flex gap-4 items-start relative z-10">
              <span className="w-9 h-9 bg-slate-950 border border-slate-800 text-indigo-400 text-xs font-bold font-mono rounded-xl flex items-center justify-center shrink-0">
                01
              </span>
              <div className="text-xs">
                <span className="font-bold text-slate-200 block">Simulate Deposit</span>
                <span className="text-slate-400 block mt-0.5">Submit a simulated sandbox hash to add mock funds instantly inside the portal.</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4 items-start relative z-10">
              <span className="w-9 h-9 bg-slate-950 border border-slate-800 text-indigo-400 text-xs font-bold font-mono rounded-xl flex items-center justify-center shrink-0">
                02
              </span>
              <div className="text-xs">
                <span className="font-bold text-slate-200 block">Submit Hash</span>
                <span className="text-slate-400 block mt-0.5">Enter any standard 64-character transaction hash into the Deposit Desk.</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4 items-start relative z-10">
              <span className="w-9 h-9 bg-indigo-600 text-white text-xs font-bold font-mono rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/20">
                03
              </span>
              <div className="text-xs">
                <span className="font-bold text-slate-200 block">Instant Verification</span>
                <span className="text-slate-400 block mt-0.5">Our sandbox verification system parses the submission, validates the ledger status, and immediately credits your prepaid balance.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PRICING PLANS SECTION */}
      <section id="pricing" className="py-20 bg-slate-900/20 border-t border-slate-900 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono font-bold">TRANSPARENT TARIFFS</span>
            <h2 className="text-3xl font-black text-white tracking-tight">Flexible Subscriptions for All Scopes</h2>
            <p className="text-xs text-slate-400 max-w-xl mx-auto leading-relaxed">
              Choose the package that matches your operational footprint. Instantly upgrade or downgrade with decentralized credits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {displayPlans.map((plan, idx) => {
              const isPro = plan.id === "pro";
              const isFree = plan.id === "free";
              const planName = plan.name.split("/")[0].trim();
              const planSubName = plan.name.split("/")[1] ? plan.name.split("/")[1].trim() : "";

              return (
                <div 
                  key={plan.id}
                  className={`bg-slate-900 rounded-3xl p-6 border flex flex-col justify-between space-y-6 relative overflow-hidden transition-all duration-300 hover:translate-y-[-4px] ${
                    isPro 
                      ? "border-indigo-500 shadow-xl shadow-indigo-500/5 ring-1 ring-indigo-500/20" 
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {isPro && (
                    <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-extrabold uppercase tracking-widest py-1.5 px-3.5 rounded-bl-xl font-mono">
                      RECOMMENDED
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider block font-mono">{planSubName || "Standard"}</span>
                      <h3 className="text-xl font-black text-white mt-1 capitalize">{planName}</h3>
                    </div>

                    <div className="flex items-baseline gap-1.5 py-2">
                      <span className="text-4xl font-black text-white">${plan.price}</span>
                      <span className="text-xs text-slate-400 font-medium">/ {plan.valid_days || 30} days</span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                      Best suited for {isFree ? "simple hobby projects" : isPro ? "professional developers and operators" : "large enterprise network nodes"}.
                    </p>

                    <div className="pt-4 border-t border-slate-800/80 space-y-3.5">
                      <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest block font-mono">Limits & Allowances</span>
                      
                      <div className="flex items-center gap-2.5 text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-slate-200">Up to <strong className="font-extrabold text-white">{plan.max_monitors}</strong> active monitors</span>
                      </div>

                      <div className="flex items-center gap-2.5 text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-slate-200">Minimum interval: <strong className="font-extrabold text-white">{plan.min_interval_sec}s</strong></span>
                      </div>

                      {/* Display feature details */}
                      {plan.features ? (
                        plan.features.map((feature, fIdx) => (
                          <div key={fIdx} className="flex items-center gap-2.5 text-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="text-slate-300">{feature}</span>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5 text-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="text-slate-300">Custom alert relays</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="text-slate-300">Realtime latency charting</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={onLoginClick}
                    className={`w-full py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                      isPro 
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/10" 
                        : "bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white"
                    }`}
                  >
                    Activate {planName} Plan
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-12 shrink-0 mt-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
              <Network className="w-4 h-4" />
            </div>
            <span className="text-xs font-black text-white tracking-tight">UptimePro</span>
          </div>

          <p className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-widest">
            DECOUPLED MONITORING PLATFORM &copy; 2026. ALL RIGHTS RESERVED.
          </p>

          <div className="flex gap-4 text-xs font-bold text-indigo-400">
            <button onClick={onLoginClick} className="hover:text-indigo-300 cursor-pointer">Login Portal</button>
            <span className="text-slate-800">|</span>
            <a href="#features" className="hover:text-indigo-300 transition-colors">Specifications</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
