# Redis Term-Research 

## Abstract
in-memory DB: physical: RAM/logical: Cache
*tool*

- Backend: NodeJS + Express
- HTTP request: POSTMAN
- DB: MySQL
- cache: Redis(WSL)
- data: image

## Member:
1. Teetawat Bussabarati(Mew)[@mewakin]
2. Piraboon ...(Tutor)[@Twtr]
3. Pansaar
 
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

## Handling Expiration
- ttl: time to live (-1 : no expire time)(ttl name)
- expire name 10: expire after 10 seconds
- setex {key} 10 {value} : set + expire

## Lists
- lpush {key} {value} : left for first(left) (right for last) (pop is L or R)
- lrange friends 0 -1 : 0 to -1 = all index

## Sets (all mem must be unique) (no order)
- SADD {key} {value}
- SMEMBER {key}

## Hashes (proporties: metadata)
- key value pair inside individual key

## NodeJS vs Python 
- Python is easier!
