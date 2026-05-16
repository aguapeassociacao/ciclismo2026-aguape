// ================================================================
// api/criar-pagamento.js  —  V3.4
// V3.3 — Atualização domínio para ciclismo.aguape.org
// V3.4 — Suporte a tipo_inscricao: normal (R$160) / participativa (R$70)
// PIX direto (tela própria) + Cartão (checkout MP) — sem boleto nem PIX no checkout MP
// Ciclismo Individual 2026 — Turismo de Base Comunitária
// © 2026 Ewerson Luiz de Oliveira
// ================================================================

export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
  const SUPABASE_URL    = process.env.SUPABASE_URL;
  const SUPABASE_KEY    = process.env.SUPABASE_KEY;
  const URL_SITE        = process.env.URL_SITE || 'https://ciclismo.aguape.org';

  if (!MP_ACCESS_TOKEN) {
    return res.status(500).json({ erro: 'Credenciais do Mercado Pago não configuradas' });
  }

  const {
    inscricao_id,
    numero_ficha,
    nome,
    email,
    metodo = 'cartao',         // 'pix' | 'cartao'
    tipo_inscricao = 'normal'  // 'normal' | 'participativa'
  } = req.body;

  // Valor conforme modalidade: normal=R$160 / participativa=R$70
  const VALOR = tipo_inscricao === 'participativa' ? 70.00 : 160.00;

  if (!inscricao_id || !numero_ficha || !nome) {
    return res.status(400).json({ erro: 'Campos obrigatórios: inscricao_id, numero_ficha, nome' });
  }

  // ── Busca CPF e e-mail do participante no Supabase ────────────
  // Necessário para PIX (MP Brasil exige CPF no payer)
  let cpf               = '';
  let emailParticipante = email || 'participante@ciclismo2026.com.br';

  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/inscricoes?id=eq.${inscricao_id}&select=participantes(cpf,email)`,
        {
          headers: {
            'apikey':        SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      );
      const rows = await r.json();
      if (Array.isArray(rows) && rows[0]?.participantes) {
        cpf               = rows[0].participantes.cpf?.replace(/\D/g, '') || '';
        emailParticipante = rows[0].participantes.email || emailParticipante;
      }
    } catch (e) {
      console.warn('criar-pagamento: nao foi possivel buscar CPF:', e.message);
    }
  }

  const idempotencyKey = `cic2026-${metodo}-${inscricao_id}-${Date.now()}`;
  const mpHeaders = {
    'Authorization':     `Bearer ${MP_ACCESS_TOKEN}`,
    'Content-Type':      'application/json',
    'X-Idempotency-Key': idempotencyKey
  };

  // ════════════════════════════════════════════════════════════
  // PIX DIRETO  →  POST /v1/payments
  // Retorna QR code para exibir na tela pix.html do site
  // ════════════════════════════════════════════════════════════
  if (metodo === 'pix') {

    // PIX expira em 30 minutos
    const expiraPix = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const payload = {
      payment_method_id:  'pix',
      transaction_amount:  VALOR,
      description:        `Ciclismo 2026 - Ficha ${numero_ficha} - ${nome}`,
      external_reference:  String(inscricao_id),
      date_of_expiration:  expiraPix,
      notification_url:   `${URL_SITE}/api/webhook-pagamento`,
      payer: {
        email:      emailParticipante,
        first_name: nome.split(' ')[0],
        last_name:  nome.split(' ').slice(1).join(' ') || 'Participante',
        ...(cpf ? { identification: { type: 'CPF', number: cpf } } : {})
      }
    };

    let resp;
    try {
      resp = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: mpHeaders,
        body:   JSON.stringify(payload)
      });
    } catch (err) {
      return res.status(502).json({ erro: 'Falha ao conectar com o Mercado Pago', detalhe: err.message });
    }

    const resultado = await resp.json();

    if (!resp.ok) {
      return res.status(resp.status).json({
        erro:    'Mercado Pago retornou erro (PIX)',
        detalhe: resultado
      });
    }

    const txData = resultado.point_of_interaction?.transaction_data;
    if (!txData?.qr_code) {
      return res.status(500).json({
        erro:    'QR Code PIX nao retornado pelo Mercado Pago',
        detalhe: resultado
      });
    }

    // Antecipa gravação do payment_id na inscrição (webhook confirma depois)
    if (SUPABASE_URL && SUPABASE_KEY) {
      fetch(`${SUPABASE_URL}/rest/v1/inscricoes?id=eq.${inscricao_id}`, {
        method: 'PATCH',
        headers: {
          'apikey':        SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type':  'application/json'
        },
        body: JSON.stringify({
          pagamento_id:     String(resultado.id),
          pagamento_metodo: 'pix',
          pix_qrcode:       txData.qr_code
        })
      }).catch(() => {});
    }

    return res.status(200).json({
      ok:             true,
      tipo:           'pix',
      payment_id:     resultado.id,
      qr_code:        txData.qr_code,         // copia-e-cola EMV
      qr_code_base64: txData.qr_code_base64,  // imagem PNG base64
      expiracao:      expiraPix
    });
  }

  // ════════════════════════════════════════════════════════════
  // CARTÃO  →  POST /checkout/preferences
  // Boleto excluído via excluded_payment_types
  // ════════════════════════════════════════════════════════════
  const preferencia = {
    items: [{
      id:          'ciclismo2026',
      title:       'Ciclismo Individual 2026 — Inscricao',
      description: `Participante: ${nome} - Ficha: ${numero_ficha}`,
      quantity:    1,
      unit_price:  VALOR,
      currency_id: 'BRL'
    }],
    payment_methods: {
      excluded_payment_types: [
        { id: 'ticket' },       // remove boleto
        { id: 'bank_transfer' }  // remove PIX (já tem tela própria no site)
      ]
    },
    payer: {
      name:  nome,
      email: emailParticipante
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

  let resp;
  try {
    resp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method:  'POST',
      headers: mpHeaders,
      body:    JSON.stringify(preferencia)
    });
  } catch (err) {
    return res.status(502).json({ erro: 'Falha ao conectar com o Mercado Pago', detalhe: err.message });
  }

  const resultado = await resp.json();

  if (!resp.ok) {
    return res.status(resp.status).json({
      erro:    'Mercado Pago retornou erro (cartao)',
      detalhe: resultado
    });
  }

  return res.status(200).json({
    ok:             true,
    tipo:           'cartao',
    url:            resultado.init_point || resultado.sandbox_init_point,
    preferencia_id: resultado.id
  });
}
