import React from 'react'
import { createRoot } from 'react-dom/client'
import { io } from 'socket.io-client'
import { Check, CircleAlert, CreditCard, LockKeyhole, RotateCcw, Wifi } from 'lucide-react'
import './styles.css'

const socketUrl = import.meta.env.VITE_SOCKET_URL || `${window.location.protocol}//${window.location.hostname}:4000`
const socket = io(socketUrl)
const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const seatIds = rows.flatMap((row) => Array.from({ length: 10 }, (_, index) => `${row}${index + 1}`))
const initialSeats = Object.fromEntries(seatIds.map((id) => [id, { id, status: 'AVAILABLE' }]))

function App() {
  const [seats, setSeats] = React.useState(initialSeats)
  const [userId] = React.useState(() => {
    const existing = sessionStorage.getItem('demoUserId')
    if (existing) return existing
    const generated = String(Math.floor(1000 + Math.random() * 9000))
    sessionStorage.setItem('demoUserId', generated)
    return generated
  })
  const [selected, setSelected] = React.useState([])
  const [screen, setScreen] = React.useState('booking')
  const [paymentResult, setPaymentResult] = React.useState('SUCCESS')
  const [bookingId, setBookingId] = React.useState('')
  const [transactionId, setTransactionId] = React.useState('')
  const [connection, setConnection] = React.useState(false)

  React.useEffect(() => {
    socket.on('connect', () => setConnection(true))
    socket.on('disconnect', () => setConnection(false))
    socket.on('show_snapshot', ({ seats: snapshot }) => setSeats(snapshot))
    socket.on('seat_snapshot', setSeats)
    socket.on('booking_result', (result) => {
      if (result.ok) {
        setBookingId(result.bookingId)
        setTransactionId(result.transactionId)
        setScreen('payment')
      } else { setScreen('conflict'); setSelected([]) }
    })
    socket.on('payment_result', (result) => {
      if (result.ok) setScreen('success')
      else setScreen('failure')
    })
    return () => socket.removeAllListeners()
  }, [])

  const total = selected.length * 200
  const toggleSeat = (id) => {
    if (seats[id]?.status !== 'AVAILABLE' || screen !== 'booking') return
    setSelected((current) => current.includes(id) ? current.filter((seatId) => seatId !== id) : [...current, id])
  }
  const proceed = () => {
    if (!selected.length) return
    socket.emit('hold_seats', { seatIds: selected, userId: Number(userId) })
  }
  const pay = () => {
    socket.emit('complete_payment', { bookingId, transactionId, userId: Number(userId), result: paymentResult })
  }
  const clearSeats = () => {
    fetch(`${socketUrl}/api/demo/clear-seats`, { method: 'POST' })
      .then((response) => response.json())
      .then((result) => { if (result.ok) { setSeats(result.seats); reset() } })
      .catch(() => {})
  }
  const reset = () => { setSelected([]); setScreen('booking'); setBookingId(''); setTransactionId('') }

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark">TL</span><div><strong>Transaction Lab</strong><small>Concurrent booking simulator</small></div></div>
      <div className="header-right"><span className="user-badge">Demo User {userId}</span><div className={`connection ${connection ? 'online' : ''}`}><Wifi size={15} /> {connection ? 'Live sync' : 'Connecting...'}</div></div>
    </header>
    <section className="layout">
      <div className="primary-panel">
        {screen === 'booking' && <BookingView seats={seats} selected={selected} toggleSeat={toggleSeat} proceed={proceed} total={total} userId={userId} />}
        {screen === 'payment' && <PaymentView paymentResult={paymentResult} setPaymentResult={setPaymentResult} pay={pay} />}
        {screen === 'success' && <ResultView type="success" selected={selected} total={total} bookingId={bookingId} userId={userId} reset={reset} />}
        {screen === 'failure' && <ResultView type="failure" selected={selected} reset={reset} />}
        {screen === 'conflict' && <ResultView type="conflict" selected={selected} reset={reset} />}
      </div>
      <aside className="inspector">
        <div className="eyebrow">DBMS OBSERVER</div>
        <h2>Transaction monitor</h2>
        <p className="muted">Watch the shared state change as both clients compete for the same seat.</p>
        <div className="monitor-card"><div className="monitor-head"><span className="status-dot" /> T-{bookingId || 'pending'}</div><div className="timeline"><span className="done">BEGIN</span><span className={screen !== 'booking' ? 'done' : ''}>LOCK REQUESTED</span><span className={screen === 'payment' || screen === 'success' ? 'done' : ''}>SEAT HELD</span><span className={screen === 'success' ? 'done' : screen === 'conflict' ? 'failed' : ''}>{screen === 'conflict' ? 'CONFLICT' : 'PAYMENT'}</span><span className={screen === 'success' ? 'done' : screen === 'failure' || screen === 'conflict' ? 'failed' : ''}>{screen === 'success' ? 'COMMIT' : screen === 'failure' || screen === 'conflict' ? 'ROLLBACK' : 'PENDING'}</span></div></div>
        <div className="principle"><LockKeyhole size={18} /><div><strong>Database is the source of truth</strong><span>Frontend selection becomes a booking only after the server validates the shared seat state.</span></div></div>
        <div className="legend compact"><span><i className="available" /> Available</span><span><i className="held" /> Held</span><span><i className="booked" /> Booked</span></div><button className="clear-seats-button" onClick={clearSeats}>Clear all demo seats</button>
      </aside>
    </section>
    <footer><span>Avengers: Endgame · 10:00 AM · Screen 1</span><span>InnoDB transaction demo</span></footer>
  </main>
}

