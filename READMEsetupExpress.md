### terminal command
1. ``cd ..`` to access back to the WebApp_Learn Project directory
2. ``mkdir express-app`` to create the folder
3. ``cd express-app`` to access to that directory
4. ``code .`` to open this folder on VScode
5. set up NPM again ``npm init``
6. `npm install express` install express framework
- install body parser `npm install body-parser` for break down GET/POST data to components
<!-- 7. `` npm install --save-dev @babel/core @babel/cli @babel/preset-env @babel/node `` install babel to transplier older version
- Create file `.babelrc`
- Add setting to support ES6 version (just add this to `.babelrc` file) 
```
{
    "presets": ["@babel/preset-env"]
}
``` -->
7. Add in `package.json` with [above "main":]
```
 "type": "module",
``` 
to enables ECMAScript Modules (ES Modules or ES6 Modules) in your Node.js code.
(to import with import, not require)

8. run with `node app` (`node` {file name})

**extra** type `ctrl c` in terminal to stop interval function that keep sending data every timeout(`Cancel Process`)

### resource
*PostMan: * [download link](https://www.postman.com/downloads/)
*Node.js: * [download link](https://nodejs.org/en/download)

