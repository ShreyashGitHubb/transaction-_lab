Yes. Based on the UI/storyboard you uploaded, I would build this as a **DBMS transaction simulator**, not as a normal ticket-booking website.

The important thing is that when you give the project context to Cursor, it should understand **what the system is demonstrating, how the database must behave, what the UI should show, and exactly what must happen when two users compete for the same seat.**

# 1. Project definition

## Project title

**Concurrent Ticket Booking & Transaction Failure Recovery System**

### Subtitle

**A DBMS simulation of concurrent seat booking, transaction processing, locking, rollback and failure recovery.**

### One-line explanation

> A LAN-based ticket booking simulator where multiple users can simultaneously request the same seat, demonstrating how database transactions, row-level locking, commit, rollback and failure recovery prevent double booking.

This is much stronger than saying:

> "We made a BookMyShow clone."

You are **not** building BookMyShow.

You are building a **visual demonstration of DBMS transaction management using a ticket-booking scenario.**

---

# 2. What the professor should see

Imagine this situation:

There is one movie:

**Avengers: Endgame**

Show:

**10:00 AM**

Screen:

**Screen 1**

Seat:

**C4**

Now two phones are connected to your laptop.

### User 1

Selects C4.

### User 2

At almost exactly the same time selects C4.

Both users think:

> "I am booking C4."

The system must ensure:

```text
USER 1 ──┐
         ├──> DATABASE ──> C4
USER 2 ──┘
```

Only **one transaction can successfully obtain C4**.

The other transaction must fail safely.

That is the heart of the project.

---

# 3. The exact experience from your image

Your uploaded design already gives us the correct overall flow.

We should implement these **8 states**.

## State 1 — User 1 selects seats

Laptop/browser:

```text
Movie Tickets

Avengers: Endgame
10:00 AM | Screen 1

       SCREEN

A  🟩 🟩 🟩 🟩 🟩 🟩 🟩
B  🟩 🟩 🟩 🟩 🟩 🟩 🟩
C  🟩 🟩 🔵 🔵 🟩 🟩 🟩
D  🟩 🟩 🟩 🟩 🟩 🟩 🟩
...
```

Legend:

```text
🟩 Available
🔵 Selected
🟥 Booked
⬜ Unavailable
```

Bottom:

```text
Selected Seats
C4, C5

Total Amount
₹400

[ Proceed to Payment ]
```

---

# 4. State 2 — User 1 starts payment

User presses:

**Proceed to Payment**

Frontend displays:

```text
        ◯

Processing Payment...

Please do not close the app
```

But this is important:

### The animation is NOT the transaction.

The real transaction happens on the backend/database.

The frontend animation is only a visual representation of what is happening.

---

# 5. State 3 — User 1 succeeds

After the simulated payment succeeds:

```text
        ✓

Payment Successful

Your seats have been booked.

Seats
C4, C5

Booking ID
#T12345

[ Done ]
```

Database:

```text
C4 → BOOKED
C5 → BOOKED
```

Transaction:

```text
SUCCESS
```

---

# 6. State 4 — User 2 sees the updated seats

This is where Socket.IO becomes useful.

User 1 doesn't refresh the page.

The server tells every connected client:

```text
SEAT_UPDATED
```

User 2 immediately sees:

```text
C4 → 🟥
C5 → 🟥
```

The UI updates automatically.

---

# 7. State 5 — User 2 tries the same seat

User 2 had already selected C4 before receiving the update.

They press:

**Proceed to Payment**

The backend checks the database.

It discovers:

```text
C4 = BOOKED
```

Therefore:

```text
Transaction → ROLLBACK
```

and User 2 gets:

```text
       ✕

Seat Not Available

C4 has been booked by
another user.

[ Go Back ]
```

This is the important DBMS demonstration.

---

# 8. Final state

Both users see different results.

### User 1

```text
✓ Booking Confirmed

C4, C5
```

### User 2

```text
✕ Seat Not Available

C4 has already been booked.
```

Database remains consistent.

There is **no double booking**.

---

# 9. The most important rule

This should be written into the project requirements:

> **The frontend must NEVER be the source of truth for seat availability.**

For example, don't do this:

```javascript
if (seat.status === "available") {
    bookSeat();
}
```

That is unsafe because two users can have the same frontend state.

Instead:

```text
Frontend
   ↓
Backend
   ↓
MySQL transaction
   ↓
Lock/check/update
   ↓
COMMIT or ROLLBACK
```

The database decides.

MySQL InnoDB supports row-level locking and `SELECT ... FOR UPDATE`; locks acquired by such locking reads are held until the transaction commits or rolls back. ([MySQL Developer Zone][1])

---

# 10. Technology stack

Keep the stack simple.

## Frontend

```text
React
Vite
CSS
Socket.IO Client
```

## Backend

```text
Node.js
Express.js
Socket.IO
```

## Database

