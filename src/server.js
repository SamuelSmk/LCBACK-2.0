require("dotenv/config");
require("express-async-errors");

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const AppError = require("./utils/appError");
const routes = require("./routes");
const knex = require("./database/knex"); // Importa o Knex configurado
const cors = require("cors");

const app = express();
const server = http.createServer(app);

// Configura o socket.io com ping sem esperar resposta
const io = new Server(server, {
  cors: {
    origin: "*", // Permitir todas as origens, ajuste conforme necessário
    methods: ["GET", "POST"]
  },
  pingInterval: 30000,
  pingTimeout: 10000,
});

app.set("socketio", io);

app.use(cors());
app.use(express.json());

app.use((req, res, next) => { 
  req.io = io; 
  req.db = knex; // Adiciona a conexão do banco de dados à requisição
  next(); 
});
app.use(routes);

// A função `database()` foi removida, já que o Knex cuida da conexão

app.use((error, request, response, next) => {
  if (error instanceof AppError) {
    return response.status(error.statusCode).json({
      status: "error",
      message: error.message,
    });
  }

  console.error(error);

  return response.status(500).json({
    status: "error",
    message: "Internal server error",
  });
});

io.on("connection", (socket) => {
  console.log("Novo cliente conectado", socket.id);

  socket.on("register", (company_id) => {
    console.log(`Empresa ${company_id} registrada no socket ${socket.id}`);
    socket.join(String(company_id));
    // Lista todas as salas que o socket está
    const rooms = Array.from(socket.rooms);
    console.log(`Socket ${socket.id} está nas salas:`, rooms);
  });

  socket.on("disconnect", () => {
    console.log("Cliente desconectado", socket.id);
  });
});

const PORT = process.env.SERVER_PORT || 3333;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { app, io };
