import { apiFetch } from "../../lib/api";
import React, { useState, useEffect } from "react";
import { Terminal, Search } from "lucide-react";
import { SystemLog } from "../../types.ts";

interface AdminLogsTabProps {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export default function AdminLogsTab({
  onSuccess,
  onError
}: AdminLogsTabProps) {
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSystemLogs = async () => {
    try {
      const res = await apiFetch("/api/admin/system-logs");
      if (res.ok) {
        const data = await res.json();
        setSystemLogs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSystemLogs();
    const interval = setInterval(fetchSystemLogs, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleClearLogs = async () => {
    try {
      const res = await apiFetch("/api/admin/system-logs/clear", { method: "POST" });
      if (res.ok) {
        setSystemLogs([]);
        onSuccess("Logs cleared successfully.");
      }
    } catch (err: any) {
      console.error(err);
      onError("Failed to clear system logs.");
    }
  };

  const filteredLogs = systemLogs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.message.toLowerCase().includes(q) ||
      log.level.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-slate-950 text-slate-200 border border-slate-900 rounded-2xl shadow-xl relative overflow-hidden animate-fade-in flex flex-col" id="admin-logs-tab" style={{ minHeight: "500px" }}>
      <div className="p-4 border-b border-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-900 border border-slate-800 text-indigo-400 rounded-xl">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-100 flex items-center gap-1.5">
                <span>System Event Logs</span>
              </h3>
              <p className="text-[10px] text-slate-500 font-bold font-mono">System auditing, authentications, & critical events</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1 bg-slate-900/50 px-2.5 py-1 rounded-lg border border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Live Logs</span>
            </div>
            <button
              onClick={handleClearLogs}
              className="px-3 py-1.5 bg-rose-950/30 hover:bg-rose-900/50 border border-rose-900/50 text-rose-400 text-[10px] rounded-lg transition-all font-black cursor-pointer"
            >
              Clear Logs
            </button>
          </div>
        </div>
        
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search events, login attempts, config changes..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 font-medium outline-hidden focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
          />
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-slate-900/50 text-slate-400 font-bold border-b border-slate-800">
            <tr>
              <th className="px-4 py-3 w-40 tracking-wider uppercase text-[9px]">Timestamp</th>
              <th className="px-4 py-3 w-24 tracking-wider uppercase text-[9px]">Level</th>
              <th className="px-4 py-3 tracking-wider uppercase text-[9px]">Event Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 bg-slate-950">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Terminal className="w-6 h-6 text-slate-700" />
                    <span className="text-slate-500 font-medium">No logs found matching your criteria.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/30 transition-colors group">
                  <td className="px-4 py-3 font-mono text-slate-400 text-[10px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider inline-flex border ${
                      log.level === "error" 
                        ? "bg-rose-950/80 text-rose-400 border-rose-900/60" 
                        : log.level === "warn" 
                        ? "bg-amber-950/80 text-amber-400 border-amber-900/60" 
                        : "bg-indigo-950/30 text-indigo-400 border-indigo-900/40"
                    }`}>
                      {log.level}
                    </span>
                  </td>
                  <td className={`px-4 py-3 whitespace-normal break-words max-w-lg ${
                    log.level === "error" 
                      ? "text-rose-200/90 font-medium" 
                      : log.level === "warn" 
                      ? "text-amber-200/90 font-medium" 
                      : "text-slate-300 font-medium"
                  }`}>
                    {log.message}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
