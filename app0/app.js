import mysql from 'mysql2';
import express from 'express';

const conn = mysql.createConnection({
   host: 'localhost',
   user: 'root',
   password: 'root',
   database: 'redisresearch'
}).promise();

const app = express();

var loadTime = 0;

//Adjustable variables
const port = 3000;

app.use(express.static('public'));

app.get('/loadtime/:loadtime', async (req, res) => {
   loadTime = req.params.loadtime;
   console.log('Total load time:', loadTime, 'ms');
   console.log('---------------');
});

app.get('/all', async (req, res) => {
   var startTime = new Date().getTime();
   const [dbdata] = await conn.query('SELECT image FROM images;');
   const dbjson = JSON.stringify(dbdata);
   res.send(dbjson);
   var endTime = new Date().getTime();
   var responseTime = endTime - startTime;
   console.log('Fetch response time:', responseTime, 'ms');
});

app.get('/album/:album', async (req, res) => {
   var startTime = new Date().getTime();
   const album = req.params.album;
   const [dbdata] = await conn.query('SELECT image FROM images WHERE album=?', [album]);
   const dbjson = JSON.stringify(dbdata);
   res.send(dbjson);
   var endTime = new Date().getTime();
   var responseTime = endTime - startTime;
   console.log('Fetch response time:', responseTime, 'ms');
});

app.get('/id/:id', async (req, res) => {
   var startTime = new Date().getTime();
   const id = req.params.id;
   const [dbdata] = await conn.query('SELECT image FROM images WHERE id=?', [id]);
   const dbjson = JSON.stringify(dbdata);
   res.send(dbjson);
   var endTime = new Date().getTime();
   var responseTime = endTime - startTime;
   console.log('Fetch response time:', responseTime, 'ms');
});

app.listen(port, () => {
   console.log('Server is running on port', port);
   console.log('---------------');
});
