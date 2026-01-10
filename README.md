# Premium Machines

Sistema de Gestão de Máquinas com Geolocalização e Controle de Alocação.

## 🎯 Visão Geral

Este sistema gerencia a alocação, o uso e a cobrança de máquinas utilizadas em obras, integrando geolocalização, mapeamento, controle de eventos operacionais e relatórios financeiros consolidados.

### Principais Funcionalidades

- **Gestão de Obras (Sites)**: Cadastro com geocodificação automática
- **Gestão de Máquinas**: Controle de máquinas próprias e alugadas
- **Eventos de Alocação**: Arquitetura orientada a eventos para tracking completo
- **Mapa Interativo**: Visualização de obras e máquinas no mapa
- **Controle de Paradas**: Registro e aprovação de paradas com impacto financeiro
- **Relatórios Financeiros**: Snapshots derivados para análise de custos

## 🛠 Stack Tecnológica

- **Frontend**: Next.js 14, React 18, TypeScript
- **Estilização**: Tailwind CSS (dark mode suportado)
- **Backend**: Supabase (PostgreSQL + Auth)
- **Mapas**: Mapbox GL JS
- **Geocodificação**: Geoapify API
- **Autenticação**: PIN-based com bcrypt

## 📋 Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com)
- Token do [Mapbox](https://www.mapbox.com)
- API Key do [Geoapify](https://www.geoapify.com)

## 🚀 Instalação

1. Clone o repositório:
```bash
git clone <repository-url>
cd premium_machines
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env.local
```

4. Preencha o `.env.local` com suas credenciais:
```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
NEXT_PUBLIC_MAPBOX_TOKEN=seu_token_mapbox
NEXT_PUBLIC_GEOAPIFY_API_KEY=sua_api_key_geoapify
GEOAPIFY_API_KEY=sua_api_key_geoapify
```

5. Execute o schema SQL no Supabase:
   - Acesse o SQL Editor do seu projeto Supabase
   - Execute o conteúdo de `database/schema.sql`

6. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

7. Acesse `http://localhost:3000`

## 📁 Estrutura do Projeto

```
premium_machines/
├── app/
│   ├── api/                    # API Routes
│   │   ├── auth/               # Autenticação
│   │   ├── dashboard/          # Dashboard stats
│   │   ├── events/             # Eventos de alocação
│   │   ├── geocode/            # Geocodificação
│   │   ├── machines/           # Máquinas
│   │   ├── machine-types/      # Tipos de máquinas
│   │   ├── sites/              # Obras
│   │   └── suppliers/          # Fornecedores
│   ├── components/             # Componentes React
│   ├── dashboard/              # Página Dashboard
│   ├── events/                 # Página Eventos
│   ├── login/                  # Página Login
│   ├── machines/               # Página Máquinas
│   ├── map/                    # Página Mapa
│   ├── sites/                  # Página Obras
│   ├── globals.css             # Estilos globais
│   ├── layout.tsx              # Layout root
│   └── page.tsx                # Redirect para login
├── database/
│   └── schema.sql              # Schema PostgreSQL
├── lib/
│   ├── auth.ts                 # Funções de autenticação
│   ├── auditLog.ts             # Log de auditoria
│   ├── geocoding.ts            # Geocodificação
│   ├── permissions.ts          # Permissões e labels
│   ├── session.ts              # Gerenciamento de sessão
│   ├── supabase.ts             # Cliente Supabase (client)
│   ├── supabase-server.ts      # Cliente Supabase (server)
│   ├── useSession.ts           # Hook de sessão
│   └── useSidebar.ts           # Hook do sidebar
├── public/
│   └── manifest.json           # PWA manifest
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## 👥 Roles e Permissões

| Role | Descrição |
|------|-----------|
| **Admin** | Acesso total, aprova eventos, vê dados financeiros |
| **Dev** | Acesso total para desenvolvimento |
| **Operador** | Registra eventos, gerencia máquinas |
| **Fornecedor** | Visualiza apenas suas máquinas |

## 📊 Arquitetura de Eventos

O sistema é orientado a eventos. Todos os fatos são registrados como eventos imutáveis:

- `start_allocation` - Início de alocação de máquina
- `end_allocation` - Fim de alocação
- `downtime_start` - Início de parada
- `downtime_end` - Fim de parada
- `correction` - Correção de evento anterior
- `extension_attach` - Conexão de extensão
- `extension_detach` - Desconexão de extensão

### Fluxo de Aprovação

1. Operador registra evento (status: `pending`)
2. Admin aprova ou rejeita
3. Sistema recalcula snapshots financeiros

## 🗺 Mapa

O mapa utiliza Mapbox GL JS e exibe:
- Marcadores para cada obra
- Contagem de máquinas por obra
- Detalhes ao clicar no marcador
- Alternância entre vista de mapa e satélite

## 💰 Modelo de Cobrança

Para máquinas alugadas:
- Cobrança: diária, semanal ou mensal
- Paradas aprovadas são deduzidas
- Snapshots financeiros são derivados, não editáveis

## 🔧 Scripts Disponíveis

```bash
npm run dev      # Inicia servidor de desenvolvimento
npm run build    # Build de produção
npm run start    # Inicia servidor de produção
npm run lint     # Executa ESLint
npm run clean    # Limpa pasta .next
```

## 📱 PWA

O sistema é Progressive Web App e pode ser instalado em dispositivos móveis.

## 🌙 Dark Mode

Suporte completo a dark mode, detectando preferência do sistema e permitindo alternância manual.

## 📄 Licença

Proprietary - Premium Engenharia
