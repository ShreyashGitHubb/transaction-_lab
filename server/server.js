const express = require('express')
const http = require('http')
const cors = require('cors')
const os = require('os')
const { Server } = require('socket.io')
const pool = require('./db')

const app = express()
const httpServer = http.createServer(app)
const io = new Server(httpServer, { cors: { origin: true, credentials: true } })
const port = Number(process.env.PORT || 4000)
const showId = 1
const seatPrice = 200

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

async function getSeatSnapshot() {
  const [rows] = await pool.query(
    'SELECT row_name, seat_number, status FROM seats WHERE show_id = ? ORDER BY row_name, seat_number',
    [showId],
  )
  return Object.fromEntries(rows.map((seat) => {
    const id = `${seat.row_name}${seat.seat_number}`
    return [id, { id, status: seat.status }]
  }))
}

async function getShow() {
  const [rows] = await pool.query(
    'SELECT show_id, movie_name, screen, show_date, show_time FROM shows WHERE show_id = ?',
    [showId],
  )
  return rows[0]
}

app.get('/api/shows/:showId', async (req, res, next) => {
  try {
    const show = await getShow()
    const seats = await getSeatSnapshot()
    res.json({ show, seats })
  } catch (error) {
    next(error)
  }
})

app.get('/api/shows/:showId/seats', async (_req, res, next) => {
  try {
    res.json({ showId, seats: await getSeatSnapshot() })
  } catch (error) {
    next(error)
  }
})

async function holdSeats({ seatIds, userId = 1 }) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const requested = [...new Set(seatIds)]
    if (!requested.length) throw new Error('At least one seat is required')

    const seatValues = requested.flatMap((id) => [id[0], Number(id.slice(1))])
    const [lockedSeats] = await connection.query(
      `SELECT seat_id, row_name, seat_number, status FROM seats
       WHERE show_id = ? AND (row_name, seat_number) IN (${requested.map(() => '(?, ?)').join(',')})
       ORDER BY seat_id FOR UPDATE`,
      [showId, ...seatValues],
    )
    const unavailable = lockedSeats.filter((seat) => seat.status !== 'AVAILABLE')
    if (lockedSeats.length !== requested.length || unavailable.length) {
      await connection.rollback()
      return { ok: false, reason: 'CONFLICT', seatIds: unavailable.map((seat) => `${seat.row_name}${seat.seat_number}`) }
    }

    const [booking] = await connection.query(
      'INSERT INTO bookings (user_id, show_id, booking_status, total_amount) VALUES (?, ?, ?, ?)',
      [userId, showId, 'PENDING', requested.length * seatPrice],
    )
    const bookingId = booking.insertId
    await connection.query(
      `INSERT INTO booking_seats (booking_id, seat_id) VALUES ${lockedSeats.map(() => '(?, ?)').join(',')}`,
      lockedSeats.flatMap((seat) => [bookingId, seat.seat_id]),
    )
    const [transaction] = await connection.query(
      'INSERT INTO transactions (booking_id, amount, transaction_status, failure_type) VALUES (?, ?, ?, ?)',
      [bookingId, requested.length * seatPrice, 'PENDING', 'NONE'],
    )
    await connection.query(
      `UPDATE seats SET status = 'HELD', hold_expires_at = DATE_ADD(NOW(), INTERVAL 10 MINUTE)
       WHERE seat_id IN (${lockedSeats.map(() => '?').join(',')})`,
      lockedSeats.map((seat) => seat.seat_id),
    )
    await connection.commit()
    return { ok: true, reason: 'HELD', seatIds: requested, bookingId, transactionId: transaction.insertId }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

async function completePayment({ bookingId, transactionId, result }) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [bookingRows] = await connection.query(
      `SELECT b.booking_id, b.booking_status, bs.seat_id, s.row_name, s.seat_number, s.status
       FROM bookings b JOIN booking_seats bs ON bs.booking_id = b.booking_id
       JOIN seats s ON s.seat_id = bs.seat_id
       WHERE b.booking_id = ? FOR UPDATE`,
      [bookingId],
    )
    if (!bookingRows.length || bookingRows.some((row) => row.status !== 'HELD')) {
      await connection.rollback()
      return { ok: false, result: 'CONFLICT', bookingId, transactionId }
    }

    const isSuccess = result === 'SUCCESS'
    const status = isSuccess ? 'BOOKED' : 'AVAILABLE'
    const bookingStatus = isSuccess ? 'CONFIRMED' : 'FAILED'
    const transactionStatus = isSuccess ? 'SUCCESS' : 'ROLLED_BACK'
    const failureType = isSuccess ? 'NONE' : result === 'TIMEOUT' ? 'TIMEOUT' : 'PAYMENT_FAILURE'
    await connection.query(
      `UPDATE seats SET status = ?, hold_expires_at = NULL WHERE seat_id IN (${bookingRows.map(() => '?').join(',')})`,
      [status, ...bookingRows.map((row) => row.seat_id)],
    )
    await connection.query('UPDATE bookings SET booking_status = ? WHERE booking_id = ?', [bookingStatus, bookingId])
    await connection.query(
      'UPDATE transactions SET transaction_status = ?, failure_type = ?, completed_at = NOW() WHERE transaction_id = ?',
      [transactionStatus, failureType, transactionId],
    )
    await connection.commit()
    return { ok: isSuccess, result, bookingId, transactionId, seatIds: bookingRows.map((row) => `${row.row_name}${row.seat_number}`) }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

io.on('connection', async (socket) => {
  try {
    socket.emit('show_snapshot', { show: await getShow(), seats: await getSeatSnapshot() })
  } catch (error) {
    socket.emit('server_error', { message: 'Could not load show data from MySQL' })
  }

  socket.on('hold_seats', async (payload, callback) => {
    try {
      const result = await holdSeats(payload)
      if (result.ok) io.emit('seat_snapshot', await getSeatSnapshot())
      socket.emit('booking_result', result)
      if (callback) callback(result)
    } catch (error) {
      socket.emit('server_error', { message: error.message })
      if (callback) callback({ ok: false, reason: 'SERVER_FAILURE' })
    }
  })

  socket.on('complete_payment', async (payload, callback) => {
    try {
      const result = await completePayment(payload)
      io.emit('seat_snapshot', await getSeatSnapshot())
      socket.emit('payment_result', result)
      if (callback) callback(result)
    } catch (error) {
      socket.emit('server_error', { message: error.message })
      if (callback) callback({ ok: false, result: 'SERVER_FAILURE' })
    }
  })
})

app.use((error, _req, res, _next) => res.status(500).json({ error: error.message }))

function getLanAddress() {
  const interfaces = Object.values(os.networkInterfaces()).flat().filter(Boolean)
  return interfaces.find((entry) => entry.family === 'IPv4' && !entry.internal)?.address
}

async function start() {
  await pool.query('SELECT 1')
  await getShow()
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Transaction server listening on http://localhost:${port}`)
    console.log(`LAN API and Socket.IO: http://${getLanAddress() || 'YOUR_LAN_IP'}:${port}`)
  })
}

start().catch((error) => {
  console.error('Could not start server with MySQL:', error.message)
  process.exitCode = 1
})
