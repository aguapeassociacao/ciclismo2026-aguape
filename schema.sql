-- ================================================================
-- SQL — Ciclismo Individual 2026
-- Turismo de Base Comunitária · Aguapé
-- Execute no SQL Editor do Supabase (Settings → SQL Editor → New query)
-- ================================================================

-- ── 1. Tabela de participantes ────────────────────────────────
CREATE TABLE IF NOT EXISTS participantes (
  id                  SERIAL PRIMARY KEY,
  nome_completo       TEXT    NOT NULL,
  cpf                 TEXT    NOT NULL UNIQUE,
  sexo                CHAR(1) CHECK (sexo IN ('M', 'F')),
  email               TEXT,
  telefone            TEXT    NOT NULL,
  data_nascimento     DATE,
  cidade              TEXT    NOT NULL,
  uf                  CHAR(2) NOT NULL DEFAULT 'RO',
  tamanho_camiseta    VARCHAR(3) CHECK (tamanho_camiseta IN ('P','M','G','GG','XG')),
  autorizacao_imagem  BOOLEAN NOT NULL DEFAULT FALSE,
  nome_responsavel    TEXT,   -- para menores de idade
  criado_em           TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Tipo enum para status de pagamento ─────────────────────
DO $$ BEGIN
  CREATE TYPE status_inscricao AS ENUM (
    'pendente_pagamento',
    'aguardando_boleto',
    'pago',
    'cancelado'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 3. Tabela de inscrições ───────────────────────────────────
-- modalidade_id: 1 = Ciclismo Masculino · 2 = Ciclismo Feminino
CREATE TABLE IF NOT EXISTS inscricoes (
  id                SERIAL PRIMARY KEY,
  participante_id   INTEGER REFERENCES participantes(id),
  modalidade_id     INTEGER NOT NULL CHECK (modalidade_id IN (1, 2)),
  numero_ficha      TEXT    NOT NULL UNIQUE,
  status            status_inscricao NOT NULL DEFAULT 'pendente_pagamento',
  tipo_inscricao    VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (tipo_inscricao IN ('normal','participativa')),
  pagamento_id      TEXT,
  pagamento_metodo  VARCHAR(10) CHECK (pagamento_metodo IN ('pix','cartao','boleto')),
  pagamento_valor   NUMERIC(10,2),
  pagamento_data    TIMESTAMPTZ,
  boleto_url        TEXT,
  boleto_codigo     TEXT,
  pix_qrcode        TEXT,
  criado_em         TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. Tabela de auditoria de pagamentos ──────────────────────
CREATE TABLE IF NOT EXISTS pagamentos (
  id                   SERIAL PRIMARY KEY,
  inscricao_id         INTEGER REFERENCES inscricoes(id),
  mp_payment_id        TEXT,
  mp_status            TEXT,
  mp_status_detail     TEXT,
  metodo               VARCHAR(10),
  valor                NUMERIC(10,2),
  webhook_recebido_em  TIMESTAMPTZ DEFAULT NOW(),
  payload_raw          JSONB
);

-- ── 4b. Migração — adiciona tipo_inscricao se ainda não existir ──
-- (rodar apenas em banco já existente sem a coluna)
ALTER TABLE inscricoes
  ADD COLUMN IF NOT EXISTS tipo_inscricao VARCHAR(20) NOT NULL DEFAULT 'normal'
  CHECK (tipo_inscricao IN ('normal','participativa'));

-- ── 5. Índices para performance ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_participantes_cpf       ON participantes(cpf);
CREATE INDEX IF NOT EXISTS idx_inscricoes_participante ON inscricoes(participante_id);
CREATE INDEX IF NOT EXISTS idx_inscricoes_ficha        ON inscricoes(numero_ficha);
CREATE INDEX IF NOT EXISTS idx_inscricoes_status       ON inscricoes(status);
CREATE INDEX IF NOT EXISTS idx_inscricoes_modalidade   ON inscricoes(modalidade_id);

-- ── 6. RLS (Row Level Security) — bloquear acesso direto ──────
-- As operações passam sempre pela /api/supabase com a chave de serviço,
-- portanto o acesso anônimo direto ao banco fica bloqueado.
ALTER TABLE participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscricoes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos    ENABLE ROW LEVEL SECURITY;

-- ── 7. Verificação ────────────────────────────────────────────
-- Após executar, confirme as tabelas criadas:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- ── 8. Tabela de operadores do sistema ────────────────────────
-- Gerenciada pelo admin master via painel. Sem necessidade de
-- acessar Vercel Dashboard para cadastrar operadores.
CREATE TABLE IF NOT EXISTS admin_operadores (
  id           SERIAL PRIMARY KEY,
  usuario      TEXT    NOT NULL UNIQUE,
  senha        TEXT    NOT NULL,
  nome         TEXT    NOT NULL,
  pode_excluir BOOLEAN NOT NULL DEFAULT FALSE,
  ativo        BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em    TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operadores_usuario ON admin_operadores(usuario);
CREATE INDEX IF NOT EXISTS idx_operadores_ativo   ON admin_operadores(ativo);

ALTER TABLE admin_operadores ENABLE ROW LEVEL SECURITY;

-- Verificação
SELECT 'admin_operadores criada' AS status
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'admin_operadores'
);
