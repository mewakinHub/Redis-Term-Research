## Notice:
- These steps are for Windows only. Might not apply to other operating systems.
- {} are adjustable variables.

## Redis Installation
1. Type in command prompt (Admin): `wsl --install` to install WSL
2. Install with UNIX username "user" and password "user"
3. Open a WSL terminal inside VS Code and type in: `sudo apt-get update` to update package information
4. Install Redis. Type in WSL terminal: `sudo apt-get install redis`
5. Stop Redis-server in case it has already automatically started: `sudo systemctl stop redis`
6. Disable Redis-server automatic startup: `sudo systemctl disable redis`

## MAMP Installation and sample database insertion
1. Open a browser and go to https://www.mamp.info/en/downloads/ and download MAMP
2. Install using the exe
3. Launch MAMP to start MySQL server
4. Type in url "http://localhost/phpMyAdmin/?lang=en" to access phpMyAdmin interface
5. Go to import tab
6. Import these in order: database.sql -> maxbuffer.sql -> images1.sql -> images2.sql. The files are in SQL folder in this project directory.

## Starting the app
1. Launch MAMP to start MySQL server.
2. Start an WSL terminal inside this project directory and type `redis-server` to start redis server.
3. Start a generic terminal (Powershell/Command Prompt/Git bash) and get into app version of choice, for example: `cd app1`
4. Make sure that app version has node_modules installed in the directory. If not, type `npm install`
4. From the generic terminal, type `node app` to start the app in localhost with port number specified in the terminal.
5. Open a browser and type in url "localhost:{portnumber}"

## Using the app
- You can manually send commands to Redis by starting a new WSL terminal and type in `redis-cli`, then you can start sending commands. For example: to check all key-values, type in `keys *`
- Change the data fetch type in file "public/index.js". There are 3 types: `fetch('/all')`, `fetch('/album/{album}')`, `fetch('/id/{id}')`
- Do not shutdown computer while an app process terminal is running, as the key-values will not be saved. To exit properly, press Ctrl+C inside the running terminal. This will trigger the backend protocol, and will restore the snapshot when redis-server is started again.
- To flush all the key-values, type `flushall` in redis-cli, or connect to "localhost:{portnumber}/flush". This is helpful when the source SQL database is updated so that the cache will not be outdated data.