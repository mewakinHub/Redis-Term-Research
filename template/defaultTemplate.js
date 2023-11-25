import express from 'express';
// init app
const app = express();

// create path and send something
app.get('/test-express', (request, response)=>{
    // response.send("Hello ExpressJS learner")
    response.json({
        name: 'Mew',
        position: "Software engineer",
        company: "Data Wow"
    });
});

//open port: 3000 (listen)
app.listen(3000, ()=>{  
    console.log('http://localhost:3000/test-express');
});

