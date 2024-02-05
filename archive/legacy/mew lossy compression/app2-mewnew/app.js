const express = require('express');
const mysql2 = require('mysql2');
const mysql = require('mysql');
const redis = require('redis');
const MySQLEvents = require('@rodrigogs/mysql-events');
const sharp = require('sharp');
const sizeOf = require('image-size');

//Adjustable variables
const port = 1002;
const TTLbase = 3600;
const TTLmax = 21600;

//Initialize Express
const app = express();
app.use(express.static('public'));
app.listen(port, () => {
   console.log('---------------');
   console.log('• Server is running on port', port);
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

function RecordResponseTime() {
   endTime = new Date().getTime();
   responseTime = endTime - startTime;
   console.log('Response time:', responseTime, 'ms');
};

app.get('/loadtime/:loadtime', async (req, res) => {
   loadTime = req.params.loadtime;
   if (responseTime != 0) {
      console.log('Page render time:', String(loadTime-responseTime), 'ms');
      console.log('Total load time:', loadTime, 'ms');
      console.log('---------------');
   }
});

//Initialize Redis
const redisCli = redis.createClient();
redisCli.on('error', err => console.log('Redis Client Error', err));
redisCli.connect();

//Initialize MySQLEvent
const sqlEventConn = mysql.createConnection({
   host: 'localhost',
   user: 'root',
   password: 'root',
});
const instance = new MySQLEvents(sqlEventConn, {startAtEnd: true});
instance.start()
   .then(() => {
      console.log('• Listening to change in DB')
      console.log('---------------');
   })
   .catch(err => console.error('MySQLEvent failed to start.', err));

//Obsolete Redis cache prevention procedure
instance.addTrigger({
   name: 'DetectChange',
   expression: 'redisresearch.images.*',
   statement: MySQLEvents.STATEMENTS.ALL,
   onEvent: async (event) => {
      console.log('• Change in DB detected');
      redisCli.flushAll();
      console.log('• Flushed all Redis keys');
      console.log('---------------');
   },
});
instance.on(MySQLEvents.EVENTS.CONNECTION_ERROR, console.error);
instance.on(MySQLEvents.EVENTS.ZONGJI_ERROR, console.error);

//TTL function
async function AddTTL(key) {
   const currentTTL = await redisCli.ttl(key);
   let newTTL = currentTTL + TTLbase;
   if (newTTL > TTLmax) {
      newTTL = TTLmax;
   }
   redisCli.expire(key, newTTL);
   console.log('• Changed TTL of key', key, 'from', String(currentTTL), 's to', String(newTTL), 's');
}

//Compression function

function calculateCompressionRatio(width, height, bufferLength) {
   const avgDimension = (width + height) / 2;
   const compressionRatio = (avgDimension * 100) / bufferLength;
   const adjustedCompressionRatio = applyAdjustments(compressionRatio);
   return adjustedCompressionRatio;
}

function applyAdjustments(compressionRatio) {
   return Math.max(compressionRatio, 0.4);
}

async function compressImage(blob, compressionRatio) {
   try {
      // Your image compression logic using Sharp
      const compressedBuffer = await sharp(blob)
         .jpeg({ quality: Math.floor(compressionRatio * 100) })
         .toBuffer();

      // Convert the compressed image buffer to Uint8Array
      const compressedImage = new Uint8Array(compressedBuffer);

      return compressedImage;
   } catch (error) {
      console.error('Error compressing image:', error);
      throw error;
   }
}

//Fetch function
async function FetchQuery(res, rediskey, query, params) {
   startTime = new Date().getTime();
   const key = rediskey+params;
   const rData = await redisCli.get(key);
   console.log('Key:', key);
   if (rData != null) {
      console.log('Cache: Hit');
      // Parse the JSON string from the cache
      // const cachedData = JSON.parse(rData);

      // Convert each item's image data back to Uint8Array
      // const convertedData = cachedData.map(item => {
      //    const imageData = item.image;

      //    // Assuming imageData is a normal string
      //    const uint8Array = new TextEncoder().encode(imageData);

         res.send(rData);
         // res.send{ image: uint8Array};
         // return { image: uint8Array };
      // }
      // );

      //res.send(JSON.stringify(convertedData));
      RecordResponseTime();
      AddTTL(key);
   }
   else {
      console.log('Cache: Miss');
      const [dbData] = await sqlConn.query(query, [params]);
      res.send(dbData);
      RecordResponseTime();
      const imageResultRedis = [];
      for (const item of dbData) {
         const imageData = item.image;
         const blob = Buffer.from(imageData);

         if (blob.length > 0) {
            const { width, height } = sizeOf(blob);
            const compressionRatio = calculateCompressionRatio(width, height, blob.length);
            const compressedImage = await compressImage(blob, compressionRatio);
            imageResultRedis.push(compressedImage);
            // console.log('Width:', width);
            // console.log('Height:', height);
            // console.log('Uint8Array length:', blob.length);
            console.log(compressionRatio);
            // console.log('Image result for Redis:', imageResultRedis);
            redisCli.setEx(key, TTLbase, JSON.stringify(imageResultRedis));
            console.log('• Set key', key, 'with TTL', String(TTLbase), 's');
            // console.log(imageResultRedis, "Stringified")
         } else {
            console.log('Buffer is empty for an image');
         }
      }
   };
};

//API endpoints

app.get('/all', async (req, res) => {
   FetchQuery(res, 'Cimg', 'SELECT image FROM images;', '');
});

app.get('/album/:album', async (req, res) => {
   const album = req.params.album;
   FetchQuery(res, 'CimgAlbum', 'SELECT image FROM images WHERE album=?', album);
});

app.get('/id/:id', async (req, res) => {
   const id = req.params.id;
   FetchQuery(res, 'CimgId', 'SELECT image FROM images WHERE id=?', id);
});

//Exit procedure
process.on('SIGINT', async () => {
   console.log('Exiting...');
   await redisCli.bgSave();
   console.log('• Saved snapshot to dump.rdb');
   console.log('---------------');
   sqlConn.end();
   sqlEventConn.end();
   redisCli.quit();
   process.exit();
});
