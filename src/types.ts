export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password_hash?: string;
  password_salt?: string;
  balance: number;
  wallet_address: string;
  plan_id: "free" | "pro" | "enterprise";
  createdAt: string;
  telegram_chat_id?: string;
  two_factor_email?: boolean;
  two_factor_telegram?: boolean;
}

export interface Monitor {
  id: string;
  user_id: string;
  name: string;
  url: string;
  monitor_type: "HTTP" | "Ping" | "Port";
  interval_sec: number;
  status: "up" | "down" | "pending";
  last_check?: string;
  consecutive_failures: number;
  alert_sent: boolean;
  uptime_percentage?: number;
  average_response_time_ms?: number;
  total_checks?: number;
}

export interface MonitorLog {
  id: string;
  monitor_id: string;
  response_time: number;
  status_code: number;
  status: "up" | "down";
  timestamp: string;
  error_message?: string;
}

export interface AlertConfig {
  alert_delay_checks: number;
  telegram_bot_token: string;
  telegram_chat_id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
  alerts_enabled: boolean;
  receiver_wallet_address: string;
}

export interface Payment {
  txn_hash: string;
  user_id: string;
  amount: number;
  token: "USDT" | "BNB";
  status: "pending" | "confirmed" | "failed";
  timestamp: string;
  block_number?: number;
}

export interface SystemLog {
  id: string;
  level: "info" | "warn" | "error";
  message: string;
  timestamp: string;
}

export interface SubscriptionPlan {
  id: "free" | "pro" | "enterprise";
  name: string;
  price: number;
  max_monitors: number;
  min_interval_sec: number;
  features: string[];
  is_active: boolean;
}

export interface BackupSnapshot {
  id: string;
  name: string;
  timestamp: string;
  sizeBytes: number;
  data?: string;
}

export interface BackupSettings {
  enabled: boolean;
  cloudUrl: string;
  intervalHours: number;
  lastBackupAt?: string;
  lastBackupStatus?: "success" | "failed" | "pending";
  lastBackupMessage?: string;
}

export interface DatabaseSchema {
  users: User[];
  monitors: Monitor[];
  logs: MonitorLog[];
  config: AlertConfig;
  payments: Payment[];
  systemLogs: SystemLog[];
  plans: SubscriptionPlan[];
  backupSettings?: BackupSettings;
  backupSnapshots?: BackupSnapshot[];
}
