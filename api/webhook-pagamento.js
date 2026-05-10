// ================================================================
// api/webhook-pagamento.js
// Recebe notificações automáticas do Mercado Pago
// Ciclismo Individual 2026 — Turismo de Base Comunitária
// ================================================================

import crypto from 'crypto';

export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).send('Método não permitido');
  }

  const SUPABASE_URL      = process.env.SUPABASE_URL;
  const SUPABASE_KEY      = process.env.SUPABASE_KEY;
  const MP_ACCESS_TOKEN   = process.env.MP_ACCESS_TOKEN;
  const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;

  // ── Validação da assinatura HMAC ──────────────────────────────
  if (MP_WEBHOOK_SECRET) {
    try {
      const xSignature = req.headers['x-signature'] || '';
      const xRequestId = req.headers['x-request-id'] || '';
      const dataId     = req.body?.data?.id || '';

      const partes = {};
      xSignature.split(',').forEach(p => {
        const [k, v] = p.split('=');
        if (k && v) partes[k.trim()] = v.trim();
      });

      const manifest = `id:${dataId};request-id:${xRequestId};ts:${partes.ts};`;
      const hmac     = crypto.createHmac('sha256', MP_WEBHOOK_SECRET);
      hmac.update(manifest);
      const esperado = hmac.digest('hex');

      if (partes.v1 && partes.v1 !== esperado) {
        console.error('Webhook: assinatura inválida');
        // Continua para não perder eventos
      }
    } catch (err) {
      console.warn('Webhook: erro na validação de assinatura:', err.message);
    }
  }

  const notificacao = req.body || {};
  const tipo = notificacao.type || notificacao.topic;

  if (tipo !== 'payment') {
    return res.status(200).send('Ignorado (tipo não é payment)');
  }

  const paymentId = notificacao?.data?.id || notificacao?.id;
  if (!paymentId) {
    return res.status(400).send('ID do pagamento não encontrado');
  }

  // ── Busca detalhes do pagamento no Mercado Pago ───────────────
  let pagamento;
  try {
    const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
    });
    pagamento = await resp.json();
  } catch (err) {
    console.error('Webhook: erro ao buscar pagamento:', err.message);
    return res.status(502).send('Falha ao consultar o Mercado Pago');
  }

  if (!pagamento || pagamento.error) {
    return res.status(404).send('Pagamento não encontrado');
  }

  // ── Converte status MP → banco ────────────────────────────────
  const mapaStatus = {
    approved:     'pago',
    pending:      'aguardando_boleto',
    in_process:   'aguardando_boleto',
    cancelled:    'pendente_pagamento',
    rejected:     'pendente_pagamento',
    refunded:     'cancelado',
    charged_back: 'cancelado'
  };
  const novoStatus = mapaStatus[pagamento.status] || 'pendente_pagamento';

  const inscricaoId = pagamento.external_reference;
  if (!inscricaoId) {
    return res.status(200).send('Sem external_reference, ignorando');
  }

  const metodo = pagamento.payment_method_id?.includes('pix') ? 'pix'
    : pagamento.payment_type_id === 'credit_card' || pagamento.payment_type_id === 'debit_card' ? 'cartao'
    : 'boleto';

  const headers = {
    'apikey':        SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type':  'application/json',
    'Prefer':        'return=representation'
  };

  console.log(`Webhook: pagamento ${paymentId} — inscricao ${inscricaoId} — status ${novoStatus}`);

  // ── Atualiza inscrição ────────────────────────────────────────
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/inscricoes?id=eq.${inscricaoId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        status:           novoStatus,
        pagamento_id:     String(paymentId),
        pagamento_metodo: metodo,
        pagamento_valor:  pagamento.transaction_amount,
        pagamento_data:   novoStatus === 'pago' ? new Date().toISOString() : null
      })
    });
  } catch (err) {
    console.error('Webhook: erro ao atualizar inscrição:', err.message);
    return res.status(500).send('Falha ao atualizar banco de dados');
  }

  // ── Registra auditoria ────────────────────────────────────────
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/pagamentos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        inscricao_id:     Number(inscricaoId),
        mp_payment_id:    String(paymentId),
        mp_status:        pagamento.status,
        mp_status_detail: pagamento.status_detail,
        metodo,
        valor:            pagamento.transaction_amount,
        payload_raw:      pagamento
      })
    });
  } catch (err) {
    console.warn('Webhook: erro ao registrar auditoria (não crítico):', err.message);
  }

  return res.status(200).json({ ok: true, status: novoStatus, inscricao: inscricaoId });
}
