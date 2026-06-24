import express from "express";
import path from "path";
import dns from "dns";
import { createServer as createViteServer } from "vite";
import { readDb, writeDb, addSystemLog, Monitor, MonitorLog, Payment } from "./server/db.js";
import { startMonitorEngine } from "./server/monitor.js";
import { verifyBscTransaction } from "./server/bsc.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing middleware
  app.use(express.json());

  // 1. Initialize Uptime Monitoring Background Engine
  startMonitorEngine();

  // 2. API Routes
  
  // Get active subscriber user
  app.get("/api/user", (req, res) => {
    try {
      const db = readDb();
      // For demo, return the first user (we support one active subscriber session in this prototype)
      const user = db.users[0];
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
      const user = db.users[0];
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

      const user = db.users[0];
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
      const user = db.users[0];
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
      const userMonitors = db.monitors.filter((m) => m.user_id === "user-1");

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
      const user = db.users[0];
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
      const user = db.users[0];

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
      const user = db.users[0];
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
      const userMonitors = db.monitors.filter((m) => m.user_id === "user-1");
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
