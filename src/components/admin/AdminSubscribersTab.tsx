import { apiFetch } from "../../lib/api";
import { getSecureToken, setSecureToken } from "../../lib/session";
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { 
  Users, 
  Search, 
  Shield, 
  X,
  User as UserIcon,
  Mail,
  Phone,
  Wallet,
  Send,
  Calendar,
  Lock,
  Unlock,
  Copy,
  Check,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  HelpCircle
} from "lucide-react";
import { User, SubscriptionPlan } from "../../types.ts";

interface AdminSubscribersTabProps {
  users: User[];
  plans: SubscriptionPlan[];
  onRefreshData: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export default function AdminSubscribersTab({
  users,
  plans,
  onRefreshData,
  onSuccess,
  onError
}: AdminSubscribersTabProps) {
  const [subscriberSearch, setSubscriberSearch] = useState("");
  
  // Detailed edit states for "Modify Everything"
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserPhone, setEditUserPhone] = useState("");
  const [editUserBalance, setEditUserBalance] = useState(0);
  const [editUserPlan, setEditUserPlan] = useState<string>("free");
  const [editUserWallet, setEditUserWallet] = useState("");
  const [editUserTgChatId, setEditUserTgChatId] = useState("");
  const [editUser2faEmail, setEditUser2faEmail] = useState(false);
  const [editUser2faTelegram, setEditUser2faTelegram] = useState(false);
  const [editUserCreatedAt, setEditUserCreatedAt] = useState("");
  const [editUserCustomMaxMonitors, setEditUserCustomMaxMonitors] = useState<string>("");
  const [editUserCustomMinInterval, setEditUserCustomMinInterval] = useState<string>("");
  const [editUserStatus, setEditUserStatus] = useState<"Active" | "Pending" | "Suspended">("Active");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [copiedId, setCopiedId] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState<string | null>(null);

