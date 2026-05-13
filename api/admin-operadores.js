// ================================================================
// api/admin-operadores.js
// CRUD de operadores via Supabase — tabela admin_operadores
// Toda operação exige sessão ativa de admin master
// Ciclismo Individual 2026 — Turismo de Base Comunitária
// © 2026 Ewerson Luiz de Oliveira · DTI · Prefeitura Costa Marques
// ================================================================

import { validarToken } from './admin-auth.js';

function sbHeaders(key) {
  return {
    'apikey':        key,
    'Authorization': `Bearer ${key}`,
    'Content-Type':  'application/json',
    'Prefer':        'return=representation'
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, erro: 'Método não permitido' });
  }

  const { acao, token } = req.body;

  // ── Toda operação exige sessão admin master ────────────────
  if (!token) return res.status(401).json({ ok: false, erro: 'Não autenticado' });
  const sess = validarToken(token);
  if (!sess) return res.status(401).json({ ok: false, erro: 'Sessão expirada' });
  if (sess.perfil !== 'admin') {
    return res.status(403).json({ ok: false, erro: 'Restrito ao administrador' });
  }

  const URL = process.env.SUPABASE_URL;
  const KEY = process.env.SUPABASE_KEY;
  if (!URL || !KEY) {
    return res.status(503).json({ ok: false, erro: 'Supabase não configurado' });
  }

  const base = `${URL}/rest/v1/admin_operadores`;

  try {
    // ── LISTAR todos os operadores ativos ──────────────────────
    if (acao === 'listar') {
      const r = await fetch(`${base}?select=id,usuario,nome,pode_excluir,ativo,criado_em&order=nome.asc`, {
        headers: sbHeaders(KEY)
      });
      const data = await r.json();
      if (!r.ok) return res.status(200).json({ ok: false, erro: data.message || `HTTP ${r.status}` });
      return res.status(200).json({ ok: true, operadores: data });
    }

    // ── ADICIONAR novo operador ────────────────────────────────
    if (acao === 'adicionar') {
      const { usuario, senha, nome, pode_excluir } = req.body;
      if (!usuario || !senha || !nome) {
        return res.status(400).json({ ok: false, erro: 'usuario, senha e nome são obrigatórios' });
      }
      if (!/^[a-z0-9_]+$/.test(usuario)) {
        return res.status(400).json({ ok: false, erro: 'usuario: só letras minúsculas, números e _' });
      }

      const r = await fetch(base, {
        method:  'POST',
        headers: sbHeaders(KEY),
        body:    JSON.stringify({ usuario, senha, nome, pode_excluir: !!pode_excluir, ativo: true })
      });
      const data = await r.json();
      if (!r.ok) {
        // Erro de unicidade (usuario já existe)
        if (data.code === '23505') {
          return res.status(200).json({ ok: false, erro: `Login "${usuario}" já existe` });
        }
        return res.status(200).json({ ok: false, erro: data.message || `HTTP ${r.status}` });
      }
      return res.status(200).json({ ok: true, operador: Array.isArray(data) ? data[0] : data });
    }

    // ── EDITAR operador existente ──────────────────────────────
    if (acao === 'editar') {
      const { id, nome, senha, pode_excluir, ativo } = req.body;
      if (!id) return res.status(400).json({ ok: false, erro: 'id obrigatório' });

      const atualizacao = {};
      if (nome  !== undefined) atualizacao.nome        = nome;
      if (senha !== undefined && senha !== '') atualizacao.senha = senha;
      if (pode_excluir !== undefined) atualizacao.pode_excluir = !!pode_excluir;
      if (ativo !== undefined) atualizacao.ativo = !!ativo;
      atualizacao.atualizado_em = new Date().toISOString();

      const r = await fetch(`${base}?id=eq.${id}`, {
        method:  'PATCH',
        headers: sbHeaders(KEY),
        body:    JSON.stringify(atualizacao)
      });
      const data = await r.json();
      if (!r.ok) return res.status(200).json({ ok: false, erro: data.message || `HTTP ${r.status}` });
      return res.status(200).json({ ok: true });
    }

    // ── REMOVER operador ───────────────────────────────────────
    if (acao === 'remover') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ ok: false, erro: 'id obrigatório' });

      const r = await fetch(`${base}?id=eq.${id}`, {
        method:  'DELETE',
        headers: sbHeaders(KEY)
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        return res.status(200).json({ ok: false, erro: data.message || `HTTP ${r.status}` });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ ok: false, erro: `Ação desconhecida: ${acao}` });

  } catch (err) {
    console.error('admin-operadores error:', err);
    return res.status(500).json({ ok: false, erro: err.message });
  }
}
