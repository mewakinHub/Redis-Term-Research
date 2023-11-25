import mysql from 'mysql2'

const pool = mysql.createPool({
   host: 'localhost',
   user: 'root',
   password: 'root',
   database: 'redisresearch'
}).promise()

export async function RgetImageAll() {
   const [rows] = await pool.query('SELECT image FROM images;')
   return rows
}

export async function RgetImageByAlbum(album) {
   const [rows] = await pool.query(`SELECT image FROM images
                                    WHERE album=?;`, [album])
   return rows
}

export async function RgetImageById(id) {
   const [rows] = await pool.query(`SELECT image FROM images
                                    WHERE id=?;`, [id])
   return rows
}
