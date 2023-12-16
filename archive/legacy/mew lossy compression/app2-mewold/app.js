import mysql from 'mysql2';
import express from 'express';
import redis from 'redis';
import sharp from 'sharp';
import sizeOf from 'image-size';

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

const port = 3002;
const TTL = 3600;

app.use(express.static('public'));

app.get('/loadtime/:loadtime', async (req, res) => {
   const loadtime = req.params.loadtime;
   console.log('Load time:', loadtime, 'ms');
});

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


app.get('/all', async (req, res) => {
   const rdata = await redisCli.get('img');
   if (rdata != null) {
      console.log('Cache Hit: all');
      // Parse the JSON string from the cache
      // const cachedData = JSON.parse(rdata);

   // Convert each item's image data back to Uint8Array
      // const convertedData = cachedData.map(item => {
      //    const imageData = item.image;

      //    // Assuming imageData is a normal string
      //    const uint8Array = new TextEncoder().encode(imageData);

         res.send(rdata);
         // res.send{ image: uint8Array};
         // return { image: uint8Array };
      // }
      // );

      //res.send(JSON.stringify(convertedData));
      redisCli.expire('img', TTL);
   }
   
   else {
      console.log('Cache Miss: all');
      const imageResultRedis = [];
      const [dbdata] = await conn.query('SELECT image FROM images;');
      const dbJson = JSON.stringify(dbdata);
      res.send(dbJson);

      for (const item of dbdata) {
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
            redisCli.setEx('img', TTL, JSON.stringify(imageResultRedis));
            // console.log(imageResultRedis, "Stringified")
         } else {
            console.log('Buffer is empty for an image');
         }


         
      }
   }
});

app.get('/album/:album', async (req, res) => {
   const album = req.params.album;
   const rdata = await redisCli.get(`img?album=${album}`);
   if (rdata != null) {
      console.log('Cache Hit: album', album);
      res.send(rdata);
      redisCli.expire(`img?album=${album}`, TTL);
   } else {
      console.log('Cache Miss: album', album);
      const [dbdata] = await conn.query('SELECT image FROM images WHERE album=?', [album]);
      const dbJson = JSON.stringify(dbdata);
      res.send(dbJson);
      redisCli.setEx(`img?album=${album}`, TTL, dbJson);
   }
});

app.get('/all', async (req, res) => {
   const rdata = await redisCli.get('img');
   
   if (rdata != null) {
      console.log('Cache Hit: all');
      res.send(rdata);
      redisCli.expire('img', TTL);
   }
   else {
      console.log('Cache Miss: all');
      const [dbdata] = await conn.query('SELECT image FROM images;');
      const dbJson = JSON.stringify(dbdata);
      res.send(dbJson)
      redisCli.setEx('img', TTL, dbJson);
   }
});

app.get('/id/:id', async (req, res) => {
   const id = req.params.id;
   const rdata = await redisCli.get(`imgId?id=${id}`);
   if (rdata != null) {
      console.log('Cache Hit: id', id);
      res.send(rdata);
      redisCli.expire(`img?id=${id}`, TTL);
   } else {
      console.log('Cache Miss: id', id);
      const [dbdata] = await conn.query('SELECT image FROM images WHERE id=?', [id]);
      const dbJson = JSON.stringify(dbdata);
      res.send(dbJson);
      redisCli.setEx(`img?id=${id}`, TTL, dbJson);
   }
});

app.listen(port, () => {
   console.log('Server is running on port', port);
});
