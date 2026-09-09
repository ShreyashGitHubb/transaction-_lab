# Concurrent Ticket Booking & Transaction Failure Recovery

## Project Overview

This is a DBMS transaction-management laboratory presented through a ticket-booking scenario. It demonstrates how a database keeps seat allocation consistent when several browsers or phones request the same seat at the same time.

The project is intentionally focused. It is not a commercial movie-booking clone.

```text
React + Vite
      |
      | Socket.IO and HTTP
      v
Node.js + Express
      |
      | mysql2 connection pool
      v
MySQL 8 / InnoDB
```

## What the Project Demonstrates

- MySQL InnoDB transactions
- Row-level locking with `SELECT ... FOR UPDATE`
- Atomic multi-seat holds
- `COMMIT` and `ROLLBACK`
- Seat states: `AVAILABLE`, `HELD`, and `BOOKED`
- Payment success and payment-failure simulation
- Concurrent users competing for the same seat
- Real-time updates with Socket.IO
- LAN access from multiple devices
- Database-backed booking and transaction records

## Quick Start

Use this sequence from a fresh checkout.

### 1. Open the project

```bash
cd /home/shreyash/Project/DBMS_IE
```

### 2. Install MySQL

```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl enable --now mysql
mysql --version
```

For the complete database setup, see [MYSQL_SETUP.md](MYSQL_SETUP.md).

### 3. Create the database and application user

```bash
sudo mysql
```

Run this inside the MySQL prompt. Replace the password with your own password.

```sql
CREATE DATABASE IF NOT EXISTS ticket_transaction_lab;
CREATE USER IF NOT EXISTS 'ticket_app'@'localhost'
IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON ticket_transaction_lab.*
TO 'ticket_app'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Load the schema and demo data

```bash
mysql -u ticket_app -p < database/schema.sql
mysql -u ticket_app -p < database/seed.sql
```

The seed creates one show and 80 seats.

### 5. Configure the server

The project defaults match the setup above. To configure them explicitly:

```bash
cp .env.example .env
```

Edit `.env` if your MySQL password or host differs. Never commit `.env`.

### 6. Install Node dependencies

```bash
npm run install:all
```

This installs the root server dependencies and the client dependencies.

### 7. Start the application

```bash
npm run dev
```

This starts both processes:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:4000
```

Keep this terminal running.

## Presentation / LAN Demo

First find the laptop's LAN address:

```bash
hostname -I
```

Use the IPv4 address shown by that command. For example:

```text
10.60.160.236
```

On the laptop, open:

```text
http://localhost:3000
```

On phones connected to the same Wi-Fi, open:

```text
http://10.60.160.236:3000
```

The frontend automatically connects Socket.IO to the same laptop IP on port `4000`. Do not use `localhost` on a phone.

### Recommended demonstration

1. Open the application on two phones or two browser windows.
2. Each browser automatically receives a different demo user ID.
3. Both users select the same available seat, for example `C4`.
4. Both click `Proceed to Payment` as close together as possible.
5. One request obtains the database row lock and changes the seat to `HELD`.
6. The other request receives a conflict and cannot continue.
7. Complete payment for the winning user.
8. Every connected client receives the committed seat update immediately.
9. Use `Clear all demo seats` in the observer panel to reset the classroom demo.

## Application Flow

### Seat selection

Selecting a seat changes only the local UI selection. It does not book the seat.

```text
Frontend selection = temporary UI state
Database status = still AVAILABLE
```

### Proceed to payment

The server opens a MySQL transaction and locks the requested seat rows:

```sql
START TRANSACTION;

SELECT ...
FROM seats
WHERE show_id = ?
  AND ...
FOR UPDATE;
```

If every requested seat is available:

```text
AVAILABLE -> HELD
```

The server creates a pending booking, links the seats, creates a pending transaction, and commits the hold.

If any requested seat is already held or booked, the transaction rolls back and the user receives a conflict result.

### Payment success

```text
HELD -> BOOKED
Booking: PENDING -> CONFIRMED
Transaction: PENDING -> SUCCESS
```

### Payment failure or timeout

