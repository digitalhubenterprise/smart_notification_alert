import { apiFetch } from "./lib/api";
import React, { useState, useEffect, useRef } from "react";
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
  ArrowUpRight,
  Lock,
  Mail,
  Smartphone,
  Key,
  Database,
  LayoutDashboard
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import SubscriberDashboard from "./components/SubscriberDashboard.tsx";
import AdminDashboard from "./components/AdminDashboard.tsx";
import LandingPage from "./components/LandingPage.tsx";
import { User, Monitor, Payment, AlertConfig, SubscriptionPlan } from "./types.ts";

export default function App() {
  // Session Login Status
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("uptimepro_isLoggedIn") === "true";
  });

  // Navigation State when not logged in ("landing", "login", "register", "forgot_password")
  const [activePage, setActivePage] = useState<"landing" | "login" | "register" | "forgot_password">(() => {
    return (localStorage.getItem("uptimepro_activePage") as any) || "landing";
  });

  // Login Input Credentials
  const [loginEmail, setLoginEmail] = useState(() => {
    return localStorage.getItem("uptimepro_loginEmail") || "subscriber@uptimepro.io";
  });
  const [loginPassword, setLoginPassword] = useState(() => {
    return localStorage.getItem("uptimepro_loginPassword") || "password123";
  });
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Login 2FA states
  const [require2fa, setRequire2fa] = useState(false);
  const [login2faDeliveryMethod, setLogin2faDeliveryMethod] = useState<"email" | "telegram">("email");
  const [login2faOtp, setLogin2faOtp] = useState("");
  const [simulatedLoginOtp, setSimulatedLoginOtp] = useState<string | null>(null);
  const [isVerifyingLoginOtp, setIsVerifyingLoginOtp] = useState(false);

  // Register Form State
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerChatId, setRegisterChatId] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  // Password Reset / Forgot Password State
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotDeliveryMethod, setForgotDeliveryMethod] = useState<"email" | "telegram">("email");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [simulatedOtp, setSimulatedOtp] = useState<string | null>(null);

  // Active Role State ("subscriber" or "admin")
  const [activeRole, setActiveRole] = useState<"subscriber" | "admin">(() => {
    return (localStorage.getItem("uptimepro_activeRole") as any) || "subscriber";
  });

  // Sub-tab Navigation States (persists selected sub-tabs when switching views)
  const [subscriberTab, setSubscriberTab] = useState<"monitors" | "wallet" | "billing" | "history" | "settings">(() => {
    return (localStorage.getItem("uptimepro_subscriberTab") as any) || "monitors";
  });
  const [adminTab, setAdminTab] = useState<"dashboard" | "settings" | "subscribers" | "logs" | "plans" | "backups">(() => {
    return (localStorage.getItem("uptimepro_adminTab") as any) || "dashboard";
  });

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
  const [isProfileSyncing, setIsProfileSyncing] = useState(false);

  // Refs for API request optimization (prevents concurrent fetches & race conditions)
  const abortControllerRef = useRef<AbortController | null>(null);
  const isFetchingRef = useRef<boolean>(false);

  // Auto-abort fetching on component unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Persistent Storage Sync Effects
  useEffect(() => {
    localStorage.setItem("uptimepro_isLoggedIn", String(isLoggedIn));
  }, [isLoggedIn]);

  useEffect(() => {
    localStorage.setItem("uptimepro_activePage", activePage);
  }, [activePage]);

  useEffect(() => {
    localStorage.setItem("uptimepro_loginEmail", loginEmail);
  }, [loginEmail]);

  useEffect(() => {
    localStorage.setItem("uptimepro_loginPassword", loginPassword);
  }, [loginPassword]);

  useEffect(() => {
    localStorage.setItem("uptimepro_activeRole", activeRole);
  }, [activeRole]);

  useEffect(() => {
    localStorage.setItem("uptimepro_subscriberTab", subscriberTab);
  }, [subscriberTab]);

  useEffect(() => {
    localStorage.setItem("uptimepro_adminTab", adminTab);
  }, [adminTab]);

  // Trigger global data refresh
  const loadPlatformData = async (silent = false, customEmail?: string) => {
    // loading state check to ignore concurrent fetch requests
    if (isFetchingRef.current) {
      return;
    }

    // Abort any outstanding previous sync request to prevent race conditions
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create a new AbortController for the current fetch batch
    const controller = new AbortController();
    abortControllerRef.current = controller;
    isFetchingRef.current = true;

    if (!silent) setIsRefreshing(true);
    try {
      const activeEmail = customEmail || loginEmail || localStorage.getItem("uptimepro_loginEmail") || "subscriber@uptimepro.io";
      const headers: Record<string, string> = {
        "x-user-email": activeEmail
      };
      const token = localStorage.getItem("uptimepro_authToken");
      if (token) headers["x-auth-token"] = token;

      // Pass the abort signal in options
      const options = { headers, signal: controller.signal };

      // Parallel fetches for speed and reliability
      const [userRes, monitorsRes, paymentsRes, configRes, plansRes] = await Promise.all([
        apiFetch(`/api/user?email=${encodeURIComponent(activeEmail)}`, options),
        apiFetch(`/api/monitors?email=${encodeURIComponent(activeEmail)}`, options),
        apiFetch(`/api/payment/history?email=${encodeURIComponent(activeEmail)}`, options),
        apiFetch(`/api/config?email=${encodeURIComponent(activeEmail)}`, options),
        apiFetch(`/api/plans?email=${encodeURIComponent(activeEmail)}`, options)
      ]);

      if (userRes.status === 401 || userRes.status === 404) {
        const isLoggedInVal = localStorage.getItem("uptimepro_isLoggedIn") === "true";
        if (isLoggedInVal) {
          setIsProfileSyncing(true);
          setError(null);
          // Auto-retry fetching after 2 seconds to check if profile has propagated
          setTimeout(() => {
            loadPlatformData(true, customEmail);
          }, 2000);
          return;
        }

        setIsLoggedIn(false);
        setActivePage("login");
        localStorage.removeItem("uptimepro_isLoggedIn");
        localStorage.removeItem("uptimepro_activePage");
        localStorage.removeItem("uptimepro_loginEmail");
        localStorage.removeItem("uptimepro_loginPassword");
        localStorage.removeItem("uptimepro_authToken");
        setUser(null);
        setAuthError("Your session expired or your profile could not be found. Please register or log in again.");
        return;
      }

      if (!userRes.ok || !monitorsRes.ok || !paymentsRes.ok || !configRes.ok || !plansRes.ok) {
        const failedRes = [
          { name: "User profile", res: userRes },
          { name: "Monitors list", res: monitorsRes },
          { name: "Payment history", res: paymentsRes },
          { name: "System configuration", res: configRes },
          { name: "Service plans", res: plansRes }
        ].find(item => !item.res.ok);

        // Handle edge case where User profile failed to load but the user is authenticated (Profile Syncing)
        if (failedRes && failedRes.name === "User profile") {
          const isLoggedInVal = localStorage.getItem("uptimepro_isLoggedIn") === "true";
          if (isLoggedInVal) {
            setIsProfileSyncing(true);
            setError(null);
            setTimeout(() => {
              loadPlatformData(true, customEmail);
            }, 2000);
            return;
          }
        }

        const statusText = failedRes ? `(${failedRes.name} returned status ${failedRes.res.status})` : "";
        throw new Error(`Failed to load server data ${statusText}. Server might be initializing...`);
      }

      const [userData, monitorsData, paymentsData, configData, plansData] = await Promise.all([
        userRes.json(),
        monitorsRes.json(),
        paymentsRes.json(),
        configRes.json(),
        plansRes.json()
      ]);

      const isLocalAdmin = userData?.id === "user-admin";
      
      let allUsersData = [];
      if (isLocalAdmin) {
        const allUsersRes = await apiFetch(`/api/admin/users?email=${encodeURIComponent(activeEmail)}`, options);
        if (allUsersRes.ok) {
          allUsersData = await allUsersRes.json();
        }
      }

       setUser(userData);
      setIsProfileSyncing(false);
      setActiveRole(isLocalAdmin ? "admin" : "subscriber");
      setAllUsers(allUsersData);
      setMonitors(monitorsData);
      setPayments(paymentsData);
      setConfig(configData);
      setPlans(plansData);
      setError(null);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Ignored, as this is due to a deliberate cancellation
        return;
      }
      setError(err.message || "Failed to sync with UptimePro Express backend. Re-trying...");
      // Auto-retry if it's the initialization error
      if (err.message?.includes("initializing")) {
        setTimeout(() => {
          loadPlatformData(true, customEmail);
        }, 2000);
      }
    } finally {
      // Only reset fetching state if the active controller was the one executing
      if (abortControllerRef.current === controller) {
        isFetchingRef.current = false;
        setIsLoading(false);
        setIsRefreshing(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleStopImpersonation = () => {
    const adminEmail = localStorage.getItem("uptimepro_adminEmail");
    const adminToken = localStorage.getItem("uptimepro_adminToken");
    if (adminEmail && adminToken) {
      localStorage.setItem("uptimepro_loginEmail", adminEmail);
      localStorage.setItem("uptimepro_authToken", adminToken);
      localStorage.removeItem("uptimepro_adminEmail");
      localStorage.removeItem("uptimepro_adminToken");
      localStorage.setItem("uptimepro_activeRole", "admin");
      window.location.reload();
    }
  };

  // On first mount, boot data using current email only if user is logged in
  useEffect(() => {
    const isLoggedInVal = localStorage.getItem("uptimepro_isLoggedIn") === "true";
    const token = localStorage.getItem("uptimepro_authToken");
    if (isLoggedInVal && token) {
      const activeEmail = localStorage.getItem("uptimepro_loginEmail") || loginEmail;
      loadPlatformData(false, activeEmail);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Automatic Session Timeout for Admin Dashboard (30 minutes of inactivity)
  useEffect(() => {
    // Only monitor inactivity if the user is logged in as an admin
    if (!isLoggedIn || activeRole !== "admin") {
      return;
    }

    const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
    let lastActive = Date.now();

    const updateActivity = () => {
      lastActive = Date.now();
    };

    // Events to monitor user interactions
    const activityEvents = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    // Listen for activity events
    activityEvents.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // Check for inactivity every 10 seconds
    const intervalId = setInterval(() => {
      const timeSinceLastActive = Date.now() - lastActive;
      if (timeSinceLastActive >= TIMEOUT_MS) {
        // Clear all auth state and redirect to login page
        setIsLoggedIn(false);
        setActivePage("login");
        setIsSidebarOpen(false);
        setActiveRole("subscriber");
        setSubscriberTab("monitors");
        setAdminTab("settings");
        localStorage.removeItem("uptimepro_isLoggedIn");
        localStorage.removeItem("uptimepro_activePage");
        localStorage.removeItem("uptimepro_activeRole");
        localStorage.removeItem("uptimepro_subscriberTab");
        localStorage.removeItem("uptimepro_adminTab");
        localStorage.removeItem("uptimepro_authToken");
        
        setAuthError("Your admin session has expired due to 30 minutes of inactivity. Please log in again.");
        
        // Trigger background api logout
        apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      }
    }, 10000); // 10 second check cycle

    return () => {
      // Cleanup event listeners and interval timer
      activityEvents.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(intervalId);
    };
  }, [isLoggedIn, activeRole]);

  // Cryptographic Authentication Handlers

  // Login Handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setRequire2fa(false);
    setSimulatedLoginOtp(null);
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login handshake failed.");
      }

      if (data.require2fa) {
        setRequire2fa(true);
        setLogin2faDeliveryMethod(data.deliveryMethod);
        setSimulatedLoginOtp(data.simulated_otp);
        setAuthSuccess(`Cryptographic 2FA is active. An OTP code has been sent to your registered ${data.deliveryMethod === "email" ? "Email Inbox" : "Telegram Thread"}.`);
        return;
      }

      const isLocalAdmin = data.user?.id === "user-admin";
      const detectedRole = isLocalAdmin ? "admin" : "subscriber";
      setActiveRole(detectedRole);
      if (detectedRole === "admin") {
        setAdminTab("dashboard");
      }
      localStorage.setItem("uptimepro_loginEmail", data.user.email);
      setLoginEmail(data.user.email);
      localStorage.setItem("uptimepro_authToken", data.token);
      setIsLoggedIn(true);
      
      // Load platform metrics synchronously for the newly logged-in account
      setTimeout(() => {
        loadPlatformData(true, data.user.email);
      }, 50);
    } catch (err: any) {
      setAuthError(err.message || "Cryptographic authentication failed. Verify credentials.");
    }
  };

  // Login 2FA Handler
  const handleLogin2faSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setIsVerifyingLoginOtp(true);
    try {
      const res = await apiFetch("/api/auth/login-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, otp: login2faOtp })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid 2FA code.");
      }

      const isLocalAdmin = data.user?.id === "user-admin";
      const detectedRole = isLocalAdmin ? "admin" : "subscriber";
      setActiveRole(detectedRole);
      if (detectedRole === "admin") {
        setAdminTab("dashboard");
      }
      localStorage.setItem("uptimepro_loginEmail", data.user.email);
      setLoginEmail(data.user.email);
      localStorage.setItem("uptimepro_authToken", data.token);
      setIsLoggedIn(true);
      setRequire2fa(false);
      setSimulatedLoginOtp(null);
      setLogin2faOtp("");
      setAuthSuccess("Two-Factor authentication handshake succeeded! Logged in successfully.");
      
      // Load platform metrics synchronously for the newly logged-in account
      setTimeout(() => {
        loadPlatformData(true, data.user.email);
      }, 50);
    } catch (err: any) {
      setAuthError(err.message || "Cryptographic 2FA verification failed. Please try again.");
    } finally {
      setIsVerifyingLoginOtp(false);
    }
  };

  // Registration Handler
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setIsRegistering(true);

    try {
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerName,
          email: registerEmail,
          phone: registerPhone,
          password: registerPassword,
          telegram_chat_id: registerChatId
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "TLS Registration failed.");
      }

      setAuthSuccess(`Secure node profile registered! You can now log in using your password.`);
      setLoginEmail(registerEmail);
      setLoginPassword("");
      
      // Clear registration form
      setRegisterName("");
      setRegisterEmail("");
      setRegisterPhone("");
      setRegisterPassword("");
      setRegisterChatId("");

      // Switch to login view
      setActivePage("login");
    } catch (err: any) {
      const errMsg = err.message || "Failed to register secure node.";
      setAuthError(errMsg);
      if (errMsg.toLowerCase().includes("already registered") || errMsg.toLowerCase().includes("exist")) {
        setForgotEmail(registerEmail);
      }
    } finally {
      setIsRegistering(false);
    }
  };

  // OTP Dispatch Request
  const handleRequestOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setIsRequestingOtp(true);
    setSimulatedOtp(null);

    try {
      const res = await apiFetch("/api/auth/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail,
          delivery_method: forgotDeliveryMethod
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "OTP dispatch failed.");
      }

      setOtpSent(true);
      setSimulatedOtp(data.simulated_otp || null);
      setAuthSuccess(data.message || `Secure OTP token dispatched via ${forgotDeliveryMethod.toUpperCase()}.`);
    } catch (err: any) {
      setAuthError(err.message || "Failed to request OTP. Check email node registration.");
    } finally {
      setIsRequestingOtp(false);
    }
  };

  // OTP Verification & Commit Password Reset
  const handleVerifyResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setIsVerifyingOtp(true);

    try {
      const res = await apiFetch("/api/auth/reset-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail,
          otp: forgotOtp,
          new_password: forgotNewPassword
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Cryptographic OTP verification failed.");
      }

      setAuthSuccess(data.message || "Password successfully reset! Secure node updated.");
      setLoginEmail(forgotEmail);
      setLoginPassword("");
      
      // Clear forgot state
      setForgotEmail("");
      setForgotOtp("");
      setForgotNewPassword("");
      setOtpSent(false);
      setSimulatedOtp(null);

      // Switch to login view
      setActivePage("login");
    } catch (err: any) {
      setAuthError(err.message || "Verification failed. Check the code and retry.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

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
                <span>Monitors</span>
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
                <span>Subscription</span>
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
                  setAdminTab("dashboard");
                  setIsSidebarOpen(false);
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                  adminTab === "dashboard"
                    ? "bg-slate-850 text-white border-l-4 border-indigo-500 font-bold"
                    : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                }`}
              >
                <LayoutDashboard className={`w-4 h-4 ${adminTab === "dashboard" ? "text-indigo-500" : ""}`} />
                <span>Super Admin Dashboard</span>
              </button>

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
                <span>Subscriber</span>
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

              <button
                onClick={() => {
                  setAdminTab("backups");
                  setIsSidebarOpen(false);
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                  adminTab === "backups"
                    ? "bg-slate-850 text-white border-l-4 border-indigo-500 font-bold"
                    : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                }`}
              >
                <Database className={`w-4 h-4 ${adminTab === "backups" ? "text-indigo-500" : ""}`} />
                <span>Cloud & DB Backups</span>
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
          <span className="text-[9px] text-slate-500 uppercase font-mono tracking-wide">UptimePro v4.0</span>
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
            setActivePage("landing");
            setIsSidebarOpen(false);
            setActiveRole("subscriber");
            setSubscriberTab("monitors");
            setAdminTab("settings");
            localStorage.removeItem("uptimepro_isLoggedIn");
            localStorage.removeItem("uptimepro_activePage");
            localStorage.removeItem("uptimepro_activeRole");
            localStorage.removeItem("uptimepro_subscriberTab");
            localStorage.removeItem("uptimepro_adminTab");
            localStorage.removeItem("uptimepro_authToken");
            apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
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

  if (isLoggedIn && (isProfileSyncing || (!user && activeRole === "subscriber"))) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="space-y-4 max-w-sm">
          {/* Glowing pulse animation */}
          <div className="relative flex items-center justify-center w-16 h-16 mx-auto bg-indigo-100 rounded-full text-indigo-600 animate-pulse">
            <RefreshCw className="w-8 h-8 animate-spin" style={{ animationDuration: '2s' }} />
            <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-20 animate-ping"></span>
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-black tracking-tight text-slate-800">Profile Syncing...</h1>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              We are finalizing your cryptographic secure profile. Your node telemetry will be active shortly.
            </p>
          </div>
          <div className="text-[10px] text-slate-400 font-mono bg-slate-100 px-3 py-1.5 rounded-lg inline-block">
            Status: Propagating to blockchain registry...
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    if (activePage === "landing") {
      return (
        <LandingPage 
          onLoginClick={() => {
            setActivePage("login");
            setAuthError(null);
            setAuthSuccess(null);
          }} 
          onRegisterClick={() => {
            setActivePage("register");
            setAuthError(null);
            setAuthSuccess(null);
          }}
          plans={plans} 
        />
      );
    }

    // Password strength score calculation helper
    const getPasswordStrength = (pass: string) => {
      if (!pass) return { score: 0, label: "None", color: "text-slate-500", bar: "w-0 bg-slate-800" };
      let score = 0;
      if (pass.length >= 8) score += 1;
      if (/[A-Z]/.test(pass)) score += 1;
      if (/[0-9]/.test(pass)) score += 1;
      if (/[^A-Za-z0-9]/.test(pass)) score += 1;
      
      if (score <= 1) return { score, label: "Weak Password", color: "text-rose-450 font-bold", bar: "w-1/3 bg-rose-500" };
      if (score <= 3) return { score, label: "Moderate Protection", color: "text-amber-455 font-bold", bar: "w-2/3 bg-amber-500" };
      return { score, label: "Strong Password", color: "text-emerald-450 font-bold", bar: "w-full bg-emerald-500" };
    };

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-indigo-500/15 font-sans relative overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full filter blur-3xl -z-10 animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full filter blur-3xl -z-10 animate-pulse duration-4000" />

        {/* Back to Home Button */}
        <button
          onClick={() => {
            setActivePage("landing");
            setAuthError(null);
            setAuthSuccess(null);
          }}
          className="absolute top-6 left-6 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 px-4 py-2 rounded-xl"
        >
          <span>&larr;</span>
          <span>Back to Homepage</span>
        </button>

        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl relative z-10 my-8">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3.5 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20 mb-2">
              <Shield className="w-8 h-8 animate-pulse" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">UptimePro Portal</h1>
            <p className="text-xs text-slate-400">Enterprise Latency & Uptime Monitoring Portal</p>
          </div>

          {/* Secure Handshake Badges */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-850 flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping" />
              <span className="text-slate-400">SECURE ENCRYPTED SESSION</span>
            </span>
            <span className="text-emerald-500 flex items-center gap-1">
              <span>SECURE CONNECTION ACTIVE</span>
            </span>
          </div>

          {/* Global Auth Errors / Successes */}
          {authError && (
            <div className="p-3.5 bg-rose-950/30 border border-rose-900/50 rounded-xl text-rose-300 text-xs font-medium space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-rose-200">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                Authentication Error:
              </p>
              <p className="text-[11px] leading-relaxed opacity-90">{authError}</p>
              {(authError.toLowerCase().includes("already registered") || authError.toLowerCase().includes("exist") || authError.toLowerCase().includes("forgot") || authError.toLowerCase().includes("recover")) && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActivePage("forgot_password");
                      setAuthError(null);
                      setAuthSuccess(null);
                    }}
                    className="text-xs font-black text-indigo-400 hover:text-indigo-300 underline cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>Forgot your password or account? Recover access now &rarr;</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {authSuccess && (
            <div className="p-3.5 bg-emerald-950/30 border border-emerald-900/50 rounded-xl text-emerald-300 text-xs font-medium space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-emerald-200">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Authentication Successful:
              </p>
              <p className="text-[11px] leading-relaxed opacity-90">{authSuccess}</p>
            </div>
          )}

          {/* VIEW: LOGIN PORTAL */}
          {activePage === "login" && (
            require2fa ? (
              <form onSubmit={handleLogin2faSubmit} className="space-y-4">
                {/* Simulated OTP Display Banner */}
                {simulatedLoginOtp && (
                  <div className="p-4 bg-slate-950 border-2 border-dashed border-indigo-500/40 rounded-2xl space-y-2 select-none animate-pulse">
                    <div className="flex items-center justify-between text-[10px] text-indigo-400 font-bold uppercase">
                      <span className="flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                        <span>Simulated Security 2FA OTP Code</span>
                      </span>
                      <span>{login2faDeliveryMethod.toUpperCase()} Channel</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-slate-400">Enter this code to bypass the challenge:</p>
                      <p className="text-base font-black text-white font-mono tracking-widest bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                        {simulatedLoginOtp}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-850">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block text-center">
                      Two-Factor verification code
                    </label>
                    <p className="text-[11px] text-slate-500 text-center leading-relaxed mb-2">
                      Please enter the 6-digit security OTP code dispatched to your registered {login2faDeliveryMethod === "authenticator" ? "Google Authenticator Client App" : login2faDeliveryMethod === "email" ? "Email Inbox" : "Telegram Bot Chat"}.
                    </p>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={login2faOtp}
                      onChange={(e) => setLogin2faOtp(e.target.value)}
                      placeholder="••••••"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-center text-sm text-white font-mono tracking-widest placeholder-slate-700 outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-bold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingLoginOtp}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>{isVerifyingLoginOtp ? "Verifying..." : "Verify & Complete Handshake"}</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRequire2fa(false);
                    setSimulatedLoginOtp(null);
                    setLogin2faOtp("");
                    setAuthSuccess(null);
                    setAuthError(null);
                  }}
                  className="w-full py-2 bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                >
                  Cancel & Go Back
                </button>
              </form>
            ) : (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-850">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Account Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-600" />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="subscriber@uptimepro.io or admin@uptimepro.io"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-600 font-medium outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Password</label>
                      <button
                        type="button"
                        onClick={() => {
                          setActivePage("forgot_password");
                          setAuthError(null);
                          setAuthSuccess(null);
                        }}
                        className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        Recover Account Access?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-600" />
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-600 font-mono outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Authorize & Log In</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>

                <div className="text-center pt-2">
                  <span className="text-[11px] text-slate-500">
                    New operator?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setActivePage("register");
                        setAuthError(null);
                        setAuthSuccess(null);
                      }}
                      className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                    >
                      Create an account &rarr;
                    </button>
                  </span>
                </div>
              </form>
            )
          )}

          {/* VIEW: REGISTER PORTAL */}
          {activePage === "register" && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="space-y-3.5 bg-slate-950/40 p-4 rounded-2xl border border-slate-850">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Full Name</label>
                  <input
                    type="text"
                    required
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="E.g. John Doe"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 font-medium outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-600" />
                    <input
                      type="email"
                      required
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      placeholder="operator@domain.com"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-600 font-medium outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Phone Number</label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-2.5 w-4 h-4 text-slate-600" />
                    <input
                      type="tel"
                      required
                      value={registerPhone}
                      onChange={(e) => setRegisterPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-600 font-medium outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Account Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-600" />
                    <input
                      type="password"
                      required
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-600 font-mono outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  {/* Dynamic Password Strength Indicator */}
                  {registerPassword && (
                    <div className="pt-2 space-y-1">
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="text-slate-500 uppercase tracking-widest font-bold">Password Strength:</span>
                        <span className={getPasswordStrength(registerPassword).color}>
                          {getPasswordStrength(registerPassword).label}
                        </span>
                      </div>
                      <div className="w-full h-1 bg-slate-850 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-300 ${getPasswordStrength(registerPassword).bar}`} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Telegram Chat ID</label>
                    <span className="text-[8px] text-slate-500 uppercase font-black px-1.5 py-0.5 bg-slate-850 rounded-sm">Optional</span>
                  </div>
                  <input
                    type="text"
                    value={registerChatId}
                    onChange={(e) => setRegisterChatId(e.target.value)}
                    placeholder="E.g. 58190302"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 font-mono outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isRegistering}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{isRegistering ? "Registering account..." : "Create Account"}</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <span className="text-[11px] text-slate-500">
                  Already registered?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setActivePage("login");
                      setAuthError(null);
                      setAuthSuccess(null);
                    }}
                    className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    Log in here &rarr;
                  </button>
                </span>
              </div>
            </form>
          )}

          {/* VIEW: FORGOT PASSWORD */}
          {activePage === "forgot_password" && (
            <div className="space-y-4">
              {!otpSent ? (
                // STEP 1: Enter email and select delivery method
                <form onSubmit={handleRequestOtpSubmit} className="space-y-4">
                  <div className="space-y-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-850">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Enter Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-600" />
                        <input
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="operator@domain.com"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-600 font-medium outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">OTP Delivery Method</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setForgotDeliveryMethod("email")}
                          className={`p-3.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                            forgotDeliveryMethod === "email"
                              ? "bg-indigo-950/40 border-indigo-500 text-indigo-200"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <Mail className="w-4 h-4" />
                          <span>Email</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setForgotDeliveryMethod("telegram")}
                          className={`p-3.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                            forgotDeliveryMethod === "telegram"
                              ? "bg-indigo-950/40 border-indigo-500 text-indigo-200"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <Smartphone className="w-4 h-4" />
                          <span>Telegram</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isRequestingOtp}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>{isRequestingOtp ? "Generating OTP..." : "Request Verification Code"}</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                // STEP 2: Input OTP and New Password
                <form onSubmit={handleVerifyResetSubmit} className="space-y-4">
                  {/* SIMULATED OTP DISPATCH BOX (EXTREMELY USEFUL FOR INTERACTIVE SIMULATION) */}
                  {simulatedOtp && (
                    <div className="p-3.5 bg-slate-950 border-2 border-dashed border-indigo-500/40 rounded-2xl space-y-2 select-none animate-pulse">
                      <div className="flex items-center justify-between text-[10px] text-indigo-400 font-bold uppercase">
                        <span className="flex items-center gap-1">
                          <Key className="w-3 h-3 text-indigo-400 animate-spin" />
                          <span>Simulated Verification Code Sent</span>
                        </span>
                        <span>{forgotDeliveryMethod.toUpperCase()} Channel</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-slate-400">Your temporary 6-digit security code:</p>
                        <p className="text-base font-black text-white font-mono tracking-widest bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                          {simulatedOtp}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-850">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">6-Digit Verification Code</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value)}
                        placeholder="E.g. 123456"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-center text-sm text-white font-mono tracking-widest placeholder-slate-700 outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-600" />
                        <input
                          type="password"
                          required
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-600 font-mono outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      {forgotNewPassword && (
                        <div className="pt-2 space-y-1">
                          <div className="flex justify-between items-center text-[9px]">
                            <span className="text-slate-500 uppercase tracking-widest font-bold">Password Strength:</span>
                            <span className={getPasswordStrength(forgotNewPassword).color}>
                              {getPasswordStrength(forgotNewPassword).label}
                            </span>
                          </div>
                          <div className="w-full h-1 bg-slate-850 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-300 ${getPasswordStrength(forgotNewPassword).bar}`} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifyingOtp}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>{isVerifyingOtp ? "Saving password..." : "Save New Password"}</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setSimulatedOtp(null);
                      setForgotOtp("");
                    }}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Resend Verification Code
                  </button>
                </form>
              )}

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActivePage("login");
                    setAuthError(null);
                    setAuthSuccess(null);
                    setOtpSent(false);
                    setSimulatedOtp(null);
                  }}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  &larr; Back to Login Portal
                </button>
              </div>
            </div>
          )}

          <div className="text-center">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold">UptimePro Secure Portal Session</span>
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
        
        {/* Impersonation Alert Banner */}
        {localStorage.getItem("uptimepro_adminEmail") && (
          <div className="bg-emerald-600 text-white px-4 py-2.5 flex items-center justify-between text-xs font-bold gap-3 z-40 relative shadow-sm border-b border-emerald-700">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 shrink-0 animate-pulse text-emerald-100" />
              <span>
                🔒 <strong>Impersonation Session Active:</strong> You are currently logged in as subscriber <span className="underline font-mono text-emerald-100">{user?.name} ({user?.email})</span>.
              </span>
            </div>
            <button
              onClick={handleStopImpersonation}
              className="bg-white hover:bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-[11px] font-black cursor-pointer transition-all shrink-0 shadow-xs uppercase tracking-wider"
            >
              Exit Impersonation
            </button>
          </div>
        )}

        {/* Global Announcement Notice Board */}
        {config?.global_notice_enabled && config?.global_notice && (
          <div className="bg-indigo-600 text-white px-4 py-2 flex items-center justify-center text-xs font-semibold gap-2.5 z-39 relative shadow-xs border-b border-indigo-700">
            <span className="bg-white/20 px-2 py-0.5 rounded-md text-[9px] uppercase tracking-wider font-extrabold shrink-0">Announcement</span>
            <span className="truncate">{config.global_notice}</span>
          </div>
        )}

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
                    : (adminTab === "dashboard" ? "System Core Overview & Metrics" : adminTab === "settings" ? "Global Settings & Gateways" : adminTab === "subscribers" ? "Subscriber directory" : adminTab === "plans" ? "Manage Subscription Plans & Pricing" : adminTab === "backups" ? "Database & Auto Cloud Backups" : "System concurrent logs")
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
                    onRefreshData={(newEmail?: string) => {
                      if (newEmail) {
                        setLoginEmail(newEmail);
                        localStorage.setItem("uptimepro_loginEmail", newEmail);
                        loadPlatformData(true, newEmail);
                      } else {
                        loadPlatformData(true);
                      }
                    }}
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
              <span className="text-xs font-bold text-slate-500 font-mono">UptimePro Monitoring Engine v4.0</span>
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
