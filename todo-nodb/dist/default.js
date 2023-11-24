"use strict";

var _express = _interopRequireDefault(require("express"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
// init app
var app = (0, _express["default"])();

// create path and send something
app.get('/test-express', function (request, response) {
  // response.send("Hello ExpressJS learner")
  response.json({
    name: 'Mew',
    position: "Software engineer",
    company: "Data Wow"
  });
});

//open port: 3000 (listen)
app.listen(3000, function () {
  console.log('http://localhost:3000/test-express');
});