### Redis' TTL Introduction

TTL in the context of Redis stands for "Time To Live." It refers to the amount of time a key-value pair will be stored in the Redis database before it expires and is automatically removed. Setting a TTL for keys in Redis is a way to control the lifespan of data in the cache.


### Set Key Expiration

SET myKey "Hello, Redis!"
EXPIRE myKey 60  # Set TTL to 60 seconds before expiration
or
SETEX myKey 60 "Hello, Redis!" # Set TTL to 60 seconds before expiration


### TTL Check State

TTL myKey # Check how many seconds myKey remains before it expires


### Setting TTL at the Time of Key Creation

SET myKey "Hello, Redis!" EX 60  # Set TTL to 60 seconds


### Persisting a key

PERSIST myKey #Remove TTL, no expiration


### TTL Redis Server Shut Down

In Redis, the Time-to-Live (TTL) for a key is the amount of time that the key will exist in the database before it is automatically deleted. When the TTL of a key expires, Redis will automatically remove the key and its associated value.

However, if the Redis server is shut down, all data in memory is typically lost, including information about TTLs. When the server is restarted, it will be as if the keys with TTLs expired during the downtime were never set at all. In other words, shutting down and restarting Redis effectively removes all keys, regardless of their TTLs.

If you need to persist data across server restarts, you might consider using Redis persistence mechanisms like RDB snapshots or AOF (Append-Only File). These mechanisms allow you to save the dataset to disk and reload it when the server restarts. Keep in mind that using these features can impact the performance of the Redis server.

### Optimization

Caching images with Redis can significantly improve the performance of your application, and using TTL (Time To Live) effectively is crucial for optimizing this process. Here are steps to optimize image caching with Redis using TTL:

1. Segment Images Based on Usage:
Understand the different types of images in your application and how frequently they are accessed. For example, profile pictures might be accessed more frequently than banner images. Segmenting images based on usage allows you to set appropriate TTL values.

2. Set TTL Based on Image Dynamics:
Adjust TTL values based on how often images change. Images that change infrequently can have a longer TTL, reducing the frequency of cache updates.

3. Use a Dynamic TTL Strategy:
Implement a dynamic TTL strategy that adjusts the expiration time based on factors such as the time of day, user activity, or system load. This can help ensure that frequently accessed images remain in the cache while less frequently accessed ones are eventually removed.

4. Consider Image Size:
Large images might consume more memory in the cache. Consider adjusting TTL based on the size of the image. Smaller images might have longer TTLs, while larger images might have shorter TTLs.

5. Implement LRU (Least Recently Used) Policies:
Redis doesn't directly support LRU for individual keys, but you can simulate LRU behavior by using a combination of ZSET and EXPIRE commands. Store image keys in a sorted set with access timestamps and periodically remove the least recently accessed images.

Example:
### ZADD sets a timestamp for the image key
***ZADD image_access_times [timestamp] "image_key"***

### EXPIRE sets the TTL for the image key
***EXPIRE "image_key" [TTL]***

6. Prevent Cache Stampede:
When the TTL of a popular image expires, it can cause a cache stampede where multiple requests attempt to regenerate the cache simultaneously. Implement strategies like lazy loading or asynchronous updates to prevent this.

7. Use Background Jobs for Cache Regeneration:
If cache regeneration is a time-consuming process, consider using background jobs to regenerate the cache. Set a longer TTL for images and asynchronously update the cache in the background when the TTL expires.

8. Monitor and Analyze:
Monitor Redis performance and analyze cache hit rates, miss rates, and memory usage. Adjust TTL values based on performance metrics and user behavior.



### Node.js Example:

const redis = require('redis');
const client = redis.createClient();

***Simple LRU Implementation using a Sorted Set***
function updateLRU(imageKey) {
  const timestamp = Date.now();
  ***Add imageKey to the sorted set with the current timestamp***
  client.zadd('image_lru', timestamp, imageKey);
}

***Function to get the access count for an image***
function getAccessCount(imageKey, callback) {
  client.get(`${imageKey}:access_count`, (err, count) => {
    callback(err, count ? parseInt(count, 10) : 0);
  });
}

***Function to increment the access count for an image***
function incrementAccessCount(imageKey) {
  client.incr(`${imageKey}:access_count`);
}

function getCachedImage(imageKey, callback) {
  ***Check if the image is in the cache***
  client.get(imageKey, (err, imageData) => {
    if (err) {
      callback(err, null);
    } else if (imageData) {
      ***Image found in cache, update LRU and increment access count***
      updateLRU(imageKey);
      incrementAccessCount(imageKey);
      callback(null, { imageData, cacheStatus: 'hit' });
    } else {
      ***Image not in cache, check if cache regeneration is already in progress***
      const lockKey = `${imageKey}:lock`;
      client.get(lockKey, (lockErr, lockValue) => {
        if (!lockErr && !lockValue) {
          ***Set a lock to indicate cache regeneration is in progress***
          client.setex(lockKey, 30, '1'); // Set a short expiration time for the lock
          ***Fetch and set image in cache with a dynamic TTL based on access count***
          fetchImage(imageKey, (fetchErr, newImageData) => {
            if (fetchErr) {
              callback(fetchErr, null);
            } else {
              getAccessCount(imageKey, (countErr, accessCount) => {
                if (!countErr) {
                  const dynamicTTL = Math.max(3600, accessCount * 60); // Minimum TTL of 1 hour
                  client.setex(imageKey, dynamicTTL, newImageData);
                  ***Update LRU with the new imageKey***
                  updateLRU(imageKey);
                  incrementAccessCount(imageKey);
                  ***Release the lock***
                  client.del(lockKey);
                  callback(null, { imageData: newImageData, cacheStatus: 'miss' });
                } else {
                  ***Use default TTL if access count retrieval fails***
                  client.setex(imageKey, 3600, newImageData);
                  updateLRU(imageKey);
                  incrementAccessCount(imageKey);
                  ***Release the lock***
                  client.del(lockKey);
                  callback(null, { imageData: newImageData, cacheStatus: 'miss' });
                }
              });
            }
          });
        } else {
          ***Another request is already regenerating the cache, wait and retry***
          setTimeout(() => {
            getCachedImage(imageKey, callback);
          }, 1000); // Retry after 1 second
        }
      });
    }
  });
}

