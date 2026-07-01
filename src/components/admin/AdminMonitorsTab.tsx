import { apiFetch } from "../../lib/api";
import React, { useState, useEffect } from "react";
import { 
  Globe, 
  Search, 
  Trash2, 
  Edit2, 
  Play, 
  Check, 
  X, 
  Activity, 
  User, 
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  Clock
} from "lucide-react";
import { Monitor } from "../../types.ts";

interface AdminMonitor extends Monitor {
  owner_name?: string;
  owner_email?: string;
}

interface AdminMonitorsTabProps {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export default function AdminMonitorsTab({
  onSuccess,
  onError
}: AdminMonitorsTabProps) {
  const [monitors, setMonitors] = useState<AdminMonitor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "up" | "down" | "pending">("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "HTTP" | "Ping" | "Port">("ALL");
  const [isLoading, setIsLoading] = useState(false);
  
  // Action/Editing states
  const [editingMonitor, setEditingMonitor] = useState<AdminMonitor | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editType, setEditType] = useState<"HTTP" | "Ping" | "Port">("HTTP");
  const [editInterval, setEditInterval] = useState(30);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const fetchAllMonitors = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/admin/monitors");
      if (res.ok) {
        const data = await res.json();
        setMonitors(data);
      } else {
        onError("Failed to fetch administrative monitors list.");
      }
    } catch (err: any) {
      console.error(err);
      onError(err.message || "An error occurred while loading monitors.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllMonitors();
    const interval = setInterval(fetchAllMonitors, 10000); // sync list every 10s
    return () => clearInterval(interval);
  }, []);

