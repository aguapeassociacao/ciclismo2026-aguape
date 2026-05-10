// ================================================================
// api/admin-auth.js
// Autenticação — admin master + operadores configurados
// Ciclismo Individual 2026 — Turismo de Base Comunitária
// ================================================================

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const { usuario, senha, acao } = req.body;

  const ADMIN_USER  = process.env.ADMIN_USER  || 'admin';
  const ADMIN_SENHA = process.env.ADMIN_SENHA || 'ciclismo2026';

  // ── Verificar permissão em tempo real (sem precisar de senha) ──
  // Chamado antes de cada exclusão para garantir permissão atual
  if (acao === 'verificarPermissao') {
    if (!usuario) return res.status(400).json({ ok: false, erro: 'Usuário não informado' });

    // Admin sempre pode
    if (usuario === ADMIN_USER) {
      return res.status(200).json({ ok: true, podeExcluir: true });
    }

    // Busca operador pelo login e retorna permissão atual do process.env
    for (let i = 1; i <= 20; i++) {
      const op = process.env[`OPERADOR_${i}`];
      if (!op) continue;
      const [opUser, , , opExcluir] = op.split(':');
      if (opUser === usuario) {
        return res.status(200).json({ ok: true, podeExcluir: opExcluir === 'true' });
      }
    }
    return res.status(404).json({ ok: false, erro: 'Operador não encontrado' });
  }

  // ── Login normal ──────────────────────────────────────────────
  if (usuario === ADMIN_USER && senha === ADMIN_SENHA) {
    const token = Date.now().toString(36) + Math.random().toString(36).slice(2);
    return res.status(200).json({
      ok: true, token,
      perfil: 'admin',
      nome: 'Administrador',
      podeExcluir: true
    });
  }

  for (let i = 1; i <= 20; i++) {
    const op = process.env[`OPERADOR_${i}`];
    if (!op) continue;
    const partes = op.split(':');
    if (partes.length < 3) continue;
    const [opUser, opSenha, opNome, opExcluir] = partes;
    if (usuario === opUser && senha === opSenha) {
      const token = Date.now().toString(36) + Math.random().toString(36).slice(2);
      return res.status(200).json({
        ok: true, token,
        perfil: 'operador',
        nome: opNome || opUser,
        podeExcluir: opExcluir === 'true'
      });
    }
  }

  return res.status(401).json({ ok: false, erro: 'Usuário ou senha incorretos' });
}
