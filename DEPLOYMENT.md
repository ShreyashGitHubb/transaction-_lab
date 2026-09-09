# Deployment Guide

The project has three deployment choices:

- **LAN:** best for the college presentation; all devices use your laptop.
- **Vercel + Railway:** best managed cloud option; Vercel hosts React, Railway hosts Node/Socket.IO and MySQL.
- **Vercel + Render + Railway:** simplest alternative when Railway GitHub deployment requires a paid plan.
- **VPS:** full manual deployment with MySQL, Node, Nginx, and systemd.

Vercel should host only the frontend. The current backend is a long-running Express and Socket.IO server, so it should run on Railway, Render, Fly.io, or a VPS.

## Option B: Vercel + Render + Railway MySQL

Use this option if Railway requires a Pro plan to deploy the GitHub backend.

```text
Vercel
React frontend
  |
  | VITE_SOCKET_URL
  v
Render
Node + Express + Socket.IO backend
  |
  | MYSQL_PUBLIC_URL
  v
Railway MySQL
```

### 1. Prepare the Railway MySQL connection

In Railway MySQL, enable **Public Access** and copy the complete `MYSQL_PUBLIC_URL`.

It looks like:

```text
mysql://root:YOUR_PASSWORD@YOUR_PUBLIC_HOST:YOUR_PUBLIC_PORT/railway
```

Do not use the private host `mysql.railway.internal` from Render. That hostname only works inside Railway's private network.

Because the password has been shared during setup, rotate it in Railway before public deployment and copy the new public URL.

### 2. Create a Render backend service

