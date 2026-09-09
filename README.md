# Concurrent Ticket Booking & Transaction Failure Recovery

A DBMS demonstration that makes concurrent seat booking visible. The supplied storyboard is implemented as a responsive booking flow with shared seat state, payment outcomes, and a transaction monitor.

## Run the demo

```bash
npm install
npm --prefix client install
npm run dev
```

For MySQL installation, database creation, schema loading, and transaction-lock testing, see [MYSQL_SETUP.md](MYSQL_SETUP.md).

Open `http://localhost:3000` in two browser tabs. Both tabs connect to the same MySQL-backed Socket.IO server on port 4000. Select an available seat in one tab and complete payment; the other tab receives the committed database update without refreshing.

The Vite client and Node server are both exposed on `0.0.0.0`, so a phone on the same LAN can open `http://10.60.160.236:3000` using the laptop's current IP address. The client derives the Socket.IO host from the page URL, so it does not incorrectly connect to the phone's `localhost`.

## Project shape

- `client/`: React/Vite storyboard UI
- `server/`: Express + Socket.IO + MySQL transaction service
- `database/`: MySQL InnoDB schema and seed data
- `tests/`: planned concurrency test surface

The server now reads the show and seats from MySQL. Seat holds use `SELECT ... FOR UPDATE`, create a booking and pending transaction atomically, and broadcast only after commit. Payment success changes `HELD` to `BOOKED`; payment failure or timeout changes it back to `AVAILABLE` and records a rollback.

Copy `.env.example` to `.env` if your MySQL credentials differ from the local defaults. Never commit `.env`.
