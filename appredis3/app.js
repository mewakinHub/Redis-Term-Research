const express = require('express');
const mysql2 = require('mysql2');
const redis = require('redis');
const sharp = require('sharp');
const mysql = require('mysql');
const MySQLEvents = require('@rodrigogs/mysql-events');

//Adjustable variables

let port = 1003; //Integer range [1000, infinity). Server port

const sqlHost = 'localhost'; //String. Address of the webpage.
const sqlUser = 'root'; //String. MySQL user.
const sqlPassword = 'root'; //String. MySQL password.
const sqlDatabase = 'redisresearch'; //String. MySQL password.

const enableTTL = true; //true for false. Whether to use TTL or not. (true = cache expires, false = cache never expires)
let TTLbase = 3600; //Integer range [1, infinity). Base time-to-live in seconds of a Redis cache
let TTLmax = 21600; //Integer range [1, infinity). Maximum time-to-live in seconds of a Redis cache

const enableCompression = true; //true or false. Whether to use compression or not.
let compressStiffness = 0.25; //Float range (0,infinity). The higher the number, the less the image file size affects compression amount, thus less compression.
let compressQualityMin = 0.1; //Float range (0, 1]. The floor of compressed image quality.
let compressQualityMax = 0.8; //Float range (0, 1]. The ceiling of compressed image quality.
let compressCorrection = 0.95; //Float range (0, 1]. Not recommended to change. The amount to correct Sharp's bigger output size when no compression is applied (quality = 80).
const forceCompressQuality = 0; //Float range (0, 1]. Set to negative or zero to disable. Used for testing.

const primaryKeyAtt = 'id';
const mainTable = 'images';

//Initialize Express

const app = express();
app.use(express.static('public'));
app.listen(port, () => {
   console.log('---------------');
   console.log('✔ Server is running on port', port);
});

//Adjustable Express API endpoints

app.get('/all', async (req, res) => {
   FetchQuery(res, 'SELECT id, image FROM images', 'imgS', ['id'], ['image']);
})

app.get('/album/:album', async (req, res) => {
   const album = req.params.album;
   FetchQuery(res, 'SELECT id, image FROM images WHERE album='+album, 'imgS-album'+album, ['id'], ['image']);
})

app.get('/id/:id', async (req, res) => {
   const id = req.params.id;
   FetchQuery(res, 'SELECT id, image FROM images WHERE id='+id, 'imgS-id'+id, ['id'], ['image']);
})

app.get('/info', async (req, res) => {
   FetchQuery(res, 'SELECT id, album, value FROM images', 'info', ['id', 'album', 'value'], []);
})

app.get('/infotest', async (req, res) => {
   FetchQuery(res, 'SELECT id, album, value FROM images WHERE id=1 OR album=2', 'infotest', ['id', 'album', 'value'], []);
})

//Adjustable metadata logging

async function CheckLogEntry(redisKey) {
   var [check] = await QueryDatabase(`SELECT 1 FROM metadata_query WHERE redisKey='`+redisKey+`'`);
   if (check.length != 0) {
      console.log(`◻ Log entry already exists`);
      return true;
   }
   else {
      return false;
   }
}