```text
MySQL 8+
InnoDB
```

## Database driver

```text
mysql2
```

## Development

```text
Git
GitHub
Postman
Cursor
```

Do **not** add:

```text
MongoDB
Firebase
Supabase
Redis
Docker
Kubernetes
Prisma
AWS
```

They aren't necessary for this DBMS exam.

The professor should be able to clearly see:

```text
React
   ↓
Node/Express
   ↓
MySQL
   ↓
Transactions
   ↓
COMMIT / ROLLBACK
```

---

# 11. Complete architecture

```text
                 USER 1 PHONE
                      │
                      │
                 Wi-Fi / LAN
                      │
                      ▼
                React Frontend
                      │
                      │ HTTP
                      ▼
                Express Server
                      │
             ┌────────┴────────┐
             │                 │
             ▼                 ▼
          MySQL             Socket.IO
             │                 │
             │                 │
             └────────┬────────┘
                      │
                      ▼
                USER 2 PHONE
```

Actually, both users communicate with the same laptop:

```text
             ┌──────────────────────┐
             │      LAPTOP          │
             │                      │
PHONE 1 ────►│ React + Node + MySQL │◄──── PHONE 2
             │                      │
             └──────────────────────┘
                       │
                    Wi-Fi
```

This makes the project extremely easy to demonstrate in your classroom.

---

# 12. LAN functionality

Your laptop becomes the server.

Suppose laptop IP is:

```text
192.168.1.5
```

Then phones connected to the same Wi-Fi open:

```text
http://192.168.1.5:3000
```

Both phones see the same application.

You don't need internet.

This is important because your project is meant to demonstrate **concurrency**, not cloud deployment.

---

# 13. Database design

Use approximately these tables.

## `users`

```text
users
-----------------------
user_id
name
email
created_at
```

Example:

```text
1 | User 1 | user1@test.com
2 | User 2 | user2@test.com
```

---

# 14. `shows`

```text
shows
-----------------------
show_id
movie_name
screen
show_date
show_time
```

Example:

```text
1
Avengers: Endgame
Screen 1
2026-09-10
10:00:00
```

---

# 15. `seats`

This is one of the most important tables.

```text
seats
-----------------------
seat_id
show_id
row_name
seat_number
status
hold_expires_at
```

Possible status:

```text
AVAILABLE
HELD
BOOKED
```

Example:

```text
101 | 1 | A | 1 | AVAILABLE
102 | 1 | A | 2 | AVAILABLE
103 | 1 | A | 3 | BOOKED
...
```

---

# 16. Why `HELD` is useful

Don't immediately change:

```text
AVAILABLE → BOOKED
```

Instead:

```text
AVAILABLE
     ↓
   HELD
     ↓
 PAYMENT
     ↓
 BOOKED
```

If payment fails:

```text
HELD
 ↓
AVAILABLE
```

If payment times out:

```text
HELD
 ↓
AVAILABLE
```

This is much closer to how real booking systems reason about temporary reservation.

---

# 17. `bookings`

```text
bookings
-----------------------
booking_id
user_id
show_id
booking_status
total_amount
created_at
```

Statuses:

```text
PENDING
CONFIRMED
CANCELLED
FAILED
```

Example:

```text
B1001
User 1
Show 1
CONFIRMED
₹400
```

---

# 18. `booking_seats`

Because one booking can contain multiple seats:

```text
booking_seats
-----------------------
booking_id
seat_id
```

Example:

```text
B1001 | C4
B1001 | C5
```

Relationship:

```text
Booking 1 ────────< Booking Seats >──────── Seat
```

---

# 19. `transactions`

This is extremely important for your DBMS case study.

```text
transactions
-----------------------
transaction_id
booking_id
amount
transaction_status
failure_type
created_at
completed_at
```

Transaction status:

```text
PENDING
SUCCESS
FAILED
ROLLED_BACK
```

Failure type:

```text
NONE
CONFLICT
PAYMENT_FAILURE
TIMEOUT
SERVER_FAILURE
```

This table allows you to demonstrate failure analysis.

---

# 20. Relationships

Your ER diagram should essentially show:

```text
USER
 │
 │ 1:N
 ▼
BOOKING
 │
 │ 1:N
 ▼
BOOKING_SEATS
 │
 │ N:1
 ▼
SEAT

SHOW
 │
 ├──── 1:N ──── SEAT
 │
 └──── 1:N ──── BOOKING

BOOKING
 │
 │ 1:N
 ▼
TRANSACTION
```

---

# 21. The actual concurrency problem

This is the most important part of the entire project.

Imagine:

```text
User 1 → C4
User 2 → C4
```

At approximately the same time.

Without proper transaction handling:

```text
User 1 checks C4 → AVAILABLE
User 2 checks C4 → AVAILABLE

User 1 books C4
User 2 books C4

💀 DOUBLE BOOKING
```

That is exactly what your project should demonstrate that a properly designed transaction system prevents.

