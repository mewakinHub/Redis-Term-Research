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

app.get('/loadtime/:loadtime', async (req, res) => {
   const loadtime = req.params.loadtime;
   console.log('Load time:', loadtime, 'ms');
});

app.get('/all', async (req, res) => {
   const [dbdata] = await conn.query('SELECT image FROM images;');
   const dbjson = JSON.stringify(dbdata);
   res.send(dbjson);
});

app.get('/album/:album', async (req, res) => {
   const album = req.params.album;
   const [dbdata] = await conn.query('SELECT image FROM images WHERE album=?', [album]);
   const dbjson = JSON.stringify(dbdata);
   res.send(dbjson);
})

app.get('/id/:id', async (req, res) => {
   const id = req.params.id;
   const [dbdata] = await conn.query('SELECT image FROM images WHERE id=?', [id]);
   const dbjson = JSON.stringify(dbdata);
   res.send(dbjson);
})

app.listen(port, () => {
   console.log('Server is running on port', port);
});
