const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

let users = {}; // userId -> socket.id

// файл для хранения сообщений
const messagesFile = path.join(__dirname, "messages.json");
let messages = {};
if (fs.existsSync(messagesFile)) {
  try { messages = JSON.parse(fs.readFileSync(messagesFile, "utf-8")); } 
  catch (e) { console.error(e); }
}
function saveMessages() { fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2)); }

// ключ чата: одинаковый для двух пользователей
function chatKey(userA, userB) {
  return [userA, userB].sort().join('|');
}

io.on("connection", (socket) => {
  console.log("user connected");

  // регистрация пользователя
  socket.on("register", (userId) => {
    users[userId] = socket.id;
    console.log("registered:", userId);

    // отправляем список контактов с последним сообщением
    let chatList = {};
    for (let key in messages) {
      if (key.includes(userId)) {
        const other = key.replace(userId, '').replace('|','');
        chatList[other] = messages[key][messages[key].length -1];
      }
    }
    socket.emit("chatList", chatList);
  });

  // личные сообщения
  socket.on("privateMessage", (msg) => {
    if (!msg.timestamp) msg.timestamp = Date.now();
    const key = chatKey(msg.from, msg.to);
    if (!messages[key]) messages[key] = [];
    messages[key].push(msg);
    saveMessages();

    // отправляем получателю
    const targetSocket = users[msg.to];
    if (targetSocket) io.to(targetSocket).emit("newMessage", msg);

    // отправителю
    socket.emit("newMessage", msg);

    // обновляем chatList для обоих
    if (users[msg.to]) {
      let chatList = {};
      for (let k in messages) {
        if (k.includes(msg.to)) {
          const other = k.replace(msg.to,'').replace('|','');
          chatList[other] = messages[k][messages[k].length -1];
        }
      }
      io.to(users[msg.to]).emit("chatList", chatList);
    }

    let chatListFrom = {};
    for (let k in messages) {
      if (k.includes(msg.from)) {
        const other = k.replace(msg.from,'').replace('|','');
        chatListFrom[other] = messages[k][messages[k].length -1];
      }
    }
    socket.emit("chatList", chatListFrom);
  });

  socket.on("disconnect", () => {
    for (let id in users) if (users[id] === socket.id) delete users[id];
    console.log("user disconnected");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server started on port " + PORT));