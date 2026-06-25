import React, { useState, useEffect } from "react";
import { 
  Cloud, 
  Database, 
  Check, 
  RefreshCw, 
  UploadCloud, 
  Plus, 
  Download, 
  Trash2, 
  AlertTriangle 
} from "lucide-react";

interface AdminBackupsTabProps {
  onRefreshData: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export default function AdminBackupsTab({
  onRefreshData,
  onSuccess,
  onError
}: AdminBackupsTabProps) {
  const [backupSettings, setBackupSettings] = useState<{
    enabled: boolean;
    cloudUrl: string;
    intervalHours: number;
    lastBackupAt?: string;
    lastBackupStatus?: "success" | "failed" | "pending";
    lastBackupMessage?: string;
  }>({ enabled: false, cloudUrl: "", intervalHours: 24 });
  const [backupSnapshots, setBackupSnapshots] = useState<any[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isSavingBackupSettings, setIsSavingBackupSettings] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isTestingCloud, setIsTestingCloud] = useState(false);
  const [newBackupName, setNewBackupName] = useState("");
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const fetchBackupSettings = async () => {
    setIsLoadingBackups(true);
    try {
      const res = await fetch("/api/admin/backup/settings");
      if (res.ok) {
        const data = await res.json();
        setBackupSettings(data.backupSettings);
        setBackupSnapshots(data.backupSnapshots || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  useEffect(() => {
    fetchBackupSettings();
  }, []);

  const handleSaveBackupSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    onSuccess("");
    onError("");
    setIsSavingBackupSettings(true);
    try {
      const res = await fetch("/api/admin/backup/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backupSettings)
      });
      if (res.ok) {
        const data = await res.json();
        setBackupSettings(data.backupSettings);
        onSuccess("Backup settings saved successfully.");
      } else {
        const data = await res.json();
        onError(data.error || "Failed to save backup settings.");
      }
    } catch (err: any) {
      onError(err.message || "Network error occurred.");
    } finally {
      setIsSavingBackupSettings(false);
    }
  };

  const handleCreateManualBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    onSuccess("");
    onError("");
    setIsCreatingBackup(true);
    try {
      const res = await fetch("/api/admin/backup/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBackupName })
      });
      if (res.ok) {
        onSuccess(`Backup snapshot created successfully!`);
        setNewBackupName("");
        fetchBackupSettings();
      } else {
        const data = await res.json();
        onError(data.error || "Failed to create manual backup.");
      }
    } catch (err: any) {
      onError(err.message || "Network error occurred.");
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleTestCloudBackup = async () => {
    onSuccess("");
    onError("");
    setIsTestingCloud(true);
    try {
      const res = await fetch("/api/admin/backup/test-cloud", {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        onSuccess(data.message || "Cloud connection test passed! Backup data uploaded successfully.");
        fetchBackupSettings();
      } else {
        const data = await res.json();
        onError(data.error || "Cloud upload failed. Please verify the backup server URL.");
        fetchBackupSettings();
      }
    } catch (err: any) {
      onError(`Cloud endpoint error: ${err.message}`);
      fetchBackupSettings();
    } finally {
      setIsTestingCloud(false);
    }
  };

  const handleRestoreBackup = async (id: string, name: string) => {
    if (!window.confirm(`Are you absolutely sure you want to restore the system to "${name}"?\nThis will revert all current data to this snapshot!`)) {
      return;
    }
    onSuccess("");
    onError("");
    setRestoringId(id);
    try {
      const res = await fetch("/api/admin/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        onSuccess(`System restored successfully to "${name}"!`);
        onRefreshData();
      } else {
        const data = await res.json();
        onError(data.error || "Failed to restore backup snapshot.");
      }
    } catch (err: any) {
      onError(`Restore error: ${err.message}`);
    } finally {
      setRestoringId(null);
    }
  };

  const handleDeleteBackup = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this backup snapshot? This cannot be undone.")) {
      return;
    }
    onSuccess("");
    onError("");
    try {
      const res = await fetch(`/api/admin/backup/delete/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        onSuccess("Backup snapshot deleted successfully.");
        fetchBackupSettings();
      } else {
        const data = await res.json();
        onError(data.error || "Failed to delete backup snapshot.");
      }
    } catch (err: any) {
      onError(err.message || "Failed to delete backup snapshot.");
    }
  };

  return (
    <div className="space-y-4 animate-fade-in" id="admin-backups-tab">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Column: Cloud Backup - Compact */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl p-4 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-xs">Cloud Auto Backup</h3>
              <p className="text-[10px] text-slate-400 font-bold">Auto cloud destinations & connection test</p>
            </div>
          </div>

          <form onSubmit={handleSaveBackupSettings} className="space-y-4">
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100/50">
              <div>
                <span className="block font-bold text-slate-700 text-xs">Auto Cloud Backup</span>
                <span className="block text-[9px] text-slate-400 font-bold">Transmit backup JSON automatically</span>
              </div>
              <button
                type="button"
                onClick={() => setBackupSettings({ ...backupSettings, enabled: !backupSettings.enabled })}
                className="cursor-pointer"
              >
                {backupSettings.enabled ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-lg border border-indigo-100/50">
                    <Check className="w-2.5 h-2.5" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-400 text-[9px] font-bold rounded-lg border border-slate-200">
                    Inactive
                  </span>
                )}
              </button>
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] uppercase tracking-wider font-black text-slate-400">
                Cloud Backup Server Endpoint URL
              </label>
              <input
                type="url"
                placeholder="https://your-cloud-endpoint/api/backup"
                value={backupSettings.cloudUrl}
                onChange={(e) => setBackupSettings({ ...backupSettings, cloudUrl: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-mono text-slate-700"
              />
              <p className="text-[9px] text-slate-400 font-medium">
                The system will POST secure JSON state snapshots to this absolute URL destination.
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] uppercase tracking-wider font-black text-slate-400">
                Sync Interval (Hours)
              </label>
              <input
                type="number"
                min="1"
                max="168"
                value={backupSettings.intervalHours}
                onChange={(e) => setBackupSettings({ ...backupSettings, intervalHours: Number(e.target.value) })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
              />
            </div>

            {/* Compact Cloud Status Block */}
            <div className="p-3 bg-slate-900 text-slate-300 rounded-xl border border-slate-800 space-y-1.5 font-mono">
              <div className="flex justify-between items-center text-[8px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-800/60 pb-1">
                <span>Cloud Sync State</span>
                <span>Target Active</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[10px] leading-relaxed">
                <div>
                  <span className="text-slate-500 block text-[8px]">Last Backup:</span>
                  <span className="font-bold text-slate-200">
                    {backupSettings.lastBackupAt ? new Date(backupSettings.lastBackupAt).toLocaleString() : "Never"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[8px]">Sync Status:</span>
                  {backupSettings.lastBackupStatus ? (
                    <span className={`px-1 py-0.2 rounded text-[8px] font-black uppercase border ${
                      backupSettings.lastBackupStatus === "success" 
                        ? "bg-emerald-950 border-emerald-900 text-emerald-400" 
                        : "bg-rose-950 border-rose-900 text-rose-400"
                    }`}>
                      {backupSettings.lastBackupStatus}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-bold">None</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSavingBackupSettings}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-lg text-xs font-black transition-all cursor-pointer shadow-3xs"
              >
                {isSavingBackupSettings ? "Saving..." : "Save Config"}
              </button>

              <button
                type="button"
                onClick={handleTestCloudBackup}
                disabled={isTestingCloud || !backupSettings.cloudUrl}
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 disabled:opacity-50 text-indigo-600 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1"
              >
                {isTestingCloud ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <UploadCloud className="w-3 h-3" />
                )}
                <span>Test Upload</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Database State Snapshots - Compact */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-2xl p-4 shadow-xs space-y-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-50 pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-slate-50 text-slate-600 rounded-xl">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-xs">Database Snapshots</h3>
                <p className="text-[10px] text-slate-400 font-bold">Create and restore system state snapshots</p>
              </div>
            </div>

            <div className="flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50/50 rounded-lg border border-indigo-50 text-indigo-600 font-mono text-[9px] font-bold">
              <span>PostgreSQL (Active)</span>
            </div>
          </div>

          {/* Create Snap Form */}
          <form onSubmit={handleCreateManualBackup} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100/50 flex flex-col sm:flex-row gap-2 shrink-0">
            <input
              type="text"
              required
              placeholder="Snapshot name (e.g., Before pricing tweaks)..."
              value={newBackupName}
              onChange={(e) => setNewBackupName(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:border-indigo-500 transition-all outline-none"
            />
            <button
              type="submit"
              disabled={isCreatingBackup}
              className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg text-xs font-black transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1 shrink-0"
            >
              {isCreatingBackup ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>Snapshot</span>
            </button>
          </form>

          {/* Snapshots Scrollable Box - Compact */}
          <div className="flex-1 overflow-y-auto max-h-[220px] pr-1 space-y-2.5 shrink-0 scrollbar-thin">
            {isLoadingBackups ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
                <span className="text-xs text-slate-400 font-medium">Loading snapshots...</span>
              </div>
            ) : backupSnapshots.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-100 rounded-xl">
                <p className="text-xs text-slate-400 font-medium">No snapshots available. Create one above!</p>
              </div>
            ) : (
              backupSnapshots.map((snapshot) => (
                <div key={snapshot.id} className="p-2.5 bg-white hover:bg-slate-50/30 border border-slate-100 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="block font-bold text-slate-800 text-xs">{snapshot.name}</span>
                    <div className="flex flex-wrap items-center gap-x-2 text-[9px] text-slate-400 font-mono">
                      <span className="font-bold text-slate-600 bg-slate-100 px-1 py-0.2 rounded">ID: {snapshot.id}</span>
                      <span>|</span>
                      <span>{new Date(snapshot.timestamp).toLocaleString()}</span>
                      <span>|</span>
                      <span className="font-bold text-slate-500">{(snapshot.sizeBytes / 1024).toFixed(2)} KB</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRestoreBackup(snapshot.id, snapshot.name)}
                      disabled={restoringId !== null}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-600 border border-indigo-100/50 text-[10px] rounded-lg font-black transition-all cursor-pointer flex items-center gap-1"
                    >
                      {restoringId === snapshot.id ? (
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                      ) : (
                        <Download className="w-2.5 h-2.5" />
                      )}
                      <span>Restore</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteBackup(snapshot.id)}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-lg transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Compact Warning block */}
          <div className="p-2 bg-amber-50/50 border border-amber-100/30 rounded-xl text-[9px] text-amber-800 leading-normal font-bold flex gap-1.5 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>
              <strong>WARNING:</strong> Restoring database snapshots overwrites all active monitor targets, subscriber profiles, balances, and parameters. Use with caution.
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
