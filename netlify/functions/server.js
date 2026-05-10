// ================================================================
// server.js — Servidor Express para o Render.com
// Adapta as funções Netlify para rotas HTTP
// Ciclismo Individual 2026 — Turismo de Base Comunitária
// ================================================================

const express = require('express');
const { handler: criarPagamento }  = require('./criar-pagamento');
const { handler: webhookPagamento } = require('./webhook-pagamento');
const { handler: supabase }         = require('./supabase');

const app = express();
app.use(express.json());

// ── CORS — permite requisições do site ────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── Adaptador: converte Express → formato Netlify ─────────────
function adaptador(handler) {
  return async (req, res) => {
    const event = {
      httpMethod: req.method,
      headers:    req.headers,
      body:       JSON.stringify(req.body),
      queryStringParameters: req.query
    };
    const resultado = await handler(event);
    res.status(resultado.statusCode)
       .set(resultado.headers || {})
       .send(resultado.body);
  };
}

// ── Rotas ─────────────────────────────────────────────────────
app.post('/criar-pagamento',   adaptador(criarPagamento));
app.post('/webhook-pagamento', adaptador(webhookPagamento));
app.post('/api/supabase',      adaptador(supabase));

// Rota de verificação
app.get('/', (req, res) => res.json({
  ok: true,
  servico: 'Ciclismo 2026 - Funções de Pagamento'
}));

// ── Iniciar servidor ──────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
