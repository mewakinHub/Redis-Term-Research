import mysql from 'mysql2'

import dotenv from 'dotenv'
dotenv.config()

const pool = mysql.createPool({
   host: process.env.MYSQL_HOST,
   user: process.env.MYSQL_USER,
   password: process.env.MYSQL_PASSWORD,
   database: process.env.MYSQL_DATABASE
}).promise()

async function getAlbum() {
   const [rows] = await pool.query('SELECT album FROM images;')
   return rows
}

async function getImage(id) {
   const [rows] = await pool.query(`SELECT image FROM images
                                    WHERE id=?;`, [id])
   return rows
}

const result = await getImage(100)
console.log(result)