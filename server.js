const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const { processChatWithClaude } = require('./claude');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.json());

// Routes
app.get('/', (req, res) => {
  res.render('index', { 
    title: 'Consulta Médica en Línea', 
    description: 'Servicio de atención médica inmediata' 
  });
});

app.get('/emergencia', (req, res) => {
  res.render('emergency-room');
});

app.get('/video-consulta', (req, res) => {
  res.render('video-consult');
});

app.get('/sala-espera', (req, res) => {
  res.render('waiting-room');
});

// Socket.IO connection handling
const activeChats = new Map();

io.on('connection', (socket) => {
  const chatId = uuidv4();
  activeChats.set(chatId, { socket, messages: [] });

  socket.on('patient-message', async (message) => {
    try {
      const chatHistory = activeChats.get(chatId).messages;
      chatHistory.push({ role: 'patient', content: message });

      const claudeResponse = await processChatWithClaude(chatHistory);
      
      // Determine next action based on Claude's recommendation
      switch(claudeResponse.action) {
        case 'emergency':
          socket.emit('redirect', '/emergencia');
          break;
        case 'video-consult':
          socket.emit('redirect', '/video-consulta');
          break;
        case 'waiting-room':
          socket.emit('redirect', '/sala-espera');
          break;
        default:
          socket.emit('assistant-message', claudeResponse.message);
      }

      chatHistory.push({ role: 'assistant', content: claudeResponse.message });
    } catch (error) {
      console.error('Error processing message:', error);
      socket.emit('error', 'Hubo un problema procesando su mensaje.');
    }
  });

  socket.on('disconnect', () => {
    activeChats.delete(chatId);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor iniciado en el puerto ${PORT}`);
});