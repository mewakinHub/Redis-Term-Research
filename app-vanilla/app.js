import mysql from 'mysql2';
import express from 'express';

const conn = mysql.createConnection({
   host: 'localhost',
   user: 'root',
   password: 'root',
   database: 'redisresearch'
}).promise();

const app = express();

//Adjustable variables
const port = 3000;

app.use(express.static('public'));

app.get('/all', async (req, res) => {
   const [dbdata] = await conn.query('SELECT image FROM images;');
   const dbjson = JSON.stringify(dbdata);
   res.send(dbjson);
});

app.listen(port, () => {
   console.log('Server is running on port', port);
});
