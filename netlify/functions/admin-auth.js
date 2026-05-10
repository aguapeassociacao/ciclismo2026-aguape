// ================================================================
// netlify/functions/admin-auth.js
// Autenticação do painel admin — adaptado para Netlify Functions
// Ciclismo Individual 2026 — Turismo de Base Comunitária
// ================================================================

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ erro: 'Método não permitido' }) };
  }

  const { usuario, senha, acao } = JSON.parse(event.body);

  const ADMIN_USER  = process.env.ADMIN_USER  || 'admin';
  const ADMIN_SENHA = process.env.ADMIN_SENHA || 'ciclismo2026';

  if (acao === 'verificarPermissao') {
    if (!usuario) return { statusCode: 400, body: JSON.stringify({ ok: false, erro: 'Usuário não informado' }) };
    if (usuario === ADMIN_USER) return { statusCode: 200, body: JSON.stringify({ ok: true, podeExcluir: true }) };
    return { statusCode: 404, body: JSON.stringify({ ok: false, erro: 'Operador não encontrado' }) };
  }

  if (usuario === ADMIN_USER && senha === ADMIN_SENHA) {
    const token = Date.now().toString(36) + Math.random().toString(36).slice(2);
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, token, perfil: 'admin', nome: 'Administrador', podeExcluir: true })
    };
  }

  return { statusCode: 401, body: JSON.stringify({ ok: false, erro: 'Usuário ou senha incorretos' }) };
};