---

# 22. Correct solution

Use a MySQL transaction.

Conceptually:

```sql
START TRANSACTION;

SELECT status
FROM seats
WHERE seat_id = ?
FOR UPDATE;
```

Then:

```text
Is seat AVAILABLE?
        │
       YES
        │
        ▼
Change to HELD
        │
        ▼
Create booking
        │
        ▼
Payment
        │
   ┌────┴────┐
   │         │
 SUCCESS   FAILURE
   │         │
   ▼         ▼
 BOOKED    ROLLBACK
   │         │
 COMMIT    AVAILABLE
```

`FOR UPDATE` is specifically designed for this kind of locking read; if another transaction requests the same locked row, it waits until the first transaction ends, unless options such as `NOWAIT` are used. ([MySQL Developer Zone][1])

---

# 23. Example with User 1 and User 2

### Transaction T1

```text
User 1
   ↓
START TRANSACTION
   ↓
LOCK C4
   ↓
C4 = AVAILABLE
   ↓
C4 = HELD
   ↓
Payment SUCCESS
   ↓
C4 = BOOKED
   ↓
COMMIT
```

### Transaction T2

At the same time:

```text
User 2
   ↓
START TRANSACTION
   ↓
Request C4
   ↓
C4 is locked by T1
   ↓
WAIT
   ↓
T1 COMMIT
   ↓
T2 checks C4
   ↓
C4 = BOOKED
   ↓
ROLLBACK
   ↓
Seat Not Available
```

That is the **killer demonstration**.

---

# 24. Do NOT keep a DB lock during a fake 10-second payment

This is an important architectural decision.

Don't do:

```text
LOCK C4
 ↓
wait 10 seconds
 ↓
fake payment
 ↓
COMMIT
```

because you're unnecessarily holding a database lock for the entire payment simulation.

Instead, use:

```text
AVAILABLE
    ↓
HELD
    ↓
payment processing
    ↓
SUCCESS → BOOKED
FAILURE → AVAILABLE
TIMEOUT → AVAILABLE
```

The `HELD` state represents temporary ownership.

---

# 25. Failure simulation

This is what will make your project much more interesting than a normal booking application.

Create a developer/demo control:

```text
Payment Simulation

○ Success
○ Payment Failure
○ Timeout
```

Maybe also:

```text
○ Server Failure
```

---

# 26. Payment failure scenario

User selects:

```text
C4
```

System:

```text
AVAILABLE
 ↓
HELD
 ↓
PAYMENT PROCESSING
 ↓
PAYMENT FAILURE
 ↓
ROLLBACK
 ↓
C4 AVAILABLE
```

Then another user can immediately book C4.

The professor can literally watch:

```text
C4 🟨
   ↓
C4 🟥
   ↓
C4 🟩
```

depending on your visual state design.

---

# 27. Timeout scenario

```text
User selects C5

AVAILABLE
 ↓
HELD
 ↓
PAYMENT PROCESSING
 ↓
TIMEOUT
 ↓
ROLLBACK
 ↓
AVAILABLE
```

This demonstrates recovery from an incomplete transaction.

---

# 28. Server failure simulation

Don't actually crash Node during the main demo.

Instead create:

```text
Simulate Server Failure
```

Backend behaves as if the operation failed.

Example:

```text
BEGIN
 ↓
LOCK C6
 ↓
UPDATE
 ↓
SERVER FAILURE
 ↓
ROLLBACK
 ↓
C6 AVAILABLE
```

Transaction:

```text
FAILED
```

or:

```text
ROLLED_BACK
```

---

# 29. Real-time synchronization

This is where Socket.IO is used.

Suppose:

```text
User 1 → books C4
```

Backend:

```text
MySQL
C4 = BOOKED
```

Then:

```text
Socket.IO
     ↓
SEAT_UPDATED
     ↓
User 2
```

User 2's screen automatically changes.

No refresh.

---

# 30. Socket event design

Use simple events.

### Server → clients

```text
SEAT_UPDATED
BOOKING_SUCCESS
BOOKING_FAILED
TRANSACTION_UPDATED
```

Example:

```javascript
socket.emit("seat_updated", {
    seatId: "C4",
    status: "BOOKED"
});
```

Better still, broadcast only the changed seat rather than reloading the entire seat map.

---

# 31. Frontend pages

Keep the UI extremely small.

You don't need:

```text
Home
Movies
Offers
Profile
Search
Reviews
Food
Recommendations
```

None of that.

Your entire project can basically be:

```text
Booking Screen
      ↓
Payment Screen
      ↓
Result Screen
```

---

# 32. Booking screen

Top:

```text
Movie Tickets

Avengers: Endgame
10:00 AM | Screen 1
```

Then:

```text
              SCREEN
```

Seat grid.

Then:

```text
🟩 Available
🔵 Selected
🟨 Held
🟥 Booked
```

