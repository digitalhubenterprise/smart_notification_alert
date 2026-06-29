import { apiFetch } from "../../lib/api";
import React, { useState, useEffect } from "react";
import { Terminal } from "lucide-react";
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
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

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

  return (
    <div className="bg-slate-950 text-slate-200 border border-slate-900 rounded-2xl p-4 shadow-xl relative overflow-hidden animate-fade-in" id="admin-logs-tab">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-900 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-slate-900 border border-slate-800 text-indigo-400 rounded-xl">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-black text-xs text-slate-100 flex items-center gap-1.5">
              <span>Worker Console Terminal Logs</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-bold font-mono">Simulated checking loops real-time activity</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Live Logs</span>
          </div>
          <button
            onClick={handleClearLogs}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 hover:text-rose-400 border border-slate-800 text-slate-400 text-[9px] rounded-lg transition-all font-black cursor-pointer"
          >
            Clear Output
          </button>
        </div>
      </div>

      {/* Console Screen - Compact Height */}
      <div className="h-80 overflow-y-auto font-mono text-[11px] space-y-1.5 bg-black/60 p-3.5 rounded-xl border border-slate-900 select-text scrollbar-thin">
        {systemLogs.length === 0 ? (
          <span className="text-slate-600 italic block text-center py-20 font-medium">Initializing UptimePro loop logs...</span>
        ) : (
          systemLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 leading-normal hover:bg-white/2 p-0.5 rounded transition-colors">
              <span className="text-slate-500 shrink-0 select-none font-mono">
                [{new Date(log.timestamp).toLocaleTimeString()}]
              </span>
              <span className={`px-1 py-0.2 rounded text-[8px] font-black select-none shrink-0 border ${
                log.level === "error" 
                  ? "bg-rose-950/80 text-rose-400 border-rose-900/60" 
                  : log.level === "warn" 
                  ? "bg-amber-950/80 text-amber-400 border-amber-900/60" 
                  : "bg-slate-900/80 text-indigo-400 border-slate-800/60"
              }`}>
                {log.level.toUpperCase()}
              </span>
              <span className={`break-all ${
                log.level === "error" 
                  ? "text-rose-300 font-semibold" 
                  : log.level === "warn" 
                  ? "text-amber-200 font-medium" 
                  : "text-slate-300"
              }`}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
