CREATE DATABASE IF NOT EXISTS ticket_transaction_lab;
USE ticket_transaction_lab;

CREATE TABLE users (
  user_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE shows (
  show_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  movie_name VARCHAR(180) NOT NULL,
  screen VARCHAR(80) NOT NULL,
  show_date DATE NOT NULL,
  show_time TIME NOT NULL,
  ticket_price DECIMAL(10,2) NOT NULL DEFAULT 200.00,
  UNIQUE KEY uq_show_instance (movie_name, screen, show_date, show_time)
) ENGINE=InnoDB;

CREATE TABLE seats (
  seat_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  show_id BIGINT NOT NULL,
  row_name CHAR(1) NOT NULL,
  seat_number TINYINT NOT NULL,
  status ENUM('AVAILABLE','HELD','BOOKED') NOT NULL DEFAULT 'AVAILABLE',
  hold_expires_at DATETIME NULL,
  UNIQUE KEY uq_show_seat (show_id, row_name, seat_number),
  CONSTRAINT fk_seat_show FOREIGN KEY (show_id) REFERENCES shows(show_id)
) ENGINE=InnoDB;

CREATE TABLE bookings (
  booking_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  show_id BIGINT NOT NULL,
  booking_status ENUM('PENDING','CONFIRMED','CANCELLED','FAILED') NOT NULL DEFAULT 'PENDING',
  total_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (show_id) REFERENCES shows(show_id)
) ENGINE=InnoDB;

CREATE TABLE booking_seats (
  booking_id BIGINT NOT NULL,
  seat_id BIGINT NOT NULL,
  PRIMARY KEY (booking_id, seat_id),
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
  FOREIGN KEY (seat_id) REFERENCES seats(seat_id)
) ENGINE=InnoDB;

CREATE TABLE transactions (
  transaction_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  booking_id BIGINT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  transaction_status ENUM('PENDING','SUCCESS','FAILED','ROLLED_BACK') NOT NULL DEFAULT 'PENDING',
  failure_type ENUM('NONE','CONFLICT','PAYMENT_FAILURE','TIMEOUT','SERVER_FAILURE') NOT NULL DEFAULT 'NONE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
) ENGINE=InnoDB;

CREATE TABLE transaction_logs (
  log_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  transaction_id BIGINT NOT NULL,
  event_type ENUM('BEGIN','LOCK_REQUESTED','LOCK_ACQUIRED','SEAT_HELD','PAYMENT_STARTED','PAYMENT_SUCCESS','PAYMENT_FAILED','CONFLICT','ROLLBACK','COMMIT','HOLD_EXPIRED') NOT NULL,
  seat_id BIGINT NULL,
  message VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id),
  FOREIGN KEY (seat_id) REFERENCES seats(seat_id)
) ENGINE=InnoDB;

CREATE INDEX idx_seats_show_status ON seats(show_id, status);
CREATE INDEX idx_transactions_status ON transactions(transaction_status);
CREATE INDEX idx_transaction_logs_transaction ON transaction_logs(transaction_id, created_at);
