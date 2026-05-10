// ================================================================
// netlify/functions/criar-pagamento.js
// Cria uma preferência de pagamento no Mercado Pago
// Ciclismo Individual 2026 — Turismo de Base Comunitária
// ================================================================

exports.handler = async function (event) {

  // Só aceita requisições do tipo POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ erro: 'Método não permitido' })
    };
  }

  // Lê as chaves do ambiente (configuradas no Netlify)
  const MP_ACCESS_TOKEN  = process.env.MP_ACCESS_TOKEN;
  const URL_SITE         = process.env.URL_SITE || 'https://snazzy-brioche-4da416.netlify.app';

  if (!MP_ACCESS_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ erro: 'Credenciais do Mercado Pago não configuradas' })
    };
  }

  // Lê os dados enviados pelo site
  let dados;
  try {
    dados = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ erro: 'Dados inválidos' })
    };
  }

  const { inscricao_id, numero_ficha, nome, email } = dados;

  if (!inscricao_id || !numero_ficha || !nome) {
    return {
      statusCode: 400,
      body: JSON.stringify({ erro: 'Campos obrigatórios: inscricao_id, numero_ficha, nome' })
    };
  }

  // Monta o corpo da requisição para o Mercado Pago
  const preferencia = {
    items: [
      {
        id:          'ciclismo2026',
        title:       'Ciclismo Individual 2026 — Inscrição',
        description: `Participante: ${nome} · Ficha: ${numero_ficha}`,
        quantity:    1,
        unit_price:  160.00,
        currency_id: 'BRL'
      }
    ],
    payer: {
      name:  nome,
      email: email || 'participante@ciclismo2026.com.br'
    },
    // external_reference liga o pagamento à inscrição no banco
    external_reference: String(inscricao_id),
    // URLs de retorno após o pagamento
    back_urls: {
      success: `${URL_SITE}/pagamento.html`,
      failure: `${URL_SITE}/pagamento.html`,
      pending: `${URL_SITE}/pagamento.html`
    },
    // Se aprovado, volta automaticamente (sem precisar clicar)
    auto_return: 'approved',
    // URL que o Mercado Pago chama quando o status muda (webhook)
    notification_url: `${URL_SITE}/.netlify/functions/webhook-pagamento`,
    // Validade da preferência: 30 dias
    expires:           true,
    expiration_date_to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  };

  // Chama a API do Mercado Pago
  let resposta;
  try {
    resposta = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type':  'application/json',
        'X-Idempotency-Key': `cic2026-${inscricao_id}-${Date.now()}`
      },
      body: JSON.stringify(preferencia)
    });
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ erro: 'Falha ao conectar com o Mercado Pago', detalhe: err.message })
    };
  }

  const resultado = await resposta.json();

  if (!resposta.ok) {
    return {
      statusCode: resposta.status,
      body: JSON.stringify({ erro: 'Mercado Pago retornou erro', detalhe: resultado })
    };
  }

  // Retorna a URL de pagamento para o site redirecionar o participante
  // Em produção: init_point
  // Em sandbox (testes): sandbox_init_point
  const url = resultado.init_point || resultado.sandbox_init_point;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ok:          true,
      url,
      preferencia_id: resultado.id
    })
  };
};
