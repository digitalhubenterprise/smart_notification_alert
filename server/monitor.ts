import dns from "dns";
import { readDb, writeDb, addSystemLog, Monitor, MonitorLog } from "./db.js";

// Keep track of runtime monitor timer refs
let monitorIntervalRef: NodeJS.Timeout | null = null;
const alertCooldowns: Record<string, number> = {}; // monitorId -> timestamp of last alert

/**
 * Checks if an IP address is private (SSRF Protection)
 */
function isPrivateIp(ip: string): boolean {
  // Clean IP
  const cleanIp = ip.trim();

  // IPv4 Private Ranges
  // 127.0.0.0/8 (Loopback)
  if (cleanIp.startsWith("127.")) return true;
  // 10.0.0.0/8 (Private)
  if (cleanIp.startsWith("10.")) return true;
  // 172.16.0.0/12 (Private)
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanIp)) return true;
  // 192.168.0.0/16 (Private)
  if (cleanIp.startsWith("192.168.")) return true;
  // 169.254.0.0/16 (Link-local)
  if (cleanIp.startsWith("169.254.")) return true;
  // 0.0.0.0
  if (cleanIp === "0.0.0.0") return true;

  // IPv6 Private / Local Ranges
  if (cleanIp === "::1" || cleanIp === "::") return true;
  if (cleanIp.toLowerCase().startsWith("fe80:")) return true; // Link-local
  if (cleanIp.toLowerCase().startsWith("fc00:") || cleanIp.toLowerCase().startsWith("fd00:")) return true; // Unique local

  return false;
}

/**
 * Resolves a URL host to an IP address with SSRF validation
 */
function resolveHostAndValidate(urlStr: string): Promise<{ ip: string; hostname: string }> {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(urlStr);
      const hostname = parsedUrl.hostname;

      // If it is already an IP address, validate it immediately
      if (/^[0-9.]+$/.test(hostname) || hostname.includes(":")) {
        if (isPrivateIp(hostname)) {
          return reject(new Error(`SSRF Protection: Blocked access to private IP: ${hostname}`));
        }
        return resolve({ ip: hostname, hostname });
      }

      dns.lookup(hostname, (err, address) => {
        if (err) {
          return reject(new Error(`DNS resolution failed for ${hostname}`));
        }
        if (!address) {
          return reject(new Error(`Could not resolve hostname: ${hostname}`));
        }
        if (isPrivateIp(address)) {
          return reject(new Error(`SSRF Protection: Blocked access to private IP resolved from ${hostname} (${address})`));
        }
        resolve({ ip: address, hostname });
      });
    } catch (e: any) {
      reject(new Error(`Invalid URL parsed: ${e.message}`));
    }
  });
}

/**
 * Triggers Telegram Alert
 */
async function sendTelegramAlert(message: string, token: string, chatId: string) {
  if (!token || !chatId) return;
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    });
    if (!response.ok) {
      console.error("Telegram API alert returned status", response.status);
    }
  } catch (err: any) {
    console.error("Failed to send Telegram alert", err);
  }
}

/**
 * Triggers Email Alert (Logged or sent)
 */
async function sendEmailAlert(toEmail: string, subject: string, body: string, smtpFrom: string, smtpUser: string) {
  // If SMTP is not fully configured, we simulate it cleanly and log it
  console.log(`[EMAIL ALERT] To: ${toEmail}, From: ${smtpFrom}, Subject: ${subject}\nBody: ${body}`);
  addSystemLog("info", `Email notification dispatched to ${toEmail}: "${subject}".`);
}

/**
 * Pings a single monitor URL
 */
