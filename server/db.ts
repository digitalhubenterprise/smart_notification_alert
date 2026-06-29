import fs from "fs";
import path from "path";
import pg from "pg";
const { Pool } = pg;

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
  site_title?: string;
  site_seo_desc?: string;
  site_seo_keywords?: string;
  google_analytics_id?: string;
  sitemap_enabled?: boolean;
  site_brand_email?: string;
  twofa_enabled?: boolean;
  twofa_secret?: string;
  twofa_enforced?: boolean;
  twofa_email_enabled?: boolean;
  twofa_telegram_enabled?: boolean;
  twofa_authenticator_enabled?: boolean;
  twofa_preferred_method?: string;
  log_retention_hours?: number;
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

export interface UserActivity {
  id: string;
  user_id: string;
  type: "login" | "monitor" | "billing" | "system";
  title: string;
  description: string;
  timestamp: string;
  metadata?: any;
}

export interface DatabaseSchema {
  users: User[];
  monitors: Monitor[];
  logs: MonitorLog[];
  config: AlertConfig;
  payments: Payment[];
  systemLogs: SystemLog[];
  activities?: UserActivity[];
  plans: SubscriptionPlan[];
  backupSettings?: BackupSettings;
  cyberPanelConfig?: any;
  backupSnapshots?: BackupSnapshot[];
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
  twofa_enabled: false,
  twofa_secret: "JBSWY3DPEHPK3PXP",
  twofa_enforced: false,
  twofa_email_enabled: true,
  twofa_telegram_enabled: false,
  twofa_authenticator_enabled: true,
  twofa_preferred_method: "authenticator",
  log_retention_hours: 24,
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
      backupSettings: {
        enabled: false,
        cloudUrl: "",
        intervalHours: 24
      },
      backupSnapshots: []
    };

    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), "utf8");
  }
}

let dbCache: DatabaseSchema | null = null;
let pgPool: pg.Pool | null = null;
let isSaving = false;
let needsSave = false;

export function getPgPool(): pg.Pool | null {
  if (!pgPool && process.env.DATABASE_URL) {
    try {
      pgPool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes("sslmode=") ? undefined : { rejectUnauthorized: false },
        max: 20, // Support more connections for 500+ users
        idleTimeoutMillis: 30000
      });
      console.log("[PostgreSQL] Pool initialized.");
    } catch (err) {
      console.error("[PostgreSQL] Failed to initialize Pool:", err);
    }
  }
  return pgPool;
}

export async function initializeDb(): Promise<DatabaseSchema> {
  const pool = getPgPool();
  if (pool) {
    try {
      console.log("[PostgreSQL] Checking schema tables...");
      await pool.query(`
        CREATE TABLE IF NOT EXISTS uptime_state (
          key VARCHAR(50) PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      const res = await pool.query("SELECT value FROM uptime_state WHERE key = 'state'");
      if (res.rows.length > 0) {
        console.log("[PostgreSQL] Loaded existing state from DB.");
        const parsed = JSON.parse(res.rows[0].value);
        
        let changed = false;
        if (!parsed.plans) {
          parsed.plans = DEFAULT_PLANS;
          changed = true;
        }
        if (!parsed.backupSettings) {
          parsed.backupSettings = {
            enabled: false,
            cloudUrl: "",
            intervalHours: 24
          };
          changed = true;
        }
        if (!parsed.backupSnapshots) {
          parsed.backupSnapshots = [];
          changed = true;
        }
        
        dbCache = parsed;
        if (changed) {
          await pool.query(
            "INSERT INTO uptime_state (key, value) VALUES ('state', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
            [JSON.stringify(dbCache)]
          );
        }
      } else {
        console.log("[PostgreSQL] No state found. Initializing with local JSON data...");
        ensureDbExists();
        const localData = fs.readFileSync(DB_PATH, "utf8");
        const parsed = JSON.parse(localData);
        if (!parsed.backupSettings) {
          parsed.backupSettings = {
            enabled: false,
            cloudUrl: "",
            intervalHours: 24
          };
        }
        if (!parsed.backupSnapshots) {
          parsed.backupSnapshots = [];
        }
        dbCache = parsed;
        await pool.query(
          "INSERT INTO uptime_state (key, value) VALUES ('state', $1)",
          [JSON.stringify(dbCache)]
        );
        console.log("[PostgreSQL] Seeded initial state in database.");
      }
    } catch (err) {
      console.error("[PostgreSQL] Error during schema initialization, falling back to local file:", err);
    }
  }

  if (!dbCache) {
    ensureDbExists();
    const data = fs.readFileSync(DB_PATH, "utf8");
    try {
      const parsed = JSON.parse(data);
      let changed = false;
      if (!parsed.plans) {
        parsed.plans = DEFAULT_PLANS;
        changed = true;
      }
      if (!parsed.backupSettings) {
        parsed.backupSettings = {
          enabled: false,
          cloudUrl: "",
          intervalHours: 24
        };
        changed = true;
      }
      if (!parsed.backupSnapshots) {
        parsed.backupSnapshots = [];
        changed = true;
      }
      if (changed) {
        fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), "utf8");
      }
      dbCache = parsed;
    } catch (err) {
      console.error("Failed to parse DB, resetting to initial DB", err);
      dbCache = INITIAL_DB;
    }
  }

  return dbCache;
}

export function readDb(): DatabaseSchema {
  if (!dbCache) {
    ensureDbExists();
    try {
      dbCache = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    } catch {
      dbCache = INITIAL_DB;
    }
  }
  return dbCache!;
}

export function writeDb(db: DatabaseSchema) {
  dbCache = db;
  needsSave = true;
  scheduleSave();
}

function scheduleSave() {
  if (isSaving || !needsSave) return;
  isSaving = true;
  needsSave = false;

  ensureDbExists();
  
  // Create a deep copy of the cache to avoid mutation during stringify
  const dataToSave = JSON.stringify(dbCache, null, 2);
  
  const pool = getPgPool();
  const pgPromise = pool 
    ? pool.query(
        "INSERT INTO uptime_state (key, value) VALUES ('state', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP",
        [dataToSave]
      ).catch(err => console.error("[PostgreSQL] Background save failed:", err))
    : Promise.resolve();

  const fsPromise = new Promise<void>((resolve) => {
    fs.writeFile(DB_PATH, dataToSave, "utf8", (err) => {
      if (err) console.error("Local file write failed:", err);
      resolve();
    });
  });

  Promise.all([pgPromise, fsPromise]).then(() => {
    isSaving = false;
    if (needsSave) {
      setTimeout(scheduleSave, 500); // 500ms debounce
    }
  });
}

export function addUserActivity(user_id: string, type: "login" | "monitor" | "billing" | "system", title: string, description: string, metadata?: any) {
  const db = readDb();
  if (!db.activities) {
    db.activities = [];
  }
  const newActivity: UserActivity = {
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    user_id,
    type,
    title,
    description,
    timestamp: new Date().toISOString(),
    metadata
  };
  db.activities.unshift(newActivity);
  if (db.activities.length > 5000) {
    db.activities = db.activities.slice(0, 5000);
  }
  writeDb(db);
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
  if (db.systemLogs.length > 5000) {
    db.systemLogs = db.systemLogs.slice(0, 5000);
  }
  writeDb(db);
}