Bottom:

```text
Selected Seats: C4, C5

Total: ₹400

[ Proceed to Payment ]
```

That's enough.

---

# 33. Payment screen

Minimal:

```text
        ◯

Processing Payment...

Please do not close the app
```

For your demonstration, perhaps add a small development-only control:

```text
Payment Simulation

[ SUCCESS ]
[ FAILURE ]
[ TIMEOUT ]
```

Don't make it look like a real payment gateway.

---

# 34. Success screen

```text
✓

Payment Successful

Your seats have been booked.

Seats
C4, C5

Booking ID
#B1001

[ Done ]
```

---

# 35. Failure screen

```text
✕

Payment Failed

Your transaction was rolled back.

The seats have been released.

[ Try Again ]
```

---

# 36. Conflict screen

This is the screen from your image:

```text
✕

Seat Not Available

C4 has been booked by
another user.

[ Go Back ]
```

This is specifically a **concurrency conflict**, not a payment failure.

That distinction is important for your viva.

---

# 37. Add one extra feature: Transaction Monitor

This could make the project significantly stronger without making the UI complicated.

A small developer panel:

```text
TRANSACTION MONITOR

T1001
User 1
C4

BEGIN
   ↓
LOCK ACQUIRED
   ↓
PAYMENT PROCESSING
   ↓
PAYMENT SUCCESS
   ↓
COMMIT

Status: SUCCESS
```

For User 2:

```text
T1002
User 2
C4

BEGIN
   ↓
WAITING FOR LOCK
   ↓
LOCK RELEASED
   ↓
C4 ALREADY BOOKED
   ↓
ROLLBACK

Status: FAILED
Failure: CONFLICT
```

This gives your professor a visual explanation of what's happening inside the database.

---

# 38. Even better: DBMS event log

Create a table:

```text
transaction_logs
-----------------------
log_id
transaction_id
event_type
seat_id
message
created_at
```

Events:

```text
BEGIN
LOCK_REQUESTED
LOCK_ACQUIRED
SEAT_HELD
PAYMENT_STARTED
PAYMENT_SUCCESS
PAYMENT_FAILED
ROLLBACK
COMMIT
CONFLICT
```

Then your application can display:

```text
01:43:21  T101 BEGIN
01:43:21  T101 LOCK C4
01:43:22  T101 SEAT C4 HELD
01:43:24  T101 PAYMENT SUCCESS
01:43:24  T101 COMMIT

01:43:21  T102 BEGIN
01:43:21  T102 WAITING FOR C4
01:43:24  T102 CONFLICT
01:43:24  T102 ROLLBACK
```

This is **excellent for a DBMS exam**.

---

# 39. API design

Keep APIs clean.

## Get show

```http
GET /api/shows/:showId
```

## Get seats

```http
GET /api/shows/:showId/seats
```

## Create booking/hold

```http
POST /api/bookings/hold
```

Body:

```json
{
  "userId": 1,
  "showId": 1,
  "seatIds": [ "C4", "C5" ]
}
```

## Complete payment

```http
POST /api/bookings/:bookingId/payment
```

Body:

```json
{
  "result": "SUCCESS"
}
```

Possible:

```text
SUCCESS
FAILURE
TIMEOUT
SERVER_FAILURE
```

## Transaction details

```http
GET /api/transactions/:transactionId
```

## Transaction logs

```http
GET /api/transactions/:transactionId/logs
```

---

# 40. Backend structure

Use:

```text
server/
│
├── server.js
│
├── config/
│   └── env.js
│
├── db/
│   └── connection.js
│
├── routes/
│   ├── showRoutes.js
│   ├── bookingRoutes.js
│   └── transactionRoutes.js
│
├── controllers/
│   ├── showController.js
│   ├── bookingController.js
│   └── transactionController.js
│
├── services/
│   ├── bookingService.js
│   ├── transactionService.js
│   └── paymentSimulator.js
│
├── socket/
│   └── seatSocket.js
│
└── middleware/
    └── errorHandler.js
```

The most important file:

```text
transactionService.js
```

That's where your DBMS logic should live.

---

# 41. Frontend structure

```text
client/
│
├── src/
│
├── components/
│   ├── SeatGrid.jsx
│   ├── Seat.jsx
│   ├── SeatLegend.jsx
│   ├── PaymentScreen.jsx
│   ├── BookingSummary.jsx
│   └── TransactionMonitor.jsx
│
├── pages/
│   ├── BookingPage.jsx
│   ├── PaymentPage.jsx
│   └── ResultPage.jsx
│
├── services/
│   ├── api.js
│   └── socket.js
│
├── App.jsx
└── main.jsx
```

---

# 42. Database transaction service

Conceptually:

```javascript
connection.beginTransaction();

try {

    // Lock seat

    // Check current status

    // Create booking

    // Change seat status

    // Create transaction

    // Commit

    await connection.commit();

} catch (error) {

    await connection.rollback();

}
```

