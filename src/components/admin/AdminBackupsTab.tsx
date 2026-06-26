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
  const [cyberPanelConfig, setCyberPanelConfig] = useState<{
    enabled: boolean;
    hostIp: string;
    username: string;
    port: number;
    sshKey: string;
    remotePath: string;
  }>({ enabled: false, hostIp: "", username: "", port: 22, sshKey: "", remotePath: "cpbackups/smart_uptime_notification" });
  const [backupSnapshots, setBackupSnapshots] = useState<any[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isSavingBackupSettings, setIsSavingBackupSettings] = useState(false);
  const [isSavingCyberPanel, setIsSavingCyberPanel] = useState(false);
  const [isTestingCyberPanel, setIsTestingCyberPanel] = useState(false);
  const [isBackingUpCyberPanel, setIsBackingUpCyberPanel] = useState<"database" | "full" | null>(null);
  const [cyberPanelDirectories, setCyberPanelDirectories] = useState<any[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isTestingCloud, setIsTestingCloud] = useState(false);
  const [newBackupName, setNewBackupName] = useState("");
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'restore' | 'delete', id: string, name?: string } | null>(null);

  const fetchBackupSettings = async () => {
    setIsLoadingBackups(true);
    try {
      const res = await fetch("/api/admin/backup/settings");
      if (res.ok) {
        const data = await res.json();
        setBackupSettings(data.backupSettings);
        setCyberPanelConfig(data.cyberPanelConfig || { enabled: false, hostIp: "", username: "", port: 22, sshKey: "", remotePath: "cpbackups/smart_uptime_notification" });
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

  const handleSaveCyberPanel = async (e: React.FormEvent) => {
    e.preventDefault();
    onSuccess("");
    onError("");
    setIsSavingCyberPanel(true);
    try {
      const res = await fetch("/api/admin/backup/cyberpanel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cyberPanelConfig)
      });
      if (res.ok) {
        const data = await res.json();
        setCyberPanelConfig(data.cyberPanelConfig);
        onSuccess("CyberPanel credentials saved successfully.");
      } else {
        const data = await res.json();
        onError(data.error || "Failed to save CyberPanel configuration.");
      }
    } catch (err: any) {
      onError(err.message || "Network error occurred.");
    } finally {
      setIsSavingCyberPanel(false);
    }
  };

  const handleTestCyberPanel = async () => {
    onSuccess("");
    onError("");
    setIsTestingCyberPanel(true);
    setCyberPanelDirectories([]);
    try {
      const res = await fetch("/api/admin/backup/cyberpanel/test", {
        method: "POST",
      });
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (res.ok) {
          onSuccess(data.message || "CyberPanel connection successful!");
          if (data.directories) {
            setCyberPanelDirectories(data.directories);
          }
        } else {
          onError(data.error || "Failed to connect to CyberPanel.");
        }
      } catch (e) {
        console.error("Test CyberPanel non-JSON response:", text);
        onError(`Server error (${res.status}): The connection timed out or host is unreachable. Response started with: ${text.substring(0, 20)}`);
      }
    } catch (err: any) {
      onError(err.message || "Network error occurred.");
    } finally {
      setIsTestingCyberPanel(false);
    }
  };

  const handleCyberPanelBackup = async (type: "database" | "full") => {
    onSuccess("");
    onError("");
    setIsBackingUpCyberPanel(type);
    try {
      const res = await fetch(`/api/admin/backup/cyberpanel/${type}`, {
        method: "POST",
      });
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (res.ok) {
          onSuccess(data.message || `${type === 'full' ? 'Full' : 'Database'} backup uploaded to CyberPanel successfully!`);
          fetchBackupSettings();
        } else {
          onError(data.error || `Failed to upload ${type} backup.`);
        }
      } catch (e) {
        console.error("Backup CyberPanel non-JSON response:", text);
        onError(`Server error (${res.status}): The connection timed out. Response started with: ${text.substring(0, 20)}`);
      }
    } catch (err: any) {
      onError(err.message || "Network error occurred.");
    } finally {
      setIsBackingUpCyberPanel(null);
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

  const handleRestoreBackup = (id: string, name: string) => {
    setConfirmDialog({ type: 'restore', id, name });
  };

  const handleDeleteBackup = (id: string) => {
    setConfirmDialog({ type: 'delete', id });
  };

  const executeConfirm = async () => {
    if (!confirmDialog) return;
    const { type, id, name } = confirmDialog;
    
    setConfirmDialog(null);

    if (type === 'restore') {
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
    } else if (type === 'delete') {
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
    }
  };

  return (
    <div className="space-y-4 animate-fade-in" id="admin-backups-tab">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Column: Cloud Backup & CyberPanel */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs space-y-4">
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
                  value={backupSettings.cloudUrl || ""}
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
                  value={backupSettings.intervalHours || 24}
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

          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-xl">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-xs">CyberPanel Cloud Backup</h3>
                <p className="text-[10px] text-slate-400 font-bold">SFTP integration for remote backups</p>
              </div>
            </div>

            <form onSubmit={handleSaveCyberPanel} className="space-y-3">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100/50">
                <div>
                  <span className="block font-bold text-slate-700 text-xs">Enable Integration</span>
                  <span className="block text-[9px] text-slate-400 font-bold">Connect to CyberPanel Server</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCyberPanelConfig({ ...cyberPanelConfig, enabled: !cyberPanelConfig.enabled })}
                  className="cursor-pointer"
                >
                  {cyberPanelConfig.enabled ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black rounded-lg border border-blue-100/50">
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
                  SFTP Host IP
                </label>
                <input
                  type="text"
                  placeholder="e.g. 65.21.224.219"
                  value={cyberPanelConfig.hostIp || ""}
                  onChange={(e) => setCyberPanelConfig({ ...cyberPanelConfig, hostIp: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none text-slate-700"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-[9px] uppercase tracking-wider font-black text-slate-400">
                    SFTP Username
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. bk_75ad..."
                    value={cyberPanelConfig.username || ""}
                    onChange={(e) => setCyberPanelConfig({ ...cyberPanelConfig, username: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] uppercase tracking-wider font-black text-slate-400">
                    Port
                  </label>
                  <input
                    type="number"
                    placeholder="22"
                    value={cyberPanelConfig.port || ""}
                    onChange={(e) => setCyberPanelConfig({ ...cyberPanelConfig, port: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] uppercase tracking-wider font-black text-slate-400">
                  SSH Private Key Block
                </label>
                <textarea
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----..."
                  value={cyberPanelConfig.sshKey || ""}
                  onChange={(e) => setCyberPanelConfig({ ...cyberPanelConfig, sshKey: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-mono outline-none text-slate-700 h-24 resize-none custom-scrollbar"
                ></textarea>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] uppercase tracking-wider font-black text-slate-400">
                  Remote Path
                </label>
                <input
                  type="text"
                  placeholder="cpbackups/smart_uptime_notification"
                  value={cyberPanelConfig.remotePath || ""}
                  onChange={(e) => setCyberPanelConfig({ ...cyberPanelConfig, remotePath: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none text-slate-700"
                />
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2">
                <h4 className="text-[10px] font-black text-slate-700 uppercase">Manual SSH Key Setup</h4>
                <p className="text-[9px] text-slate-500">Run these commands on your CyberPanel server to grant access:</p>
                <div className="bg-slate-900 rounded text-slate-300 font-mono text-[9px] p-2 overflow-x-auto whitespace-pre">
{`# 1. Generate SSH key:
ssh-keygen -t ed25519 -f /root/.ssh/cyberpanel -N ""

# 2. Copy the public key:
cat /root/.ssh/cyberpanel.pub

# 3. Test connection:
sftp -i /root/.ssh/cyberpanel -P 22 bk_75ad9ea559b09a5a@65.21.224.219`}
                </div>
              </div>

              <div className="flex gap-2 mb-2">
                <button
                  type="submit"
                  disabled={isSavingCyberPanel}
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-lg text-xs font-black transition-all cursor-pointer shadow-3xs"
                >
                  {isSavingCyberPanel ? "Saving..." : "Save Config"}
                </button>
                <button
                  type="button"
                  onClick={handleTestCyberPanel}
                  disabled={isTestingCyberPanel}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-black transition-all cursor-pointer shadow-3xs flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  {isTestingCyberPanel ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UploadCloud className="w-3.5 h-3.5" />
                  )}
                  Test Connection
                </button>
              </div>

              {cyberPanelDirectories.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 mt-3 max-h-48 overflow-y-auto custom-scrollbar">
                  <h4 className="text-[10px] font-black text-slate-700 uppercase sticky top-0 bg-slate-50 py-1">Remote Directories Found</h4>
                  <ul className="space-y-1">
                    {cyberPanelDirectories.map((dir, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-[10px] font-mono text-slate-600 bg-white p-1.5 rounded border border-slate-100">
                        {dir.type === 'd' ? <Database className="w-3 h-3 text-blue-400" /> : <Cloud className="w-3 h-3 text-slate-400" />}
                        <span>{dir.name}</span>
                        <span className="text-[8px] text-slate-400 ml-auto">{dir.size} B</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleCyberPanelBackup('database')}
                  disabled={isBackingUpCyberPanel !== null}
                  className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 text-blue-700 border border-blue-100 rounded-lg text-xs font-black transition-all cursor-pointer shadow-3xs flex items-center justify-center gap-1.5"
                >
                  {isBackingUpCyberPanel === 'database' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Database className="w-3.5 h-3.5" />
                  )}
                  {isBackingUpCyberPanel === 'database' ? 'Uploading...' : 'Database Backup'}
                </button>
                <button
                  type="button"
                  onClick={() => handleCyberPanelBackup('full')}
                  disabled={isBackingUpCyberPanel !== null}
                  className="flex-1 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg text-xs font-black transition-all cursor-pointer shadow-3xs flex items-center justify-center gap-1.5"
                >
                  {isBackingUpCyberPanel === 'full' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Cloud className="w-3.5 h-3.5" />
                  )}
                  {isBackingUpCyberPanel === 'full' ? 'Uploading...' : 'Full Backup'}
                </button>
              </div>
            </form>
          </div>
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

                    <div className="flex items-center gap-1.5 mt-2 sm:mt-0">
                      <a
                        href={`/api/admin/backup/download/${snapshot.id}`}
                        download
                        className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-[10px] rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <Download className="w-3 h-3 text-slate-400" />
                        <span className="hidden sm:inline">Download</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleRestoreBackup(snapshot.id, snapshot.name)}
                        disabled={restoringId !== null}
                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-700 border border-indigo-200 text-[10px] rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        {restoringId === snapshot.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3 text-indigo-500" />
                        )}
                        <span className="hidden sm:inline">Restore</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteBackup(snapshot.id)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition-all cursor-pointer shadow-2xs"
                        title="Delete Backup"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Compact Warning block */}
            <div className="p-2.5 bg-amber-50 border border-amber-200/60 rounded-xl text-[10px] text-amber-800 leading-normal font-bold flex gap-2 shrink-0 items-start shadow-xs">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                <strong>WARNING:</strong> Restoring database snapshots completely overwrites all active monitor targets, subscriber profiles, balances, and system parameters. This action is irreversible. Use with extreme caution.
              </span>
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        {confirmDialog && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100 flex flex-col scale-100 animate-in zoom-in-95 duration-200">
              <div className={`p-4 border-b ${confirmDialog.type === 'restore' ? 'bg-indigo-50/50 border-indigo-100/50' : 'bg-rose-50/50 border-rose-100/50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${confirmDialog.type === 'restore' ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'}`}>
                    {confirmDialog.type === 'restore' ? <RefreshCw className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-sm">
                      {confirmDialog.type === 'restore' ? 'Restore System Snapshot' : 'Delete Snapshot'}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {confirmDialog.type === 'restore' ? 'This action is highly destructive.' : 'This action cannot be undone.'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  {confirmDialog.type === 'restore' ? (
                    <>
                      Are you absolutely sure you want to restore the system to <strong>"{confirmDialog.name}"</strong>? All current data will be overwritten and permanently lost.
                    </>
                  ) : (
                    <>
                      Are you sure you want to permanently delete this backup snapshot?
                    </>
                  )}
                </p>
              </div>
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeConfirm}
                  className={`px-4 py-2 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm ${
                    confirmDialog.type === 'restore' 
                      ? 'bg-indigo-600 hover:bg-indigo-700' 
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {confirmDialog.type === 'restore' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      Confirm Restore
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Backup
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
