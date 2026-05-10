// ================================================================
// api/supabase.js
// Endpoint seguro — todas as operações no banco passam por aqui
// As chaves do Supabase ficam no servidor, NUNCA no navegador
// Ciclismo Individual 2026 — Turismo de Base Comunitária
// ================================================================

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ erro: 'Configuração do servidor incompleta' });
  }

  const { acao, tabela, query, dados, id } = req.body;

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
      return res.status(200).json(data);
    }

    if (acao === 'inserir') {
      const r = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(dados)
      });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    // Upsert: insere ou atualiza com base em colunas de conflito
    if (acao === 'upsert') {
      const conflito = req.body.conflito || 'id';
      const upsertHeaders = {
        ...headers,
        'Prefer': 'resolution=merge-duplicates,return=representation',
      };
      const url = baseUrl + '?on_conflict=' + encodeURIComponent(conflito);
      const r = await fetch(url, {
        method: 'POST',
        headers: upsertHeaders,
        body: JSON.stringify(Array.isArray(dados) ? dados : [dados])
      });
      const data = await r.json().catch(() => []);
      return res.status(r.ok ? 200 : r.status).json(data);
    }

    if (acao === 'atualizar') {
      const url = `${baseUrl}?id=eq.${id}`;
      const r = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(dados)
      });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    if (acao === 'deletar') {
      const url = `${baseUrl}?id=eq.${id}`;
      const r = await fetch(url, { method: 'DELETE', headers });
      if (r.ok) return res.status(200).json({ ok: true });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    // Deletar por campo customizado (ex: participante_id=eq.xxx para limpar inscrições)
    if (acao === 'deletarPorCampo') {
      const { campo, valor } = req.body;
      const url = `${baseUrl}?${campo}=eq.${valor}`;
      const r = await fetch(url, { method: 'DELETE', headers });
      if (r.ok) return res.status(200).json({ ok: true });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    // Upload de foto para Supabase Storage (bucket "alimentos")
    if (acao === 'uploadFoto') {
      const { base64, nome, tipo } = req.body;
      if (!base64 || !nome) return res.status(400).json({ erro: 'base64 e nome são obrigatórios' });

      const buffer = Buffer.from(base64, 'base64');
      const bucket = 'alimentos';
      const storageUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${nome}`;

      const r = await fetch(storageUrl, {
        method: 'POST',
        headers: {
          'apikey':        SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type':  tipo || 'image/jpeg',
          'x-upsert':      'true'
        },
        body: buffer
      });

      if (r.ok) {
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${nome}`;
        return res.status(200).json({ url: publicUrl });
      }

      let errData = {};
      try { errData = await r.json(); } catch {}
      return res.status(r.status).json({ erro: 'Falha no upload', detalhe: errData });
    }

    // Busca com query string livre (para logs)
    if (acao === 'buscarQuery') {
      const { tabela: tbl, query: q } = req.body;
      const url2 = q ? `${SUPABASE_URL}/rest/v1/${tbl}?${q}` : `${SUPABASE_URL}/rest/v1/${tbl}?select=*`;
      const r2 = await fetch(url2, { headers });
      const d2 = await r2.json();
      return res.status(200).json(d2);
    }

    return res.status(400).json({ erro: 'Ação não reconhecida' });

  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno do servidor', detalhe: err.message });
  }
}
