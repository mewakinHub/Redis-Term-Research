const express = require('express');
const mysql2 = require('mysql2');

//Adjustable variables
const port = 1000; //Integer [1000, infinity). Server port

//Adjustable database-specific variables
const sqlHost = 'localhost';
const sqlUser = 'root';
const sqlPassword = 'root';
const sqlDatabase = 'redisresearch';

//Adjustable database-specific initialization
const sqlConn = mysql2.createConnection({
   host: sqlHost,
   user: sqlUser,
   password: sqlPassword,
   database: sqlDatabase
}).promise();

//Adjustable database-specific cache miss query function
async function QueryDatabase(sqlquery, params) {
   return await sqlConn.query(sqlquery, [params]);
}



//Initialize Express
const app = express();
app.use(express.static('public'));
app.listen(port, () => {
   console.log('---------------');
   console.log('• Server is running on port', port);
   console.log('---------------');
});

//Initialize time measurements

let startTime = 0;
let endTime = 0;
let responseTime = 0;
let loadTime = 0;

app.get('/loadtime/:loadtime', async (req, res) => {
   loadTime = req.params.loadtime;
   if (responseTime != 0) {
      console.log('Page render time:', loadTime-responseTime, 'ms');
      console.log('Total load time:', parseInt(loadTime), 'ms');
      console.log('---------------');
   }
});

function RecordResponseTime() {
   endTime = new Date().getTime();
   responseTime = endTime - startTime;
   console.log('Response time:', responseTime, 'ms');
};

//Fetch function
async function FetchQuery(res, sqlquery, params) {
   startTime = new Date().getTime();
   const [dbData] = QueryDatabase(sqlquery, params);
   res.send(dbData);
   RecordResponseTime();
};

//Express API endpoints

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
