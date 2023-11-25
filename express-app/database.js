import mysql from 'mysql2'

const pool = mysql.createPool({
   host: 'localhost',
   user: 'root',
   password: 'root',
   database: 'redisresearch',
   maxPacketSize: 1000000,
}).promise()

export async function getAlbumAll() {
   const [rows] = await pool.query('SELECT album FROM images;')
   return rows
}

export async function getImageAll() {
   const [rows] = await pool.query('SELECT image FROM images;')
   return rows
}