The exact implementation should be written carefully and tested under concurrency.

---

# 43. Critical database rule

Every seat should have a unique identity.

For example:

```text
show_id + seat_id
```

must uniquely identify a seat for a show.

You don't want:

```text
C4
C4
C4
```

for the same show.

---

# 44. Important indexes

Add indexes around your common operations.

For example:

```text
seats(show_id, seat_id)

bookings(user_id)
bookings(show_id)

booking_seats(booking_id)
booking_seats(seat_id)

transactions(booking_id)
transactions(transaction_status)
```

This is also something you can mention during viva.

---

# 45. Concurrency testing

This is absolutely necessary.

Don't just test:

```text
User 1 books C4
```

You need to test:

```text
User 1 ── C4
User 2 ── C4
```

at the same time.

Then:

```text
Expected:

User 1 → SUCCESS
User 2 → CONFLICT

Database:

C4 → BOOKED
```

Never:

```text
User 1 → SUCCESS
User 2 → SUCCESS
```

---

# 46. Test cases

Create a proper test matrix.

| Test                   | User 1        | User 2 | Expected                   |
| ---------------------- | ------------- | ------ | -------------------------- |
| Normal booking         | C4            | —      | Success                    |
| Different seats        | C4            | C5     | Both success               |
| Same seat              | C4            | C4     | Only one succeeds          |
| Payment failure        | C4            | —      | C4 released                |
| Timeout                | C4            | —      | C4 released                |
| Retry after failure    | C4 fails      | C4     | Second booking succeeds    |
| Multiple seats         | C4,C5         | —      | Both booked                |
| Partial conflict       | C4,C5         | C5,C6  | Transaction handled safely |
| Rapid clicking         | C4 repeatedly | —      | No duplicate booking       |
| Refresh during payment | C4            | —      | State recovered correctly  |

The **partial conflict** case is particularly important.

---

# 47. Example: two users select multiple seats

User 1:

```text
C4, C5
```

User 2:

```text
C5, C6
```

You need to decide your business rule.

I recommend:

> **Booking is atomic. Either all requested seats are successfully held/booked, or none are.**

Therefore:

```text
User 1:
C4 ✓
C5 ✓
→ SUCCESS

User 2:
C5 ✕
C6 ✓
→ Entire transaction ROLLBACK
```

So C6 must **not** accidentally remain booked by User 2.

This demonstrates atomicity.

---

# 48. The four ACID properties

Your professor will almost certainly ask about ACID.

## Atomicity

Either the complete booking succeeds or everything is rolled back.

```text
C4 + C5
   ↓
both succeed
OR
both fail
```

## Consistency

Database rules remain valid.

No:

```text
C4 = BOOKED
for two different users
```

## Isolation

Two concurrent transactions should not corrupt each other's work.

```text
T1 ───── C4
T2 ───── C4
```

They are isolated through transaction/locking mechanisms.

## Durability

After:

```text
COMMIT
```

the booking remains stored in the database.

---

# 49. What your project demonstrates

Your project should explicitly demonstrate:

### 1. Transactions

```text
START TRANSACTION
COMMIT
ROLLBACK
```

### 2. Concurrency

Multiple users access the same seat.

### 3. Locking

```text
SELECT ... FOR UPDATE
```

### 4. Atomicity

Multiple seat booking succeeds or fails together.

### 5. Consistency

No double booking.

### 6. Isolation

Concurrent operations don't corrupt each other.

### 7. Failure recovery

Payment failure / timeout / server failure.

### 8. Real-time synchronization

Socket.IO updates other users.

---

# 50. Don't overbuild the UI

Your uploaded design is actually going in the correct direction.

Keep:

```text
WHITE BACKGROUND

Movie
Show time
Screen

Seat grid

Legend

Selected seats
Total

Button
```

That's it.

The **technical complexity should be behind the UI**.

The professor should look at the screen and immediately understand:

> "Two people are trying to book the same seat."

---

# 51. Recommended final UI

I would make it even cleaner than the screenshot.

### Desktop

```text
┌──────────────────────────────────────────────┐
│ Movie Tickets                                │
│ Avengers: Endgame                            │
│ 10:00 AM · Screen 1                         │
│                                              │
│                  SCREEN                      │
│                                              │
│ A   □ □ □ □ □ □ □ □ □ □                    │
│ B   □ □ □ □ □ □ □ □ □ □                    │
│ C   □ □ □ 🔵 🔵 □ □ □ □                    │
│ D   □ □ □ □ □ □ □ □ □ □                    │
│ E   □ □ □ □ □ □ □ □ □ □                    │
│ F   □ □ □ □ □ □ □ □ □ □                    │
│                                              │
│ 🟩 Available  🔵 Selected  🟥 Booked         │
│                                              │
│ Selected: C4, C5              ₹400           │
│                                              │
│              [ Proceed to Payment ]          │
└──────────────────────────────────────────────┘
```