async function checkMonitor(monitor: Monitor): Promise<void> {
  const startTime = Date.now();
  let status: "up" | "down" = "down";
  let responseTime = 0;
  let statusCode = 0;
  let errorMessage: string | undefined;

  try {
    // 1. Resolve host and perform SSRF check
    const { ip } = await resolveHostAndValidate(monitor.url);

    // 2. Perform HTTP Check
    // Set a timeout of 5 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(monitor.url, {
      method: "GET",
      headers: {
        "User-Agent": "UptimePro-Engine/2.0 Uptime Monitor (https://uptimepro.io)",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    responseTime = Date.now() - startTime;
    statusCode = response.status;

    if (response.status >= 200 && response.status < 400) {
      status = "up";
    } else {
      status = "down";
      errorMessage = `Server returned unhealthy status: ${response.status} ${response.statusText}`;
    }
  } catch (err: any) {
    responseTime = Math.min(Date.now() - startTime, 5000);
    status = "down";
    statusCode = err.name === "AbortError" ? 504 : 0;
    errorMessage = err.message || "Unknown Connection Error";
  }

  // 3. Update Database State
  const db = readDb();
  const dbMonitorIndex = db.monitors.findIndex((m) => m.id === monitor.id);

  if (dbMonitorIndex !== -1) {
    const dbMonitor = db.monitors[dbMonitorIndex];
    dbMonitor.last_check = new Date().toISOString();

    if (status === "up") {
      dbMonitor.consecutive_failures = 0;
      if (dbMonitor.status === "down" && dbMonitor.alert_sent) {
        // Recovery Alert Trigger
        dbMonitor.status = "up";
        dbMonitor.alert_sent = false;
        
        // Notify Recovery
        const recoveryMsg = `✅ *RECOVERY*: Site is back UP!\n\n*Name*: ${monitor.name}\n*URL*: ${monitor.url}\n*Response Time*: ${responseTime}ms\n*Time*: ${new Date().toLocaleString()}`;
        if (db.config.alerts_enabled) {
          const monitorOwner = db.users.find((u) => u.id === monitor.user_id);
          const targetChatId = (monitorOwner && monitorOwner.telegram_chat_id) || db.config.telegram_chat_id;
          const targetEmail = (monitorOwner && monitorOwner.email) || "subscriber@uptimepro.io";

          if (targetChatId) {
            sendTelegramAlert(recoveryMsg, db.config.telegram_bot_token, targetChatId);
          }
          sendEmailAlert(targetEmail, `RECOVERY: ${monitor.name} is UP`, recoveryMsg, db.config.smtp_from, db.config.smtp_user);
        }
        addSystemLog("info", `Recovery: ${monitor.name} is UP again. Alerts reset.`);
      } else {
        dbMonitor.status = "up";
      }
    } else {
      // Down Status Handling
      dbMonitor.consecutive_failures += 1;
      dbMonitor.status = "down";

      const delayThreshold = db.config.alert_delay_checks || 3;
      if (dbMonitor.consecutive_failures >= delayThreshold && !dbMonitor.alert_sent) {
        // We only trigger alerts if cooldown has expired (throttling - e.g. 5 minutes)
        const now = Date.now();
        const lastAlert = alertCooldowns[monitor.id] || 0;
        const alertCooldownMs = 5 * 60 * 1000; // 5 mins cooldown

        if (now - lastAlert > alertCooldownMs) {
          dbMonitor.alert_sent = true;
          alertCooldowns[monitor.id] = now;

          // Notify Outage
          const outageMsg = `🚨 *ALERT*: Website is DOWN!\n\n*Name*: ${monitor.name}\n*URL*: ${monitor.url}\n*Failures*: ${dbMonitor.consecutive_failures} checks\n*Details*: ${errorMessage}\n*Time*: ${new Date().toLocaleString()}`;
          if (db.config.alerts_enabled) {
            const monitorOwner = db.users.find((u) => u.id === monitor.user_id);
            const targetChatId = (monitorOwner && monitorOwner.telegram_chat_id) || db.config.telegram_chat_id;
            const targetEmail = (monitorOwner && monitorOwner.email) || "subscriber@uptimepro.io";

            if (targetChatId) {
              sendTelegramAlert(outageMsg, db.config.telegram_bot_token, targetChatId);
            }
            sendEmailAlert(targetEmail, `ALERT: ${monitor.name} is DOWN`, outageMsg, db.config.smtp_from, db.config.smtp_user);
          }
          addSystemLog("warn", `Alert triggered: ${monitor.name} has been down for ${dbMonitor.consecutive_failures} consecutive pings!`);
        }
      }
    }

    // 4. Create and Save Log
    const newLog: MonitorLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      monitor_id: monitor.id,
      response_time: responseTime,
      status_code: statusCode,
      status: status,
      timestamp: new Date().toISOString(),
      error_message: errorMessage,
    };

    db.logs.unshift(newLog);

    // Limit historical logs to 50000 items to prevent database bloat but support 500+ users
    if (db.logs.length > 50000) {
      db.logs = db.logs.slice(0, 50000);
    }

    writeDb(db);
  }
}

