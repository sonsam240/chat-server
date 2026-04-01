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

// userId -> socket.id
let users = {};

// загружаем историю сообщений из файла
const messagesFile = path.join(__dirname, "messages.json");
let messages = {};
if (fs.existsSync(messagesFile)) {
  try {
    messages = JSON.parse(fs.readFileSync(messagesFile, "utf-8"));
  } catch (e) {
    console.error("Failed to parse messages.json", e);
  }
}

// функция для сохранения истории
function saveMessages() {
  fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2));
}

io.on("connection", (socket) => {
  console.log("user connected");

  // регистрация пользователя
  socket.on("register", (userId) => {
    users[userId] = socket.id;
    console.log("registered:", userId);

    // отправляем всю историю сообщений
    if (messages[userId]) {
      messages[userId].forEach(msg => socket.emit("newMessage", msg));
    }
  });

  // личные сообщения
  socket.on("privateMessage", (msg) => {
    // добавляем timestamp
    if (!msg.timestamp) msg.timestamp = Date.now();

    // сохраняем сообщение для получателя
    if (!messages[msg.to]) messages[msg.to] = [];
    messages[msg.to].push(msg);

    // сохраняем сообщение для отправителя
    if (!messages[msg.from]) messages[msg.from] = [];
    messages[msg.from].push(msg);

    saveMessages(); // сохраняем в файл

    const targetSocket = users[msg.to];
    if (targetSocket) {
      io.to(targetSocket).emit("newMessage", msg);
    }

    // отправителю тоже показываем
    socket.emit("newMessage", msg);
  });

  socket.on("disconnect", () => {
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