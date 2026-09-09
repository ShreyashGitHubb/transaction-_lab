-- Concurrent Ticket Booking & Transaction Failure Recovery
-- Run this complete file once in the Railway MySQL query console.

CREATE DATABASE IF NOT EXISTS ticket_transaction_lab;
USE ticket_transaction_lab;

CREATE TABLE IF NOT EXISTS users (
  user_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS shows (
  show_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  movie_name VARCHAR(180) NOT NULL,
  screen VARCHAR(80) NOT NULL,
  show_date DATE NOT NULL,
  show_time TIME NOT NULL,
  UNIQUE KEY uq_show_instance (movie_name, screen, show_date, show_time)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS seats (
  seat_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  show_id BIGINT NOT NULL,
  row_name CHAR(1) NOT NULL,
  seat_number TINYINT NOT NULL,
  status ENUM('AVAILABLE','HELD','BOOKED') NOT NULL DEFAULT 'AVAILABLE',
  hold_expires_at DATETIME NULL,
  UNIQUE KEY uq_show_seat (show_id, row_name, seat_number),
  CONSTRAINT fk_seat_show FOREIGN KEY (show_id) REFERENCES shows(show_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bookings (
  booking_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  show_id BIGINT NOT NULL,
  booking_status ENUM('PENDING','CONFIRMED','CANCELLED','FAILED') NOT NULL DEFAULT 'PENDING',
  total_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_user FOREIGN KEY (user_id) REFERENCES users(user_id),
  CONSTRAINT fk_booking_show FOREIGN KEY (show_id) REFERENCES shows(show_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS booking_seats (
  booking_id BIGINT NOT NULL,
  seat_id BIGINT NOT NULL,
  PRIMARY KEY (booking_id, seat_id),
  CONSTRAINT fk_booking_seat_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
  CONSTRAINT fk_booking_seat_seat FOREIGN KEY (seat_id) REFERENCES seats(seat_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transactions (
  transaction_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  booking_id BIGINT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  transaction_status ENUM('PENDING','SUCCESS','FAILED','ROLLED_BACK') NOT NULL DEFAULT 'PENDING',
  failure_type ENUM('NONE','CONFLICT','PAYMENT_FAILURE','TIMEOUT','SERVER_FAILURE') NOT NULL DEFAULT 'NONE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  CONSTRAINT fk_transaction_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
) ENGINE=InnoDB;

CREATE INDEX idx_seats_show_status ON seats(show_id, status);
CREATE INDEX idx_transactions_status ON transactions(transaction_status);

INSERT IGNORE INTO users (name, email)
VALUES
  ('User 1', 'user1@test.local'),
  ('User 2', 'user2@test.local');

INSERT INTO shows (movie_name, screen, show_date, show_time)
SELECT 'Avengers: Endgame', 'Screen 1', '2026-09-10', '10:00:00'
WHERE NOT EXISTS (
  SELECT 1
  FROM shows
  WHERE movie_name = 'Avengers: Endgame'
    AND screen = 'Screen 1'
    AND show_date = '2026-09-10'
    AND show_time = '10:00:00'
);

INSERT IGNORE INTO seats (show_id, row_name, seat_number)
SELECT show_id, seat_rows.row_name, seat_numbers.seat_number
FROM shows
CROSS JOIN (
  SELECT 'A' AS row_name UNION ALL SELECT 'B' UNION ALL SELECT 'C' UNION ALL SELECT 'D'
  UNION ALL SELECT 'E' UNION ALL SELECT 'F' UNION ALL SELECT 'G' UNION ALL SELECT 'H'
) AS seat_rows
CROSS JOIN (
  SELECT 1 AS seat_number UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
  UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
) AS seat_numbers
WHERE shows.movie_name = 'Avengers: Endgame'
  AND shows.screen = 'Screen 1'
  AND shows.show_date = '2026-09-10'
  AND shows.show_time = '10:00:00';

-- Verification: expected result is 2 users, 1 show, and 80 seats.
SELECT COUNT(*) AS users_count FROM users;
SELECT COUNT(*) AS shows_count FROM shows;
SELECT COUNT(*) AS seats_count FROM seats;
SELECT status, COUNT(*) AS total FROM seats GROUP BY status;
