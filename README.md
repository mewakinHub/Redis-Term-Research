# Redis Term-Research 

## Abstract
in-memory DB: physical: RAM/logical: Cache
*tool*
- Backend: NodeJS + Express
- HTTP request: POSTMAN
- DB: MySQL
- cache: Redis(WSL)
- data: image

*compressed strategy:*
- zlib(file compression[zip]): overall zip
- compressed image: ngx-image-compress [https://www.npmjs.com/package/ngx-image-compress]
- avoid compression strategies:
    overhead: if too short, it's waste of time (increasing CPU utilization)

*Back-up strategies*
- Back up in file.rdb before Exit Terminal
- recover from file.rdb everytime system start

*Sample*
> optimized btw Time & Size (render time as optional)
- Image Size: Large (to show how compression help)
- Album ID(Large Quantity): Section got Prime into Redis to show Time reduce


## Member:
1. Teetawat Bussabarati(Mew)[@mewakin] deep research, 
2. Piraboon ...(Tutor)[@Twtr] system design
3. Pansaar [gen sample]
 
## Redis Installation(*Step for Windows*)
 1. Install WSL. Type in command prompt (Admin): `wsl --install`
 2. Install with UNIX username "user" and password "user".
 3. Update Package Information. Open a WSL terminal inside VS Code and type in: `sudo apt-get update`
 4. Install Redis. Type in WSL terminal: `sudo apt-get install redis`

## Basic Redis Commands
1. `ps aux | grep redis` keep run 6379 default port somewhere
2. redis-server --port 6360
3. redis-cli has defaut port as 6379

- set {key} {value}
- nil = null
- flushall: delete all key
- get name : get only work for string
- del {key}

### Handling Expiration
- ttl: time to live (-1 : no expire time)(ttl name)
- expire name 10: expire after 10 seconds
- setex {key} 10 {value} : set + expire

### Lists
- lpush {key} {value} : left for first(left) (right for last) (pop is L or R)
- lrange friends 0 -1 : 0 to -1 = all index

### Sets (all mem must be unique) (no order)
- SADD {key} {value}
- SMEMBER {key}

### Hashes (proporties: metadata)
- key value pair inside individual key

## NodeJS vs Python 
- Python is easier!

### render speed(additional/ optional)
https://stackoverflow.com/questions/2516665/how-can-i-monitor-the-rendering-time-in-a-browser

## Back-up strategies 
```javascript
import redis from 'redis';
import { promises as fs } from 'fs';

const client = redis.createClient();

// Function to trigger a Redis backup (asynchronous)
const triggerAsyncRedisBackup = () => {
  return new Promise((resolve, reject) => {
    client.bgsave(err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// Function to recover Redis from a backup file
const recoverRedisFromBackup = async (filePath) => {
  const backupData = await fs.readFile(filePath, 'utf-8');
  await client.send_command('RESTORE', [filePath, '0', backupData]);
};

// Function to perform cleanup and backup on system exit
const onExit = async () => {
  console.log('Exiting system. Triggering Redis backup...');

  try {
    await triggerAsyncRedisBackup();
    console.log('Redis backup completed successfully.');
  } catch (error) {
    console.error('Error triggering Redis backup:', error);
  }

  // Close the Redis connection
  client.quit(() => {
    console.log('Redis connection closed. Exiting...');
    process.exit(0);
  });
};

// Register an exit handler to trigger cleanup and backup before exiting
process.on('exit', onExit);
process.on('SIGINT', onExit);

// Example usage: Recovering from a backup file on system start
const startup = async () => {
  console.log('Starting system. Recovering Redis from backup...');
  // Make sure to replace 'your_backup_file.rdb' with the actual backup file path
  const backupFilePath = 'your_backup_file.rdb';

  try {
    await recoverRedisFromBackup(backupFilePath);
    console.log('Redis recovered from backup successfully.');
  } catch (error) {
    console.error('Error recovering from backup:', error);
  }

  // Continue with the rest of your application's startup logic here
};

// Call the startup function when the script starts
startup();
```
In this example:

- The `onExit` function is registered to handle both the `exit` event and the `SIGINT` signal (Ctrl+C).
- The `startup` function is called when the script starts, triggering the recovery process.
- Adjust the file path in the `backupFilePath` variable to point to your actual backup file.

With these modifications, the backup will be automatically triggered when the system exits, and the recovery will occur when the system starts. This ensures that your Redis data is backed up and recovered seamlessly as part of your application's lifecycle.