const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {cors:{origin:"*"}});

let users = {}; // userId -> socket.id

io.on("connection", socket=>{
  console.log("user connected");

  socket.on("register", userId=>{
    users[userId]=socket.id;
    console.log("registered:", userId);
  });

  socket.on("privateMessage", msg=>{
    // отправить получателю
    const target = users[msg.to];
    if(target) io.to(target).emit("newMessage", msg);

    // отправителю тоже можно отправить обратно, но на фронте мы это не дублируем
    socket.emit("newMessage", msg);
  });

  socket.on("disconnect", ()=>{
    for(let id in users) if(users[id]===socket.id) delete users[id];
    console.log("user disconnected");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>console.log("Server started on port "+PORT));