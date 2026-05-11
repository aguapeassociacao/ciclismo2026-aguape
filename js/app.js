// ================================================================
// app.js — Lógica principal do formulário de inscrições
// Ciclismo Individual 2026 — Turismo de Base Comunitária
// Associação dos Seringueiros do Vale do Guaporé · Aguapé
// © 2026 Ewerson Luiz de Oliveira
// V3.2 — PIX direto + Cartão (sem boleto) · Modal de escolha
// V3.2 — botão de pagamento via createElement fora do card (fix Safari/iOS mobile)
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

  const ficha   = gerarFicha();
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

  const resInsc = await post('inscricoes', {
    participante_id:  pid,
    modalidade_id:    sexo === 'M' ? 1 : 2,
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

  const btnPagar = document.getElementById('btn-pagar-agora');
  if (btnPagar && inscricaoId) {
    btnPagar.style.display = 'block';
    btnPagar.onclick = () => irParaPagamento(inscricaoId, ficha, nome, email);
  }

  const avisoRef = document.getElementById('aviso-ficha-ref');
  if (avisoRef) {
    avisoRef.textContent = `Referência no extrato: "${ficha} · ${nome}"`;
  }

  setTimeout(() => gerarQRCode(ficha, nome), 100);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ══════════════════════════════════════════════════════════════
// PAGAMENTO — MODAL DE ESCOLHA (PIX ou Cartão)
// ══════════════════════════════════════════════════════════════

/**
 * Ponto de entrada: exibe o modal de escolha do método de pagamento.
 * Chamado pelo botão "Pagar agora" tanto na tela de sucesso quanto na consulta.
 */
function irParaPagamento(inscricaoId, ficha, nome, email, btnEl) {
  // Restaura o botão de origem caso o usuário feche o modal
  const btnOrigem = btnEl || document.getElementById('btn-pagar-agora');
  abrirModalPagamento(inscricaoId, ficha, nome, email, btnOrigem);
}

/**
 * Cria e exibe o modal overlay com as opções PIX e Cartão.
 */
function abrirModalPagamento(inscricaoId, ficha, nome, email, btnOrigem) {
  // Remove modal anterior se existir
  const antigo = document.getElementById('modal-pagamento');
  if (antigo) antigo.remove();

  const modal = document.createElement('div');
  modal.id = 'modal-pagamento';
  modal.innerHTML = `
    <div id="modal-overlay" onclick="fecharModalPagamento()"></div>
    <div id="modal-box" role="dialog" aria-modal="true" aria-label="Escolha o método de pagamento">

      <button class="modal-fechar" onclick="fecharModalPagamento()" aria-label="Fechar">✕</button>

      <div class="modal-topo">
        <div class="modal-icone">💳</div>
        <h2 class="modal-titulo">Como deseja pagar?</h2>
        <p class="modal-sub">Inscrição · Ciclismo Individual 2026 · <strong>R$ 160,00</strong></p>
      </div>

      <div class="modal-opcoes">

        <!-- PIX -->
        <button class="modal-opcao" id="btn-modal-pix" onclick="processarPagamento(${inscricaoId},'${ficha.replace(/'/g,"\\'")}','${nome.replace(/'/g,"\\'")}','${(email||'').replace(/'/g,"\\'")}','pix')">
          <div class="opcao-icone opcao-icone-pix">⚡</div>
          <div class="opcao-info">
            <div class="opcao-nome">PIX</div>
            <div class="opcao-desc">QR Code · aprovação imediata</div>
          </div>
          <div class="opcao-seta">→</div>
        </button>

        <!-- Cartão -->
        <button class="modal-opcao" id="btn-modal-cartao" onclick="processarPagamento(${inscricaoId},'${ficha.replace(/'/g,"\\'")}','${nome.replace(/'/g,"\\'")}','${(email||'').replace(/'/g,"\\'")}','cartao')">
          <div class="opcao-icone opcao-icone-cartao">💳</div>
          <div class="opcao-info">
            <div class="opcao-nome">Cartão de Crédito</div>
            <div class="opcao-desc">Parcelamento disponível</div>
          </div>
          <div class="opcao-seta">→</div>
        </button>

      </div>

      <div id="modal-processando" style="display:none">
        <div class="modal-spinner"></div>
        <p class="modal-processando-txt">Preparando pagamento…</p>
      </div>

      <p class="modal-seguranca">🔒 Pagamento processado com segurança pelo Mercado Pago</p>
    </div>
  `;

  // Estilos inline do modal (autônomo, não depende de styles.css)
  const style = document.createElement('style');
  style.id = 'modal-pagamento-css';
  style.textContent = `
    #modal-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,.65);
      backdrop-filter: blur(4px);
      z-index: 9998;
      animation: fadeIn .2s ease;
    }
    #modal-box {
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%,-50%);
      background: #0d2810;
      border: 1px solid rgba(45,122,58,.45);
      border-radius: 22px;
      padding: 32px 28px 24px;
      width: min(420px, calc(100vw - 32px));
      z-index: 9999;
      box-shadow: 0 24px 64px rgba(0,0,0,.6);
      animation: slideUp .22s ease;
    }
    @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
    @keyframes slideUp { from{opacity:0;transform:translate(-50%,-44%)} to{opacity:1;transform:translate(-50%,-50%)} }

    .modal-fechar {
      position: absolute; top: 14px; right: 16px;
      background: rgba(255,255,255,.08); border: none;
      color: rgba(245,234,208,.5); font-size: 16px;
      width: 30px; height: 30px; border-radius: 50%;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background .15s, color .15s;
    }
    .modal-fechar:hover { background: rgba(255,255,255,.15); color: #f5ead0; }

    .modal-topo { text-align: center; margin-bottom: 24px; }
    .modal-icone { font-size: 36px; margin-bottom: 10px; }
    .modal-titulo {
      font-family: 'Cinzel', serif; font-size: 18px; font-weight: 700;
      color: #f5ead0; margin-bottom: 6px;
    }
    .modal-sub { font-size: 13px; color: rgba(245,234,208,.55); }
    .modal-sub strong { color: #f0b429; }

    .modal-opcoes { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }

    .modal-opcao {
      display: flex; align-items: center; gap: 14px;
      padding: 16px 18px;
      background: rgba(45,122,58,.1);
      border: 1px solid rgba(45,122,58,.28);
      border-radius: 14px;
      cursor: pointer;
      transition: background .15s, border-color .15s, transform .1s;
      text-align: left; width: 100%;
      color: #f5ead0;
    }
    .modal-opcao:hover {
      background: rgba(45,122,58,.22);
      border-color: rgba(45,122,58,.5);
      transform: translateY(-1px);
    }
    .modal-opcao:active { transform: translateY(0); }
    .modal-opcao:disabled { opacity: .5; cursor: not-allowed; transform: none; }

    .opcao-icone {
      width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; font-size: 22px;
    }
    .opcao-icone-pix    { background: linear-gradient(135deg,#00b4d8,#0077b6); }
    .opcao-icone-cartao { background: linear-gradient(135deg,#7c3aed,#4c1d95); }

    .opcao-info { flex: 1; }
    .opcao-nome { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
    .opcao-desc { font-size: 12px; color: rgba(245,234,208,.5); }
    .opcao-seta { font-size: 18px; color: rgba(245,234,208,.3); flex-shrink: 0; }

    .modal-processando {
      text-align: center; padding: 12px 0;
    }
    .modal-spinner {
      width: 36px; height: 36px;
      border: 3px solid rgba(125,207,138,.2);
      border-top-color: #7dcf8a;
      border-radius: 50%; animation: girar .8s linear infinite;
      margin: 0 auto 12px;
    }
    @keyframes girar { to { transform: rotate(360deg); } }
    .modal-processando-txt { font-size: 13px; color: rgba(245,234,208,.6); }

    .modal-seguranca {
      text-align: center; font-size: 11px;
      color: rgba(245,234,208,.25); margin-top: 4px;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(modal);

  // Fecha com ESC
  document.addEventListener('keydown', _fecharComEsc);
}

function _fecharComEsc(e) {
  if (e.key === 'Escape') fecharModalPagamento();
}

function fecharModalPagamento() {
  const modal = document.getElementById('modal-pagamento');
  const style = document.getElementById('modal-pagamento-css');
  if (modal) modal.remove();
  if (style) style.remove();
  document.removeEventListener('keydown', _fecharComEsc);
}

/**
 * Processa o pagamento após o usuário escolher o método.
 * metodo: 'pix' | 'cartao'
 */
async function processarPagamento(inscricaoId, ficha, nome, email, metodo) {
  // Mostra spinner, desabilita botões
  const btnPix    = document.getElementById('btn-modal-pix');
  const btnCartao = document.getElementById('btn-modal-cartao');
  const processd  = document.getElementById('modal-processando');
  const opcoes    = document.querySelector('.modal-opcoes');

  if (btnPix)    btnPix.disabled    = true;
  if (btnCartao) btnCartao.disabled = true;
  if (opcoes)    opcoes.style.display    = 'none';
  if (processd)  processd.style.display  = 'block';

  try {
    const r = await fetch('/api/criar-pagamento', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ inscricao_id: inscricaoId, numero_ficha: ficha, nome, email, metodo })
    });

    const dados = await r.json();

    if (!dados.ok) {
      throw new Error(dados.erro || 'Erro ao criar pagamento');
    }

    if (metodo === 'pix') {
      // Grava dados do PIX no sessionStorage e redireciona para pix.html
      if (!dados.qr_code) {
        throw new Error('QR Code PIX não recebido do servidor');
      }
      sessionStorage.setItem('pix_data', JSON.stringify({
        payment_id:     dados.payment_id,
        qr_code:        dados.qr_code,
        qr_code_base64: dados.qr_code_base64,
        expiracao:      dados.expiracao,
        ficha,
        nome
      }));
      fecharModalPagamento();
      window.location.href = '/pix.html';

    } else {
      // Cartão: redireciona para checkout do Mercado Pago
      if (!dados.url) {
        throw new Error('URL de checkout não recebida do servidor');
      }
      fecharModalPagamento();
      window.location.href = dados.url;
    }

  } catch (err) {
    console.error('processarPagamento:', err);

    // Restaura o modal para o estado inicial
    if (opcoes)   opcoes.style.display   = '';
    if (processd) processd.style.display  = 'none';
    if (btnPix)   btnPix.disabled    = false;
    if (btnCartao) btnCartao.disabled = false;

    // Exibe erro dentro do modal
    let msgErro = document.getElementById('modal-erro-txt');
    if (!msgErro) {
      msgErro = document.createElement('p');
      msgErro.id = 'modal-erro-txt';
      msgErro.style.cssText = 'text-align:center;font-size:12px;color:#ef4444;margin-top:8px;padding:0 4px;';
      document.getElementById('modal-box')?.appendChild(msgErro);
    }
    msgErro.textContent = `⚠️ ${err.message || 'Erro de conexão. Tente novamente.'}`;
  }
}

function gerarQRCode(ficha, nome) {
  const el = document.getElementById('qrcode-sucesso');
  if (!el || typeof QRCode === 'undefined') return;
  el.innerHTML = '';
  const url = `${URL_SITE}/consulta.html?ficha=${ficha}`;
  new QRCode(el, {
    text:         url,
    width:        140,
    height:       140,
    colorDark:    '#0d2810',
    colorLight:   '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
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

  if (dig.length === 11) {
    const fmt = dig.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    let r = await get('participantes', 'cpf=eq.' + encodeURIComponent(fmt) + '&select=*');
    if (Array.isArray(r) && r.length > 0) enc = r[0];
    else {
      r = await get('participantes', 'cpf=eq.' + encodeURIComponent(dig) + '&select=*');
      if (Array.isArray(r) && r.length > 0) enc = r[0];
    }
  }

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
    pendente_pagamento: '⏳ Aguardando pagamento',
    aguardando_boleto:  '⏳ Aguardando pagamento',
    pago:               '✅ Pagamento confirmado',
    cancelado:          '⚠️ Tentativa anterior não concluída — tente novamente',
  };
  const statusCor = {
    pendente_pagamento: '#b45309',
    aguardando_boleto:  '#b45309',
    pago:               '#15803d',
    cancelado:          '#b45309',
  };

  const catLabel  = p.sexo === 'M' ? '🚴 Ciclismo Masculino' : '🚴 Ciclismo Feminino';
  const status    = i?.status || 'pendente_pagamento';
  const cor       = statusCor[status] || '#374151';
  const label     = statusLabel[status] || status;
  const podePagar = status === 'pendente_pagamento' || status === 'aguardando_boleto' || status === 'cancelado';
  const btnId     = `btn-pagar-consulta-${i?.id || 0}`;

  // ── Dados do participante (sem botão — botão vai fora do card) ──
  el.innerHTML = `
    <div class="perfil-nome">${p.nome_completo}</div>
    <div class="perfil-info">📋 Ficha: <strong>${i?.numero_ficha || '—'}</strong></div>
    <div class="perfil-info">${catLabel}</div>
    <div class="perfil-info">👕 Camiseta: <strong>${p.tamanho_camiseta || '—'}</strong></div>
    <div class="perfil-info">📍 ${p.cidade} / ${p.uf}</div>
    <div class="perfil-status" style="color:${cor};font-weight:700;margin-top:10px;font-size:15px;">${label}</div>
    ${status === 'pago' ? `
      <div style="margin-top:14px;background:rgba(21,128,61,.1);border:1px solid rgba(21,128,61,.3);border-radius:10px;padding:12px 14px;font-size:12px;color:#86efac;line-height:1.6;">
        ✅ Pagamento confirmado. Sua vaga está garantida!
      </div>
    ` : ''}
  `;

  document.getElementById('consulta-resultado').style.display = 'block';

  // ── Remove botão anterior se existir ──────────────────────────
  const wrapAnterior = document.getElementById('consulta-pagar-wrap');
  if (wrapAnterior) wrapAnterior.remove();

  // ── Botão de pagamento criado FORA do card via createElement ──
  // (evita problema de clipping por backdrop-filter no Safari/iOS)
  if (podePagar && i?.id) {
    const wrap = document.createElement('div');
    wrap.id = 'consulta-pagar-wrap';
    wrap.style.cssText = 'margin-top:12px;padding:0 0 8px;';

    const aviso = document.createElement('p');
    aviso.style.cssText = 'font-size:12px;color:rgba(245,234,208,.5);margin-bottom:12px;line-height:1.5;padding:0 2px;';
    aviso.textContent = 'Sua inscrição está salva. Clique abaixo para realizar o pagamento agora.';

    const btn = document.createElement('button');
    btn.id    = btnId;
    btn.style.cssText = [
      'width:100%',
      'padding:16px',
      'background:linear-gradient(135deg,#c8920a 0%,#ffd700 50%,#c8920a 100%)',
      'color:#3d1a0a',
      'border:none',
      'border-radius:50px',
      'font-size:16px',
      'font-weight:700',
      'cursor:pointer',
      "font-family:'Cinzel',serif",
      'letter-spacing:1px',
      'box-shadow:0 4px 20px rgba(200,146,10,.4)',
      'display:block'
    ].join(';');
    btn.textContent = '⚡ Pagar agora — R$ 160,00';
    btn.addEventListener('click', () => {
      irParaPagamento(i.id, i.numero_ficha, p.nome_completo, p.email || '', btn);
    });

    wrap.appendChild(aviso);
    wrap.appendChild(btn);
    document.getElementById('consulta-resultado').appendChild(wrap);

    // Rola até o botão (fix mobile)
    setTimeout(() => {
      btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);

  } else if (status !== 'pago') {
    setTimeout(() => {
      document.getElementById('consulta-resultado')
        .scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }
}

// ══════════════════════════════════════════════════════════════
// INICIALIZAÇÃO
// ══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
  const el = document.getElementById('data-acesso');
  if (el) el.textContent = new Date().toLocaleDateString('pt-BR');

  document.getElementById('btn-enviar').disabled = true;

  if (!inscricaoAberta()) {
    const btn = document.getElementById('btn-enviar');
    if (btn) {
      btn.disabled         = true;
      btn.textContent      = '⚠️ Inscrições encerradas';
      btn.style.background = '#6b7280';
    }
    const aviso = document.getElementById('aviso-encerrado');
    if (aviso) aviso.style.display = 'block';
  }

  const params   = new URLSearchParams(window.location.search);
  const fichaUrl = params.get('ficha');
  if (fichaUrl) {
    mudarTab('consulta');
    document.getElementById('consulta-input').value = fichaUrl;
    buscarInscricao();
  }
});
