const express = require('express');
const mysql2 = require('mysql2');

//Adjustable variables

let port = 1000; //Integer range [1000, infinity). Server port

const sqlHost = 'localhost'; //String. Address of the webpage.
const sqlUser = 'root'; //String. MySQL user.
const sqlPassword = 'root'; //String. MySQL password.
const sqlDatabase = 'redisresearch'; //String. MySQL password.

//Initialize Express

const app = express();
app.use(express.static('public'));
app.listen(port, () => {
   console.log('---------------');
   console.log('✔ Server is running on port', port);
});

//Adjustable Express API endpoints

app.get('/all', async (req, res) => {
   FetchQuery(res, 'SELECT id, image FROM images');
});

app.get('/album/:album', async (req, res) => {
   const album = req.params.album;
   FetchQuery(res, 'SELECT id, image FROM images WHERE album='+album);
});

app.get('/id/:id', async (req, res) => {
   const id = req.params.id;
   FetchQuery(res, 'SELECT id, image FROM images WHERE id=?'+id);
});



//Initialize database

const sqlConn = mysql2.createConnection({
   host: sqlHost,
   user: sqlUser,
   password: sqlPassword,
   database: sqlDatabase
}).promise();

function QueryDatabase(query) {
   return sqlConn.query(query);
};

//Initialize time measurements

let startTime = 0;
let endTime = 0;
let responseTime = 0;
let loadTime = 0;

function RecordResponseTime() {
   endTime = new Date().getTime();
   responseTime = endTime - startTime;
   console.log('○ Response time:', responseTime, 'ms');
};

app.get('/loadtime/:loadtime', async (req, res) => {
   
   loadTime = req.params.loadtime;
   if (responseTime != 0) {
      console.log('○ Page render time:', loadTime-responseTime, 'ms');
      console.log('○ Total load time:', parseInt(loadTime), 'ms');
   }
});

//Fetch function
async function FetchQuery(res, query) {
   console.log('● API called');
   startTime = new Date().getTime();
   const [dbData] = await QueryDatabase(query);
   res.send(dbData);
   RecordResponseTime();
};

//Exit procedure
process.on('SIGINT', async () => {
   console.log('⌫  Exiting...');
   console.log('---------------');
   sqlConn.end();
   process.exit();
});
