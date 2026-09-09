USE ticket_transaction_lab;
INSERT IGNORE INTO users (name, email) VALUES ('User 1', 'user1@test.local'), ('User 2', 'user2@test.local');
INSERT INTO shows (movie_name, screen, show_date, show_time)
SELECT 'Avengers: Endgame', 'Screen 1', '2026-09-10', '10:00:00'
WHERE NOT EXISTS (
	SELECT 1 FROM shows
	WHERE movie_name = 'Avengers: Endgame'
		AND screen = 'Screen 1'
		AND show_date = '2026-09-10'
		AND show_time = '10:00:00'
);

INSERT IGNORE INTO seats (show_id, row_name, seat_number)
SELECT 1, seat_rows.row_name, numbers.seat_number
FROM (SELECT 'A' row_name UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H') AS seat_rows
CROSS JOIN (SELECT 1 seat_number UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) numbers;
