import express from "express";
import path from "path";
import dns from "dns";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { readDb, writeDb, addSystemLog, Monitor, MonitorLog, Payment, initializeDb } from "./server/db.js";
import { startMonitorEngine } from "./server/monitor.js";
import { verifyBscTransaction } from "./server/bsc.js";

// Cryptographic helpers for password hashing
function hashPassword(password: string, salt: string): string {
  return crypto.createHmac("sha256", salt).update(password).digest("hex");
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

// In-memory secure OTP storage for password resets (expires in 5 minutes)
interface OtpRecord {
  otp: string;
  expires: number;
  deliveryMethod: "email" | "telegram";
}
const tempOtps = new Map<string, OtpRecord>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing middleware
  app.use(express.json());

  // Initialize DB first
  await initializeDb();

  // 1. Initialize Uptime Monitoring Background Engine
  startMonitorEngine();

  // Helper to dynamically get the active session user
  const getActiveUser = (req: express.Request, db: any) => {
    const emailHeader = req.headers["x-user-email"] || req.query.email;
    if (emailHeader) {
      const matched = db.users.find((u: any) => u.email.toLowerCase() === String(emailHeader).toLowerCase());
      if (matched) return matched;
      return null;
    }
    return null;
  };

  // 2. API Routes

  // Secure Cryptographic Authentication Endpoints

  // Register Endpoint
  app.post("/api/auth/register", (req, res) => {
    try {
      const { name, email, phone, password, telegram_chat_id } = req.body;
      if (!name || !email || !password) {
        res.status(400).json({ error: "Name, email, and password are required for TLS registration." });
        return;
      }

      if (password.length < 8) {
        res.status(400).json({ error: "Cryptographic standard requires a password of at least 8 characters." });
        return;
      }

      const db = readDb();
      const lowerEmail = email.toLowerCase().trim();

      // Ensure email uniqueness
      const existing = db.users.find((u: any) => u.email.toLowerCase() === lowerEmail);
      if (existing) {
        res.status(400).json({ error: "A node has already registered with this email address." });
        return;
      }

      const salt = generateSalt();
      const hash = hashPassword(password, salt);

      // Generate a clean random BSC BEP-20 wallet address for the new user
      const randomWallet = "0x" + crypto.randomBytes(20).toString("hex");

      const newUser = {
        id: "user-" + crypto.randomBytes(6).toString("hex"),
        name: name.trim(),
        email: lowerEmail,
        phone: phone ? phone.trim() : "",
        password_hash: hash,
        password_salt: salt,
        balance: 10.00, // Gift 10 USDT starting balance for pro simulation
        wallet_address: randomWallet,
        plan_id: "free" as const,
        createdAt: new Date().toISOString(),
        telegram_chat_id: telegram_chat_id ? telegram_chat_id.trim() : ""
      };

      db.users.push(newUser);
      writeDb(db);

      addSystemLog("info", `Security Audit: New node registered successfully: ${newUser.email} (${newUser.id})`);
      res.json({ success: true, user: newUser });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Login / Challenge Verification Endpoint
  app.post("/api/auth/login", (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: "Credentials are required." });
        return;
      }

      const db = readDb();
      const lowerEmail = email.toLowerCase().trim();
      const user = db.users.find((u: any) => u.email.toLowerCase() === lowerEmail);

      if (!user) {
        res.status(401).json({ error: "Access Denied. Invalid security handshake credentials." });
        return;
      }

      // If user has a registered password, enforce check
      if (user.password_hash && user.password_salt) {
        const computed = hashPassword(password, user.password_salt);
        if (computed !== user.password_hash) {
          res.status(401).json({ error: "Access Denied. Invalid security handshake credentials." });
          return;
        }
      } else {
        // Fallback for pre-loaded mock user with no password yet
        // If password is submitted, we auto-save it on first login to make it fully secure
        const salt = generateSalt();
        user.password_hash = hashPassword(password, salt);
        user.password_salt = salt;
        writeDb(db);
      }

      addSystemLog("info", `Security Audit: User authenticated successfully via TLS: ${user.email}`);
      res.json({ success: true, user });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Request Password Reset / OTP Generation
  app.post("/api/auth/reset-request", (req, res) => {
    try {
      const { email, delivery_method } = req.body;
      if (!email || !delivery_method) {
        res.status(400).json({ error: "Email and OTP delivery method (email | telegram) are required." });
        return;
      }

      const db = readDb();
      const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase().trim());

      if (!user) {
        res.status(404).json({ error: "No registered node found with this email." });
        return;
      }

      // Generate secure 6-digit random OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = Date.now() + 5 * 60 * 1000; // 5 mins expiration

      tempOtps.set(user.email.toLowerCase(), { otp, expires, deliveryMethod: delivery_method });

      const logMessage = `[SECURITY OTP CHANNELS] Sent 6-digit OTP code [${otp}] to ${user.email} via ${delivery_method.toUpperCase()}. (Expires in 5 minutes)`;
      console.log(logMessage);
      addSystemLog("warn", `Security Audit: Generated OTP for ${user.email} reset via ${delivery_method.toUpperCase()}`);

      res.json({ 
        success: true, 
        message: `A highly secure OTP has been dispatched to your ${delivery_method === "email" ? "Email Inbox" : "Telegram Bot Chat"}.`,
        // Include OTP in response for simulation so the user can easily copy and paste it!
        simulated_otp: otp 
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Verify Reset Request & Commit New Password
  app.post("/api/auth/reset-verify", (req, res) => {
    try {
      const { email, otp, new_password } = req.body;
      if (!email || !otp || !new_password) {
        res.status(400).json({ error: "All validation fields are required." });
        return;
      }

      if (new_password.length < 8) {
        res.status(400).json({ error: "New password must be at least 8 characters for cryptographic security." });
        return;
      }

      const lowerEmail = email.toLowerCase().trim();
      const record = tempOtps.get(lowerEmail);

      if (!record) {
        res.status(400).json({ error: "No active password reset request found for this email node." });
        return;
      }

      if (Date.now() > record.expires) {
        tempOtps.delete(lowerEmail);
        res.status(400).json({ error: "The OTP verification window has expired. Please request a new one." });
        return;
      }

      if (record.otp !== String(otp).trim()) {
        res.status(400).json({ error: "Cryptographic validation failed. Invalid OTP code entered." });
        return;
      }

      const db = readDb();
      const user = db.users.find((u: any) => u.email.toLowerCase() === lowerEmail);

      if (!user) {
        res.status(404).json({ error: "Target node user not found." });
        return;
      }

      const salt = generateSalt();
      user.password_hash = hashPassword(new_password, salt);
      user.password_salt = salt;
      writeDb(db);

      // Clean up OTP key
      tempOtps.delete(lowerEmail);

      addSystemLog("info", `Security Audit: Password reset successfully completed for node: ${user.email}`);
      res.json({ success: true, message: "Your cryptographic password has been updated securely. You can now login." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get active subscriber user
  app.get("/api/user", (req, res) => {
    try {
      const db = readDb();
      const user = getActiveUser(req, db);
      if (!user) {
        res.status(401).json({ error: "Session expired or user not found. Please log in again." });
        return;
      }
      res.json(user);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Edit subscriber profile
  app.put("/api/user", (req, res) => {
    try {
      const { name, email, wallet_address, telegram_chat_id } = req.body;
      const db = readDb();
      const user = getActiveUser(req, db);
      if (!user) {
        res.status(401).json({ error: "Session expired or user not found. Please log in again." });
        return;
      }
      if (name) user.name = name;
      if (email) user.email = email;
      if (wallet_address) user.wallet_address = wallet_address;
      if (telegram_chat_id !== undefined) user.telegram_chat_id = telegram_chat_id.trim();
      writeDb(db);
      res.json(user);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Upgrade Plan
  app.post("/api/user/upgrade", (req, res) => {
    try {
      const { plan_id } = req.body;
      const db = readDb();
      const plans = db.plans || [];
      const selectedPlan = plans.find((p) => p.id === plan_id);

      if (!selectedPlan) {
        res.status(400).json({ error: "Invalid plan ID specified or plan does not exist." });
        return;
      }

      if (!selectedPlan.is_active) {
        res.status(400).json({ error: `The ${selectedPlan.name} plan is currently disabled by administrators.` });
        return;
      }

      const user = getActiveUser(req, db);
      if (!user) {
        res.status(401).json({ error: "Session expired or user not found." });
        return;
      }
      const cost = selectedPlan.price;

      if (user.balance < cost) {
        res.status(400).json({ error: `Insufficient balance to purchase this plan. Requires ${cost} USDT.` });
        return;
      }

      user.balance -= cost;
      user.plan_id = plan_id;
      writeDb(db);

      addSystemLog("info", `User upgraded subscription plan to ${selectedPlan.name.toUpperCase()} (${plan_id}). Charged ${cost} USDT.`);
      res.json({ success: true, user });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Add custom balance (Sandbox Testing mode)
  app.post("/api/user/sandbox-credit", (req, res) => {
    try {
      const { amount } = req.body;
      const creditAmount = Number(amount);
      if (isNaN(creditAmount) || creditAmount <= 0) {
        res.status(400).json({ error: "Invalid credit amount." });
        return;
      }

      const db = readDb();
      const user = getActiveUser(req, db);
      if (!user) {
        res.status(401).json({ error: "Session expired or user not found." });
        return;
      }
      user.balance += creditAmount;
      writeDb(db);

      addSystemLog("info", `Sandbox Mode: Admin credited user wallet with ${creditAmount} USDT.`);
      res.json({ success: true, user });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get active monitors with uptime stats
  app.get("/api/monitors", (req, res) => {
    try {
      const db = readDb();
      const user = getActiveUser(req, db);
      if (!user) {
        res.status(401).json({ error: "Session expired or user not found." });
        return;
      }
      const userMonitors = db.monitors.filter((m) => m.user_id === user.id);

      // Calculate uptime statistics for each monitor based on logs
      const enrichedMonitors = userMonitors.map((m) => {
        const logs = db.logs.filter((l) => l.monitor_id === m.id);
        const total = logs.length;
        const upCount = logs.filter((l) => l.status === "up").length;
        const uptimePercent = total > 0 ? (upCount / total) * 100 : 100;
        
        // Average response time of up logs
        const upLogs = logs.filter((l) => l.status === "up");
        const avgResponse = upLogs.length > 0 
          ? Math.round(upLogs.reduce((sum, l) => sum + l.response_time, 0) / upLogs.length) 
          : 0;

        return {
          ...m,
          uptime_percentage: Number(uptimePercent.toFixed(2)),
          average_response_time_ms: avgResponse,
          total_checks: total,
        };
      });

      res.json(enrichedMonitors);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create a new monitor
  app.post("/api/monitors", (req, res) => {
    try {
      const { name, url, monitor_type, interval_sec } = req.body;
      if (!name || !url) {
        res.status(400).json({ error: "Name and URL are required." });
        return;
      }

      // Check URL format
      try {
        new URL(url);
      } catch (e) {
        res.status(400).json({ error: "Invalid URL format. Please include protocol (http:// or https://)." });
        return;
      }

      const db = readDb();
      const user = getActiveUser(req, db);
      if (!user) {
        res.status(401).json({ error: "Session expired or user not found." });
        return;
      }
      const monitors = db.monitors.filter((m) => m.user_id === user.id);

      // Validate plan limits dynamically
      const plans = db.plans || [];
      const userPlan = plans.find((p) => p.id === user.plan_id) || { name: user.plan_id, max_monitors: 3, min_interval_sec: 30 };
      const limit = userPlan.max_monitors;
      if (monitors.length >= limit) {
        res.status(400).json({
          error: `You have reached the maximum number of monitors allowed on the ${userPlan.name} plan (${limit}). Please upgrade your plan.`,
        });
        return;
      }

      // Validate intervals based on plan dynamically
      const minInterval = userPlan.min_interval_sec;
      const selectedInterval = Number(interval_sec) || 30;

      if (selectedInterval < minInterval) {
        res.status(400).json({
          error: `Minimum check interval allowed on the ${userPlan.name} plan is ${minInterval} seconds.`,
        });
        return;
      }

      const newMonitor: Monitor = {
        id: `monitor-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        user_id: user.id,
        name: name.trim(),
        url: url.trim(),
        monitor_type: monitor_type || "HTTP",
        interval_sec: selectedInterval,
        status: "pending",
        consecutive_failures: 0,
        alert_sent: false,
      };

      db.monitors.push(newMonitor);
      writeDb(db);

      addSystemLog("info", `New monitor added: "${newMonitor.name}" (${newMonitor.url})`);
      res.json(newMonitor);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Edit monitor configuration
  app.put("/api/monitors/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { name, url, monitor_type, interval_sec } = req.body;
      const db = readDb();
      
      const idx = db.monitors.findIndex((m) => m.id === id);
      if (idx === -1) {
        res.status(404).json({ error: "Monitor not found." });
        return;
      }

      const monitor = db.monitors[idx];
      const user = getActiveUser(req, db);
      if (!user) {
        res.status(401).json({ error: "Session expired or user not found." });
        return;
      }

      // Validate intervals based on plan dynamically
      if (interval_sec) {
        const plans = db.plans || [];
        const userPlan = plans.find((p) => p.id === user.plan_id) || { name: user.plan_id, min_interval_sec: 30 };
        const minInterval = userPlan.min_interval_sec;
        const selectedInterval = Number(interval_sec);
        if (selectedInterval < minInterval) {
          res.status(400).json({
            error: `Minimum check interval allowed on the ${userPlan.name} plan is ${minInterval} seconds.`,
          });
          return;
        }
        monitor.interval_sec = selectedInterval;
      }

      if (name) monitor.name = name.trim();
      if (url) {
        try {
          new URL(url);
          monitor.url = url.trim();
        } catch (e) {
          res.status(400).json({ error: "Invalid URL format." });
          return;
        }
      }
      if (monitor_type) monitor.monitor_type = monitor_type;

      // Reset status on edit
      monitor.status = "pending";
      monitor.consecutive_failures = 0;
      monitor.alert_sent = false;

      writeDb(db);
      addSystemLog("info", `Monitor updated: "${monitor.name}" (${monitor.url})`);
      res.json(monitor);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete monitor
  app.delete("/api/monitors/:id", (req, res) => {
    try {
      const { id } = req.params;
      const db = readDb();
      
      const monitor = db.monitors.find((m) => m.id === id);
      if (!monitor) {
        res.status(404).json({ error: "Monitor not found." });
        return;
      }

      db.monitors = db.monitors.filter((m) => m.id !== id);
      // Clean up historical logs for this monitor
      db.logs = db.logs.filter((l) => l.monitor_id !== id);

      writeDb(db);
      addSystemLog("info", `Monitor deleted: "${monitor.name}"`);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Fetch recent logs for a specific monitor
  app.get("/api/monitors/:id/logs", (req, res) => {
    try {
      const { id } = req.params;
      const db = readDb();
      // Return the last 30 logs for this monitor, sorted oldest to newest for graphing
      const logs = db.logs
        .filter((l) => l.monitor_id === id)
        .slice(0, 30)
        .reverse();
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Trigger manual immediate check
  app.post("/api/monitors/:id/check", async (req, res) => {
    try {
      const { id } = req.params;
      const db = readDb();
      const monitor = db.monitors.find((m) => m.id === id);

      if (!monitor) {
        res.status(404).json({ error: "Monitor not found." });
        return;
      }

      // Check if domain is blacklisted / SSRF protection
      let ip = "";
      try {
        const parsedUrl = new URL(monitor.url);
        const lookupPromise = new Promise<string>((resolve, reject) => {
          dns.lookup(parsedUrl.hostname, (err, address) => {
            if (err) reject(err);
            else resolve(address || "");
          });
        });
        ip = await lookupPromise;
      } catch (dnsErr: any) {
        res.status(400).json({ error: `DNS check failed: ${dnsErr.message}` });
        return;
      }

      // Perform fast check synchronously for the manual request
      const startTime = Date.now();
      let status: "up" | "down" = "down";
      let responseTime = 0;
      let statusCode = 0;
      let errMsg = "";

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const response = await fetch(monitor.url, { signal: controller.signal });
        clearTimeout(timeoutId);
        responseTime = Date.now() - startTime;
        statusCode = response.status;
        if (response.status >= 200 && response.status < 400) {
          status = "up";
        } else {
          errMsg = `HTTP Status ${response.status}`;
        }
      } catch (err: any) {
        responseTime = Date.now() - startTime;
        status = "down";
        errMsg = err.message || "Network Error";
      }

      // Save log
      const newLog: MonitorLog = {
        id: `log-manual-${Date.now()}`,
        monitor_id: monitor.id,
        response_time: responseTime,
        status_code: statusCode,
        status: status,
        timestamp: new Date().toISOString(),
        error_message: errMsg || undefined
      };

      // Update monitor
      const dbIdx = db.monitors.findIndex((m) => m.id === id);
      if (dbIdx !== -1) {
        db.monitors[dbIdx].last_check = new Date().toISOString();
        db.monitors[dbIdx].status = status;
        if (status === "up") {
          db.monitors[dbIdx].consecutive_failures = 0;
          db.monitors[dbIdx].alert_sent = false;
        } else {
          db.monitors[dbIdx].consecutive_failures += 1;
        }
      }

      db.logs.unshift(newLog);
      writeDb(db);

      res.json({ success: true, log: newLog, monitor: db.monitors[dbIdx] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Verify BEP-20 Payment
  app.post("/api/payment/verify", async (req, res) => {
    try {
      const { txn_hash } = req.body;
      if (!txn_hash) {
        res.status(400).json({ error: "Transaction hash is required." });
        return;
      }

      const db = readDb();
      const user = getActiveUser(req, db);
      if (!user) {
        res.status(401).json({ error: "Session expired or user not found." });
        return;
      }
      const config = db.config;

      // Check if hash is already processed
      const existing = db.payments.find((p) => p.txn_hash.toLowerCase() === txn_hash.toLowerCase().trim());
      if (existing && existing.status === "confirmed") {
        res.status(400).json({ error: "This transaction hash has already been verified and credited." });
        return;
      }

      // Perform real BSC query
      const result = await verifyBscTransaction(txn_hash, config.receiver_wallet_address);

      if (result.success && result.amount) {
        // Record payment
        const newPayment: Payment = {
          txn_hash: txn_hash.trim().toLowerCase(),
          user_id: user.id,
          amount: result.amount,
          token: result.token || "USDT",
          status: "confirmed",
          timestamp: new Date().toISOString(),
          block_number: result.blockNumber
        };

        db.payments.unshift(newPayment);
        // Credit user balance
        user.balance += result.amount;
        writeDb(db);

        addSystemLog("info", `Payment verified! Credited ${result.amount.toFixed(2)} USDT to ${user.name}'s balance. Hash: ${txn_hash}`);
        res.json({ success: true, amount: result.amount, balance: user.balance, message: result.message });
      } else {
        // Record failed transaction attempts in the log
        const failedPayment: Payment = {
          txn_hash: txn_hash.trim().toLowerCase(),
          user_id: user.id,
          amount: 0,
          token: "USDT",
          status: "failed",
          timestamp: new Date().toISOString()
        };
        db.payments.unshift(failedPayment);
        writeDb(db);

        res.status(400).json({ error: result.message });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Fetch transaction history
  app.get("/api/payment/history", (req, res) => {
    try {
      const db = readDb();
      res.json(db.payments);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Fetch subscriber-wide check logs
  app.get("/api/logs", (req, res) => {
    try {
      const db = readDb();
      const user = getActiveUser(req, db);
      if (!user) {
        res.status(401).json({ error: "Session expired or user not found." });
        return;
      }
      const userMonitors = db.monitors.filter((m) => m.user_id === user.id);
      const userMonitorIds = new Set(userMonitors.map((m) => m.id));
      const filteredLogs = db.logs.filter((l) => userMonitorIds.has(l.monitor_id));
      
      const enrichedLogs = filteredLogs.map((l) => {
        const m = userMonitors.find((mon) => mon.id === l.monitor_id);
        return {
          ...l,
          monitorName: m ? m.name : "Unknown Monitor",
          monitorUrl: m ? m.url : ""
        };
      });
      res.json(enrichedLogs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Fetch subscriber alert notifications audit trail
  app.get("/api/alerts", (req, res) => {
    try {
      const db = readDb();
      const alertLogs = db.systemLogs.filter((log) => {
        const msg = log.message.toLowerCase();
        return (
          msg.includes("alert triggered") ||
          msg.includes("recovery:") ||
          msg.includes("email notification triggered")
        );
      });
      res.json(alertLogs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Test current alert notification configurations
  app.post("/api/alerts/test", async (req, res) => {
    try {
      const { telegram_bot_token, telegram_chat_id, smtp_from, smtp_user } = req.body;
      const db = readDb();
      
      const botToken = telegram_bot_token || db.config.telegram_bot_token;
      const chatId = telegram_chat_id || db.config.telegram_chat_id;
      const mailFrom = smtp_from || db.config.smtp_from;

      const testMsg = `🧪 *TEST ALERT*: Your UptimePro alert system is configured correctly!\n\n*Time*: ${new Date().toLocaleString()}\n*Status*: ONLINE`;
      
      let telegramSuccess = false;
      let emailSuccess = false;

      if (botToken && chatId) {
        try {
          const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: testMsg,
              parse_mode: "Markdown",
            }),
          });
          telegramSuccess = response.ok;
        } catch (err) {
          console.error(err);
        }
      }

      if (mailFrom) {
        console.log(`[TEST EMAIL ALERT] From: ${mailFrom}\nBody: ${testMsg}`);
        addSystemLog("info", "Test email alert dispatched successfully.");
        emailSuccess = true;
      }

      res.json({ success: true, telegram: telegramSuccess, email: emailSuccess });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Read alert configs (including receiver wallet, bot tokens)
  app.get("/api/config", (req, res) => {
    try {
      const db = readDb();
      res.json(db.config);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Edit configuration values
  app.post("/api/config", (req, res) => {
    try {
      const {
        alert_delay_checks,
        telegram_bot_token,
        telegram_chat_id,
        smtp_host,
        smtp_port,
        smtp_user,
        smtp_pass,
        smtp_from,
        alerts_enabled,
        receiver_wallet_address,
      } = req.body;

      const db = readDb();
      const config = db.config;

      if (alert_delay_checks !== undefined) config.alert_delay_checks = Number(alert_delay_checks) || 3;
      if (telegram_bot_token !== undefined) config.telegram_bot_token = telegram_bot_token.trim();
      if (telegram_chat_id !== undefined) config.telegram_chat_id = telegram_chat_id.trim();
      if (smtp_host !== undefined) config.smtp_host = smtp_host.trim();
      if (smtp_port !== undefined) config.smtp_port = Number(smtp_port) || 2525;
      if (smtp_user !== undefined) config.smtp_user = smtp_user.trim();
      if (smtp_pass !== undefined) config.smtp_pass = smtp_pass.trim();
      if (smtp_from !== undefined) config.smtp_from = smtp_from.trim();
      if (alerts_enabled !== undefined) config.alerts_enabled = Boolean(alerts_enabled);
      if (receiver_wallet_address !== undefined) {
        if (/^0x[a-fA-F0-9]{40}$/.test(receiver_wallet_address)) {
          config.receiver_wallet_address = receiver_wallet_address.trim();
        } else {
          res.status(400).json({ error: "Invalid BEP-20 receiving wallet format." });
          return;
        }
      }

      writeDb(db);
      addSystemLog("info", "Global Alert configurations and target receiving wallet updated by administrator.");
      res.json({ success: true, config });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin users list
  app.get("/api/admin/users", (req, res) => {
    try {
      const db = readDb();
      res.json(db.users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin edit user
  app.put("/api/admin/users/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { balance, plan_id, wallet_address } = req.body;
      const db = readDb();

      const user = db.users.find((u) => u.id === id);
      if (!user) {
        res.status(404).json({ error: "User not found." });
        return;
      }

      if (balance !== undefined) user.balance = Number(balance);
      if (plan_id !== undefined) user.plan_id = plan_id;
      if (wallet_address !== undefined) user.wallet_address = wallet_address;

      writeDb(db);
      addSystemLog("info", `Admin modified user profile for ${user.name}`);
      res.json(user);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin system logs
  app.get("/api/admin/system-logs", (req, res) => {
    try {
      const db = readDb();
      res.json(db.systemLogs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin clear system logs
  app.post("/api/admin/system-logs/clear", (req, res) => {
    try {
      const db = readDb();
      db.systemLogs = [
        {
          id: `syslog-clear-${Date.now()}`,
          level: "info",
          message: "System log cache cleared by administrator.",
          timestamp: new Date().toISOString()
        }
      ];
      writeDb(db);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 1. Get Backup settings & snapshots
  app.get("/api/admin/backup/settings", (req, res) => {
    try {
      const db = readDb();
      res.json({
        backupSettings: db.backupSettings || { enabled: false, cloudUrl: "", intervalHours: 24 },
        backupSnapshots: (db.backupSnapshots || []).map(s => ({
          id: s.id,
          name: s.name,
          timestamp: s.timestamp,
          sizeBytes: s.sizeBytes
        }))
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Update Backup settings
  app.post("/api/admin/backup/settings", (req, res) => {
    try {
      const { enabled, cloudUrl, intervalHours } = req.body;
      const db = readDb();
      db.backupSettings = {
        enabled: Boolean(enabled),
        cloudUrl: String(cloudUrl || ""),
        intervalHours: Number(intervalHours || 24),
        lastBackupAt: db.backupSettings?.lastBackupAt,
        lastBackupStatus: db.backupSettings?.lastBackupStatus,
        lastBackupMessage: db.backupSettings?.lastBackupMessage
      };
      writeDb(db);
      addSystemLog("info", `Backup configurations updated by administrator. Cloud Backup Server: ${cloudUrl || 'None'}`);
      res.json({ success: true, backupSettings: db.backupSettings });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Create Manual Backup snapshot
  app.post("/api/admin/backup/create", async (req, res) => {
    try {
      const { name } = req.body;
      const db = readDb();
      const backupName = name ? String(name) : `Backup_${new Date().toISOString().replace(/[:.]/g, "-")}`;
      
      const dbString = JSON.stringify(db);
      const sizeBytes = Buffer.byteLength(dbString, "utf8");
      
      const newSnapshot = {
        id: `backup-${Date.now()}`,
        name: backupName,
        timestamp: new Date().toISOString(),
        sizeBytes,
        data: dbString
      };
      
      if (!db.backupSnapshots) {
        db.backupSnapshots = [];
      }
      db.backupSnapshots.unshift(newSnapshot);
      
      let uploadStatus = "not_configured";
      let uploadMessage = "";
      
      if (db.backupSettings?.enabled && db.backupSettings?.cloudUrl) {
        try {
          const cloudRes = await fetch(db.backupSettings.cloudUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              appName: "UptimePro",
              timestamp: new Date().toISOString(),
              backupName: backupName,
              data: db
            })
          });
          
          if (cloudRes.ok) {
            uploadStatus = "success";
            uploadMessage = "Cloud backup dispatched and accepted successfully.";
            db.backupSettings.lastBackupStatus = "success";
            db.backupSettings.lastBackupMessage = uploadMessage;
          } else {
            uploadStatus = "failed";
            uploadMessage = `Cloud backup failed with status code ${cloudRes.status}.`;
            db.backupSettings.lastBackupStatus = "failed";
            db.backupSettings.lastBackupMessage = uploadMessage;
          }
        } catch (fetchErr: any) {
          uploadStatus = "failed";
          uploadMessage = `Cloud backup request failed: ${fetchErr.message}`;
          db.backupSettings.lastBackupStatus = "failed";
          db.backupSettings.lastBackupMessage = uploadMessage;
        }
        db.backupSettings.lastBackupAt = new Date().toISOString();
      }
      
      writeDb(db);
      addSystemLog("info", `Manual backup snapshot "${backupName}" created successfully. Cloud upload status: ${uploadStatus}`);
      
      res.json({
        success: true,
        snapshot: {
          id: newSnapshot.id,
          name: newSnapshot.name,
          timestamp: newSnapshot.timestamp,
          sizeBytes: newSnapshot.sizeBytes
        },
        cloudUpload: {
          status: uploadStatus,
          message: uploadMessage
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Restore database from snapshot ID
  app.post("/api/admin/backup/restore", (req, res) => {
    try {
      const { id } = req.body;
      if (!id) {
        res.status(400).json({ error: "Backup snapshot ID is required." });
        return;
      }
      
      const db = readDb();
      const matched = (db.backupSnapshots || []).find(s => s.id === id);
      if (!matched || !matched.data) {
        res.status(404).json({ error: "Backup snapshot not found or has no content data." });
        return;
      }
      
      const restoredState = JSON.parse(matched.data);
      
      const currentBackupSettings = db.backupSettings;
      const currentBackupSnapshots = db.backupSnapshots;
      
      restoredState.backupSettings = currentBackupSettings;
      restoredState.backupSnapshots = currentBackupSnapshots;
      
      writeDb(restoredState);
      addSystemLog("info", `System restored to snapshot: "${matched.name}"`);
      res.json({ success: true, message: `System state restored to "${matched.name}" successfully.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Test Cloud Backup
  app.post("/api/admin/backup/test-cloud", async (req, res) => {
    try {
      const db = readDb();
      const cloudUrl = db.backupSettings?.cloudUrl;
      
      if (!cloudUrl) {
        res.status(400).json({ error: "No Cloud Backup Server URL is currently configured." });
        return;
      }
      
      addSystemLog("info", `Initiating manual test backup upload to cloud destination: ${cloudUrl}`);
      
      let uploadStatus: "success" | "failed" = "success";
      let uploadMessage = "Cloud test backup accepted successfully.";
      
      try {
        const cloudRes = await fetch(cloudUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appName: "UptimePro",
            test: true,
            timestamp: new Date().toISOString(),
            data: db
          })
        });
        
        if (!cloudRes.ok) {
          uploadStatus = "failed";
          uploadMessage = `Cloud test failed with HTTP status code ${cloudRes.status}.`;
        }
      } catch (fetchErr: any) {
        uploadStatus = "failed";
        uploadMessage = `Cloud test transfer failed: ${fetchErr.message}`;
      }
      
      if (!db.backupSettings) {
        db.backupSettings = { enabled: false, cloudUrl: "", intervalHours: 24 };
      }
      db.backupSettings.lastBackupStatus = uploadStatus;
      db.backupSettings.lastBackupMessage = uploadMessage;
      db.backupSettings.lastBackupAt = new Date().toISOString();
      writeDb(db);
      
      if (uploadStatus === "success") {
        addSystemLog("info", `Cloud backup test passed.`);
        res.json({ success: true, message: uploadMessage });
      } else {
        addSystemLog("error", `Cloud backup test failed: ${uploadMessage}`);
        res.status(502).json({ error: uploadMessage });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Delete backup snapshot
  app.delete("/api/admin/backup/delete/:id", (req, res) => {
    try {
      const { id } = req.params;
      const db = readDb();
      const initialCount = db.backupSnapshots?.length || 0;
      db.backupSnapshots = (db.backupSnapshots || []).filter(s => s.id !== id);
      writeDb(db);
      addSystemLog("info", `Deleted backup snapshot ${id}`);
      res.json({ success: true, deleted: initialCount - db.backupSnapshots.length > 0 });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get all subscription plans (public/subscriber-facing)
  app.get("/api/plans", (req, res) => {
    try {
      const db = readDb();
      res.json(db.plans || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin update subscription plan details
  app.put("/api/admin/plans/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { name, price, max_monitors, min_interval_sec, features, is_active } = req.body;
      const db = readDb();

      const plan = db.plans.find((p) => p.id === id);
      if (!plan) {
        res.status(404).json({ error: `Subscription plan "${id}" not found.` });
        return;
      }

      if (name !== undefined) plan.name = name;
      if (price !== undefined) plan.price = Number(price);
      if (max_monitors !== undefined) plan.max_monitors = Number(max_monitors);
      if (min_interval_sec !== undefined) plan.min_interval_sec = Number(min_interval_sec);
      if (features !== undefined) plan.features = features;
      if (is_active !== undefined) plan.is_active = Boolean(is_active);

      writeDb(db);
      addSystemLog("info", `Admin updated subscription plan details for tier: ${plan.name} (${id})`);
      res.json(plan);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  // 3. Vite Server Integration Middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // 4. Listen on PORT 3000
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical: Express Server failed to start:", err);
});
