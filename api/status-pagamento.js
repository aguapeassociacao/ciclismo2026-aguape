// ================================================================
// api/status-pagamento.js  —  V1.0
// Consulta status de um pagamento PIX no Mercado Pago (polling)
// Chamado pela pix.html a cada 5 segundos
// GET /api/status-pagamento?payment_id=xxx
// Ciclismo Individual 2026 — Turismo de Base Comunitária
// © 2026 Ewerson Luiz de Oliveira
// ================================================================

export default async function handler(req, res) {

  if (req.method !== 'GET') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
  if (!MP_ACCESS_TOKEN) {
    return res.status(500).json({ erro: 'Configuração do servidor incompleta' });
  }

  const payment_id = req.query?.payment_id;
  if (!payment_id) {
    return res.status(400).json({ erro: 'payment_id é obrigatório' });
  }

  try {
    const resp = await fetch(
      `https://api.mercadopago.com/v1/payments/${payment_id}`,
      { headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` } }
    );

    const data = await resp.json();

    if (!resp.ok) {
      return res.status(resp.status).json({
        erro:    'Erro ao consultar pagamento',
        detalhe: data
      });
    }

    // Retorna só o necessário — nunca expõe dados completos do pagamento
    return res.status(200).json({
      ok:                 true,
      status:             data.status,          // 'pending' | 'approved' | 'cancelled' | 'rejected'
      status_detail:      data.status_detail,
      external_reference: data.external_reference
    });

  } catch (err) {
    return res.status(502).json({
      erro:    'Falha ao consultar o Mercado Pago',
      detalhe: err.message
    });
  }
}
