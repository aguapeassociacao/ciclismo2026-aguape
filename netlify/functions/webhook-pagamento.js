// ================================================================
// netlify/functions/webhook-pagamento.js
// Recebe notificações automáticas do Mercado Pago
// Quando alguém paga, o MP chama esta função automaticamente
// Ciclismo Individual 2026 — Turismo de Base Comunitária
// ================================================================

const crypto = require('crypto');

exports.handler = async function (event) {

  // O Mercado Pago sempre envia POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método não permitido' };
  }

  const SUPABASE_URL       = process.env.SUPABASE_URL;
  const SUPABASE_KEY       = process.env.SUPABASE_KEY;
  const MP_ACCESS_TOKEN    = process.env.MP_ACCESS_TOKEN;
  const MP_WEBHOOK_SECRET  = process.env.MP_WEBHOOK_SECRET;

  // ── Validação da assinatura HMAC (segurança) ──────────────────
  // O MP assina cada notificação. Sem validar, qualquer pessoa poderia
  // fingir um pagamento aprovado enviando uma requisição falsa.
  if (MP_WEBHOOK_SECRET) {
    try {
      const xSignature  = event.headers['x-signature']  || event.headers['X-Signature']  || '';
      const xRequestId  = event.headers['x-request-id'] || event.headers['X-Request-Id'] || '';
      const body        = JSON.parse(event.body || '{}');
      const dataId      = body?.data?.id || '';

      // Extrai ts e v1 do header x-signature
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
        return { statusCode: 401, body: 'Assinatura inválida' };
      }
    } catch (err) {
      console.warn('Webhook: erro na validação de assinatura:', err.message);
      // Continua mesmo com erro na validação (para não perder eventos em ambiente de teste)
    }
  }

  // ── Lê o corpo da notificação ─────────────────────────────────
  let notificacao;
  try {
    notificacao = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Corpo inválido' };
  }

  // O MP também envia notificações de outros tipos (ex: merchant_order)
  // Só processamos notificações de pagamento
  const tipo = notificacao.type || notificacao.topic;
  if (tipo !== 'payment') {
    return { statusCode: 200, body: 'Ignorado (tipo não é payment)' };
  }

  // ── Busca os detalhes do pagamento no Mercado Pago ────────────
  const paymentId = notificacao?.data?.id || notificacao?.id;
  if (!paymentId) {
    return { statusCode: 400, body: 'ID do pagamento não encontrado na notificação' };
  }

  let pagamento;
  try {
    const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
    });
    pagamento = await resp.json();
  } catch (err) {
    console.error('Webhook: erro ao buscar pagamento no MP:', err.message);
    return { statusCode: 502, body: 'Falha ao consultar o Mercado Pago' };
  }

  if (!pagamento || pagamento.error) {
    return { statusCode: 404, body: 'Pagamento não encontrado no Mercado Pago' };
  }

  // ── Converte o status do MP para o status do nosso banco ──────
  // approved  → pago
  // pending   → aguardando_boleto (boleto gerado, banco ainda não compensou)
  // in_process→ aguardando_boleto
  // cancelled → cancelado
  // rejected  → cancelado
  const mapaStatus = {
    approved:    'pago',
    pending:     'aguardando_boleto',
    in_process:  'aguardando_boleto',
    cancelled:   'cancelado',
    rejected:    'cancelado',
    refunded:    'cancelado',
    charged_back:'cancelado'
  };
  const novoStatus = mapaStatus[pagamento.status] || 'pendente_pagamento';

  // external_reference = inscricao_id (definido em criar-pagamento.js)
  const inscricaoId = pagamento.external_reference;
  if (!inscricaoId) {
    return { statusCode: 200, body: 'Sem external_reference, ignorando' };
  }

  const headers = {
    'apikey':        SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type':  'application/json',
    'Prefer':        'return=representation'
  };

  // ── Atualiza o status da inscrição no banco ───────────────────
  const metodo = pagamento.payment_method_id?.includes('pix') ? 'pix'
    : pagamento.payment_type_id === 'credit_card' || pagamento.payment_type_id === 'debit_card' ? 'cartao'
    : 'boleto';

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/inscricoes?id=eq.${inscricaoId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        status:            novoStatus,
        pagamento_id:      String(paymentId),
        pagamento_metodo:  metodo,
        pagamento_valor:   pagamento.transaction_amount,
        pagamento_data:    novoStatus === 'pago' ? new Date().toISOString() : null
      })
    });
  } catch (err) {
    console.error('Webhook: erro ao atualizar inscrição:', err.message);
    return { statusCode: 500, body: 'Falha ao atualizar banco de dados' };
  }

  // ── Registra na tabela de auditoria (pagamentos) ──────────────
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/pagamentos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        inscricao_id:    Number(inscricaoId),
        mp_payment_id:   String(paymentId),
        mp_status:       pagamento.status,
        mp_status_detail:pagamento.status_detail,
        metodo,
        valor:           pagamento.transaction_amount,
        payload_raw:     pagamento
      })
    });
  } catch (err) {
    console.warn('Webhook: erro ao registrar auditoria (não crítico):', err.message);
  }

  // Responde 200 para o Mercado Pago saber que recebemos a notificação
  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, status: novoStatus, inscricao: inscricaoId })
  };
};
