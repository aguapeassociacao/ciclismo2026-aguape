// ================================================================
// netlify/functions/supabase.js
// Proxy seguro para o Supabase — adaptado para Netlify Functions
// Ciclismo Individual 2026 — Turismo de Base Comunitária
// ================================================================

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ erro: 'Método não permitido' }) };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ erro: 'Configuração do servidor incompleta' }) };
  }

  const { acao, tabela, query, dados, id } = JSON.parse(event.body);

  const baseUrl = `${SUPABASE_URL}/rest/v1/${tabela}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  try {
    if (acao === 'buscar') {
      const url = query ? `${baseUrl}?${query}` : `${baseUrl}?select=*`;
      const r = await fetch(url, { headers });
      const data = await r.json();
      return { statusCode: 200, body: JSON.stringify(data) };
    }

    if (acao === 'inserir') {
      const r = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(dados)
      });
      const data = await r.json();
      return { statusCode: r.status, body: JSON.stringify(data) };
    }

    if (acao === 'atualizar') {
      const url = `${baseUrl}?id=eq.${id}`;
      const r = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(dados)
      });
      const data = await r.json();
      return { statusCode: r.status, body: JSON.stringify(data) };
    }

    if (acao === 'deletar') {
      const url = `${baseUrl}?id=eq.${id}`;
      const r = await fetch(url, { method: 'DELETE', headers });
      if (r.ok) return { statusCode: 200, body: JSON.stringify({ ok: true }) };
      const data = await r.json();
      return { statusCode: r.status, body: JSON.stringify(data) };
    }

    if (acao === 'deletarPorCampo') {
      const { campo, valor } = JSON.parse(event.body);
      const url = `${baseUrl}?${campo}=eq.${valor}`;
      const r = await fetch(url, { method: 'DELETE', headers });
      if (r.ok) return { statusCode: 200, body: JSON.stringify({ ok: true }) };
      const data = await r.json();
      return { statusCode: r.status, body: JSON.stringify(data) };
    }

    return { statusCode: 400, body: JSON.stringify({ erro: 'Ação não reconhecida' }) };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ erro: 'Erro interno', detalhe: err.message }) };
  }
};
