// ================================================================
// config.js — Configurações e constantes
// Ciclismo Individual 2026 — Turismo de Base Comunitária
// Associação dos Seringueiros do Vale do Guaporé · Aguapé
// © 2026 Ewerson Luiz de Oliveira
// ================================================================

// Data limite para inscrições (01/08/2026 às 23:59)
const DATA_LIMITE_INSCRICAO = new Date('2026-08-01T23:59:00');

// Data do evento
const DATA_EVENTO = '09 de agosto de 2026';

// Valor da inscrição
const VALOR_INSCRICAO = 'R$ 160,00';

// Verifica se as inscrições estão abertas
function inscricaoAberta() {
  return new Date() <= DATA_LIMITE_INSCRICAO;
}

// Tamanhos de camiseta disponíveis
const TAMANHOS_CAMISETA = ['P', 'M', 'G', 'GG', 'XG'];

// Prefixo da ficha de inscrição
const PREFIXO_FICHA = 'CIC';

// URL do site
const URL_SITE = 'https://ciclismo.aguape.org';

// Lista de municípios de Rondônia (autocomplete)
const MUNICIPIOS_RO = [
  "Alta Floresta D'Oeste", "Alto Alegre dos Parecis", "Alto Paraíso",
  "Ariquemes", "Buritis", "Cabixi", "Cacaulândia", "Cacoal",
  "Campo Novo de Rondônia", "Candeias do Jamari", "Castanheiras",
  "Cerejeiras", "Chupinguaia", "Colorado do Oeste", "Corumbiara",
  "Costa Marques", "Cujubim", "Espigão D'Oeste",
  "Governador Jorge Teixeira", "Guajará-Mirim", "Itapuã do Oeste",
  "Jaru", "Ji-Paraná", "Machadinho D'Oeste", "Ministro Andreazza",
  "Mirante da Serra", "Monte Negro", "Nova Brasilândia D'Oeste",
  "Nova Mamoré", "Novo Horizonte do Oeste", "Ouro Preto do Oeste",
  "Parecis", "Pimenta Bueno", "Pimenteiras do Oeste", "Porto Velho",
  "Presidente Médici", "Primavera de Rondônia", "Rio Crespo",
  "Rolim de Moura", "Santa Luzia D'Oeste", "São Felipe D'Oeste",
  "São Francisco do Guaporé", "São Miguel do Guaporé", "Seringueiras",
  "Teixeirópolis", "Theobroma", "Urupá", "Vale do Anari",
  "Vale do Paraíso", "Vilhena"
];
