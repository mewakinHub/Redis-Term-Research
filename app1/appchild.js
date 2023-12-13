const redis = require('redis');

//Initialize Redis
const redisCli = redis.createClient();
redisCli.on('error', err => console.log('Redis Client Error', err));
redisCli.connect();

//Setex
process.on('message', async (data) => {
   const { key, baseTTL, value } = data;
   try {
      await redisCli.setEx(key, baseTTL, value);
      process.send('done');
      redisCli.quit();
      process.exit(0);
   }
   catch {
      process.send('error');
      redisCli.quit();
      process.exit(0);
   }
});