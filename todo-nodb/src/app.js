import express, { response } from 'express';
import bodyParser from 'body-parser';
// init app
const app = express();
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
app.use(bodyParser.json());
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);
const todoList = [];
// browser doesn't support post method(only support GET, so have to use POSTMAN)

//both method are inside todolist-nodb collection
//POST: create new todo
app.post('/todos', (request,response)=>{
    todoList.push(request.body);
    // console.log('body data: ', request.body); //in Terminal
    response.send(request.body); //in POSTMAN
});

//GET: get todo list
app.get('/todos', (request,response)=>{
    response.send(todoList); //in POSTMAN
});

//DELETE: delete todo
app.delete('/todos/:id', (request,response)=>{
    // index of todoList array
    const todoIndex = todoList.findIndex(
        (todo)=> todo.id === request.params.id
    );
    if(todoIndex === -1){
        response.status(404).send("Todo not found");
        return;
    }
    // start = todoIndex, deletecount = 1(only itself index)
    todoList.splice(todoIndex,1);
    // status 200 ok(found index and delete that id)
    response.send(request.params.id);
});

// PATCH: edit todo
app.patch('/todos/:id',(request,response)=>{
    // index of todoList array
    const todoIndex = todoList.findIndex(
        (todo)=> todo.id === request.params.id
    );
    if(todoIndex === -1){
        response.status(404).send("Todo not found");
        return;
    }
    // merge (using destructuring ...)
    todoList[todoIndex] = {...todoList[todoIndex],...request.body};
    // status 200 ok
    response.send(todoList[todoIndex]);
});

// PUT: overwrite todo
app.put('/todos/:id',(request,response)=>{
    // index of todoList array
    const todoIndex = todoList.findIndex(
        (todo)=> todo.id === request.params.id
    );
    if(todoIndex === -1){
        response.status(404).send("Todo not found");
        return;
    }
    // overwrite whole new
    todoList[todoIndex] = request.body;
    // status 200 ok
    response.send(todoList[todoIndex]);
});

//open port: 3000 (listen)
app.listen(3000, ()=>{  
    console.log('http://localhost:3000/');
});

