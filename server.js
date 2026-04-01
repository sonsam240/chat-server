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

// временное хранилище
let messages = [];

io.on("connection", (socket) => {
  console.log("user connected");

  // отправляем историю
  socket.emit("chatHistory", messages);

  // принимаем сообщение
  socket.on("sendMessage", (msg) => {
    const messageData = {
      text: msg.text,
      user: msg.user,
      time: new Date()
    };

    messages.push(messageData);

    // рассылаем всем
    io.emit("newMessage", messageData);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

// проверка сервера
app.get("/", (req, res) => {
  res.send("Chat server is running");
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server started on port " + PORT);
});