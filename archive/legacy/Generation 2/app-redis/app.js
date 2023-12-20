const mysql = require('mysql2');
const express = require('express');
const path = require('path');
const redis = require('redis');

const conn = mysql.createConnection({
   host: 'localhost',
   user: 'root',
   password: 'root',
   database: 'redisresearch'
}).promise()
const app = express()

const port = 3001

app.set('views', path.join(__dirname));
app.set('view engine', 'ejs');

app.get('/all', async (req, res) => {
   try {
      const [rows] = await conn.query('SELECT image FROM images;')
      res.render('index', {images: rows})
   }
   catch (error) {
      console.error('Error fetching images:', error);
      res.status(500).send('Internal Server Error');
   }
});

app.listen(port, () => {
   console.log('Server is running on port', port)
});
