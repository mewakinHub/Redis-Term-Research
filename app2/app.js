import mysql from 'mysql2';
import express from 'express';
import redis from 'redis';
//mew
import sharp from 'sharp';
//mew

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

//Adjustable variables
const port = 3002;
const TTL = 3600;

app.use(express.static('public'));

app.get('/loadtime/:loadtime', async (req, res) => {
   const loadtime = req.params.loadtime;
   console.log('Load time:', loadtime, 'ms');
});

// mew
// Utility Functions
function calculateCompressionRatio(buffer) {
   console.log('Buffer length:', buffer.length);
   
   sharp(buffer)
      .metadata()
      .then(metadata => {
         const { width, height, size, format, channels, exif, icc, density, hasProfile, space } = metadata;
         console.log(`Image Metadata:`, { width, height, size, format, channels, exif, icc, density, hasProfile, space });
      })
      .catch(err => {
         console.error('Error extracting metadata:', err);
      });

   // compression ratio equation
   const avgDimension = (width + height) / 2;
   const compressionRatio = avgDimension / size;

   // Adjust compression ratio based on your criteria
   const adjustedCompressionRatio = compressionRatio; // You can adjust this based on your criteria

   return adjustedCompressionRatio;
}

 
async function compressImage(buffer, compressionRatio) {
   try {
      const compressedImage = await sharp(buffer)
         .jpeg({ quality: 50 })
         .toBuffer();

      return compressedImage;
   } catch (error) {
      console.error('Error compressing image:', error);
      throw error; // Rethrow the error to handle it outside
   }
}
// mew

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
      res.send(dbdata)
      // mewwwwwwwwwww
      const imageResultRedis = [];

      // Ensure dbdata is not an empty array
      if (Array.isArray(dbdata) && dbdata.length > 0) {
         for (const item of dbdata) {
            if (item && item.image) {
               const uint8Array = new Uint8Array(item.image.data);
               const buffer = Buffer.from(uint8Array);
               console.log('Buffer length:', buffer.length);

               // Check if the buffer is not empty before processing
               if (buffer.length > 0) {
                  // Apply compression decision algorithm
                  const compressionRatio = calculateCompressionRatio(buffer);

                  // Use compression algorithm (Sharp in this case)
                  const compressedImage = await compressImage(buffer, compressionRatio);

                  // Store compressed image in Redis
                  imageResultRedis.push(compressedImage);
               } else {
                  console.log('Buffer is empty for an image');
               }
            } else {
               console.log('Item or image is undefined or null');
            }
         }
      } else {
         console.log('No images found in the database');
      }
      // mewwwwwwwwwwww
      // Store compressed images in Redis
      redisCli.setEx('img', TTL, JSON.stringify(imageResultRedis));
   }
});

app.get('/album/:album', async (req, res) => {
   const album = req.params.album;
   const rdata = await redisCli.get(`img?album=${album}`);
   if (rdata != null) {
      console.log('Cache Hit: album', album);
      res.send(rdata);
      redisCli.expire(`img?album=${album}`, TTL);
   }
   else {
      console.log('Cache Miss: album', album);
      const [dbdata] = await conn.query('SELECT image FROM images WHERE album=?', [album]);
      const dbJson = JSON.stringify(dbdata);
      res.send(dbJson);
      redisCli.setEx(`img?album=${album}`, TTL, dbJson)
   }
});

app.get('/id/:id', async (req, res) => {
   const id = req.params.id;
   const rdata = await redisCli.get(`imgId?id=${id}`);
   if (rdata != null) {
      console.log('Cache Hit: album', album);
      res.send(rdata);
      redisCli.expire(`img?id=${id}`, TTL);
   }
   else {
      console.log('Cache Miss');
      const [dbdata] = await conn.query('SELECT image FROM images WHERE id=?', [id]);
      const dbJson = JSON.stringify(dbdata);
      res.send(dbJson);
      redisCli.setEx(`img?id=${id}`, TTL, dbJson);
   }
})

app.listen(port, () => {
   console.log('Server is running on port', port);
});
