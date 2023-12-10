import mysql from 'mysql2';
import express from 'express';

//Adjustable variables
const port = 1000;

//Initialize base
const conn = mysql.createConnection({
   host: 'localhost',
   user: 'root',
   password: 'root',
   database: 'redisresearch'
}).promise();
const app = express();
var startTime = 0;
var endTime = 0;
var responseTime = 0;
var loadTime = 0;
app.use(express.static('public'));
app.listen(port, () => {
   console.log('Server is running on port', port);
   console.log('---------------');
});
app.get('/loadtime/:loadtime', async (req, res) => {
   loadTime = req.params.loadtime;
   if (responseTime != 0) {
      console.log('Page render time:', String(loadTime-responseTime), 'ms');
      console.log('Total load time:', loadTime, 'ms');
      console.log('---------------');
   }
});
function RecordFetchTime() {
   endTime = new Date().getTime();
   responseTime = endTime - startTime;
   console.log('Fetch response time:', responseTime, 'ms');
}

//Fetch function
async function FetchQuery(res, sqlquery, params) {
   startTime = new Date().getTime();
   const [dbdata] = await conn.query(sqlquery, [params]);
   const dbjson = JSON.stringify(dbdata);
   res.send(dbjson);
   RecordFetchTime();
}

//API endpoints

app.get('/all', async (req, res) => {
   FetchQuery(res, 'SELECT image FROM images;', '');
});

app.get('/album/:album', async (req, res) => {
   const album = req.params.album;
   FetchQuery(res, 'SELECT image FROM images WHERE album=?', album);
});

app.get('/id/:id', async (req, res) => {
   const id = req.params.id;
   FetchQuery(res, 'SELECT image FROM images WHERE id=?', id);
});
