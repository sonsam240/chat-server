const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

const FILE = "messages.json";

// загрузка сообщений из файла
let messages = [];

if (fs.existsSync(FILE)) {
  messages = JSON.parse(fs.readFileSync(FILE));
}

// сохранение в файл
function saveMessages() {
  fs.writeFileSync(FILE, JSON.stringify(messages, null, 2));
}

io.on("connection", (socket) => {
  console.log("user connected");

  socket.emit("chatHistory", messages);

  socket.on("sendMessage", (msg) => {
    const messageData = {
      text: msg.text,
      user: msg.user,
      time: new Date()
    };

    messages.push(messageData);
    saveMessages();

    io.emit("newMessage", messageData);
  });

  socket.on("disconnect", () => {
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