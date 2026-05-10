// ================================================================
// app.js — Lógica principal do formulário de inscrições
// Ciclismo Individual 2026 — Turismo de Base Comunitária
// Associação dos Seringueiros do Vale do Guaporé · Aguapé
// © 2026 Ewerson Luiz de Oliveira
// ================================================================

// ── Estado da aplicação ────────────────────────────────────────
let itemAtivo            = -1;
let sexoSelecionado      = '';
let participanteConsulta = null;
let inscricaoConsulta    = null;

// ══════════════════════════════════════════════════════════════
// ABAS (Nova inscrição / Já inscrito?)
// ══════════════════════════════════════════════════════════════
function mudarTab(t) {
  document.getElementById('aba-inscricao').style.display = t === 'inscricao' ? '' : 'none';
  document.getElementById('aba-consulta').style.display  = t === 'consulta'  ? '' : 'none';
  document.getElementById('tab-inscricao').classList.toggle('ativo', t === 'inscricao');
  document.getElementById('tab-consulta').classList.toggle('ativo',  t === 'consulta');
}

// ══════════════════════════════════════════════════════════════
// AUTORIZAÇÃO DE IMAGEM
// ══════════════════════════════════════════════════════════════
function toggleAutorizacao() {
  const c = document.getElementById('cb-autorizo');
  c.checked = !c.checked;
  document.getElementById('label-autorizo').classList.toggle('marcado', c.checked);
  verificarMenor();
}

function sincronizarAutorizacao() {
  const c = document.getElementById('cb-autorizo');
  document.getElementById('label-autorizo').classList.toggle('marcado', c.checked);
  verificarMenor();
}

function toggleResponsavel() {
  const c = document.getElementById('cb-responsavel');
  c.checked = !c.checked;
}

