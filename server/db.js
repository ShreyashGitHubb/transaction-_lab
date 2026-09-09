require('dotenv').config()
const mysql = require('mysql2/promise')

// Railway provides MYSQL_URL/MYSQL* variables to a linked backend service.
// MYSQL_PUBLIC_URL is supported only when the backend is outside Railway.
const connectionUrl = process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL || process.env.DATABASE_URL
const poolConfig = connectionUrl ? connectionUrl : {
  host: process.env.DB_HOST || process.env.MYSQLHOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
  user: process.env.DB_USER || process.env.MYSQLUSER || 'ticket_app',
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || 'password',
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'ticket_transaction_lab',
}

const pool = mysql.createPool({
  ...poolConfig,
  ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
})

module.exports = pool
