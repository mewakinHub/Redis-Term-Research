const express = require('express');
const mysql2 = require('mysql2');

//Adjustable variables
const port = 1000;

//Initialize Express
const app = express();
app.use(express.static('public'));
app.listen(port, () => {
   console.log('---------------');
   console.log('• Server is running on port', port);
   console.log('---------------');
});

//Initialize MySQL
const sqlConn = mysql2.createConnection({
   host: 'localhost',
   user: 'root',
   password: 'root',
   database: 'redisresearch'
}).promise();

//Initialize Timestamps

let startTime = 0;
let endTime = 0;
let responseTime = 0;
let loadTime = 0;

app.get('/loadtime/:loadtime', async (req, res) => {
   loadTime = req.params.loadtime;
   if (responseTime != 0) {
      console.log('Page render time:', String(loadTime-responseTime), 'ms');
      console.log('Total load time:', loadTime, 'ms');
      console.log('---------------');
   }
});

function RecordResponseTime() {
   endTime = new Date().getTime();
   responseTime = endTime - startTime;
   console.log('Response time:', responseTime, 'ms');
};

//Fetch function
async function FetchQuery(res, query, params) {
   startTime = new Date().getTime();
   const [dbData] = await sqlConn.query(query, [params]);
   const dbBase64 = dbData.map(item => {
      const imageData = item.image;
      const base64Image = Buffer.from(imageData).toString('base64');
      return { ...item, image: base64Image };
   });
   res.send(dbBase64);
   RecordResponseTime();
};

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

//Exit procedure
process.on('SIGINT', async () => {
   console.log('Exiting...');
   console.log('---------------');
   sqlConn.end();
   process.exit();
});