  const handleImpersonate = async (targetUser: User) => {
    try {
      setIsImpersonating(targetUser.id);
      const res = await apiFetch(`/api/admin/impersonate/${targetUser.id}`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        // Save original admin details before changing
        const currentEmail = localStorage.getItem("uptimepro_loginEmail");
        const currentToken = getSecureToken("uptimepro_authToken");
        if (currentEmail) localStorage.setItem("uptimepro_adminEmail", currentEmail);
        if (currentToken) setSecureToken(currentToken, "uptimepro_adminToken");

        // Set user details
        localStorage.setItem("uptimepro_loginEmail", data.user.email);
        setSecureToken(data.token, "uptimepro_authToken");
        localStorage.setItem("uptimepro_isLoggedIn", "true");
        localStorage.setItem("uptimepro_activeRole", "subscriber");

        onSuccess(`🚀 Now impersonating: ${data.user.name}`);
        window.location.reload();
      } else {
        const err = await res.json();
        onError(err.error || "Failed to impersonate subscriber.");
      }
    } catch (err: any) {
      onError(err.message || "Failed to initiate session switch.");
    } finally {
      setIsImpersonating(null);
    }
  };
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting2FA, setIsResetting2FA] = useState(false);
  const [isDrawerClosing, setIsDrawerClosing] = useState(false);

  // Filter subscribers list
  const filteredUsers = users.filter((u) => {
    const term = subscriberSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(term) || 
      u.email.toLowerCase().includes(term) || 
      (u.wallet_address && u.wallet_address.toLowerCase().includes(term))
    );
  });

  // Calculate remaining days Helper
  const getRemainingDaysText = (u: User) => {
    const userPlan = plans.find((p) => p.id === u.plan_id);
    const validDays = userPlan ? userPlan.valid_days : (u.plan_id === "free" ? 30 : u.plan_id === "pro" ? 30 : 365);
    
    if (validDays >= 9999) {
      return "Lifetime Free";
    }
    
    const expiresAt = new Date(u.createdAt).getTime() + validDays * 24 * 60 * 60 * 1000;
    const remainingMs = expiresAt - Date.now();
    const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
    if (remainingDays <= 0) {
      return "Expired";
    }
    return `${remainingDays} Day${remainingDays === 1 ? "" : "s"}`;
  };

  const startEditUser = (user: User) => {
    setEditingUser(user);
    setEditUserName(user.name);
    setEditUserEmail(user.email);
    setEditUserPhone(user.phone || "");
    setEditUserBalance(user.balance);
    setEditUserPlan(user.plan_id);
    setEditUserWallet(user.wallet_address || "");
    setEditUserTgChatId(user.telegram_chat_id || "");
    setEditUser2faEmail(!!user.two_factor_email);
    setEditUser2faTelegram(!!user.two_factor_telegram);
    setEditUserCreatedAt(user.createdAt || new Date().toISOString());
    setEditUserCustomMaxMonitors(user.custom_max_monitors !== undefined && user.custom_max_monitors !== null ? String(user.custom_max_monitors) : "");
    setEditUserCustomMinInterval(user.custom_min_interval_sec !== undefined && user.custom_min_interval_sec !== null ? String(user.custom_min_interval_sec) : "");
    setEditUserStatus(user.status || "Active");
    setCopiedId(false);
  };

  const handleCloseDrawer = () => {
    setIsDrawerClosing(true);
    setTimeout(() => {
      setEditingUser(null);
      setIsDrawerClosing(false);
    }, 400); // Wait for animations to finish
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleReset2FA = async () => {
    if (!editingUser) return;
    
    onSuccess("");
    onError("");
    setIsResetting2FA(true);

    try {
      const res = await apiFetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reset_2fa: true
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reset subscriber 2FA.");
      }

      setEditUser2faEmail(false);
      setEditUser2faTelegram(false);
      
      onSuccess(`🔒 Successfully reset and bypassed 2FA constraints for user: ${editingUser.name}`);
      onRefreshData();
      
      // Update local reference so changes match active UI
      setEditingUser(prev => prev ? { ...prev, two_factor_email: false, two_factor_telegram: false } : null);
    } catch (err: any) {
      onError(err.message || "Failed to execute 2FA reset.");
    } finally {
      setIsResetting2FA(false);
    }
  };

  const handleUpdateStatus = async (newStatus: "Active" | "Pending" | "Suspended") => {
    if (!editingUser) return;
    
    onSuccess("");
    onError("");
    setIsUpdatingStatus(true);

    try {
      const res = await apiFetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update subscriber status.");
      }

      setEditUserStatus(newStatus);
      onSuccess(`✅ Successfully updated status for ${editingUser.name} to ${newStatus}`);
      onRefreshData();
      
      // Update local reference so changes match active UI
      setEditingUser(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (err: any) {
      onError(err.message || "Failed to execute status update.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    onSuccess("");
    onError("");
    setIsSaving(true);

    try {
      const res = await apiFetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editUserName,
          email: editUserEmail,
          phone: editUserPhone,
          balance: editUserBalance,
          plan_id: editUserPlan,
          wallet_address: editUserWallet,
          telegram_chat_id: editUserTgChatId,
          two_factor_email: editUser2faEmail,
          two_factor_telegram: editUser2faTelegram,
          createdAt: editUserCreatedAt,
          custom_max_monitors: editUserCustomMaxMonitors === "" ? null : Number(editUserCustomMaxMonitors),
          custom_min_interval_sec: editUserCustomMinInterval === "" ? null : Number(editUserCustomMinInterval),
          status: editUserStatus
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save subscriber edits.");
      }

      const updatedUser = await res.json();
      handleCloseDrawer();
      onSuccess(`✨ Successfully saved full profile overrides for: ${updatedUser.name}`);
      onRefreshData();
    } catch (err: any) {
      onError(err.message || "Failed to update subscriber attributes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in" id="admin-subscribers-tab">
      <div className="bg-white border border-slate-100 rounded-2xl p-4 md:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm leading-tight font-sans">Subscriber Directory</h3>
              <p className="text-[10px] text-slate-400 font-bold">Override subscriber properties, manage limits, verify credentials, and view remaining periods</p>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, or wallet..."
              value={subscriberSearch}
              onChange={(e) => setSubscriberSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 font-bold transition-all"
            />
          </div>
        </div>

        {/* Subscribers Directory Grid/Table */}
        <div className="space-y-2">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-bold bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              No registered subscribers matching your query.
            </div>
          ) : (
            filteredUsers.map((u) => {
              const remainingDays = getRemainingDaysText(u);
              const isExpired = remainingDays === "Expired";
              const isLifetime = remainingDays === "Lifetime Free";

              return (
                <div 
                  key={u.id} 
                  className={`border p-3.5 rounded-2xl hover:bg-slate-50/40 transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-4 ${
                    editingUser?.id === u.id 
                      ? "border-indigo-400 bg-indigo-50/5 ring-4 ring-indigo-500/5" 
                      : "border-slate-100 bg-white"
                  }`}
                >
                  {/* User Basic Identity */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0 border border-indigo-100/30">
                      {u.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-slate-800 text-xs leading-none">{u.name}</span>
                        <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase ${
                          u.status === "Suspended"
                            ? "bg-rose-50 text-rose-700 border border-rose-100"
                            : u.status === "Pending"
                            ? "bg-amber-50 text-amber-700 border border-amber-100"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        }`}>
                          {u.status || "Active"}
                        </span>
                        {(u.two_factor_email || u.two_factor_telegram) && (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 text-[8px] font-black uppercase flex items-center gap-0.5">
                            <Lock className="w-2 h-2" />
                            <span>2FA On</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold block mt-1.5 truncate max-w-xs">{u.email}</span>
                    </div>
                  </div>

                  {/* Attributes Blocks */}
                  <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-2.5 md:gap-3">
                    
                    {/* Active Plan Tag */}
                    <div className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl min-w-[95px]">
                      <span className="text-[8px] uppercase text-slate-400 font-extrabold block leading-none mb-1">Subscription</span>
                      <span className="text-[10px] font-black text-indigo-600 uppercase block">{u.plan_id}</span>
                    </div>

                    {/* Credit Balance */}
                    <div className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl min-w-[100px]">
                      <span className="text-[8px] uppercase text-slate-400 font-extrabold block leading-none mb-1">Credit Balance</span>
                      <span className="text-[10px] font-black text-slate-800 block">${u.balance.toFixed(2)} USDT</span>
                    </div>

                    {/* Expiry Remaining Days Column */}
                    <div className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl min-w-[115px]">
                      <span className="text-[8px] uppercase text-slate-400 font-extrabold block leading-none mb-1">Remaining Term</span>
                      <span className={`text-[10px] font-black block ${
                        isLifetime 
                          ? "text-slate-500 font-bold" 
                          : isExpired 
                            ? "text-rose-600 font-black animate-pulse" 
                            : "text-emerald-600 font-black"
                      }`}>
                        {remainingDays}
                      </span>
                    </div>

                    {/* Impersonate Action */}
                    <button
                      disabled={isImpersonating !== null}
                      onClick={() => handleImpersonate(u)}
                      className="col-span-2 md:col-span-1 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 disabled:opacity-55 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 border border-emerald-200/50"
                    >
                      {isImpersonating === u.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
                      <span>Impersonate</span>
                    </button>

                    {/* Edit Trigger Action */}
                    <button
                      onClick={() => startEditUser(u)}
                      className="col-span-2 md:col-span-1 px-4 py-2 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-3xs hover:shadow-sm"
                    >
                      View & Edit Profile
                    </button>

                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* FULL DETAILED INSPECT & INTERACTIVE OVERRIDES DRAWER */}
      {editingUser && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end" id="subscriber-details-drawer">
          {/* Backdrop */}
          <div 
            className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm ${isDrawerClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
            onClick={handleCloseDrawer}
          ></div>
          
          {/* Drawer content */}
          <div className={`relative w-full md:w-[85vw] lg:w-[80vw] xl:w-[75vw] max-w-[1400px] h-full bg-white text-slate-800 shadow-[0_0_50px_-12px_rgba(0,0,0,0.3)] border-l border-slate-200 flex flex-col overflow-hidden ${isDrawerClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>
            <div className="px-6 py-5 flex justify-between items-center border-b border-slate-200 bg-slate-50 shrink-0">
            <div className="space-y-0.5">
              <h4 className="text-sm font-black text-indigo-600 flex items-center gap-1.5 uppercase tracking-wider">
                <Shield className="w-4 h-4" />
                <span>Super Admin Subscriber Override Suite</span>
              </h4>
              <p className="text-[10px] text-slate-500 font-bold">Direct database control panel: view metadata and modify credentials with live override capabilities</p>
            </div>
            
            <button 
              onClick={handleCloseDrawer} 
              className="bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded-xl p-2.5 cursor-pointer transition-all border border-slate-200 hover:border-slate-300"
              title="Close Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* COLUMN 1: VIEW DETAILS PANEL */}
            <div className="xl:col-span-5 bg-slate-50/50 border border-slate-200 p-5 rounded-2xl space-y-5">
              <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider block border-b border-slate-200 pb-2">
                Section A: Subscriber Details Inspect
              </span>

              <div className="space-y-3.5">
                {/* User UUID Row */}
                <div className="space-y-1">
                  <span className="text-[8px] text-slate-500 uppercase font-black font-mono block">Database Entry ID (UUID)</span>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 overflow-hidden">
                    <span className="text-xs font-mono font-bold text-slate-700 truncate flex-1">{editingUser.id}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyId(editingUser.id)}
                      className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-slate-100 shrink-0 transition-all cursor-pointer"
                      title="Copy Subscriber ID"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Sub Plan Summary Card */}
                <div className="bg-white border border-slate-200 p-3 rounded-xl space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase text-indigo-600">Current Plan Summary</span>
                    <span className="px-2 py-0.5 rounded-full text-[8px] bg-indigo-50 text-indigo-600 border border-indigo-100 font-extrabold uppercase">{editingUser.plan_id}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-medium pt-1">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <span className="text-[8px] text-slate-500 uppercase block font-black">Period Status</span>
                      <span className="text-[10px] text-slate-700 font-bold block mt-0.5">{getRemainingDaysText(editingUser)}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <span className="text-[8px] text-slate-500 uppercase block font-black">Credit Capital</span>
                      <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">${editingUser.balance.toFixed(2)} USDT</span>
                    </div>
                  </div>
                </div>

                {/* Security Verification score */}
                <div className="border border-slate-200 p-3 rounded-xl bg-slate-50 flex items-start gap-2.5 shadow-sm">
                  <ShieldAlert className={`w-5 h-5 shrink-0 mt-0.5 ${
                    editingUser.two_factor_email || editingUser.two_factor_telegram 
                      ? "text-emerald-500" 
                      : "text-amber-500"
                  }`} />
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black text-slate-700 block uppercase">2FA Credential Lock State</span>
                    <p className="text-[9px] text-slate-500 leading-normal font-medium">
                      {editingUser.two_factor_email || editingUser.two_factor_telegram
                        ? `This subscriber profile is guarded by active 2FA constraints. Dispatched via ${editingUser.two_factor_telegram ? "Telegram Bot" : "Email Sandbox"}.`
                        : "No active 2FA restrictions on this profile. Relies on the default hashed credential check."}
                    </p>
                  </div>
                </div>

                {/* Creation Timestamp details */}
                <div className="bg-white border border-slate-200 p-3 rounded-xl space-y-1 shadow-sm">
                  <span className="text-[8px] text-slate-500 uppercase font-black block leading-none">Registered Chronology Timestamp</span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-700 font-mono mt-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(editingUser.createdAt).toUTCString()}</span>
                  </div>
                </div>

                {/* Subscriber Account Status Override Section */}
                <div className="bg-white border border-slate-200 p-3 rounded-xl space-y-3 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-[9px] font-black uppercase text-indigo-600">Account Status Control</span>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                      editUserStatus === "Suspended"
                        ? "bg-rose-50 text-rose-700 border border-rose-100"
                        : editUserStatus === "Pending"
                        ? "bg-amber-50 text-amber-700 border border-amber-100"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    }`}>
                      {editUserStatus}
                    </span>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[8px] text-slate-500 uppercase font-black block">Update Subscriber Status</label>
                    <div className="flex gap-2">
                      <select
                        value={editUserStatus}
                        onChange={(e) => setEditUserStatus(e.target.value as any)}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-black outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                      >
                        <option value="Active">Active</option>
                        <option value="Pending">Pending</option>
                        <option value="Suspended">Suspended</option>
                      </select>
                      
                      <button
                        type="button"
                        disabled={isUpdatingStatus || editUserStatus === (editingUser.status || "Active")}
                        onClick={() => handleUpdateStatus(editUserStatus)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer"
                      >
                        {isUpdatingStatus ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Apply
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live Impersonate Command Widget */}
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Unlock className="w-4 h-4 text-emerald-600" />
                    <span className="text-[10px] font-black uppercase text-emerald-800">Admin Impersonate Gate</span>
                  </div>
                  <p className="text-[10px] text-emerald-700 leading-normal font-medium">
                    Instantly log in as this subscriber to view their dashboard, resolve check errors, configure monitors, or verify account states without requesting credentials.
                  </p>
                  <button
                    type="button"
                    disabled={isImpersonating !== null}
                    onClick={() => handleImpersonate(editingUser)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {isImpersonating === editingUser.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
                    <span>Login as {editingUser.name}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* COLUMN 2: MODIFY EVERYTHING CONTROLS */}
            <div className="xl:col-span-7 bg-white border border-slate-200 p-5 rounded-2xl space-y-5 shadow-sm">
              <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider block border-b border-slate-200 pb-2">
                Section B: Edit Credentials & Parameters
              </span>

              <form onSubmit={handleSaveUserEdit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Full Name */}
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block flex items-center gap-1">
                      <UserIcon className="w-3 h-3 text-indigo-500" />
                      <span>Full Name Override</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editUserName}
                      onChange={(e) => setEditUserName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-black outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block flex items-center gap-1">
                      <Mail className="w-3 h-3 text-indigo-500" />
                      <span>Email Address Override</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={editUserEmail}
                      onChange={(e) => setEditUserEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-black outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block flex items-center gap-1">
                      <Phone className="w-3 h-3 text-indigo-500" />
                      <span>Phone Connection Override</span>
                    </label>
                    <input
                      type="text"
                      value={editUserPhone}
                      onChange={(e) => setEditUserPhone(e.target.value)}
                      placeholder="e.g. +1 555-0199"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-black outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Wallet address */}
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block flex items-center gap-1">
                      <Wallet className="w-3 h-3 text-indigo-500" />
                      <span>BSC Wallet Address (BEP-20)</span>
                    </label>
                    <input
                      type="text"
                      pattern="^0x[a-fA-F0-9]{40}$|^$"
                      value={editUserWallet}
                      onChange={(e) => setEditUserWallet(e.target.value)}
                      placeholder="0x742..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-mono font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Platform Credit */}
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Platform USDT Balance</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editUserBalance}
                      onChange={(e) => setEditUserBalance(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-black outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Plan Tier ID */}
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Subscription Plan Tier</label>
                    <select
                      value={editUserPlan}
                      onChange={(e) => setEditUserPlan(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-black outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                    >
                      {plans.map((p) => (
                        <option key={p.id} value={p.id} className="bg-white text-slate-800">
                          {p.name} ({p.id.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Telegram chat ID */}
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block flex items-center gap-1">
                      <Send className="w-3 h-3 text-indigo-500" />
                      <span>Telegram Bot Chat ID</span>
                    </label>
                    <input
                      type="text"
                      value={editUserTgChatId}
                      onChange={(e) => setEditUserTgChatId(e.target.value)}
                      placeholder="e.g. 19283746"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-mono font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Created At Overrider (Helpful for simulation) */}
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-indigo-500" />
                      <span>Registration ISO Date (Remaining Days Sim)</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editUserCreatedAt}
                      onChange={(e) => setEditUserCreatedAt(e.target.value)}
                      placeholder="YYYY-MM-DDTHH:MM:SS.sssZ"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-mono outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Custom Quota Limit Overrides */}
                  <div className="space-y-1">
                    <label className="text-[9px] text-rose-500 font-bold uppercase tracking-wider block">
                      Custom Max Monitors Limit
                    </label>
                    <input
                      type="number"
                      placeholder="Leave blank for plan default"
                      value={editUserCustomMaxMonitors}
                      onChange={(e) => setEditUserCustomMaxMonitors(e.target.value)}
                      className="w-full bg-slate-50 border border-rose-100 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-black outline-none focus:border-rose-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-rose-500 font-bold uppercase tracking-wider block">
                      Custom Min Check Interval (Sec)
                    </label>
                    <input
                      type="number"
                      placeholder="Leave blank for plan default"
                      value={editUserCustomMinInterval}
                      onChange={(e) => setEditUserCustomMinInterval(e.target.value)}
                      className="w-full bg-slate-50 border border-rose-100 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-black outline-none focus:border-rose-500 focus:bg-white transition-all"
                    />
                  </div>

                </div>

                {/* Individual 2FA Toggles */}
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-3">
                  <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider block">Individual 2FA Notification Gates</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 shadow-sm">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-700 font-black block">Email Delivery Auth Gate</span>
                        <span className="text-[8px] text-slate-500 block">Deploys code checks to profile email.</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editUser2faEmail}
                          onChange={(e) => setEditUser2faEmail(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-7 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 shadow-sm">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-700 font-black block">Telegram Channel Auth Gate</span>
                        <span className="text-[8px] text-slate-500 block">Deploys codes to Telegram client.</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editUser2faTelegram}
                          onChange={(e) => setEditUser2faTelegram(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-7 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* ACTION BUTTONS GRID */}
                <div className="flex flex-col sm:flex-row gap-2.5 sm:justify-between items-stretch sm:items-center pt-3 border-t border-slate-200">
                  {/* Action A: Reset 2FA constrain blocks */}
                  <button
                    type="button"
                    onClick={handleReset2FA}
                    disabled={isResetting2FA || (!editUser2faEmail && !editUser2faTelegram && !editingUser.two_factor_email && !editingUser.two_factor_telegram)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:hover:bg-rose-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                    title="Instantly deactivate all multi-factor constraints for this user"
                  >
                    {isResetting2FA ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-white" />
                    )}
                    <span>Reset 2FA constrain blocks</span>
                  </button>

                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleCloseDrawer}
                      className="flex-1 sm:flex-initial px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold cursor-pointer border border-slate-200 shadow-sm transition-all"
                    >
                      Cancel Overrides
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 sm:flex-initial px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
                    >
                      {isSaving && <RefreshCw className="w-3 h-3 animate-spin" />}
                      <span>Apply Changes</span>
                    </button>
                  </div>
                </div>

              </form>
            </div>
          </div>
          </div>
          </div>
        </div>
        , document.body)}
    </div>
  );
}
