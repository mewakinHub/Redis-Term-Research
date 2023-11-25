import mysql from 'mysql2'

const conn = mysql.createConnection({
   host: 'localhost',
   user: 'root',
   password: 'root',
   database: 'redisresearch'
}).promise()

export async function VgetImageAll() {
   const [rows] = await conn.query('SELECT image FROM images;')
   return rows
}

export async function VgetImageByAlbum(album) {
   const [rows] = await conn.query(`SELECT image FROM images
                                    WHERE album=?;`, [album])
   return rows
}

export async function VgetImageById(id) {
   const [rows] = await conn.query(`SELECT image FROM images
                                    WHERE id=?;`, [id])
   return rows
}