function verificarMenor() {
  const nasc  = document.getElementById('nascimento').value;
  const aut   = document.getElementById('cb-autorizo').checked;
  const aviso = document.getElementById('menor-aviso');
  if (!nasc || !aut) { aviso.classList.remove('visivel'); return; }
  const hoje = new Date();
  const d    = new Date(nasc + 'T00:00');
  const idade = hoje.getFullYear() - d.getFullYear() -
    (hoje < new Date(hoje.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
  aviso.classList.toggle('visivel', idade < 18);
}

// ══════════════════════════════════════════════════════════════
// REGULAMENTO
// ══════════════════════════════════════════════════════════════
function toggleRegulamento() {
  document.getElementById('reg-conteudo').classList.toggle('aberto');
  document.getElementById('reg-seta').classList.toggle('aberto');
}

function verificarAceite() {
  document.getElementById('btn-enviar').disabled =
    !document.getElementById('aceite-regulamento').checked;
}

// ══════════════════════════════════════════════════════════════
// SELEÇÃO DE GÊNERO/CATEGORIA
// ══════════════════════════════════════════════════════════════
function selecionarSexo(s) {
  sexoSelecionado = s;
  document.getElementById('sexo').value = s;
  document.getElementById('sexo-btn-m').className = 'sexo-btn' + (s === 'M' ? ' ativo-m' : '');
  document.getElementById('sexo-btn-f').className = 'sexo-btn' + (s === 'F' ? ' ativo-f' : '');

  // Mostra o badge da categoria selecionada
  const badge = document.getElementById('categoria-badge');
  if (badge) {
    badge.textContent = s === 'M' ? '🚴 Categoria Masculino' : '🚴 Categoria Feminino';
    badge.style.display = 'inline-block';
    badge.className = 'categoria-badge ' + (s === 'M' ? 'cat-m' : 'cat-f');
  }
}

// ══════════════════════════════════════════════════════════════
// TAMANHO DA CAMISETA
// ══════════════════════════════════════════════════════════════
function selecionarCamiseta(tam) {
  document.getElementById('tamanho-camiseta').value = tam;
  document.querySelectorAll('.tamanho-btn').forEach(btn => {
    btn.classList.toggle('ativo', btn.dataset.tam === tam);
  });
}

// ══════════════════════════════════════════════════════════════
// AUTOCOMPLETE DE CIDADES
// ══════════════════════════════════════════════════════════════
function filtrarCidades() {
  const input = document.getElementById('cidade');
  const lista = document.getElementById('cidade-lista');
  const termo = input.value.trim();
  itemAtivo = -1;

  if (!termo.length) { lista.classList.remove('aberta'); lista.innerHTML = ''; return; }

  const norm   = normalizar(termo);
  const filtro = MUNICIPIOS_RO.filter(c => normalizar(c).includes(norm));

  if (!filtro.length) { lista.classList.remove('aberta'); lista.innerHTML = ''; return; }

  lista.innerHTML = filtro.map(c => {
    const cn = normalizar(c);
    const p  = cn.indexOf(norm);
    const a  = c.slice(0, p);
    const d  = c.slice(p, p + termo.length);
    const dp = c.slice(p + termo.length);
    const e  = c.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `<div class="cidade-item" data-valor="${c}" onmousedown="event.preventDefault();selecionarCidade('${e}')">${a}<strong>${d}</strong>${dp}</div>`;
  }).join('');

  lista.classList.add('aberta');
}

function selecionarCidade(c) {
  document.getElementById('cidade').value       = c;
  document.getElementById('cidade-valor').value = c;
  document.getElementById('cidade-lista').classList.remove('aberta');
  document.getElementById('cidade-lista').innerHTML = '';
}

function validarCidadeBlur() {
  const input  = document.getElementById('cidade');
  const hidden = document.getElementById('cidade-valor');
  const typed  = input.value.trim();
  if (!typed) { hidden.value = ''; return; }
  const norm   = normalizar(typed);
  const achada = MUNICIPIOS_RO.find(c => normalizar(c) === norm);
  if (achada) {
    input.value  = achada;
    hidden.value = achada;
  } else {
    input.value  = '';
    hidden.value = '';
    input.placeholder = '⚠️ Cidade não encontrada — selecione da lista';
    setTimeout(() => { input.placeholder = 'Digite o nome da cidade...'; }, 3000);
  }
}

function navegarCidades(e) {
  const lista = document.getElementById('cidade-lista');
  const itens = lista.querySelectorAll('.cidade-item');
  if (!lista.classList.contains('aberta') || !itens.length) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (itemAtivo >= 0) itens[itemAtivo].classList.remove('ativo');
    itemAtivo = Math.min(itemAtivo + 1, itens.length - 1);
    itens[itemAtivo].classList.add('ativo');
    itens[itemAtivo].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (itemAtivo >= 0) itens[itemAtivo].classList.remove('ativo');
    itemAtivo = Math.max(itemAtivo - 1, 0);
    itens[itemAtivo].classList.add('ativo');
    itens[itemAtivo].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter' && itemAtivo >= 0) {
    e.preventDefault();
    selecionarCidade(itens[itemAtivo].dataset.valor);
  } else if (e.key === 'Escape') {
    lista.classList.remove('aberta');
  }
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('#cidade-wrap'))
    document.getElementById('cidade-lista').classList.remove('aberta');
});