---

# 52. Mobile

The mobile version should essentially be the same thing.

Don't create a completely different application.

Responsive CSS:

```text
Desktop
     ↓
responsive
     ↓
Mobile
```

Both users should see the same application.

---

# 53. Important distinction: UI state vs database state

This is another thing Cursor must understand.

Frontend:

```text
selected
```

doesn't mean:

```text
booked
```

For example:

```text
User clicks C4

Frontend:
C4 = SELECTED
```

Only after backend transaction succeeds:

```text
Database:
C4 = BOOKED
```

This distinction is critical.

---

# 54. State machine

Make the seat state machine explicit.

```text
                 ┌──────────────┐
                 │              │
                 ▼              │
AVAILABLE ──→ HELD ──→ BOOKED
     ▲          │
     │          │
     │          ├── PAYMENT_FAILURE
     │          │
     │          └── TIMEOUT
     │
     └────────── RELEASE
```

And:

```text
HELD → BOOKED
```

only after successful payment.

---

# 55. Transaction state machine

```text
PENDING
   │
   ├──── SUCCESS ────> SUCCESS
   │
   ├──── FAILURE ────> FAILED
   │
   ├──── TIMEOUT ────> ROLLED_BACK
   │
   └──── CONFLICT ───> ROLLED_BACK
```

This can be displayed in your transaction monitor.

---

# 56. Folder structure

Final project:

```text
ticket-transaction-system/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Seat.jsx
│   │   │   ├── SeatGrid.jsx
│   │   │   ├── SeatLegend.jsx
│   │   │   ├── BookingSummary.jsx
│   │   │   ├── PaymentScreen.jsx
│   │   │   └── TransactionMonitor.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── BookingPage.jsx
│   │   │   ├── PaymentPage.jsx
│   │   │   └── ResultPage.jsx
│   │   │
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── socket.js
│   │   │
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   └── package.json
│
├── server/
│   ├── config/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── socket/
│   ├── middleware/
│   ├── db/
│   │   └── connection.js
│   ├── server.js
│   └── package.json
│
├── database/
│   ├── schema.sql
│   └── seed.sql
│
├── tests/
│   ├── concurrency.test.js
│   ├── booking.test.js
│   └── failure-recovery.test.js
│
├── README.md
└── .env.example
```

---

# 57. What NOT to let Cursor do

This is extremely important.

Don't tell Cursor:

> "Build a BookMyShow clone."

It will waste time building:

```text
navbar
movie cards
search
login
animations
profiles
reviews
etc.
```

Instead tell it:

> **Build a DBMS transaction-management simulator with a ticket-booking UI.**

And emphasize:

> **Database correctness has higher priority than UI.**

---

# 58. Master context for Cursor

You can paste this as the **main project context/instruction** in Cursor:

