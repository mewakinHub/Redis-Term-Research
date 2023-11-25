import mysql from 'mysql2'

const pool = mysql.createPool({
   host: 'localhost',
   user: 'root',
   password: 'root',
   database: 'redisresearch'
}).promise()

export async function getAlbum() {
   const [rows] = await pool.query('SELECT album FROM images;')
   return rows
}

export async function getImage(id) {
   const [rows] = await pool.query(`SELECT image FROM images
                                    WHERE id=?;`, [id])
   return rows
}