// ══════════════════════════════════════════════════════════════
// ENVIAR INSCRIÇÃO
// ══════════════════════════════════════════════════════════════
async function enviarInscricao() {
  const nome     = document.getElementById('nome').value.trim();
  const cpf      = document.getElementById('cpf').value.trim();
  const sexo     = document.getElementById('sexo').value;
  const tel      = document.getElementById('telefone').value.trim();
  const cidade   = document.getElementById('cidade-valor').value.trim();
  const email    = document.getElementById('email').value.trim();
  const nasc     = document.getElementById('nascimento').value;
  const camiseta = document.getElementById('tamanho-camiseta').value;
  const erro     = document.getElementById('erro');
  const erroDup  = document.getElementById('erro-ja-inscrito');
  const btn      = document.getElementById('btn-enviar');

  erro.style.display    = 'none';
  erroDup.style.display = 'none';

  // ── Validações ────────────────────────────────────────────
  if (!nome || !cpf || !tel || !cidade) {
    erro.textContent = 'Preencha todos os campos obrigatórios.';
    erro.style.display = 'block';
    window.scrollTo({ top: erro.offsetTop - 80, behavior: 'smooth' });
    return;
  }

  if (!validarCPF(cpf)) {
    erro.textContent = 'CPF inválido. Verifique os números digitados e tente novamente.';
    erro.style.display = 'block';
    const cpfEl = document.getElementById('cpf');
    marcarCPFerro(cpfEl);
    cpfEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  if (!sexo) {
    erro.textContent = 'Selecione sua categoria (Masculino ou Feminino).';
    erro.style.display = 'block';
    document.getElementById('sexo-btn-m').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  if (!camiseta) {
    erro.textContent = 'Selecione o tamanho da camiseta.';
    erro.style.display = 'block';
    document.getElementById('camiseta-wrap').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  if (!document.getElementById('cb-autorizo').checked) {
    erro.textContent = 'É necessário autorizar o uso de imagem para participar.';
    erro.style.display = 'block';
    document.getElementById('label-autorizo').classList.add('autorizacao-nao-aceita');
    document.getElementById('label-autorizo').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  document.getElementById('label-autorizo').classList.remove('autorizacao-nao-aceita');

  if (!document.getElementById('aceite-regulamento').checked) {
    erro.textContent = 'Você precisa aceitar o Regulamento para concluir a inscrição.';
    erro.style.display = 'block';
    document.getElementById('aceite-regulamento').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // ── Verificar menor de idade ───────────────────────────────
  let nResp = null;
  if (eMenor()) {
    const cr = document.getElementById('cb-responsavel').checked;
    const nr = document.getElementById('nome-responsavel').value.trim();
    if (!cr || !nr) {
      erro.textContent = 'Participantes menores de idade precisam de autorização do responsável legal com nome completo.';
      erro.style.display = 'block';
      document.getElementById('nome-responsavel').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    nResp = nr;
  }

  btn.disabled    = true;
  btn.textContent = 'Enviando...';

  // ── Salvar participante ────────────────────────────────────
  const ficha = gerarFicha();
  const telNorm = normalizarTelefone(tel);

  const resPart = await post('participantes', {
    nome_completo:      nome,
    cpf,
    sexo,
    email:              email || null,
    telefone:           telNorm || tel,
    data_nascimento:    nasc   || null,
    cidade,
    uf:                 'RO',
    tamanho_camiseta:   camiseta,
    autorizacao_imagem: true,
    nome_responsavel:   nResp  || null,
  });

  if (!resPart || resPart.length === 0 || resPart.code) {
    const dup = resPart?.message?.includes('unique') || resPart?.code === '23505';
    if (dup) {
      erroDup.style.display = 'block';
      erroDup.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      erro.textContent = 'Erro ao enviar. Tente novamente.';
      erro.style.display = 'block';
    }
    btn.disabled    = false;
    btn.textContent = 'Enviar inscrição';
    return;
  }

  const pid = resPart[0].id;

  // ── Salvar inscrição ───────────────────────────────────────
  const resInsc = await post('inscricoes', {
    participante_id:  pid,
    modalidade_id:    sexo === 'M' ? 1 : 2,   // 1 = Masc · 2 = Fem
    numero_ficha:     ficha,
    status:           'pendente_pagamento',
  });

  const inscFalhou = !resInsc || (!Array.isArray(resInsc) && (resInsc.code || resInsc.erro || resInsc.error));
  if (inscFalhou) {
    try { await deletar('participantes', pid); } catch(_) {}
    erro.textContent = 'Erro ao salvar inscrição (' + (resInsc?.message || resInsc?.erro || 'desconhecido') + '). Tente novamente.';
    erro.style.display = 'block';
    window.scrollTo({ top: erro.offsetTop - 80, behavior: 'smooth' });
    btn.disabled    = false;
    btn.textContent = 'Enviar inscrição';
    return;
  }

  // Guarda o id da inscrição para usar no pagamento
  const inscricaoId = Array.isArray(resInsc) && resInsc.length > 0 ? resInsc[0].id : null;

  // ── Tela de sucesso ────────────────────────────────────────
  document.getElementById('formulario').style.display = 'none';
  document.getElementById('sucesso').style.display    = 'block';
  document.getElementById('numero-ficha').textContent = ficha;
  document.getElementById('sucesso-nome').textContent = nome;
  document.getElementById('sucesso-categoria').textContent =
    sexo === 'M' ? '🚴 Ciclismo Masculino' : '🚴 Ciclismo Feminino';
  document.getElementById('sucesso-camiseta').textContent = camiseta;

  const msg = encodeURIComponent(
    `🚴 Estou inscrito no *Ciclismo Individual 2026* — Turismo de Base Comunitária!\n` +
    `📍 Costa Marques, Rondônia · Vale do Guaporé\n` +
    `📅 ${DATA_EVENTO}\n` +
    `📋 Ficha: *${ficha}*\n` +
    `👕 Camiseta: ${camiseta}\n\n` +
    `📲 Inscreva-se também:\n${URL_SITE}`
  );
  document.getElementById('share-link').href = 'https://wa.me/?text=' + msg;

  // Configura o botão de pagamento
  const btnPagar = document.getElementById('btn-pagar-agora');
  if (btnPagar && inscricaoId) {
    btnPagar.style.display = 'block';
    btnPagar.onclick = () => irParaPagamento(inscricaoId, ficha, nome, email);
  }

  // Mostra a referência que aparecerá no extrato do MP
  const avisoRef = document.getElementById('aviso-ficha-ref');
  if (avisoRef) {
    avisoRef.textContent = `Referência no extrato: "${ficha} · ${nome}"`;
  }

  // Gerar QR Code
  setTimeout(() => gerarQRCode(ficha, nome), 100);

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ══════════════════════════════════════════════════════════════
// PAGAMENTO — REDIRECIONAR PARA O MERCADO PAGO
// ══════════════════════════════════════════════════════════════
async function irParaPagamento(inscricaoId, ficha, nome, email) {
  const btn = document.getElementById('btn-pagar-agora');
  if (btn) {
    btn.textContent = '⏳ Preparando pagamento...';
    btn.disabled    = true;
    btn.style.opacity = '0.7';
  }

  try {
    const r = await fetch('https://ciclismo2026-funcoes.onrender.com/criar-pagamento', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ inscricao_id: inscricaoId, numero_ficha: ficha, nome, email })
    });

    const dados = await r.json();

    if (!dados.ok || !dados.url) {
      throw new Error(dados.erro || 'URL de pagamento não recebida');
    }

    // Redireciona para a página de pagamento do Mercado Pago
    window.location.href = dados.url;

  } catch (err) {
    console.error('Erro ao criar pagamento:', err);
    if (btn) {
      btn.textContent = '⚡ Pagar agora — R$ 160,00';
      btn.disabled    = false;
      btn.style.opacity = '1';
    }
    alert('Erro ao conectar com o sistema de pagamento. Tente novamente em alguns segundos.');
  }
}


function gerarQRCode(ficha, nome) {
  const el = document.getElementById('qrcode-sucesso');
  if (!el || typeof QRCode === 'undefined') return;
  el.innerHTML = '';
  const url = `${URL_SITE}/consulta.html?ficha=${ficha}`;
  new QRCode(el, {
    text:           url,
    width:          140,
    height:         140,
    colorDark:      '#0d2810',
    colorLight:     '#ffffff',
    correctLevel:   QRCode.CorrectLevel.M
  });
}

// ══════════════════════════════════════════════════════════════
// CONSULTA DE INSCRIÇÃO
// ══════════════════════════════════════════════════════════════
function irParaConsultaComCPF() {
  const cpf = document.getElementById('cpf').value.trim();
  mudarTab('consulta');
  if (cpf) {
    document.getElementById('consulta-input').value = cpf;
    buscarInscricao();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limparResultadoConsulta() {
  document.getElementById('consulta-resultado').style.display = 'none';
  document.getElementById('consulta-erro').style.display      = 'none';
  participanteConsulta = null;
  inscricaoConsulta    = null;
}

async function buscarInscricao() {
  const inp  = document.getElementById('consulta-input').value.trim();
  const erro = document.getElementById('consulta-erro');
  const btn  = document.getElementById('btn-buscar');
  erro.style.display = 'none';
  document.getElementById('consulta-resultado').style.display = 'none';

  if (!inp) {
    erro.textContent   = 'Informe o CPF ou o número da ficha (ex: CIC-1234).';
    erro.style.display = 'block';
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Buscando...';

  let enc = null;
  const dig = inp.replace(/\D/g, '');

  // Buscar por CPF
  if (dig.length === 11) {
    const fmt = dig.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    let r = await get('participantes', 'cpf=eq.' + encodeURIComponent(fmt) + '&select=*');
    if (Array.isArray(r) && r.length > 0) enc = r[0];
    else {
      r = await get('participantes', 'cpf=eq.' + encodeURIComponent(dig) + '&select=*');
      if (Array.isArray(r) && r.length > 0) enc = r[0];
    }
  }

  // Buscar por número de ficha
  if (!enc) {
    const fi = inp.toUpperCase().replace(/\s/g, '').replace(/^CIC-?(\d+)$/, 'CIC-$1');
    if (/^CIC-\d+$/.test(fi)) {
      const insc = await get('inscricoes', 'numero_ficha=eq.' + encodeURIComponent(fi) + '&select=participante_id&limit=1');
      if (Array.isArray(insc) && insc.length > 0) {
        const p = await get('participantes', 'id=eq.' + insc[0].participante_id + '&select=*');
        if (Array.isArray(p) && p.length > 0) enc = p[0];
      }
    }
  }

  btn.disabled    = false;
  btn.textContent = 'Buscar';

  if (!enc) {
    erro.textContent   = 'Nenhuma inscrição encontrada com este CPF ou ficha.';
    erro.style.display = 'block';
    return;
  }

  const insc = await get('inscricoes', 'participante_id=eq.' + enc.id + '&select=*&limit=1');
  participanteConsulta = enc;
  inscricaoConsulta    = Array.isArray(insc) && insc.length > 0 ? insc[0] : null;
  renderizarConsulta();
}

function renderizarConsulta() {
  const p  = participanteConsulta;
  const i  = inscricaoConsulta;
  const el = document.getElementById('consulta-perfil');

  const statusLabel = {
    pendente_pagamento:  '⏳ Aguardando pagamento',
    aguardando_boleto:   '📄 Boleto gerado — aguardando compensação',
    pago:                '✅ Pagamento confirmado',
    cancelado:           '❌ Inscrição cancelada',
  };
  const statusCor = {
    pendente_pagamento: '#b45309',
    aguardando_boleto:  '#1d4ed8',
    pago:               '#15803d',
    cancelado:          '#dc2626',
  };

  const catLabel = p.sexo === 'M' ? '🚴 Ciclismo Masculino' : '🚴 Ciclismo Feminino';
  const status   = i?.status || 'pendente_pagamento';
  const cor      = statusCor[status] || '#374151';
  const label    = statusLabel[status] || status;

  el.innerHTML = `
    <div class="perfil-nome">${p.nome_completo}</div>
    <div class="perfil-info">📋 Ficha: <strong>${i?.numero_ficha || '—'}</strong></div>
    <div class="perfil-info">${catLabel}</div>
    <div class="perfil-info">👕 Camiseta: <strong>${p.tamanho_camiseta || '—'}</strong></div>
    <div class="perfil-info">📍 ${p.cidade} / ${p.uf}</div>
    <div class="perfil-status" style="color:${cor};font-weight:700;margin-top:10px;font-size:15px;">${label}</div>
  `;

  document.getElementById('consulta-resultado').style.display = 'block';
}

// ══════════════════════════════════════════════════════════════
// INICIALIZAÇÃO
// ══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
  // Mostrar data de acesso no rodapé
  const el = document.getElementById('data-acesso');
  if (el) el.textContent = new Date().toLocaleDateString('pt-BR');

  // Desabilitar botão de envio até aceitar regulamento
  document.getElementById('btn-enviar').disabled = true;

  // Verificar se inscrições estão abertas
  if (!inscricaoAberta()) {
    const btn = document.getElementById('btn-enviar');
    if (btn) {
      btn.disabled    = true;
      btn.textContent = '⚠️ Inscrições encerradas';
      btn.style.background = '#6b7280';
    }
    const aviso = document.getElementById('aviso-encerrado');
    if (aviso) aviso.style.display = 'block';
  }

  // Detectar ficha na URL (ex: consulta.html?ficha=CIC-1234)
  const params = new URLSearchParams(window.location.search);
  const fichaUrl = params.get('ficha');
  if (fichaUrl) {
    mudarTab('consulta');
    document.getElementById('consulta-input').value = fichaUrl;
    buscarInscricao();
  }
});