```text
PROJECT: Concurrent Ticket Booking & Transaction Failure Recovery System

PURPOSE:
This is a DBMS academic project, not a generic movie-ticket website.

The project visually demonstrates how a real online ticket-booking system handles concurrent users competing for the same seat while maintaining database consistency.

The core concepts that MUST be demonstrated are:

1. Database transactions
2. ACID properties
3. Concurrent transactions
4. Row-level locking
5. SELECT ... FOR UPDATE
6. COMMIT
7. ROLLBACK
8. Atomic multi-seat booking
9. Failure recovery
10. Payment failure
11. Timeout handling
12. Conflict detection
13. Real-time seat synchronization

TECH STACK:

Frontend:
- React
- Vite
- Plain CSS
- Socket.IO Client

Backend:
- Node.js
- Express.js
- Socket.IO

Database:
- MySQL 8+
- InnoDB
- mysql2

Do not use MongoDB, Firebase, Supabase, Redis, Prisma, Docker, Kubernetes or other unnecessary infrastructure.

CORE SCENARIO:

There is one movie:

Avengers: Endgame

Show:
10:00 AM
Screen 1

Users connect from multiple phones on the same Wi-Fi network to the laptop running the application.

Example:

User 1 attempts to book C4.
User 2 simultaneously attempts to book C4.

Only one user may successfully book C4.

The database, NOT the frontend, is the source of truth.

The frontend must never decide that a seat is finally available.

DATABASE:

users:
- user_id
- name
- email
- created_at

shows:
- show_id
- movie_name
- screen
- show_date
- show_time

seats:
- seat_id
- show_id
- row_name
- seat_number
- status
- hold_expires_at

Seat statuses:
AVAILABLE
HELD
BOOKED

bookings:
- booking_id
- user_id
- show_id
- booking_status
- total_amount
- created_at

booking_seats:
- booking_id
- seat_id

transactions:
- transaction_id
- booking_id
- amount
- transaction_status
- failure_type
- created_at
- completed_at

Transaction statuses:
PENDING
SUCCESS
FAILED
ROLLED_BACK

Failure types:
NONE
CONFLICT
PAYMENT_FAILURE
TIMEOUT
SERVER_FAILURE

Optional transaction_logs:
- log_id
- transaction_id
- event_type
- seat_id
- message
- created_at

SEAT STATE MACHINE:

AVAILABLE
    ↓
HELD
    ↓
BOOKED

Failure/timeout:

HELD
    ↓
AVAILABLE

IMPORTANT:
Selected on the frontend does NOT mean booked in the database.

TRANSACTION LOGIC:

A booking request must be handled using a real MySQL transaction.

Conceptually:

START TRANSACTION

SELECT seat
FROM seats
WHERE seat_id = ?
FOR UPDATE;

Check the current database state.

If seat is not AVAILABLE:
    ROLLBACK
    return CONFLICT

If seat is AVAILABLE:
    change seat to HELD
    create booking
    create transaction
    COMMIT the hold operation

Then simulate payment.

If payment succeeds:
    START TRANSACTION
    lock the relevant booking/seat rows
    change HELD → BOOKED
    transaction → SUCCESS
    COMMIT

If payment fails:
    START TRANSACTION
    lock the relevant rows
    change HELD → AVAILABLE
    transaction → FAILED / ROLLED_BACK
    COMMIT

Do not keep a database row lock open during a fake multi-second payment animation.

MULTI-SEAT BOOKING:

Booking multiple seats must be atomic.

Example:

User requests C4 and C5.

Either:
C4 + C5 both succeed

or:
C4 + C5 both fail.

Never allow partial successful booking.

CONCURRENCY:

User 1:
C4

User 2:
C4

Expected result:

One transaction succeeds.
One transaction receives CONFLICT.

Never allow:

User 1 → SUCCESS
User 2 → SUCCESS

for the same show and seat.

REAL-TIME:

Use Socket.IO.

When a seat changes:

SERVER → all connected clients

event:
SEAT_UPDATED

Payload should contain at least:
- showId
- seatId
- status

Clients must update only the affected seat rather than reloading the entire application.

UI:

The UI must be extremely clean and minimal.

Do NOT build a full BookMyShow clone.

No:
- movie search
- advertisements
- recommendations
- reviews
- food ordering
- profile pages
- unnecessary navigation

Main booking screen:

Movie title
Show time
Screen

SCREEN indicator

Seat grid

Legend:
Available
Selected
Held
Booked

Selected seats
Total amount

Proceed to Payment button

PAYMENT SCREEN:

Show a minimal payment processing animation.

Text:

Processing Payment...
Please do not close the app.

For demonstration/development, provide simulation controls:

SUCCESS
FAILURE
TIMEOUT
SERVER FAILURE

These controls are for academic demonstration only and must not represent a real payment gateway.

SUCCESS SCREEN:

Payment Successful
Seats booked
Booking ID
Done

CONFLICT SCREEN:

Seat Not Available
This seat has already been booked by another user.
Go Back

FAILURE SCREEN:

Payment Failed
Transaction rolled back.
Seats have been released.
Try Again

TRANSACTION MONITOR:

Provide an optional developer/academic panel showing transaction events.

Example:

T101
User 1
C4

BEGIN
LOCK REQUESTED
LOCK ACQUIRED
SEAT HELD
PAYMENT STARTED
PAYMENT SUCCESS
COMMIT

T102
User 2
C4

BEGIN
LOCK REQUESTED
WAITING FOR LOCK
CONFLICT
ROLLBACK

This panel exists to visually explain DBMS transaction processing.

LAN:

The Node server must listen on 0.0.0.0.

The application must work from phones connected to the same Wi-Fi network.

Example:

Laptop:
192.168.1.5

Phone:
http://192.168.1.5:3000

Do not hardcode localhost for mobile access.

PERFORMANCE:

Do not poll the database continuously.

Do not reload the entire seat map every few milliseconds.

Use Socket.IO event-driven updates.

Use MySQL connection pooling.

Use appropriate database indexes.

Keep the application lightweight because it will run on a low-spec laptop.

TESTING:

The project MUST include concurrency tests.

Test:
1. Normal booking
2. Two users booking same seat
3. Two users booking different seats
4. Payment failure
5. Timeout
6. Server failure simulation
7. Retry after failure
8. Multi-seat booking
9. Partial conflict
10. Rapid repeated booking requests

MOST IMPORTANT TEST:

Two concurrent requests for C4.

Expected:

Request A → SUCCESS
Request B → CONFLICT

Database:

C4 → BOOKED

Never double-book.

DEVELOPMENT RULE:

Do not build everything at once.

First implement and test:

1. Database schema
2. Transaction service
3. Concurrent booking logic
4. Failure recovery
5. REST API
6. Socket.IO synchronization
7. React seat UI
8. Payment simulation
9. Transaction monitor
10. LAN testing

Before writing code, inspect the existing repository.

Never replace working code unnecessarily.

Prioritize database correctness and concurrency safety over UI polish.

Every important DBMS behavior should be visible and explainable during the exam.
```