  // Filter monitors
  const filteredMonitors = monitors.filter((m) => {
    // Search filter
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      m.name.toLowerCase().includes(query) ||
      m.url.toLowerCase().includes(query) ||
      (m.owner_name && m.owner_name.toLowerCase().includes(query)) ||
      (m.owner_email && m.owner_email.toLowerCase().includes(query));

    // Status filter
    const matchesStatus = statusFilter === "ALL" || m.status === statusFilter;

    // Type filter
    const matchesType = typeFilter === "ALL" || m.monitor_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Handle immediate manual trigger check
  const handleCheckNow = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(`check-${id}`);
    try {
      const res = await apiFetch(`/api/monitors/${id}/check`, { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        onSuccess(`Immediate diagnostic check successfully dispatched for "${result.monitor?.name || 'Monitor'}". Status: ${result.monitor?.status?.toUpperCase()}`);
        fetchAllMonitors();
      } else {
        const errData = await res.json();
        onError(errData.error || "Failed to trigger quick diagnostic check.");
      }
    } catch (err: any) {
      console.error(err);
      onError(err.message || "Connection refused by endpoint engine.");
    } finally {
      setActionLoading(null);
    }
  };

  // Open Edit Modal / Setup Form
  const startEdit = (m: AdminMonitor, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMonitor(m);
    setEditName(m.name);
    setEditUrl(m.url);
    setEditType(m.monitor_type);
    setEditInterval(m.interval_sec);
  };

  // Submit Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMonitor) return;
    if (!editName.trim() || !editUrl.trim()) {
      onError("Monitor name and endpoint URL are required.");
      return;
    }

    setActionLoading("save-edit");
    try {
      const res = await apiFetch(`/api/monitors/${editingMonitor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          url: editUrl,
          monitor_type: editType,
          interval_sec: editInterval
        })
      });

      if (res.ok) {
        onSuccess(`Monitor "${editName}" configuration successfully updated.`);
        setEditingMonitor(null);
        fetchAllMonitors();
      } else {
        const errData = await res.json();
        onError(errData.error || "Failed to update monitor settings.");
      }
    } catch (err: any) {
      console.error(err);
      onError(err.message || "An error occurred while saving.");
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Delete Monitor
  const handleDeleteMonitor = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmName(name);
    setDeleteConfirmId(id);
  };

  // Perform actual Delete Action
  const performDeleteMonitor = async (id: string) => {
    setActionLoading(`delete-${id}`);
    try {
      const res = await apiFetch(`/api/monitors/${id}`, { method: "DELETE" });
      if (res.ok) {
        onSuccess(`Successfully deleted monitor "${deleteConfirmName}".`);
        fetchAllMonitors();
      } else {
        const errData = await res.json();
        onError(errData.error || "Failed to delete monitor.");
      }
    } catch (err: any) {
      console.error(err);
      onError(err.message || "An error occurred while deleting the monitor.");
    } finally {
      setActionLoading(null);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in" id="admin-monitors-tab">
      <div className="bg-white border border-slate-100 rounded-2xl p-4 md:p-5 shadow-xs space-y-4">
        {/* Tab Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm leading-tight font-sans">System-Wide Monitor Management</h3>
              <p className="text-[10px] text-slate-400 font-bold">Supervise, modify, delete, and manually trigger live checks for all user monitors configured on this platform</p>
            </div>
          </div>
          <button
            onClick={fetchAllMonitors}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Force Sync
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
          <div className="md:col-span-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by monitor name, target endpoint, subscriber, or user email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs placeholder-slate-400 text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 font-bold transition-all"
            />
          </div>
          
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-850 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 font-bold transition-all"
            >
              <option value="ALL">All Statuses</option>
              <option value="up">Active / Up Only</option>
              <option value="down">Offline / Down Only</option>
              <option value="pending">Pending Configuration Only</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-850 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 font-bold transition-all"
            >
              <option value="ALL">All Protocol Types</option>
              <option value="HTTP">HTTP/HTTPS</option>
              <option value="Ping">ICMP Ping</option>
              <option value="Port">TCP Port Check</option>
            </select>
          </div>
        </div>

        {/* Monitors Listing Table */}
        <div className="border border-slate-100 rounded-xl overflow-hidden">
          {isLoading && monitors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-sm text-slate-400 font-bold">Harvesting system monitors database...</p>
            </div>
          ) : filteredMonitors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4 bg-white">
              <Globe className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm text-slate-700 font-bold">No matching monitors found</p>
              <p className="text-xs text-slate-400 mt-1 font-bold">Try adjusting your filters or query string.</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="p-3 text-xs font-black text-slate-500">Monitor Identifier & Target</th>
                    <th className="p-3 text-xs font-black text-slate-500">Protocol</th>
                    <th className="p-3 text-xs font-black text-slate-500">Current Status</th>
                    <th className="p-3 text-xs font-black text-slate-500">Uptime & Latency</th>
                    <th className="p-3 text-xs font-black text-slate-500">Subscriber / Owner</th>
                    <th className="p-3 text-xs font-black text-slate-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMonitors.map((m) => {
                    const isStatusUp = m.status === "up";
                    const isStatusDown = m.status === "down";
                    const isChecking = actionLoading === `check-${m.id}`;
                    const isDeleting = actionLoading === `delete-${m.id}`;

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition-all group">
                        {/* Name & Target URL */}
                        <td className="p-3 max-w-xs">
                          <div className="text-xs font-black text-slate-900 truncate">
                            {m.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate font-mono mt-0.5 flex items-center gap-1 font-bold">
                            <span className="opacity-80">{m.url}</span>
                            <a href={m.url} target="_blank" rel="noreferrer" className="text-indigo-500 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        </td>

                        {/* Protocol / Type */}
                        <td className="p-3">
                          <span className="px-2 py-0.5 text-[10px] rounded-md font-extrabold font-mono bg-indigo-50 text-indigo-600 border border-indigo-100">
                            {m.monitor_type}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-mono font-bold">
                            <Clock className="w-2.5 h-2.5 text-slate-400" />
                            {m.interval_sec}s
                          </div>
                        </td>

                        {/* Current Status */}
                        <td className="p-3">
                          {isStatusUp ? (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              ONLINE
                            </div>
                          ) : isStatusDown ? (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              DOWN
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              PENDING
                            </div>
                          )}
                          {m.consecutive_failures > 0 && (
                            <div className="text-[9px] text-rose-500 mt-1 font-mono font-extrabold">
                              {m.consecutive_failures} fails in a row
                            </div>
                          )}
                        </td>

                        {/* Uptime % & Latency */}
                        <td className="p-3 font-mono">
                          <div className="text-xs text-slate-800 font-black">
                            {m.uptime_percentage !== undefined ? `${m.uptime_percentage.toFixed(2)}%` : "100.00%"}
                            <span className="text-[10px] text-slate-400 ml-1 font-sans font-bold">uptime</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 font-bold">
                            {m.average_response_time_ms ? `${m.average_response_time_ms}ms` : "0ms"}
                            <span className="text-[9px] text-slate-400 ml-1 font-sans font-bold">avg lag</span>
                          </div>
                        </td>

                        {/* Subscriber Owner */}
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1 bg-slate-50 border border-slate-100 rounded-lg text-slate-400">
                              <User className="w-3.5 h-3.5" />
                            </div>
                            <div className="max-w-[150px]">
                              <div className="text-xs text-slate-900 font-black truncate">
                                {m.owner_name || "Unknown Owner"}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono font-bold truncate">
                                {m.owner_email || "Unknown Email"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Admin Actions */}
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Run Live Check now */}
                            <button
                              title="Trigger immediate live diagnostic probe"
                              disabled={isChecking || isDeleting}
                              onClick={(e) => handleCheckNow(m.id, e)}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-lg border border-slate-250/60 transition cursor-pointer disabled:opacity-40"
                            >
                              <Play className={`w-3.5 h-3.5 ${isChecking ? "animate-spin text-slate-400" : "fill-current"}`} />
                            </button>

                            {/* Edit Settings */}
                            <button
                              title="Modify monitor properties"
                              disabled={isDeleting}
                              onClick={(e) => startEdit(m, e)}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-amber-600 rounded-lg border border-slate-250/60 transition cursor-pointer disabled:opacity-40"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete permanently */}
                            <button
                              title="Delete monitor permanently"
                              disabled={isDeleting}
                              onClick={(e) => handleDeleteMonitor(m.id, m.name, e)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 hover:text-rose-600 rounded-lg border border-rose-150/40 transition cursor-pointer disabled:opacity-40"
                            >
                              <Trash2 className={`w-3.5 h-3.5 ${isDeleting ? "animate-spin" : ""}`} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modify Monitor Modal Form */}
      {editingMonitor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-150 rounded-2xl w-full max-w-lg overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="border-b border-slate-100 p-4 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-1.5 text-slate-900">
                <Globe className="w-4 h-4 text-indigo-500" />
                <h3 className="font-black text-sm">Modify Monitor: {editingMonitor.name}</h3>
              </div>
              <button
                onClick={() => setEditingMonitor(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Monitor Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Primary Web App API"
                  className="bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 font-bold px-3 py-2 w-full transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Target Destination / URI
                </label>
                <input
                  type="text"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  placeholder="https://api.yourdomain.com/health"
                  className="bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-850 font-mono outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 font-bold px-3 py-2 w-full transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Protocol Type
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as any)}
                    className="bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 font-bold px-3 py-2 w-full transition-all"
                  >
                    <option value="HTTP">HTTP/HTTPS</option>
                    <option value="Ping">ICMP Ping</option>
                    <option value="Port">TCP Port Check</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Check Interval
                  </label>
                  <select
                    value={editInterval}
                    onChange={(e) => setEditInterval(Number(e.target.value))}
                    className="bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 font-bold px-3 py-2 w-full transition-all"
                  >
                    <option value={5}>5 seconds</option>
                    <option value={10}>10 seconds</option>
                    <option value={30}>30 seconds</option>
                    <option value={60}>60 seconds (1 min)</option>
                    <option value={300}>300 seconds (5 min)</option>
                    <option value={600}>600 seconds (10 min)</option>
                  </select>
                </div>
              </div>

              {/* Warnings and Notes for Admin */}
              <div className="bg-amber-50 border border-amber-100 text-amber-800 rounded-xl p-3 flex gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[10px] text-amber-800 font-bold leading-normal">
                  <strong>Important Notice:</strong> Modifying a user's monitor targets will instantly reset its uptime diagnostic states and cancel outstanding consecutive alerts. The subscriber will be notified in their panel of any active changes.
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2 bg-slate-50 -mx-5 -mb-5 p-5">
                <button
                  type="button"
                  onClick={() => setEditingMonitor(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === "save-edit"}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-xs text-white font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  {actionLoading === "save-edit" && <RefreshCw className="w-3 h-3 animate-spin" />}
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="admin-delete-confirmation-modal">
          <div className="bg-white border border-slate-150 rounded-2xl w-full max-w-md overflow-hidden shadow-xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-xl">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="font-black text-slate-900 text-sm">Delete Monitor?</h3>
            </div>
            <p className="text-xs text-slate-500 font-bold">
              Are you absolutely sure you want to delete <span className="text-slate-800 font-black">"{deleteConfirmName}"</span>? This action is permanent and all telemetry log history will be permanently destroyed.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => performDeleteMonitor(deleteConfirmId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-xs text-white font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
