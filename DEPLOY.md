# Deploying UptimePro to Coolify with PostgreSQL

This guide explains how to deploy **UptimePro** step-by-step using **Coolify** (a self-hosted Vercel/Heroku alternative) with a **PostgreSQL Database** and **Automated Cloud Backups**. 

By using PostgreSQL, you do **NOT** need to configure local file volumes (`+ Add Volume`), because all monitors, settings, subscriptions, users, and logs will be stored securely in your database!

---

## Step 1: Spin up PostgreSQL inside Coolify

First, let's set up a PostgreSQL database in Coolify.

1. Go to your Coolify dashboard and select your **Project** and **Environment**.
2. Click on **+ Add New Resource** or **New** and select **Databases**.
3. Choose **PostgreSQL**.
4. Give it a name (e.g. `uptime-db`) and click **Save**.
5. Once created, go to the **Connection Strings** tab of your new database.
6. Copy the **Internal Connection String** (it starts with `postgresql://...`).

---

## Step 2: Add UptimePro in Coolify (Nixpacks)

1. Click on **+ Add New Resource** or **New** and select **Public/Private Git Repository**.
2. Paste your Git repository URL and select your branch (e.g., `main`).
3. Under **Build Pack**, make sure **Nixpacks** is selected.
4. Under **Ports**, configure:
   * **Ports Exposed**: `3000`
   * **Ports Mapping**: `3000:3000`
5. Verify that the build and start commands are correctly set:
   * **Build Command**: `npm run build`
   * **Start Command**: `npm run start`

---

## Step 3: Configure Environment Variables

Scroll down to the **Environment Variables** section in your application resource inside Coolify and add:

1. `NODE_ENV` = `production`
2. `APP_URL` = `https://your-domain.com` *(Your assigned domain)*
3. `DATABASE_URL` = *(Paste the PostgreSQL Internal Connection String you copied in Step 1)*

> **Why we do NOT need `+ Add Volume` anymore:**
> When the `DATABASE_URL` is set, UptimePro automatically switches from the local JSON file database to your high-performance **PostgreSQL** database. The system automatically initializes the table schema on boot!

---

## Step 4: Configure Auto Cloud Backups (For Super Admin)

UptimePro has a built-in Cloud Backup manager inside the Super Admin dashboard to let you schedule, test, and trigger full cloud backups or local database snapshots.

1. Log in with an admin user (e.g., any email containing `admin`, like `admin@uptimepro.com`).
2. Open the **Cloud & DB Backups** tab from the sidebar.
3. **Configure Auto Backups**:
   - Turn **Auto Cloud Backup** on.
   - Enter your **Cloud Backup Server URL** (the endpoint on your backup cloud server that receives the JSON payload via a POST request).
   - Set the **Interval Hours** (e.g., `24` for daily backups).
4. **Test the Connection**:
   - Click **Test Cloud Backup** to dispatch a secure backup payload immediately. You will see a success or failure notification directly on-screen with live response details.
5. **Manage Snapshots**:
   - You can write a name and click **Create System Snapshot** to create custom database states.
   - Click **Restore** next to any snapshot to instantly roll back the entire system to that exact historical moment.
   - You can safely delete snapshots using the trash icon.

---

## Step 5: Assign a Domain & Deploy

1. Under the **Domains** tab in Coolify, set your desired custom domain or generate a wildcard subdomain.
2. Click **Deploy** at the top right of the dashboard.
3. Coolify will fetch your code, compile the React bundle, launch the Express server on port `3000`, connect to PostgreSQL, and your application will be live!
