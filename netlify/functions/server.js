const express = require('express');
const { handler: criarPagamento } = require('./criar-pagamento');
const { handler: webhookPagamento } = require('./webhook-pagamento');

const app = express();
app.use(express.json());

// Permite requisições do site (CORS)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Converte requisição Express para o formato Netlify
function adaptador(handler) {
  return async (req, res) => {
    const event = {
      httpMethod: req.method,
      headers: req.headers,
      body: JSON.stringify(req.body),
      queryStringParameters: req.query
    };
    const resultado = await handler(event);
    res.status(resultado.statusCode)
       .set(resultado.headers || {})
       .send(resultado.body);
  };
}

app.post('/criar-pagamento', adaptador(criarPagamento));
app.post('/webhook-pagamento', adaptador(webhookPagamento));

app.get('/', (req, res) => res.json({ ok: true, servico: 'Ciclismo 2026 - Funções de Pagamento' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
