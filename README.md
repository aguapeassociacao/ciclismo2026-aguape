# Ciclismo Individual 2026 — Sistema de Inscrições
**Turismo de Base Comunitária · Associação dos Seringueiros do Vale do Guaporé (Aguapé)**

---

## Stack
- **Frontend**: HTML + Vanilla JS + CSS (sem framework)
- **Backend**: Vercel Serverless Functions (Node.js)
- **Banco**: Supabase (PostgreSQL)
- **Pagamento**: Mercado Pago (Fase 2)

---

## Estrutura de arquivos

```
ciclismo-2026/
├── index.html          ← Formulário de inscrição + consulta
├── admin.html          ← Painel administrativo (adaptar do Festival)
├── regulamento.pdf     ← PDF do regulamento (substituir pela versão final)
├── aguape.png          ← Logo Aguapé
├── css/
│   └── styles.css
├── js/
│   ├── config.js       ← Configurações (data, valor, prefixo)
│   ├── utils.js        ← Funções utilitárias + comunicação com API
│   └── app.js          ← Lógica principal
├── api/
│   ├── supabase.js     ← Proxy seguro para o banco (chave no servidor)
│   └── admin-auth.js   ← Autenticação do painel admin
├── vercel.json         ← Configuração de headers de segurança
└── schema.sql          ← SQL completo para criar as tabelas no Supabase
```

---

## Setup (passo a passo)

### 1. Supabase
1. Criar projeto `ciclismo-2026` em supabase.com
2. Ir em **SQL Editor → New query**
3. Colar o conteúdo de `schema.sql` e executar
4. Ir em **Settings → API** e copiar:
   - Project URL → `SUPABASE_URL`
   - `service_role` key → `SUPABASE_KEY` (atenção: **service_role**, não anon)

### 2. GitHub
1. Criar repositório privado `ciclismo-2026`
2. Fazer push de todos os arquivos

### 3. Vercel
1. Importar repositório `ciclismo-2026`
2. Antes do deploy, adicionar **Environment Variables**:
   ```
   SUPABASE_URL     = (URL do Supabase)
   SUPABASE_KEY     = (chave service_role)
   ADMIN_USER       = (usuário do painel admin)
   ADMIN_SENHA      = (senha forte)
   ```
3. Deploy → copiar URL gerada e atualizar `URL_SITE` em `js/config.js`

### 4. Arquivos finais a colocar na raiz
- `aguape.png` — logo da Aguapé
- `regulamento.pdf` — regulamento definitivo

---

## Modalidades (banco)
| modalidade_id | Descrição |
|---|---|
| 1 | Ciclismo Individual — Masculino |
| 2 | Ciclismo Individual — Feminino |

## Status de inscrição
| status | Significado |
|---|---|
| `pendente_pagamento` | Inscrição registrada, aguardando pagamento |
| `aguardando_boleto` | Boleto gerado, aguardando compensação |
| `pago` | Pagamento confirmado |
| `cancelado` | Inscrição cancelada |

---

## Fase 2 — Mercado Pago
Integração a ser desenvolvida conforme manual v1.1.
Variáveis a adicionar no Vercel quando implementado:
```
MP_ACCESS_TOKEN  = (token de produção do Mercado Pago)
MP_WEBHOOK_SECRET = (segredo para validação HMAC)
```

---

## Ficha de inscrição
Formato: `CIC-XXXX` (ex: CIC-4872)
