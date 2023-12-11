# Redis Installation (Step for Windows)
1. Install WSL. Type in command prompt (Admin): `wsl --install`
2. Install with UNIX username "user" and password "user".
3. Open a WSL terminal inside VS Code and type in: `sudo apt-get update` to update package information.
4. Install Redis. Type in WSL terminal: `sudo apt-get install redis`
5. Disable Redis-server automatic startup: `sudo systemctl disable redis`
6. Stop Redis-server in case it has already automatically started: `sudo systemctl stop redis`

# To start app:
1. Launch MAMP to start MySQL server.
2. Start an WSL terminal and type `redis-server` to start redis server. Do not close this terminal.
3. Start another WSL terminal and type `redis-cli` to manually send commands to Redis.
3. Start a generic terminal (Powershell/Command Prompt/Git bash) and get into app version of choice, for example: `cd app1`
4. Make sure that app version has node_modules installed in the directory. If not, type `npm install`
4. From the generic terminal, type `node app` to start the app in localhost with port number specified in the terminal.
5. Open a browser and type in url "localhost:(portnumber)"

# To stop the redis-server when accidentally closed the redis-server WSL
1. View what process is occupying the port. Type in WSL: `sudo lsof -i :6379`
2. Kill the process with `sudo lsof -i :(PID)`