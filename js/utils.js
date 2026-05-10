// ================================================================
// utils.js — Funções utilitárias (máscaras, validações, API segura)
// Ciclismo Individual 2026 — Turismo de Base Comunitária
// © 2026 Ewerson Luiz de Oliveira
// ================================================================

// ── URL base das funções no Render ─────────────────────────────
const API_BASE = 'https://ciclismo2026-funcoes.onrender.com';

// ── Comunicação segura com o servidor (/api/supabase) ──────────
async function get(tabela, query = '') {
  const r = await fetch(`${API_BASE}/api/supabase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acao: 'buscar', tabela, query })
  });
  return r.json();
}

async function post(tabela, dados) {
  const r = await fetch(`${API_BASE}/api/supabase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acao: 'inserir', tabela, dados })
  });
  return r.json();
}

async function patch(tabela, id, dados) {
  const r = await fetch(`${API_BASE}/api/supabase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acao: 'atualizar', tabela, id, dados })
  });
  return r.json();
}

async function deletar(tabela, id) {
  const r = await fetch(`${API_BASE}/api/supabase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acao: 'deletar', tabela, id })
  });
  return r.json();
}

async function deletarPorCampo(tabela, campo, valor) {
  const r = await fetch(`${API_BASE}/api/supabase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acao: 'deletarPorCampo', tabela, campo, valor })
  });
  return r.json();
}

// ── Máscara de telefone ─────────────────────────────────────────
function mascararTelefone(el) {
  let v = el.value.replace(/\D/g, '');
  if (v.length > 11) v = v.replace(/^(55)?(\d{10,11})$/, '$2');
  v = v.slice(0, 11);
  if (v.length === 0) { el.value = ''; return; }
  if      (v.length <= 2)  v = `(${v}`;
  else if (v.length <= 3)  v = `(${v.slice(0,2)}) ${v.slice(2)}`;
  else if (v.length <= 7)  v = `(${v.slice(0,2)}) ${v.slice(2,3)} ${v.slice(3)}`;
  else if (v.length <= 11) v = `(${v.slice(0,2)}) ${v.slice(2,3)} ${v.slice(3,7)}-${v.slice(7)}`;
  el.value = v;
}

// ── Normaliza telefone para o banco ────────────────────────────
function normalizarTelefone(raw) {
  if (!raw) return raw;
  let digits = String(raw).replace(/\D/g, '');
  if (digits.length > 11 && digits.startsWith('55')) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  if (digits.length < 10) return raw;
  if (digits.length === 10) digits = digits.slice(0, 2) + '9' + digits.slice(2);
  return `(${digits.slice(0,2)}) ${digits.slice(2,3)} ${digits.slice(3,7)}-${digits.slice(7)}`;
}

// ── Máscara de CPF ─────────────────────────────────────────────
function mascararCPF(el) {
  let v = el.value.replace(/\D/g, '').slice(0, 11);
  if      (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
  else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d+)/,            '$1.$2.$3');
  else if (v.length > 3) v = v.replace(/(\d{3})(\d+)/,                   '$1.$2');
  el.value = v;
}

// ── Validação de CPF (algoritmo oficial) ───────────────────────
function validarCPF(cpf) {
  const c = cpf.replace(/\D/g, '');
  if (c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(c[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(c[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(c[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(c[10])) return false;
  return true;
}

// ── Validação visual do CPF ────────────────────────────────────
function validarCampoCPF(el) {
  const cpf = el.value.trim();
  if (!cpf) { marcarCPFok(el); return; }
  const digits = cpf.replace(/\D/g, '');
  if (digits.length < 11) { marcarCPFok(el); return; }
  if (validarCPF(cpf)) { marcarCPFok(el); }
  else                  { marcarCPFerro(el); }
}

function marcarCPFerro(el) {
  el.style.borderColor = '#dc2626';
  el.style.boxShadow   = '0 0 0 3px rgba(220,38,38,0.1)';
  let msg = el.parentElement.querySelector('.cpf-erro-msg');
  if (!msg) {
    msg = document.createElement('div');
    msg.className = 'cpf-erro-msg';
    msg.style.cssText = 'color:#dc2626;font-size:11px;margin-top:4px;';
    el.parentElement.appendChild(msg);
  }
  msg.textContent = '⚠️ CPF inválido. Verifique os números digitados.';
}

function marcarCPFok(el) {
  el.style.borderColor = '';
  el.style.boxShadow   = '';
  const msg = el.parentElement.querySelector('.cpf-erro-msg');
  if (msg) msg.remove();
}

// ── Normalizar texto (remover acentos para autocomplete) ────────
function normalizar(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// ── Gerar número de ficha — CIC-XXXX ──────────────────────────
function gerarFicha() {
  return PREFIXO_FICHA + '-' + String(Math.floor(Math.random() * 9000) + 1000);
}

// ── Verificar se participante é menor de idade ─────────────────
function eMenor() {
  const nasc = document.getElementById('nascimento').value;
  if (!nasc) return false;
  const hoje = new Date();
  const d    = new Date(nasc + 'T00:00');
  return (hoje.getFullYear() - d.getFullYear() -
    (hoje < new Date(hoje.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0)) < 18;
}

// ── Máscara inteligente para campo de consulta ─────────────────
function mascararConsultaInput(el) {
  limparResultadoConsulta();
  const v = el.value;
  if (/^[a-zA-Z]/.test(v.replace(/\s/g, ''))) {
    el.value = v.toUpperCase();
    return;
  }
  let d = v.replace(/\D/g, '').slice(0, 11);
  if      (d.length > 9) d = d.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
  else if (d.length > 6) d = d.replace(/(\d{3})(\d{3})(\d+)/,            '$1.$2.$3');
  else if (d.length > 3) d = d.replace(/(\d{3})(\d+)/,                   '$1.$2');
  el.value = d;
}