```text
HELD -> AVAILABLE
Booking: PENDING -> FAILED
Transaction: PENDING -> ROLLED_BACK
```

The payment controls are academic simulations. No real payment gateway is connected.

## Database Tables

Defined in [database/schema.sql](database/schema.sql):

| Table | Purpose |
| --- | --- |
| `users` | Demo users who make booking requests |
| `shows` | Movie, screen, date, and time |
| `seats` | Seat state for each show |
| `bookings` | Booking header and status |
| `booking_seats` | Many-to-many link between bookings and seats |
| `transactions` | Payment and rollback state |

The important relationships are:

```text
users 1 ----< bookings 1 ----< booking_seats >---- 1 seats
shows 1 ----< bookings
shows 1 ----< seats
bookings 1 ----< transactions
```

## API and Socket Events

### HTTP endpoints

```text
GET  /api/shows/1
GET  /api/shows/1/seats
POST /api/demo/clear-seats
```

The current booking commands use Socket.IO:

```text
hold_seats
complete_payment
```

The server broadcasts:

```text
show_snapshot
seat_snapshot
booking_result
payment_result
server_error
```

## Project Structure

```text
DBMS_IE/
├── client/
│   ├── src/
│   │   ├── main.jsx       # React screens and interaction logic
│   │   └── styles.css     # Responsive visual design
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── db.js              # mysql2 connection pool
│   └── server.js          # Express, Socket.IO, and transaction logic
├── database/
│   ├── schema.sql         # InnoDB schema
│   └── seed.sql           # Demo show, users, and seats
├── tests/
├── .env.example
├── MYSQL_SETUP.md
├── context.md
└── package.json
```

## Useful Commands

Start development mode:

```bash
npm run dev
```

Start only the backend:

```bash
npm run server
```

Build the frontend:

```bash
npm run build
```

Check the backend syntax:

```bash
node --check server/server.js
node --check server/db.js
```

Check the database:

```bash
mysql -u ticket_app -p -e "USE ticket_transaction_lab; SELECT COUNT(*) AS seats FROM seats; SELECT status, COUNT(*) AS total FROM seats GROUP BY status;"
```

Reset all seats through the application:

```bash
curl -X POST http://localhost:4000/api/demo/clear-seats
```

Reset the complete development database. This deletes all project records:

```bash
sudo mysql -e "DROP DATABASE IF EXISTS ticket_transaction_lab;"
mysql -u ticket_app -p < database/schema.sql
mysql -u ticket_app -p < database/seed.sql
```

## Troubleshooting

### `Access denied for user ticket_app`

Reset the password:

```bash
sudo mysql
```

```sql
ALTER USER 'ticket_app'@'localhost' IDENTIFIED BY 'password';
FLUSH PRIVILEGES;
EXIT;
```

### MySQL connection error

```bash
sudo systemctl enable --now mysql
sudo systemctl status mysql
```

### Port 4000 already in use

```bash
ss -ltnp | grep ':4000'
```

Stop the old project server, then run:

```bash
npm run dev
```

### Phone cannot open the app

Check all of these:

- Phone and laptop are on the same Wi-Fi.
- The phone uses the laptop IP, not `localhost`.
- The frontend was started with `--host 0.0.0.0` through `npm run dev`.
- The backend listens on `0.0.0.0:4000`.
- The laptop firewall allows ports `3000` and `4000` if required.

## Academic Explanation

The project demonstrates ACID properties:

- **Atomicity:** all requested seats are held together or none are held.
- **Consistency:** a seat cannot be confirmed for two users.
- **Isolation:** `FOR UPDATE` serializes competing changes to the same seat rows.
- **Durability:** committed bookings remain in MySQL after the request finishes.

The central rule is:

> The frontend displays state, but MySQL decides whether a seat can be held or booked.

## Current Scope

Included:

- One seeded movie show
- 80 seats
- MySQL-backed booking state
- Simulated payment outcomes
- Real-time synchronization
- LAN classroom demonstration
- Demo reset control

Not included intentionally:

- Real authentication
- Real payment gateway
- Movie search and recommendations
- Food ordering
- Cloud deployment
- MongoDB, Redis, Firebase, Docker, or Prisma
