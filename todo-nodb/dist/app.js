"use strict";

var _express = _interopRequireWildcard(require("express"));
var _bodyParser = _interopRequireDefault(require("body-parser"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != _typeof(e) && "function" != typeof e) return { "default": e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && Object.prototype.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n["default"] = e, t && t.set(e, n), n; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
// init app
var app = (0, _express["default"])();
/**
 * TODO
 * create todo
 * update todo by id
 * delete todo by id
 * get todo by id
 */

/**
 * id
 * status = complete, in-progress, canceled
 * name
 */
app.use(_bodyParser["default"].json());
app.use(_bodyParser["default"].urlencoded({
  extended: true
}));
var todoList = [];
// browser doesn't support post method(only support GET, so have to use POSTMAN)

//both method are inside todolist-nodb collection
//POST: create new todo
app.post('/todos', function (request, response) {
  todoList.push(request.body);
  // console.log('body data: ', request.body); //in Terminal
  response.send(request.body); //in POSTMAN
});

//GET: get todo list
app.get('/todos', function (request, response) {
  response.send(todoList); //in POSTMAN
});

//DELETE: delete todo
app["delete"]('/todos/:id', function (request, response) {
  // index of todoList array
  var todoIndex = todoList.findIndex(function (todo) {
    return todo.id === request.params.id;
  });
  if (todoIndex === -1) {
    response.status(404).send("Todo not found");
    return;
  }
  // start = todoIndex, deletecount = 1(only itself index)
  todoList.splice(todoIndex, 1);
  // status 200 ok(found index and delete that id)
  response.send(request.params.id);
});

// PATCH: edit todo
app.patch('/todos/:id', function (request, response) {
  // index of todoList array
  var todoIndex = todoList.findIndex(function (todo) {
    return todo.id === request.params.id;
  });
  if (todoIndex === -1) {
    response.status(404).send("Todo not found");
    return;
  }
  // merge (using destructuring ...)
  todoList[todoIndex] = _objectSpread(_objectSpread({}, todoList[todoIndex]), request.body);
  // status 200 ok
  response.send(todoList[todoIndex]);
});

// PUT: overwrite todo
app.put('/todos/:id', function (request, response) {
  // index of todoList array
  var todoIndex = todoList.findIndex(function (todo) {
    return todo.id === request.params.id;
  });
  if (todoIndex === -1) {
    response.status(404).send("Todo not found");
    return;
  }
  // overwrite whole new
  todoList[todoIndex] = request.body;
  // status 200 ok
  response.send(todoList[todoIndex]);
});

//open port: 3000 (listen)
app.listen(3000, function () {
  console.log('http://localhost:3000/');
});