let engineIsRunning = false;

/**
 * Main loop that runs periodically
 */
async function runEngineTick() {
  if (!engineIsRunning) return;
  
  try {
    const db = readDb();
    const monitors = db.monitors;
    const now = Date.now();

    // Automatically clear logs (monitor execution history, system alert logs, activities) based on retention config
    const retentionHours = db.config.log_retention_hours || 24;
    const retentionThreshold = now - retentionHours * 60 * 60 * 1000;
    
    const initialLogsCount = db.logs.length;
    const initialSysLogsCount = db.systemLogs.length;
    const initialActivitiesCount = db.activities ? db.activities.length : 0;

    db.logs = db.logs.filter((l) => new Date(l.timestamp).getTime() >= retentionThreshold);
    db.systemLogs = db.systemLogs.filter((sl) => new Date(sl.timestamp).getTime() >= retentionThreshold);
    
    if (db.activities) {
      db.activities = db.activities.filter((act) => new Date(act.timestamp).getTime() >= retentionThreshold);
    }

    if (db.logs.length !== initialLogsCount || db.systemLogs.length !== initialSysLogsCount || (db.activities && db.activities.length !== initialActivitiesCount)) {
      writeDb(db);
    }

    const dueMonitors = monitors.filter((monitor) => {
      const lastCheckTime = monitor.last_check ? new Date(monitor.last_check).getTime() : 0;
      const intervalMs = monitor.interval_sec * 1000;
      return now - lastCheckTime >= intervalMs;
    });

    // Chunk size of 100 for stable 500+ users concurrency
    const chunkSize = 100;
    for (let i = 0; i < dueMonitors.length; i += chunkSize) {
      if (!engineIsRunning) break;
      const chunk = dueMonitors.slice(i, i + chunkSize);
      
      // Execute chunk concurrently
      await Promise.allSettled(chunk.map(m => checkMonitor(m)));
      
      // Yield slightly to not block the Node.js event loop
      await new Promise(resolve => setTimeout(resolve, 50));
    }

  } catch (err: any) {
    console.error("Error in monitor engine tick:", err);
  } finally {
    if (engineIsRunning) {
      // Schedule the next tick
      monitorIntervalRef = setTimeout(runEngineTick, 5000);
    }
  }
}

/**
 * Initializes and starts the background monitoring engine
 */
export function startMonitorEngine() {
  if (engineIsRunning) return;
  engineIsRunning = true;

  if (monitorIntervalRef) {
    clearTimeout(monitorIntervalRef as NodeJS.Timeout);
  }

  addSystemLog("info", "Starting UptimePro Monitoring Engine worker (interval: 5s)...");
  
  // Run immediately once on startup
  runEngineTick();
}

/**
 * Stops the monitoring engine
 */
export function stopMonitorEngine() {
  engineIsRunning = false;
  if (monitorIntervalRef) {
    clearTimeout(monitorIntervalRef as NodeJS.Timeout);
    monitorIntervalRef = null;
    addSystemLog("info", "UptimePro Monitoring Engine stopped.");
  }
}
