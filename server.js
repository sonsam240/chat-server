const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

// userId -> socket.id
let users = {};

io.on("connection", (socket) => {
  console.log("user connected");

  // регистрация пользователя
  socket.on("register", (userId) => {
    users[userId] = socket.id;
    console.log("registered:", userId);
  });

  // личные сообщения
  socket.on("privateMessage", (msg) => {
    const targetSocket = users[msg.to];

    if (targetSocket) {
      io.to(targetSocket).emit("newMessage", msg);
    }

    // отправителю тоже показываем
    socket.emit("newMessage", msg);
  });

  socket.on("disconnect", () => {
    // удаляем пользователя
    for (let id in users) {
      if (users[id] === socket.id) {
        delete users[id];
        break;
      }
    }

    console.log("user disconnected");
  });
});

app.get("/", (req, res) => {
  res.send("Chat server is running");
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server started on port " + PORT);
});