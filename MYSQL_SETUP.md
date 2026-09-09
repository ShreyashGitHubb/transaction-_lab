# MySQL Setup Guide

This guide is for Ubuntu/Debian Linux and this project.

## 1. Install MySQL Server

Open a terminal:

```bash
sudo apt update
sudo apt install mysql-server
```

Check that MySQL is installed:

```bash
mysql --version
```

Start MySQL and enable it after reboot:

```bash
sudo systemctl start mysql
sudo systemctl enable mysql
sudo systemctl status mysql
```

The status should show `active (running)`. Press `q` to leave the status screen.

## 2. Run the security setup

```bash
sudo mysql_secure_installation
```

Recommended answers for a local college project:

- Set up VALIDATE PASSWORD component: `n`
- Change the root password: choose `y` only if you want one
- Remove anonymous users: `y`
- Disallow root login remotely: `y`
- Remove the test database: `y`
- Reload privilege tables: `y`

Do not expose MySQL's root account to the LAN. The application should use a separate project user.

## 3. Open the MySQL console

Ubuntu commonly authenticates the local root account through the operating system:

```bash
sudo mysql
```

You should see a prompt like:

```text
mysql>
```

## 4. Create the project database user

Run this inside the `mysql>` prompt. Replace `YourStrongPassword123!` with your own password.

```sql
CREATE USER IF NOT EXISTS 'ticket_app'@'localhost'
IDENTIFIED BY 'YourStrongPassword123!';

CREATE DATABASE IF NOT EXISTS ticket_transaction_lab;

GRANT ALL PRIVILEGES ON ticket_transaction_lab.*
TO 'ticket_app'@'localhost';

FLUSH PRIVILEGES;
EXIT;
```

The database name must stay `ticket_transaction_lab` because it is used by `schema.sql` and `seed.sql`.

## 5. Test the application user

```bash
mysql -u ticket_app -p ticket_transaction_lab
```

Enter the password you created. Then run:

```sql
SELECT DATABASE();
SHOW TABLES;
EXIT;
```

At this point, `SHOW TABLES` will be empty because the schema has not been loaded yet.

## 6. Load the project schema

From the project root:

```bash
cd /home/shreyash/Project/DBMS_IE
mysql -u ticket_app -p < database/schema.sql
```

Enter the project user's password when prompted.

This creates the InnoDB tables:

- `users`
- `shows`
- `seats`
- `bookings`
- `booking_seats`
- `transactions`

## 7. Load the sample movie and seats

```bash
mysql -u ticket_app -p < database/seed.sql
```

Verify the seed data:

```bash
mysql -u ticket_app -p ticket_transaction_lab
```

Then run:

```sql
SELECT * FROM shows;
SELECT COUNT(*) AS seat_count FROM seats;
SELECT status, COUNT(*) AS total FROM seats GROUP BY status;
EXIT;
```

Expected values:

- One show for `Avengers: Endgame`
- `80` seats, covering rows A-H and seats 1-10
- All seats initially `AVAILABLE`

## 8. Test the transaction lock manually

Open two terminals and connect to the same database in both:

```bash
mysql -u ticket_app -p ticket_transaction_lab
```

In terminal 1, find a seat and lock it:

```sql
START TRANSACTION;
SELECT seat_id, status
FROM seats
WHERE show_id = 1 AND row_name = 'C' AND seat_number = 4
FOR UPDATE;
```

Leave this transaction open. In terminal 2, run the same `SELECT ... FOR UPDATE`. Terminal 2 will wait because terminal 1 owns the row lock.

Return to terminal 1 and release the lock:

```sql
ROLLBACK;
```

Terminal 2 will continue. This is the database behavior the project demonstrates during concurrent booking.

## 9. Application connection settings

When the server is switched from the current in-memory demo to MySQL, use these settings:

```text
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=ticket_transaction_lab
DB_USER=ticket_app
DB_PASSWORD=YourStrongPassword123!
```

Create a local `.env` file in the project root or in `server/`, depending on where the database connection module reads it. Never commit this file or put the password in frontend code.

The Node.js MySQL driver will be installed with:

```bash
npm install mysql2 dotenv
```

A connection pool should use these values and the booking service should perform the seat operation with `SELECT ... FOR UPDATE` inside a transaction.

## 10. Important current-project note

The first runnable UI demo currently stores seats in memory inside `server/server.js`. It is useful for demonstrating two browser tabs immediately, but it does not yet read or write MySQL.

The database is prepared by this guide. The next implementation step is to replace that in-memory repository with a `mysql2` connection pool and transaction service. The SQL schema is already prepared for that change.

## Common fixes

### Access denied for `ticket_app`

Make sure you are using the same password that was set in `CREATE USER`:

```bash
mysql -u ticket_app -p ticket_transaction_lab
```

If needed, reset it from `sudo mysql`:

```sql
ALTER USER 'ticket_app'@'localhost' IDENTIFIED BY 'NewPassword123!';
FLUSH PRIVILEGES;
```

### MySQL is not running

```bash
sudo systemctl start mysql
sudo systemctl status mysql
```

### Reset the project database during development

This deletes all project data and recreates the tables:

```bash
sudo mysql -e "DROP DATABASE IF EXISTS ticket_transaction_lab;"
mysql -u ticket_app -p < database/schema.sql
mysql -u ticket_app -p < database/seed.sql
```
