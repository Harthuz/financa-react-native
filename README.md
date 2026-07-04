# 💰 Finanças Pro

Aplicativo pessoal de controle financeiro construído com **Expo / React Native**, com suporte a web, Android e iOS. Permite acompanhar dívidas parceladas, gastos recorrentes e projetar a evolução do patrimônio líquido ao longo do tempo.

---

## ✨ Funcionalidades

### 📊 Dashboard
- Exibe o **saldo livre mensal** (quanto sobra do salário após todos os gastos)
- Cards de **Patrimônio Líquido** e **Dívida Total Restante**
- **Fluxo mensal vigente**: salário, investimento, poupança, fatura do cartão e saídas
- **Simulador de Compras**: simule o impacto de uma compra à vista ou parcelada antes de efetivar
- Contadores rápidos de dívidas ativas e gastos cadastrados
- Modal de configuração da realidade financeira (salário, investimento, poupança, fatura)

### 💳 Dívidas
- Cadastro de dívidas parceladas com valor de parcela, total e parcelas restantes
- Suporte a **data de início** com cálculo automático das parcelas restantes
- Marcação se a dívida é paga via **cartão de crédito**
- Categorização livre (ex: Eletrônicos, Lazer, Saúde)
- Edição e exclusão com confirmação

### 🧾 Gastos Recorrentes
- Cadastro de despesas fixas mensais (ex: Netflix, Academia, Aluguel)
- Dia de vencimento opcional
- Marcação de cobrança no **cartão de crédito**
- Vínculo com uma dívida (gasto some automaticamente quando a dívida for quitada)
- Edição e exclusão com confirmação

### 📈 Projeção Futura
- Projeção automática de **24 meses** baseada nos dados atuais
- Gráfico de barras da evolução do patrimônio líquido (12 meses)
- Cards de **crescimento patrimonial** do Ano 1 e Ano 2
- Tabela com poupança, dívida e patrimônio por mês
- **Expansão da listagem**: exibe 12 meses por padrão, com botões **+6**, **+12** e **+24 meses**
- Clique em qualquer mês para ver o detalhamento completo do fluxo financeiro
- **Aporte customizado por mês**: substitua o investimento padrão em meses específicos

---

## 🗂️ Estrutura do Projeto

```
finance/
├── src/
│   ├── app/
│   │   ├── index.tsx          # Dashboard principal
│   │   ├── debts.tsx          # Tela de dívidas
│   │   ├── expenses.tsx       # Tela de gastos recorrentes
│   │   ├── projection.tsx     # Tela de projeção futura
│   │   └── _layout.tsx        # Layout e navegação por abas
│   ├── components/            # Componentes reutilizáveis
│   ├── financeEngine/
│   │   └── engine.ts          # Motor de cálculo de projeções (lógica pura)
│   ├── services/
│   │   └── api.ts             # Cliente HTTP para a API REST
│   ├── stores/
│   │   └── financeStore.ts    # Estado global com Zustand (+ fallback LocalStorage)
│   └── types/                 # Tipagens TypeScript
├── server/
│   └── src/
│       ├── index.js           # API REST com Express.js
│       └── db.js              # Conexão e inicialização do PostgreSQL
├── docker-compose.yml         # Orquestração: PostgreSQL + API + Web (Nginx)
├── Dockerfile.web             # Build do app web com Expo + Nginx
└── nginx.conf                 # Proxy reverso para API e app web
```

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Expo 57 + React Native 0.86 |
| Estilização | NativeWind (TailwindCSS para RN) |
| Estado global | Zustand |
| Navegação | Expo Router (file-based) |
| Backend | Node.js + Express.js |
| Banco de dados | PostgreSQL 16 |
| Deploy web | Docker + Nginx |

---

## 🚀 Como Executar

### Pré-requisitos
- [Node.js 20+](https://nodejs.org/)
- [Docker e Docker Compose](https://www.docker.com/) *(para o banco e API)*

---

### 1. Clonar e instalar dependências

```bash
git clone <url-do-repositorio>
cd finance
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

O `.env` padrão já funciona para desenvolvimento local. Edite se necessário:

```env
POSTGRES_USER=finance
POSTGRES_PASSWORD=finance
POSTGRES_DB=finance

# Dispositivo físico: descomente e use o IP da sua máquina
# EXPO_PUBLIC_API_URL=http://192.168.0.10:3001
```

### 3. Subir o banco de dados e a API

```bash
docker compose up db api -d
```

Isso inicializa o PostgreSQL e a API REST na porta `3001`.

### 4. Iniciar o app Expo

```bash
npm start
```

| Plataforma | Comando |
|-----------|---------|
| Web | `npm run web` ou pressione `w` no terminal |
| Android | `npm run android` ou pressione `a` |
| iOS | `npm run ios` ou pressione `i` |

> **Sem Docker?** O app funciona em modo **fallback com LocalStorage** automaticamente se a API não estiver disponível. Os dados ficam salvos localmente no navegador.

---

## 🐳 Deploy Completo com Docker

Para rodar o stack completo (banco + API + app web via Nginx):

```bash
docker compose up -d
```

| Serviço | URL |
|---------|-----|
| App Web | http://localhost:8080 |
| API REST | http://localhost:3001 |
| PostgreSQL | localhost:5432 |

---

## 🔌 API REST

Base URL: `http://localhost:3001`

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/state` | Retorna settings + dívidas + gastos |
| `PUT` | `/api/settings` | Atualiza configurações financeiras |
| `POST` | `/api/debts` | Cria uma nova dívida |
| `PUT` | `/api/debts/:id` | Atualiza uma dívida |
| `DELETE` | `/api/debts/:id` | Remove uma dívida (cascade em despesas vinculadas) |
| `POST` | `/api/expenses` | Cria um novo gasto recorrente |
| `PUT` | `/api/expenses/:id` | Atualiza um gasto |
| `DELETE` | `/api/expenses/:id` | Remove um gasto |

---

## 🧠 Motor de Projeção

O arquivo [`src/financeEngine/engine.ts`](src/financeEngine/engine.ts) contém a **lógica pura** de cálculo, sem dependências de UI ou banco.

**Como funciona:**
- Parte da data atual (`new Date()`) — mês 1 da projeção = mês corrente
- Itera mês a mês por `N` meses (padrão: 24)
- Cada mês calcula:
  - Dívidas ainda ativas (`remainingInstallments >= i`)
  - Despesas ativas e vinculadas a dívidas ativas
  - Deduplicação de itens no cartão de crédito vs. fatura avulsa
  - Poupança acumulada + investimento mensal (com override por mês)
  - Dívidas restantes após o pagamento do mês
  - Patrimônio Líquido = Poupança − Dívidas Restantes

> A projeção é **totalmente dinâmica**: os labels de meses avançam automaticamente a cada mês real.

---

## 📁 Dados e Persistência

O app possui dois modos de persistência:

| Modo | Quando ativa | Onde salva |
|------|-------------|-----------|
| **PostgreSQL** | API disponível | Banco de dados via Docker |
| **Fallback LocalStorage** | API indisponível | `localStorage` do navegador |

O modo ativo é detectado automaticamente no boot do app.

---

## 📄 Licença

Consulte o arquivo [LICENSE](LICENSE).
