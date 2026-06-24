import fs from "fs";
import path from "path";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password_hash?: string;
  password_salt?: string;
  balance: number; // in USDT
  wallet_address: string;
  plan_id: "free" | "pro" | "enterprise";
  createdAt: string;
  telegram_chat_id?: string;
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
}

export interface MonitorLog {
  id: string;
  monitor_id: string;
  response_time: number; // in ms
  status_code: number;
  status: "up" | "down";
  timestamp: string;
  error_message?: string;
}

export interface AlertConfig {
  alert_delay_checks: number; // e.g. 3 consecutive checks before alert
  telegram_bot_token: string;
  telegram_chat_id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
  alerts_enabled: boolean;
  receiver_wallet_address: string; // BEP-20 receiving wallet address
}

export interface Payment {
  txn_hash: string;
  user_id: string;
  amount: number; // in USDT
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

export interface DatabaseSchema {
  users: User[];
  monitors: Monitor[];
  logs: MonitorLog[];
  config: AlertConfig;
  payments: Payment[];
  systemLogs: SystemLog[];
  plans: SubscriptionPlan[];
}

const DB_PATH = path.join(process.cwd(), "data", "uptime_db.json");

export const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free Basic",
    price: 0,
    max_monitors: 3,
    min_interval_sec: 30,
    features: ["Up to 3 monitors", "30s min check interval", "Basic email logs", "Community support"],
    is_active: true
  },
  {
    id: "pro",
    name: "Developer Pro",
    price: 10,
    max_monitors: 20,
    min_interval_sec: 10,
    features: ["Up to 20 monitors", "10s min check interval", "Instant Telegram alerts", "Outage delay thresholds", "Email incident dispatch"],
    is_active: true
  },
  {
    id: "enterprise",
    name: "Enterprise Elite",
    price: 50,
    max_monitors: 100,
    min_interval_sec: 5,
    features: ["Up to 100 monitors", "5s min check interval", "Custom SMTP channels", "Priority processing queue", "24/7 dedicated alert relay"],
    is_active: true
  }
];

const DEFAULT_CONFIG: AlertConfig = {
  alert_delay_checks: 3,
  telegram_bot_token: "",
  telegram_chat_id: "",
  smtp_host: "smtp.mailtrap.io",
  smtp_port: 2525,
  smtp_user: "",
  smtp_pass: "",
  smtp_from: "alerts@uptimepro.io",
  alerts_enabled: true,
  receiver_wallet_address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", // Demo BSC address
};

const INITIAL_DB: DatabaseSchema = {
  users: [
    {
      id: "user-admin",
      name: "Super Admin",
      email: "admin@uptimepro.io",
      balance: 1000.0,
      wallet_address: "0x1234567890abcdef1234567890abcdef12345678",
      plan_id: "enterprise",
      createdAt: new Date().toISOString(),
      telegram_chat_id: "",
    },
    {
      id: "user-1",
      name: "Demo Subscriber",
      email: "subscriber@uptimepro.io",
      balance: 15.50,
      wallet_address: "0x9E7036B599bDC6e2a276F1d17961b7b0a7526978",
      plan_id: "free",
      createdAt: new Date().toISOString(),
      telegram_chat_id: "",
    },
  ],
  monitors: [
    {
      id: "monitor-google",
      user_id: "user-1",
      name: "Google Homepage",
      url: "https://www.google.com",
      monitor_type: "HTTP",
      interval_sec: 10,
      status: "up",
      last_check: new Date().toISOString(),
      consecutive_failures: 0,
      alert_sent: false,
    },
    {
      id: "monitor-github",
      user_id: "user-1",
      name: "GitHub API",
      url: "https://api.github.com",
      monitor_type: "HTTP",
      interval_sec: 10,
      status: "up",
      last_check: new Date().toISOString(),
      consecutive_failures: 0,
      alert_sent: false,
    },
    {
      id: "monitor-broken",
      user_id: "user-1",
      name: "Simulated Down Endpoint",
      url: "https://this-domain-does-not-exist-uptimepro-test.com",
      monitor_type: "HTTP",
      interval_sec: 10,
      status: "down",
      last_check: new Date().toISOString(),
      consecutive_failures: 4,
      alert_sent: true,
    },
  ],
  logs: [],
  config: DEFAULT_CONFIG,
  payments: [
    {
      txn_hash: "0x4fca1a3a693c04c5a932b1239cf2be278e9cf97f6c32185b98a3e790a18ab8bc",
      user_id: "user-1",
      amount: 10.00,
      token: "USDT",
      status: "confirmed",
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      block_number: 35129402,
    },
    {
      txn_hash: "0xfa9b8c7d6e5d4c3b2a1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c",
      user_id: "user-1",
      amount: 5.50,
      token: "USDT",
      status: "confirmed",
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
      block_number: 35118491,
    }
  ],
  systemLogs: [
    {
      id: "syslog-1",
      level: "info",
      message: "UptimePro Monitoring Engine initialized successfully.",
      timestamp: new Date().toISOString(),
    },
  ],
  plans: DEFAULT_PLANS,
};

// Ensure data folder exists
function ensureDbExists() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    // Generate some mock history log data for Google and GitHub
    const now = Date.now();
    const mockLogs: MonitorLog[] = [];
    
    // Seed 12 points of history for google (every 10 minutes)
    for (let i = 11; i >= 0; i--) {
      mockLogs.push({
        id: `log-g-${i}`,
        monitor_id: "monitor-google",
        response_time: 80 + Math.floor(Math.random() * 40),
        status_code: 200,
        status: "up",
        timestamp: new Date(now - i * 600000).toISOString(),
      });
    }

    // Seed 12 points of history for github (every 10 minutes)
    for (let i = 11; i >= 0; i--) {
      mockLogs.push({
        id: `log-gh-${i}`,
        monitor_id: "monitor-github",
        response_time: 150 + Math.floor(Math.random() * 80),
        status_code: 200,
        status: "up",
        timestamp: new Date(now - i * 600000).toISOString(),
      });
    }

    // Seed 12 points of history for simulated broken endpoint
    for (let i = 11; i >= 0; i--) {
      mockLogs.push({
        id: `log-b-${i}`,
        monitor_id: "monitor-broken",
        response_time: 0,
        status_code: 503,
        status: "down",
        timestamp: new Date(now - i * 600000).toISOString(),
        error_message: "ENOTFOUND this-domain-does-not-exist-uptimepro-test.com",
      });
    }

    const initialData = {
      ...INITIAL_DB,
      logs: mockLogs,
    };

    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), "utf8");
  }
}

export function readDb(): DatabaseSchema {
  ensureDbExists();
  const data = fs.readFileSync(DB_PATH, "utf8");
  try {
    const parsed = JSON.parse(data);
    let changed = false;
    if (!parsed.plans) {
      parsed.plans = DEFAULT_PLANS;
      changed = true;
    }
    if (changed) {
      fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), "utf8");
    }
    return parsed;
  } catch (err) {
    console.error("Failed to parse DB, resetting to initial DB", err);
    return INITIAL_DB;
  }
}

export function writeDb(db: DatabaseSchema) {
  ensureDbExists();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

// Log helper
export function addSystemLog(level: "info" | "warn" | "error", message: string) {
  const db = readDb();
  const newLog: SystemLog = {
    id: `syslog-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    level,
    message,
    timestamp: new Date().toISOString(),
  };
  db.systemLogs.unshift(newLog);
  // Cap at 100 logs
  if (db.systemLogs.length > 100) {
    db.systemLogs = db.systemLogs.slice(0, 100);
  }
  writeDb(db);
}
