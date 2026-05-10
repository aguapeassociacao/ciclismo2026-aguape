// ================================================================
// server.js — Servidor Express para o Render.com
// Serve o site estático + as funções de pagamento
// Ciclismo Individual 2026 — Turismo de Base Comunitária
// ================================================================

const express = require('express');
const path    = require('path');

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

// ── Arquivos estáticos (HTML, CSS, JS, imagens) ───────────────
// server.js fica em netlify/functions/ — a raiz do site fica 2 níveis acima
const PASTA_SITE = path.join(__dirname, '..', '..');
app.use(express.static(PASTA_SITE));

// ── Adaptador: converte Express → formato Netlify ─────────────
function adaptador(handler) {
  return async (req, res) => {
    const event = {
      httpMethod: req.method,
      headers:    req.headers,
      body:       JSON.stringify(req.body),
      queryStringParameters: req.query
    };
    try {
      const resultado = await handler(event);
      res.status(resultado.statusCode)
         .set(resultado.headers || {})
         .send(resultado.body);
    } catch (err) {
      console.error('Erro na função:', err);
      res.status(500).json({ erro: 'Erro interno do servidor', detalhe: err.message });
    }
  };
}

// ── Rotas de API ──────────────────────────────────────────────
app.post('/criar-pagamento',   adaptador(criarPagamento));
app.post('/webhook-pagamento', adaptador(webhookPagamento));
app.post('/api/supabase',      adaptador(supabase));

// ── Health check — evita que o servidor durma ─────────────────
app.get('/health', (req, res) => res.json({
  ok: true,
  servico: 'Ciclismo 2026',
  hora: new Date().toISOString()
}));

// ── Fallback: rotas não encontradas → index.html ──────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(PASTA_SITE, 'index.html'));
});

// ── Iniciar servidor ──────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