1. Open [render.com](https://render.com).
2. Choose **New +**.
3. Choose **Web Service**.
4. Connect the GitHub repository.
5. Configure the service:

```text
Name: transaction-backend
Runtime: Node
Root Directory: leave blank
Build Command: npm install
Start Command: npm run server
```

Render must deploy from the repository root because `server/server.js` and the root `package.json` are there.

### 3. Add Render environment variables

In Render, open:

```text
Environment → Add Environment Variable
```

Add:

```env
MYSQL_URL=mysql://root:YOUR_PASSWORD@YOUR_PUBLIC_HOST:YOUR_PUBLIC_PORT/railway
PORT=10000
```

You can also use the variable name `MYSQL_PUBLIC_URL`; the backend supports both names. `MYSQL_URL` is preferred.

Do not add these variables to Vercel:

```text
MYSQL_URL
MYSQL_PUBLIC_URL
MYSQL_ROOT_PASSWORD
MYSQLPASSWORD
```

### 4. Deploy and test Render

Click **Create Web Service** and wait for the deployment to finish.

Render will provide a URL similar to:

```text
https://transaction-backend.onrender.com
```

Test the backend:

```bash
curl https://transaction-backend.onrender.com/api/shows/1/seats
```

The response should contain the show and the seat map from Railway MySQL.

The backend also supports Socket.IO, so two browser clients can receive live seat updates through this Render URL.

### 5. Connect Vercel to Render

In Vercel:

```text
Project → Settings → Environment Variables
```

Add:

```env
VITE_SOCKET_URL=https://transaction-backend.onrender.com
```

Use your actual Render URL. Apply it to Production, Preview, and Development, then redeploy Vercel.

### 6. Test the complete application

Open:

```text
https://transaction-lab-eight.vercel.app
```

Test these endpoints and behaviors:

```bash
curl https://transaction-backend.onrender.com/api/shows/1/seats
curl -X POST https://transaction-backend.onrender.com/api/demo/clear-seats
```

Then open the Vercel URL on two devices, select the same seat, and submit both booking requests. One should hold the seat and the other should receive a conflict.

### Render notes

- Free Render services may sleep when idle; the first request can take a little longer.
- Socket.IO works while the Render service is awake.
- Render must use the Railway **public** MySQL URL because it is outside Railway's private network.
- The database password should be rotated and never committed to GitHub.

## Option A: Classroom LAN

### Requirements

- Ubuntu/Debian laptop
- MySQL 8+
- Node.js 20+
- Laptop and phones on the same Wi-Fi

### First-time setup

```bash
cd /home/shreyash/Project/DBMS_IE
sudo apt update
sudo apt install mysql-server
sudo systemctl enable --now mysql
```

Create the database user once:

```bash
sudo mysql
```

```sql
CREATE DATABASE IF NOT EXISTS ticket_transaction_lab;
CREATE USER IF NOT EXISTS 'ticket_app'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON ticket_transaction_lab.* TO 'ticket_app'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Load the schema and seed data:

```bash
mysql -u ticket_app -p < database/schema.sql
mysql -u ticket_app -p < database/seed.sql
```

Install dependencies and start both services:

```bash
npm run install:all
npm run dev
```

Open locally:

```text
http://localhost:3000
```

Find the laptop IP:

```bash
hostname -I
```

Open the displayed IPv4 address on phones, for example:

```text
http://10.60.160.236:3000
```

Do not use `localhost` on a phone. The backend runs on port `4000` and the frontend runs on port `3000`.

Before each presentation, reset the seats:

```bash
curl -X POST http://localhost:4000/api/demo/clear-seats
```

### Presentation sequence

1. Open the app on two phones or browser windows.
2. Each browser receives a unique demo user ID automatically.
3. Both clients select `C4`.
4. Both press `Proceed to Payment`.
5. MySQL allows only one request to hold the row.
6. The other request receives a conflict.
7. Complete payment for the winner.
8. The seat update appears on every connected client without refreshing.

## Option C: Vercel + Railway

This is the recommended public deployment for this project.

```text
Vercel:   React/Vite frontend
Railway:  Node/Express + Socket.IO backend
Railway:  MySQL database
```

### 1. Push the project to GitHub

From the project root:

```bash
cd /home/shreyash/Project/DBMS_IE
git add .
git commit -m "Prepare ticket transaction app for deployment"
git push origin main
```

Never commit `.env` or database passwords.

### 2. Create Railway MySQL

1. Open [railway.app](https://railway.app).
2. Create a new project.
3. Add a MySQL service.
4. Open the MySQL service's connection variables.
5. Note the host, port, database, username, and password.

Typical Railway values are:

```text
MYSQLHOST
MYSQLPORT
MYSQLDATABASE
MYSQLUSER
MYSQLPASSWORD
```

Import the schema and seed data using the connection values from Railway:

```bash
mysql -h YOUR_MYSQL_HOST \
  -P YOUR_MYSQL_PORT \
  -u YOUR_MYSQL_USER \
  -p YOUR_MYSQL_DATABASE < database/schema.sql

mysql -h YOUR_MYSQL_HOST \
  -P YOUR_MYSQL_PORT \
  -u YOUR_MYSQL_USER \
  -p YOUR_MYSQL_DATABASE < database/seed.sql
```

Verify it:

```bash
mysql -h YOUR_MYSQL_HOST -P YOUR_MYSQL_PORT \
  -u YOUR_MYSQL_USER -p YOUR_MYSQL_DATABASE \
  -e "SELECT COUNT(*) AS seats FROM seats;"
```

Expected result:

```text
80
```

If Railway does not expose MySQL for direct local connections, import the SQL through its database console or a temporary Railway shell.

Alternatively, open the Railway MySQL query console and paste the complete contents of [database/railway_setup.sql](database/railway_setup.sql). It creates the tables, demo users, show, and 80 seats in one script.

### Optional: connect with Railway CLI without global installation

If `npm install -g @railway/cli` fails with `EACCES`, use `npx`:

```bash
npx --yes @railway/cli login
npx --yes @railway/cli link
npx --yes @railway/cli connect MySQL
```

For a tunnel that can be used by DBeaver or another local database client:

```bash
npx --yes @railway/cli connect MySQL --tunnel-only
```

You can verify the CLI without installing it globally:

```bash
npx --yes @railway/cli --version
```

### 3. Deploy the backend to Railway

1. In Railway, choose **New Service**.
2. Choose **Deploy from GitHub repo**.
3. Select this repository.
4. Use the repository root as the service directory.
5. Set the start command to:

```bash
npm run server
```

Add Railway's complete MySQL connection variable to the backend service:

```env
MYSQL_URL=${{MySQL.MYSQL_URL}}
```

If Railway does not offer a direct variable reference for `MYSQL_URL`, add the individual references instead:

```env
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_NAME=${{MySQL.MYSQLDATABASE}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
```

Do not set `DB_HOST=localhost` on Railway. The database is a separate service.

Generate a public Railway domain, for example:

```text
https://ticket-transaction-backend.up.railway.app
```

Test the backend:

```bash
curl https://YOUR_BACKEND_DOMAIN/api/shows/1/seats
```

The response should contain the show and 80 seats.

### 4. Deploy the frontend to Vercel

1. Open [vercel.com](https://vercel.com).
2. Choose **Add New Project**.
3. Import the GitHub repository.
4. Configure these settings:

```text
Framework Preset: Vite
Root Directory: client
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Add this Vercel environment variable:

```text
VITE_SOCKET_URL=https://YOUR_BACKEND_DOMAIN
```

This variable is required. It tells the browser to connect Socket.IO to Railway instead of trying to connect to Vercel on port `4000`.

Deploy and open the Vercel URL:

```text
https://YOUR_PROJECT.vercel.app
```

The header should show `Live sync`.

### 5. Test the cloud deployment

Open the Vercel URL in two browsers or devices. Select the same seat and submit both requests. Confirm that:

- only one request obtains the seat hold;
- the other request receives a conflict;
- the winning payment updates every connected client;
- `Clear all demo seats` resets the shared database state.

Reset the cloud demo from a terminal:

```bash
curl -X POST https://YOUR_BACKEND_DOMAIN/api/demo/clear-seats
```

### 6. Public CORS hardening

The current backend allows cross-origin access for the academic prototype. Before public production use, restrict CORS to the Vercel URL using a `FRONTEND_URL` environment variable in `server/server.js`.

Also remember:

- do not expose MySQL port `3306` publicly;
- do not use the MySQL root account in the app;
- protect or remove the public clear-all endpoint;
- use HTTPS for both frontend and backend.

## Option D: Ubuntu VPS

Use this when you want full control instead of managed services.

Install the services:

```bash
sudo apt update
sudo apt install -y git nginx mysql-server
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Clone the repository:

```bash
cd /var/www
sudo git clone YOUR_REPOSITORY_URL DBMS_IE
sudo chown -R "$USER":"$USER" /var/www/DBMS_IE
cd /var/www/DBMS_IE
```

Create the MySQL user, load `database/schema.sql` and `database/seed.sql`, create `.env`, then run:

```bash
npm run install:all
npm run build
```

Run the backend with systemd using `npm run server` or:

```ini
[Unit]
Description=Concurrent Ticket Booking Node Server
After=network.target mysql.service

[Service]
Type=simple
User=YOUR_LINUX_USER
WorkingDirectory=/var/www/DBMS_IE
ExecStart=/usr/bin/node /var/www/DBMS_IE/server/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Save it as `/etc/systemd/system/ticket-transaction.service`, then run:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ticket-transaction
sudo systemctl status ticket-transaction
```

Serve `client/dist` with Nginx and proxy `/api/` and `/socket.io/` to `http://127.0.0.1:4000`. For HTTPS:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR_DOMAIN
```

## Useful Commands

```bash
npm run dev
npm run server
npm run build
node --check server/server.js
node --check server/db.js
ss -ltnp | grep -E ':3000|:4000'
```

Check the database:

```bash
mysql -u ticket_app -p -e "USE ticket_transaction_lab; SELECT COUNT(*) AS seats FROM seats; SELECT status, COUNT(*) AS total FROM seats GROUP BY status;"
```

## Troubleshooting

### MySQL connection error

```bash
sudo systemctl enable --now mysql
sudo systemctl status mysql
```

Check `.env` values and make sure the application user password is correct.

### Port 4000 is already in use

```bash
ss -ltnp | grep ':4000'
```

Stop the old project backend before starting a new one.

### Phone cannot connect

- Confirm the phone and laptop use the same Wi-Fi.
- Use the laptop IP, never `localhost`, on the phone.
- Confirm the frontend uses `0.0.0.0`.
- Confirm the backend uses `0.0.0.0:4000`.
- Check the firewall for ports `3000` and `4000`.

### Vercel page cannot connect to Socket.IO

- Confirm `VITE_SOCKET_URL` is set in Vercel.
- Use the full Railway backend URL, including `https://`.
- Redeploy Vercel after changing environment variables.
- Confirm the Railway backend is running and its API responds with `curl`.

## Scope and Security

This is an academic prototype. It includes simulated payment results, demo identities, and a demo reset endpoint. It intentionally does not include real authentication, a real payment gateway, or public production hardening. Protect those areas before exposing the system publicly.
