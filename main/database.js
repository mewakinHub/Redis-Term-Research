import mysql from 'mysql2'

const sql = mysql.createPool({
   host: 'localhost',
   user: 'root',
   password: 'root',
   database: 'redisresearch'
}).promise()

const result = await sql.query('SELECT ')