### terminal command
1. ``cd ..`` to access back to the WebApp_Learn Project directory
2. ``mkdir intro-express`` to create the folder
3. ``cd todo-nodb`` to access to that directory
4. ``code .`` to open this folder on VScode
5. set up NPM again ``npm init``
6. `npm install express` install express framework
- install body parser `npm install body-parser` for break down GET/POST data to components
7. `` npm install --save-dev @babel/core @babel/cli @babel/preset-env @babel/node `` install babel to transplier older version
- Create file `.babelrc`
- Add setting to support ES6 version (just add this to `.babelrc` file) 
```
{
    "presets": ["@babel/preset-env"]
}
```
8. This program will run on `dist/main.js` when tpye `npm run build` % `npm run start` because we changed script section in `package.json` to be
```
 "scripts": {
    "start": "node dist/main.js",
    "build": "babel src --out-dir dist"
  }
``` 
**extra** type `ctrl c` in terminal to stop interval function that keep sending data every timeout(`Cancel Process`)

### resource
*PostMan: * [download link](https://www.postman.com/downloads/)
*Node.js: * [download link](https://nodejs.org/en/download)

## Express stuff
- after open port