async function LogMetadata(redisKey, query) {
   console.log('◼ Logging begins');
   const logExists = await CheckLogEntry(redisKey);
   if (!logExists) {
      QueryDatabase(`INSERT INTO metadata_query (redisKey, query) VALUES ('`+redisKey+`', '`+query+`')`);
      console.log('◻ Logged metadata_query');
      const [rows] = await QueryDatabase(`SELECT `+primaryKeyAtt+` FROM`+query.split('FROM')[1]);
      for (const item of rows) {
         QueryDatabase(`INSERT INTO metadata_row (redisKey, row) VALUES ('`+redisKey+`', `+item.id+`)`);
      }
      console.log('◻ Logged metadata_row');
      var rowOrder = '';
      var count = rows.length;
      for (const item of rows) {
         rowOrder += item.id;
         if (count > 1) {
            rowOrder += ',';
         }
         count--;
      }
      QueryDatabase(`INSERT INTO metadata_roworder (redisKey, rowOrder) VALUES ('`+redisKey+`', '`+rowOrder+`')`);
      console.log('◻ Logged metadata_roworder');
      const columns = query.match(/SELECT\s+(.+?)\s+FROM/i)[1].split(',').map(name => name.trim());
      for (const item of columns) {
         QueryDatabase(`INSERT INTO metadata_column (redisKey, columnName) VALUES ('`+redisKey+`', '`+item+`')`);
      }
      console.log('◻ Logged metadata_column');
      var [columnNames] = await QueryDatabase(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '`+mainTable+`'`);
      columnNames = columnNames.map(columnNames => columnNames.COLUMN_NAME);
      conditions = query.split('FROM ')[1];
      for (const item of columns) {
         const regex = new RegExp(`\\b${item}\\b`, 'i');
         if (regex.test(conditions)) {
            QueryDatabase(`INSERT INTO metadata_columnconditions (redisKey, columnName) VALUES ('`+redisKey+`', '`+item+`')`)
         }
      }
      console.log('◻ Logged metadata_columnconditions');
   }
}

//Initialize database listener

const sqlEventConn = mysql.createConnection({
   host: sqlHost,
   user: sqlUser,
   password: sqlPassword
});

const instance = new MySQLEvents(sqlEventConn, {startAtEnd: true});
instance.start()
   .then(() => {
      console.log('✔ Listening to change in DB');
   })
   .catch(err => console.error('⚠︎ MySQLEvent failed to start.', err));

//Adjustable outdated cache handler

instance.addTrigger({
   name: 'DetectChange',
   expression: 'redisresearch.images',
   statement: MySQLEvents.STATEMENTS.ALL,
   onEvent: async (event) => {
      if (event.table != 'metadata') {
         console.log('▶ A change in DB detected');
         console.log('▷ Table:', event.table);
         console.log('▷ Row:', event.affectedRows[0].before['id']);
         const affectedColumns = event.affectedColumns.filter(item => item !== 'image');
         console.log('▷ Column:', affectedColumns);
         console.log('▷ Value before:', event.affectedRows[0].before[affectedColumns[0]]);
         console.log('▷ Value after:', event.affectedRows[0].after[affectedColumns[0]]);
      }
   }
})
instance.on(MySQLEvents.EVENTS.CONNECTION_ERROR, console.error);
instance.on(MySQLEvents.EVENTS.ZONGJI_ERROR, console.error);



//Initialize database

const sqlConn = mysql2.createConnection({
   host: sqlHost,
   user: sqlUser,
   password: sqlPassword,
   database: sqlDatabase
}).promise();

async function QueryDatabase(query) {
   return sqlConn.query(query);
}

//Initialize Redis

const redisCli = redis.createClient();
redisCli.on('error', err => console.log('⚠︎ Redis Client Error', err));
redisCli.connect();

//Initialize time measurements

let startTime = 0;
let endTime = 0;
let responseTime = 0;
let loadTime = 0;

function RecordResponseTime() {
   endTime = new Date().getTime();
   responseTime = endTime - startTime;
   console.log('○ Response time:', responseTime, 'ms');
}

app.get('/loadtime/:loadtime', async (req, res) => {
   loadTime = req.params.loadtime;
   if (responseTime != 0) {
      console.log('○ Page render time:', loadTime-responseTime, 'ms');
      console.log('○ Total load time:', parseInt(loadTime), 'ms');
   }
})

//TTL function

async function AddTTL(redisKey) {
   if (enableTTL) {
      const currentTTL = await redisCli.ttl(redisKey);
      let newTTL = currentTTL + TTLbase;
      if (newTTL > TTLmax) {
         newTTL = TTLmax;
      }
      redisCli.expire(redisKey, newTTL);
      console.log('○ Changed TTL of key', redisKey, 'from', currentTTL, 's to', newTTL, 's');
   }
}

//Image compression
async function CompressImage(dbData, genericAtt, imgAtt) {
   console.log('▶ Compression process begins');
   if (imgAtt.length == 0) {
      console.log('▷ No images to be compressed');
      return JSON.stringify(dbData);
   }
   else {
      let compressedArray = [];
      let i = 1;
      for (const item of dbData) {
         let obj = {}
         if (genericAtt == 0) {
            console.log('▷ No generic attributes')
         }
         else {
            for (j = 0; j < genericAtt.length; j++) {
               obj[genericAtt[j]] = item[genericAtt[j]]
            }
         }
         let width;
         let height;
         let size;
         let compressQualityMapped;
         for (j = 0; j < imgAtt.length; j++) {
            const image = item[imgAtt[j]];
            await sharp(image)
               .metadata()
               .then(meta => {
                  width = meta.width;
                  height = meta.height;
                  size = meta.size;
                  if (forceCompressQuality <= 0) {
                     const compressQualityRaw = (1 - (size / (width * height * compressStiffness)));
                     compressQualityNormalized = Math.min(Math.max(compressQualityRaw, compressQualityMin), compressQualityMax);
                  }
                  else {
                     compressQualityNormalized = forceCompressQuality;
                  }
                  compressQualityMapped = Math.round(compressQualityNormalized * compressCorrection * 80);
                  console.log('▷ Img', i, 'quality:', compressQualityMapped*1.25 + '%');
               });
            const compressedImage = await sharp(image)
               .webp({
                  quality: compressQualityMapped,
                  minSize: true,
                  effort: 0
               })
               .toBuffer();
               obj[imgAtt[j]] = compressedImage;
         }
         compressedArray.push(obj);
         i++;
      }
      return JSON.stringify(compressedArray);
   };
}

//Fetch function

async function FetchQuery(res, query, redisKey, genericAtt, imgAtt) {
   console.log('● API called');
   startTime = new Date().getTime();
   const rJson = await redisCli.get(redisKey);
   console.log('○ Key:', redisKey);
   if (rJson != null) {
      console.log('○ Cache: Hit');
      res.send(rJson);
      RecordResponseTime();
      AddTTL(redisKey);
   }
   else {
      console.log('○ Cache: Miss');
      const [dbData] = await QueryDatabase(query);
      res.send(dbData);
      RecordResponseTime();
      let dbJson;
      if (enableCompression) {
         dbJson = await CompressImage(dbData, genericAtt, imgAtt);
      }
      else {
         dbJson = JSON.stringify(dbData);
      }
      if (enableTTL) {
         redisCli.setEx(redisKey, TTLbase, dbJson);
         console.log('▷ Set key', redisKey, 'with TTL', TTLbase, 's');
      }
      else {
         redisCli.set(redisKey, dbJson);
         console.log('▷ Set key', redisKey, 'with no TTL');
      }
      console.log('▷ Approximate size in Redis:', Math.round(dbJson.length / 1.81), 'bytes');
      LogMetadata(redisKey, query);
   }
}

//Exit procedure

process.on('SIGINT', async () => {
   console.log('⌫  Exiting...');
   await redisCli.bgSave();
   console.log('⌫  Saved snapshot to dump.rdb');
   console.log('---------------');
   sqlConn.end();
   redisCli.quit();
   process.exit();
})