---

# 59. Your actual demo sequence

When you present it, don't just click randomly.

Do this:

### Demo 1 — Normal transaction

```text
User 1
 ↓
Select C4
 ↓
Payment
 ↓
SUCCESS
 ↓
COMMIT
```

Explain:

> "This demonstrates a successful transaction."

---

### Demo 2 — Concurrent transaction

Open two phones.

Both select:

```text
C5
```

Then simultaneously proceed.

Show:

```text
User 1 → SUCCESS
User 2 → SEAT NOT AVAILABLE
```

Then explain:

> "Both clients requested the same seat, but the database serialized access to the seat row using transactional locking. Only one transaction was allowed to successfully allocate it."

That's the **main wow moment**.

---

### Demo 3 — Failure recovery

User 1:

```text
C6
 ↓
HELD
 ↓
Payment Failure
 ↓
ROLLBACK
```

Then show:

```text
C6 → AVAILABLE
```

Explain:

> "Because the payment failed, the booking operation was rolled back and the seat was released."

---

### Demo 4 — Real-time synchronization

User 1 books C7.

Don't refresh User 2.

User 2 automatically sees:

```text
C7 → BOOKED
```

Explain:

> "Socket.IO synchronizes committed database changes across connected clients."

---

# 60. What makes this a strong DBMS project

The UI itself isn't innovative.

The **system behavior** is.

Your project combines:

```text
                 ┌───────────────┐
                 │ Ticket Booking│
                 └───────┬───────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
      Concurrency     Transactions   Failures
          │              │              │
          ▼              ▼              ▼
       Locking       COMMIT/ROLLBACK  Recovery
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                  Consistent DB
```

That's what you should sell during the presentation.

---

# 61. One thing I would add to your screenshot

Your current storyboard is good.

But for the **actual application**, I'd add a tiny **"Transaction Monitor"** button/panel.

Not permanently huge.

Something like:

```text
                         Transaction Monitor
                         ● T102  ROLLBACK
```

Click it and show:

```text
TRANSACTION T102

User: User 2
Seat: C4

BEGIN
   ↓
LOCK REQUESTED
   ↓
WAITING
   ↓
C4 BOOKED
   ↓
ROLLBACK

Failure:
CONFLICT
```

That immediately connects the UI to the **DBMS concepts your professor is grading**.

---

# 62. Final architecture in one picture

```text
                 ┌──────────────────────┐
                 │      USER 1          │
                 │      Phone           │
                 └──────────┬───────────┘
                            │
                            │
                         Wi-Fi
                            │
                            ▼
                  ┌─────────────────────┐
                  │       REACT         │
                  │     FRONTEND        │
                  └──────────┬──────────┘
                             │
                         HTTP/API
                             │
                             ▼
                  ┌─────────────────────┐
                  │    NODE + EXPRESS   │
                  │                     │
                  │ Booking Service     │
                  │ Transaction Service │
                  │ Payment Simulator   │
                  └──────────┬──────────┘
                             │
                       SQL TRANSACTION
                             │
                             ▼
                  ┌─────────────────────┐
                  │       MYSQL         │
                  │       INNODB        │
                  │                     │
                  │ Users               │
                  │ Shows               │
                  │ Seats               │
                  │ Bookings            │
                  │ Booking Seats       │
                  │ Transactions        │
                  │ Transaction Logs    │
                  └──────────┬──────────┘
                             │
                       COMMIT / ROLLBACK
                             │
                             ▼
                       SOCKET.IO
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
                 USER 1             USER 2
```

And the core DBMS flow is:

```text
REQUEST
   ↓
BEGIN TRANSACTION
   ↓
LOCK SEAT
   ↓
CHECK AVAILABILITY
   ↓
   ┌───────────────┐
   │               │
AVAILABLE       BOOKED
   │               │
   ▼               ▼
HOLD           ROLLBACK
   │               │
   ▼               ▼
PAYMENT         CONFLICT
   │
 ┌─┴──────────┐
 │            │
SUCCESS     FAILURE
 │            │
 ▼            ▼
BOOKED      RELEASE
 │            │
 ▼            ▼
COMMIT      ROLLBACK
```

**This is the project I would build from your storyboard.** The screenshot becomes the visual specification, while the database transaction engine becomes the actual innovation.

And technically, the use of InnoDB row locking is not just a made-up simulation: MySQL documents `SELECT ... FOR UPDATE` as a locking read and explains that conflicting transactions wait for the existing lock to be released; this is exactly the mechanism your demonstration is intended to visualize. ([MySQL Developer Zone][1])

[1]: https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html?utm_source=chatgpt.com "MySQL :: MySQL 8.4 Reference Manual :: 17.7.2.4 Locking Reads"
