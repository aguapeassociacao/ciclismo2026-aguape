// ================================================================
// api/criar-pagamento.js
// Cria uma preferência de pagamento no Mercado Pago
// Ciclismo Individual 2026 — Turismo de Base Comunitária
// ================================================================

export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
  const URL_SITE        = process.env.URL_SITE || 'https://ciclismo2026-aguape.vercel.app';

  if (!MP_ACCESS_TOKEN) {
    return res.status(500).json({ erro: 'Credenciais do Mercado Pago não configuradas' });
  }

  const { inscricao_id, numero_ficha, nome, email } = req.body;

  if (!inscricao_id || !numero_ficha || !nome) {
    return res.status(400).json({ erro: 'Campos obrigatórios: inscricao_id, numero_ficha, nome' });
  }

  const preferencia = {
    items: [
      {
        id:          'ciclismo2026',
        title:       'Ciclismo Individual 2026 — Inscrição',
        description: `Participante: ${nome} · Ficha: ${numero_ficha}`,
        quantity:    1,
        unit_price:  1.00,   // ⚠️ TESTE — alterar para 160.00 antes de abrir ao público
        currency_id: 'BRL'
      }
    ],
    payer: {
      name:  nome,
      email: email || 'participante@ciclismo2026.com.br'
    },
    external_reference: String(inscricao_id),
    back_urls: {
      success: `${URL_SITE}/pagamento.html`,
      failure: `${URL_SITE}/pagamento.html`,
      pending: `${URL_SITE}/pagamento.html`
    },
    auto_return:        'approved',
    notification_url:   `${URL_SITE}/api/webhook-pagamento`,
    expires:            true,
    expiration_date_to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  };

  let resposta;
  try {
    resposta = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method:  'POST',
      headers: {
        'Authorization':    `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type':     'application/json',
        'X-Idempotency-Key': `cic2026-${inscricao_id}-${Date.now()}`
      },
      body: JSON.stringify(preferencia)
    });
  } catch (err) {
    return res.status(502).json({ erro: 'Falha ao conectar com o Mercado Pago', detalhe: err.message });
  }

  const resultado = await resposta.json();

  if (!resposta.ok) {
    return res.status(resposta.status).json({ erro: 'Mercado Pago retornou erro', detalhe: resultado });
  }

  const url = resultado.init_point || resultado.sandbox_init_point;

  return res.status(200).json({
    ok:            true,
    url,
    preferencia_id: resultado.id
  });
}
