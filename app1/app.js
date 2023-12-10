import mysql from 'mysql2';
import express from 'express';
import redis from 'redis';

const conn = mysql.createConnection({
   host: 'localhost',
   user: 'root',
   password: 'root',
   database: 'redisresearch'
}).promise();

const app = express();
const redisCli = redis.createClient();
redisCli.on('error', err => console.log('Redis Client Error', err));
await redisCli.connect();

var loadTime = 0;

//Adjustable variables
const port = 3001;
const TTL = 3600;

app.use(express.static('public'));

app.get('/loadtime/:loadtime', async (req, res) => {
   loadTime = req.params.loadtime;
   console.log('Total load time:', loadTime, 'ms');
   console.log('---------------');
});

app.get('/all', async (req, res) => {
   var startTime = new Date().getTime();
   const key = 'img';
   const rdata = await redisCli.get(key);
   if (rdata != null) {
      console.log('Key:', key);
      console.log('Cache: Hit');
      res.send(rdata);
      var endTime = new Date().getTime();
      var responseTime = endTime - startTime;
      console.log('Fetch response time:', responseTime, 'ms');
      redisCli.expire(key, TTL);
   }
   else {
      console.log('Key:', key);
      console.log('Cache: Miss');
      const [dbdata] = await conn.query('SELECT image FROM images;');
      const dbJson = JSON.stringify(dbdata);
      res.send(dbJson);
      var endTime = new Date().getTime();
      var responseTime = endTime - startTime;
      console.log('Fetch response time:', responseTime, 'ms');
      redisCli.setEx(key, TTL, dbJson);
      console.log('• setEx done');
   }
});

app.get('/album/:album', async (req, res) => {
   var startTime = new Date().getTime();
   const album = req.params.album;
   const key = 'img?album='+album;
   const rdata = await redisCli.get(key);
   if (rdata != null) {
      console.log('Key:', key);
      console.log('Cache: Hit');
      res.send(rdata);
      var endTime = new Date().getTime();
      var responseTime = endTime - startTime;
      console.log('Fetch response time:', responseTime, 'ms');
      redisCli.expire(key, TTL);
   }
   else {
      console.log('Key:', key);
      console.log('Cache: Miss');
      const [dbdata] = await conn.query('SELECT image FROM images WHERE album=?', [album]);
      const dbJson = JSON.stringify(dbdata);
      res.send(dbJson);
      var endTime = new Date().getTime();
      var responseTime = endTime - startTime;
      console.log('Fetch response time:', responseTime, 'ms');
      redisCli.setEx(key, TTL, dbJson);
      console.log('• setEx done');
   }
});

app.get('/id/:id', async (req, res) => {
   var startTime = new Date().getTime();
   const id = req.params.id;
   const key = 'img?id='+id;
   const rdata = await redisCli.get(key);
   if (rdata != null) {
      console.log('Key:', key);
      console.log('Cache: Hit');
      res.send(rdata);
      var endTime = new Date().getTime();
      var responseTime = endTime - startTime;
      console.log('Fetch response time:', responseTime, 'ms');
      redisCli.expire(key, TTL);
   }
   else {
      console.log('Key:', key);
      console.log('Cache: Miss');
      const [dbdata] = await conn.query('SELECT image FROM images WHERE id=?', [id]);
      const dbJson = JSON.stringify(dbdata);
      res.send(dbJson);
      var endTime = new Date().getTime();
      var responseTime = endTime - startTime;
      console.log('Fetch response time:', responseTime, 'ms');
      redisCli.setEx(key, TTL, dbJson);
      console.log('• setEx done');
   }
});

app.listen(port, () => {
   console.log('Server is running on port', port);
   console.log('---------------');
});
