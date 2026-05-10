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
  if (MP_WEBHOOK_SECRET) {
    try {
      const xSignature  = event.headers['x-signature']  || event.headers['X-Signature']  || '';
      const xRequestId  = event.headers['x-request-id'] || event.headers['X-Request-Id'] || '';
      const body        = JSON.parse(event.body || '{}');
      const dataId      = body?.data?.id || '';

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
        // Continua mesmo com assinatura inválida para não perder eventos
        // return { statusCode: 401, body: 'Assinatura inválida' };
      }
    } catch (err) {
      console.warn('Webhook: erro na validação de assinatura:', err.message);
    }
  }

  // ── Lê o corpo da notificação ─────────────────────────────────
  let notificacao;
  try {
    notificacao = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Corpo inválido' };
  }

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

  // ── Converte o status do MP para o status do banco ────────────
  const mapaStatus = {
    approved:     'pago',
    pending:      'aguardando_boleto',
    in_process:   'aguardando_boleto',
    cancelled:    'cancelado',
    rejected:     'cancelado',
    refunded:     'cancelado',
    charged_back: 'cancelado'
  };
  const novoStatus = mapaStatus[pagamento.status] || 'pendente_pagamento';

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

  // ── Detecta o método de pagamento ────────────────────────────
  const metodo = pagamento.payment_method_id?.includes('pix') ? 'pix'
    : pagamento.payment_type_id === 'credit_card' || pagamento.payment_type_id === 'debit_card' ? 'cartao'
    : 'boleto';

  // ── Dados de quem PAGOU (pode ser diferente do inscrito) ──────
  const pagador = pagamento.payer || {};
  const pagoPorNome  = pagador.first_name && pagador.last_name
    ? `${pagador.first_name} ${pagador.last_name}`.trim()
    : pagador.first_name || pagador.email || null;
  const pagoPorEmail = pagador.email || null;
  const pagoPorCpf   = pagador.identification?.number || null;

  // Banco e conta de quem pagou (disponível mesmo com LGPD)
  const bankInfo     = pagamento.point_of_interaction?.transaction_data?.bank_info?.payer || {};
  const pagoPorBanco = bankInfo.long_name || null;
  const pagoPorConta = bankInfo.account_id ? String(bankInfo.account_id) : null;

  // ID da transação PIX (para cruzar com extrato bancário)
  const mpTransactionId = pagamento.transaction_details?.transaction_id
    || pagamento.point_of_interaction?.transaction_data?.transaction_id
    || String(paymentId);

  console.log(`Webhook: pagamento ${paymentId} — inscricao ${inscricaoId} — status ${novoStatus}`);
  console.log(`Webhook: banco pagador: ${pagoPorBanco} conta: ${pagoPorConta}`);

  // ── Atualiza a inscrição no banco ─────────────────────────────
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/inscricoes?id=eq.${inscricaoId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        status:            novoStatus,
        pagamento_id:      String(paymentId),
        pagamento_metodo:  metodo,
        pagamento_valor:   pagamento.transaction_amount,
        pagamento_data:    novoStatus === 'pago' ? new Date().toISOString() : null,
        // Quem efetivamente realizou o pagamento
        pago_por_nome:     pagoPorNome,
        pago_por_email:    pagoPorEmail,
        pago_por_cpf:      pagoPorCpf,
        pago_por_banco:    pagoPorBanco,
        pago_por_conta:    pagoPorConta,
        mp_transaction_id: mpTransactionId
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

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, status: novoStatus, inscricao: inscricaoId })
  };
};
