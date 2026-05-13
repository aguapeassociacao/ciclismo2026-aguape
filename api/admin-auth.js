// ================================================================
// api/admin-auth.js — V3.0
// Autenticação segura — sem fallback hardcoded
// Sessão expira em 8 horas
// Operadores lidos do Supabase (admin_operadores) + env vars legadas
// Ciclismo Individual 2026 — Turismo de Base Comunitária
// © 2026 Ewerson Luiz de Oliveira · DTI · Prefeitura Costa Marques
// ================================================================

function gerarToken(usuario, perfil) {
  const expira = Date.now() + (8 * 60 * 60 * 1000);
  const payload = `${usuario}:${perfil}:${expira}`;
  const rand    = Math.random().toString(36).slice(2);
  return Buffer.from(payload).toString('base64') + '.' + rand;
}

export function validarToken(token) {
  try {
    const [payload] = token.split('.');
    const decoded   = Buffer.from(payload, 'base64').toString('utf8');
    const [usuario, perfil, expira] = decoded.split(':');
    if (Date.now() > parseInt(expira)) return null;
    return { usuario, perfil };
  } catch {
    return null;
  }
}

// Busca operador na tabela Supabase e valida a senha
async function buscarOperadorSupabase(usuario, senha) {
  const URL = process.env.SUPABASE_URL;
  const KEY = process.env.SUPABASE_KEY;
  if (!URL || !KEY) return null;
  try {
    const r = await fetch(
      `${URL}/rest/v1/admin_operadores?usuario=eq.${encodeURIComponent(usuario)}&ativo=eq.true&select=*`,
      { headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` } }
    );
    if (!r.ok) return null;
    const rows = await r.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const op = rows[0];
    if (op.senha !== senha) return null;
    return op;
  } catch { return null; }
}

// Busca apenas a permissão de excluir do operador
async function buscarPermissaoSupabase(usuario) {
  const URL = process.env.SUPABASE_URL;
  const KEY = process.env.SUPABASE_KEY;
  if (!URL || !KEY) return null;
  try {
    const r = await fetch(
      `${URL}/rest/v1/admin_operadores?usuario=eq.${encodeURIComponent(usuario)}&ativo=eq.true&select=pode_excluir`,
      { headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` } }
    );
    if (!r.ok) return null;
    const rows = await r.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return rows[0];
  } catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const ADMIN_USER  = process.env.ADMIN_USER;
  const ADMIN_SENHA = process.env.ADMIN_SENHA;

  if (!ADMIN_USER || !ADMIN_SENHA) {
    console.error('admin-auth: ADMIN_USER ou ADMIN_SENHA não configurados');
    return res.status(503).json({
      ok:   false,
      erro: 'Painel não configurado. Configure ADMIN_USER e ADMIN_SENHA no Vercel.'
    });
  }

  const { usuario, senha, acao, token } = req.body;

  // Validar sessão existente
  if (acao === 'validarSessao') {
    if (!token) return res.status(401).json({ ok: false, erro: 'Token não informado' });
    const dados = validarToken(token);
    if (!dados)  return res.status(401).json({ ok: false, erro: 'Sessão expirada' });
    return res.status(200).json({ ok: true, ...dados });
  }

  // Verificar permissão de excluir
  if (acao === 'verificarPermissao') {
    if (!token) return res.status(401).json({ ok: false });
    const dados = validarToken(token);
    if (!dados)  return res.status(401).json({ ok: false, erro: 'Sessão expirada' });

    if (dados.usuario === ADMIN_USER) {
      return res.status(200).json({ ok: true, podeExcluir: true });
    }
    // env vars legadas
    for (let i = 1; i <= 20; i++) {
      const op = process.env[`OPERADOR_${i}`];
      if (!op) continue;
      const [opUser, , , opExcluir] = op.split(':');
      if (opUser === dados.usuario) {
        return res.status(200).json({ ok: true, podeExcluir: opExcluir === 'true' });
      }
    }
    // tabela Supabase
    const dbOp = await buscarPermissaoSupabase(dados.usuario);
    if (dbOp !== null) {
      return res.status(200).json({ ok: true, podeExcluir: !!dbOp.pode_excluir });
    }
    return res.status(404).json({ ok: false, erro: 'Operador não encontrado' });
  }

  // Login
  if (!usuario || !senha) {
    return res.status(400).json({ ok: false, erro: 'Usuário e senha obrigatórios' });
  }

  // Admin master
  if (usuario === ADMIN_USER && senha === ADMIN_SENHA) {
    return res.status(200).json({
      ok: true, token: gerarToken(usuario, 'admin'),
      perfil: 'admin', nome: 'Administrador',
      podeExcluir: true, expira_em: Date.now() + (8 * 60 * 60 * 1000)
    });
  }

  // Operadores — env vars legadas (OPERADOR_1..20)
  for (let i = 1; i <= 20; i++) {
    const op = process.env[`OPERADOR_${i}`];
    if (!op) continue;
    const partes = op.split(':');
    if (partes.length < 3) continue;
    const [opUser, opSenha, opNome, opExcluir] = partes;
    if (usuario === opUser && senha === opSenha) {
      return res.status(200).json({
        ok: true, token: gerarToken(usuario, 'operador'),
        perfil: 'operador', nome: opNome || opUser,
        podeExcluir: opExcluir === 'true',
        expira_em: Date.now() + (8 * 60 * 60 * 1000)
      });
    }
  }

  // Operadores — tabela Supabase
  const dbOp = await buscarOperadorSupabase(usuario, senha);
  if (dbOp) {
    return res.status(200).json({
      ok: true, token: gerarToken(usuario, 'operador'),
      perfil: 'operador', nome: dbOp.nome || usuario,
      podeExcluir: !!dbOp.pode_excluir,
      expira_em: Date.now() + (8 * 60 * 60 * 1000)
    });
  }

  // Delay anti brute-force
  return new Promise(resolve => setTimeout(() => {
    resolve(res.status(401).json({ ok: false, erro: 'Usuário ou senha incorretos' }));
  }, 800));
}