function UserPicker({ onSelect }) { return <main className="picker-shell"><div className="picker-card"><span className="brand-mark">TL</span><div className="eyebrow">TRANSACTION LAB</div><h1>Choose your demo user</h1><p>Choose a different user on each phone or browser for the concurrency demonstration.</p><div className="user-options"><button onClick={() => onSelect(1)}><strong>User 1</strong><span>Booking client</span></button><button onClick={() => onSelect(2)}><strong>User 2</strong><span>Competing client</span></button></div></div></main> }
function BookingView({ seats, selected, toggleSeat, proceed, total }) { return <><div className="section-kicker">MOVIE TICKETS <span>SHOW 01</span></div><div className="title-row"><div><h1>Avengers: Endgame</h1><p>10:00 AM <b>·</b> Screen 1</p></div><div className="show-badge">LIVE<br /><strong>LAN DEMO</strong></div></div><div className="screen-label">SCREEN</div><div className="seat-map">{rows.map((row) => <div className="seat-row" key={row}><span className="row-label">{row}</span>{Array.from({ length: 10 }, (_, index) => { const id = `${row}${index + 1}`; const seat = seats[id]; const status = selected.includes(id) ? 'selected' : seat?.status.toLowerCase(); return <button title={`Seat ${id}`} aria-label={`Seat ${id}`} className={`seat ${status}`} onClick={() => toggleSeat(id)} key={id}>{index + 1}</button> })}</div>)}</div><div className="legend"><span><i className="available" /> Available</span><span><i className="selected-dot" /> Selected</span><span><i className="held" /> Held</span><span><i className="unavailable" /> Booked</span></div><div className="summary"><div><small>Selected seats</small><strong>{selected.length ? selected.join(', ') : 'Choose your seats'}</strong></div><div className="amount"><small>Total amount</small><strong>₹ {total.toLocaleString('en-IN')}</strong></div></div><button className="primary-button" disabled={!selected.length} onClick={proceed}>Proceed to Payment <span>→</span></button></> }
function PaymentView({ paymentResult, setPaymentResult, pay }) { return <div className="payment-view"><div className="payment-icon"><CreditCard size={34} /></div><div className="section-kicker">SECURE CHECKOUT</div><h1>Processing Payment...</h1><p>Please do not close the app while your transaction is being confirmed.</p><div className="simulator"><div className="simulator-label">DEMO PAYMENT RESULT</div><div className="segmented">{['SUCCESS', 'FAILURE', 'TIMEOUT'].map((result) => <button className={paymentResult === result ? 'active' : ''} onClick={() => setPaymentResult(result)} key={result}>{result}</button>)}</div></div><button className="primary-button" onClick={pay}>Complete demo payment <span>→</span></button></div> }
function ResultView({ type, selected, total, bookingId, userId, reset }) { const data = { success: { icon: <Check />, kicker: 'TRANSACTION COMMITTED', title: 'Payment Successful', copy: 'Your seats have been booked.', className: 'success' }, failure: { icon: <RotateCcw />, kicker: 'TRANSACTION ROLLED BACK', title: 'Payment Failed', copy: 'The seats were released and are available again.', className: 'failure' }, conflict: { icon: <CircleAlert />, kicker: 'TRANSACTION REJECTED', title: 'Seat Not Available', copy: 'These seats have been booked by another user.', className: 'conflict' } }[type]; return <div className={`result-view ${data.className}`}><div className="result-icon">{data.icon}</div><div className="section-kicker">{data.kicker}</div><h1>{data.title}</h1><p>{data.copy}</p>{type === 'success' && <div className="receipt"><span>Seats <strong>{selected.join(', ')}</strong></span><span>Allocated to <strong>User {userId}</strong></span><span>Booking ID <strong>#{bookingId}</strong></span><span>Total <strong>₹ {total.toLocaleString('en-IN')}</strong></span></div>}<button className="primary-button" onClick={reset}>{type === 'success' ? 'Done' : 'Go back'} <span>→</span></button></div> }

createRoot(document.getElementById('root')).render(<App />)