***Function to evict the least recently used key if cache reaches a certain size***
function evictLRUIfNeeded() {
  const maxSize = 100; // Set your desired max cache size
  client.zcard('image_lru', (err, size) => {
    if (!err && size > maxSize) {
      // Get and remove the least recently used key from the sorted set
      client.zpopmin('image_lru', 1, (popErr, keys) => {
        if (!popErr && keys.length > 0) {
          const evictedKey = keys[0];
          // Remove the evicted key from the cache
          client.del(evictedKey);
          // Also reset access count for the evicted key
          client.del(`${evictedKey}:access_count`);
        }
      });
    }
  });
}

### This code integrates caching, LRU management, dynamic TTL based on access count, and a mechanism to prevent cache stampedes using a lock. It provides a comprehensive approach to managing images in a cache with Redis. Adjust parameters and time values based on your specific use case and requirements.


***Example usage***
const imageKey = 'profile_picture:user123';
getCachedImage(imageKey, (err, result) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Image Data:', result.imageData);
    console.log('Cache Status:', result.cacheStatus);
    // Check if LRU eviction is needed periodically (e.g., in a background task)
    evictLRUIfNeeded();
  }
});

### ----- Algorithm Summary -----

1. LRU Implementation: updateLRU function

  function updateLRU(imageKey) {
  const timestamp = Date.now();
  client.zadd('image_lru', timestamp, imageKey);
}

### This function updates the LRU (Least Recently Used) information by adding the imageKey to a sorted set named ***image_lru*** with the current timestamp. The sorted set is used to keep track of the order in which images were accessed.

2. Access Count Functions: ***getAccessCount*** and ***incrementAccessCount*** functions

  function getAccessCount(imageKey, callback) {
  client.get(`${imageKey}:access_count`, (err, count) => {
    callback(err, count ? parseInt(count, 10) : 0);
  });
}

function incrementAccessCount(imageKey) {
  client.incr(`${imageKey}:access_count`);
}

### ***getAccessCount*** retrieves the access count for a specific image key.
### ***incrementAccessCount*** increments the access count for a specific image key.

3. Caching Function: ***getCachedImage*** function

function getCachedImage(imageKey, callback) {
  client.get(imageKey, (err, imageData) => {
    if (err) {
      callback(err, null);
    } else if (imageData) {
      updateLRU(imageKey);
      incrementAccessCount(imageKey);
      callback(null, { imageData, cacheStatus: 'hit' });
    } else {
      const lockKey = `${imageKey}:lock`;
      client.get(lockKey, (lockErr, lockValue) => {
        if (!lockErr && !lockValue) {
          client.setex(lockKey, 30, '1');
          fetchImage(imageKey, (fetchErr, newImageData) => {
            if (fetchErr) {
              callback(fetchErr, null);
            } else {
              getAccessCount(imageKey, (countErr, accessCount) => {
                if (!countErr) {
                  const dynamicTTL = Math.max(3600, accessCount * 60);
                  client.setex(imageKey, dynamicTTL, newImageData);
                  updateLRU(imageKey);
                  incrementAccessCount(imageKey);
                  client.del(lockKey);
                  callback(null, { imageData: newImageData, cacheStatus: 'miss' });
                } else {
                  client.setex(imageKey, 3600, newImageData);
                  updateLRU(imageKey);
                  incrementAccessCount(imageKey);
                  client.del(lockKey);
                  callback(null, { imageData: newImageData, cacheStatus: 'miss' });
                }
              });
            }
          });
        } else {
          setTimeout(() => {
            getCachedImage(imageKey, callback);
          }, 1000);
        }
      });
    }
  });
}

### This function checks if the image is in the cache. If it is, it updates the LRU and increments the access count, returning the cached data.
### If the image is not in the cache, it checks for a lock to prevent cache stampede. If no lock is present, it sets a lock, fetches the image, sets it in the cache with a dynamic TTL based on access count, updates the LRU, increments the access count, and releases the lock.
### If a lock is present, it waits for a short period and retries the cache retrieval.

4. LRU Eviction Function: ***evictLRUIfNeeded*** function

function evictLRUIfNeeded() {
  const maxSize = 100;
  client.zcard('image_lru', (err, size) => {
    if (!err && size > maxSize) {
      client.zpopmin('image_lru', 1, (popErr, keys) => {
        if (!popErr && keys.length > 0) {
          const evictedKey = keys[0];
          client.del(evictedKey);
          client.del(`${evictedKey}:access_count`);
        }
      });
    }
  });
}

### This function checks if the size of the LRU sorted set exceeds a specified maximum size (maxSize). If it does, it evicts the least recently used key from the cache and resets the access count for the evicted key.

5. Example Usage

const imageKey = 'profile_picture:user123';
getCachedImage(imageKey, (err, result) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Image Data:', result.imageData);
    console.log('Cache Status:', result.cacheStatus);
    evictLRUIfNeeded();
  }
});



# Task!
- competitor & reference(normal usage) research
- make it our own(design algorithm) => Pansaar's Algorithm ;3
- write the detailed in README for doc. & comment the important commands.