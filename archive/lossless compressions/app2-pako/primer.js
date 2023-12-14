import redis from 'redis';
import pako from 'pako';

const redisCli = redis.createClient();
redisCli.on('error', err => console.log('Redis Client Error', err));
await redisCli.connect();

const key = process.argv[2];
const dbData = process.argv[3];

console.log('child started');
try {
   const dbJson = JSON.stringify(dbData);
   const dbCompressed = pako.deflate(dbJson);
   const dbBuffer = Buffer.from(dbCompressed);
   redisCli.setEx(key, TTL, dbBuffer);
}
catch (error) {
   console.error('Compression error:', error);
}
console.log('• Set key', key, 'with TTL', String(TTL), 's');