// ./server.js
const express = require('express');
const dotenv = require('dotenv');
const orderRoutes = require('./routes/OrderRoutes');

// Deve ser a primeira linha executada para carregar o .env!
dotenv.config(); 

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json()); // Middleware para parsear JSON
app.use('/order', orderRoutes); // Rota base

app.use((req, res, next) => {
    res.status(404).json({ message: 'Recurso não encontrado' });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});