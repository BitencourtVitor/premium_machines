# Requisitos de Configuração Inicial - Premium Machines

Este documento lista **tudo que precisa ser cadastrado e configurado** no sistema antes de começar a utilizá-lo em produção. Os itens estão organizados por ordem de dependência e importância.

---

## 📋 Índice

1. [Usuários Internos](#1-usuários-internos)
2. [Tipos de Máquinas](#2-tipos-de-máquinas)
3. [Fornecedores](#3-fornecedores)
4. [Usuários Fornecedores](#4-usuários-fornecedores)
5. [Obras (Sites)](#5-obras-sites)
6. [Máquinas](#6-máquinas)
7. [Tipos de Extensões](#7-tipos-de-extensões-opcional)
8. [Extensões de Máquinas](#8-extensões-de-máquinas-opcional)
9. [Configuração de Permissões](#9-configuração-de-permissões)
10. [Checklist Final](#10-checklist-final)

---

## 1. Usuários Internos

**Prioridade: CRÍTICA** ⚠️  
**Dependências: Nenhuma**

### O que é necessário:

- **Pelo menos 1 usuário com role `admin` ou `dev`**
  - Este usuário terá acesso total ao sistema
  - Pode gerenciar todos os outros usuários
  - Pode configurar todas as funcionalidades

### O que cadastrar:

- ✅ Nome completo
- ✅ Email (opcional, mas recomendado)
- ✅ PIN de acesso (4 dígitos)
- ✅ Role: `admin` ou `dev`
- ✅ Todas as permissões habilitadas (automático para admin/dev)

### Onde cadastrar:

- Página: **Usuários** (`/usuarios`)
- Aba: **Usuários**
- Botão: **"Novo Usuário"** (ícone +)

### Observações:

- Sem pelo menos um usuário admin/dev, não será possível configurar o resto do sistema
- Usuários com role `operador` podem ser criados depois, conforme necessário
- Cada usuário precisa ter um PIN único e seguro

---

## 2. Tipos de Máquinas

**Prioridade: CRÍTICA** ⚠️  
**Dependências: Nenhuma**  
**Necessário para:** Cadastrar máquinas

### O que é necessário:

- **Todos os tipos de máquinas que serão utilizadas no sistema**
  - Exemplos: Escavadeira, Retroescavadeira, Guindaste, Caminhão, etc.

### O que cadastrar:

- ✅ Nome do tipo (ex: "Escavadeira", "Retroescavadeira")
- ✅ Descrição (opcional)
- ✅ Ícone (opcional)

### Onde cadastrar:

- Página: **Máquinas** (`/machines`)
- Ao criar uma nova máquina, se o tipo não existir, será necessário cadastrá-lo primeiro
- Ou através da API diretamente

### Observações:

- Cada máquina precisa ter um tipo associado
- Tipos podem ser reutilizados para múltiplas máquinas
- Recomenda-se cadastrar todos os tipos antes de começar a cadastrar máquinas

---

## 3. Fornecedores

**Prioridade: ALTA** 🔴  
**Dependências: Nenhuma**  
**Necessário para:** 
- Máquinas alugadas (`ownership_type = 'rented'`)
- Usuários fornecedores
- Prestadores de manutenção

### O que é necessário:

- **Todas as empresas fornecedoras de máquinas alugadas**
- **Todas as empresas de manutenção/mecânicos**
- Empresas que fazem ambos (aluguel + manutenção)

### O que cadastrar:

- ✅ Nome da empresa
- ✅ Email (opcional)
- ✅ Telefone (formato americano: +1 (XXX) XXX-XXXX)
- ✅ Tipo de fornecedor:
  - `rental` - Aluguel de Máquinas
  - `maintenance` - Manutenção/Mecânico
  - `both` - Ambos

### Onde cadastrar:

- Página: **Usuários** (`/usuarios`)
- Aba: **Fornecedores**
- Botão: **"Nova Empresa"** (ícone +)

### Observações:

- Fornecedores são necessários apenas se:
  - Você aluga máquinas de terceiros
  - Você contrata manutenção externa
  - Você tem usuários fornecedores que precisam acessar o sistema
- Se todas as máquinas são próprias (`ownership_type = 'owned'`), este passo pode ser pulado inicialmente

---

## 4. Usuários Fornecedores

**Prioridade: MÉDIA** 🟡  
**Dependências: Fornecedores (tópico 3)**  
**Necessário para:** Fornecedores acessarem o sistema

### O que é necessário:

- **Usuários de cada empresa fornecedora que precisam acessar o sistema**
  - Exemplo: 3 mecânicos de uma empresa de manutenção
  - Exemplo: 2 operadores de uma empresa de aluguel

### O que cadastrar:

- ✅ Nome completo
- ✅ Email (opcional)
- ✅ PIN de acesso (4 dígitos)
- ✅ Role: `fornecedor` (automático)
- ✅ Fornecedor associado (empresa)

### Onde cadastrar:

- Página: **Usuários** (`/usuarios`)
- Aba: **Fornecedores**
- Para cada fornecedor, clique em **"Adicionar Usuário"**
- Ou na aba **Usuários**, selecione o fornecedor ao criar

### Observações:

- Usuários fornecedores só podem ver dados relacionados à sua empresa
- Não é obrigatório ter usuários fornecedores se você não precisa que eles acessem o sistema
- Cada fornecedor pode ter múltiplos usuários

---

## 5. Obras (Sites)

**Prioridade: ALTA** 🔴  
**Dependências: Nenhuma**  
**Necessário para:** Alocar máquinas

### O que é necessário:

- **Todas as obras/endereços onde máquinas serão alocadas**
  - Obras ativas em andamento
  - Obras futuras planejadas (podem ser cadastradas e arquivadas)

### O que cadastrar:

- ✅ Nome da obra (ex: "Obra Residencial Alpha", "Construção Shopping Center")
- ✅ Endereço completo
- ✅ Geocodificação obrigatória (latitude/longitude)
  - O sistema faz isso automaticamente ao digitar o endereço
  - É necessário confirmar a localização no mapa antes de salvar

### Onde cadastrar:

- Página: **Obras** (`/sites`)
- Botão: **"Nova Obra"** (ícone +)

### Observações:

- **Geocodificação é obrigatória** - sem coordenadas, a obra não pode ser salva
- Obras podem ser arquivadas quando finalizadas
- Obras são necessárias para registrar alocações de máquinas
- Recomenda-se cadastrar todas as obras ativas antes de começar a alocar máquinas

---

## 6. Máquinas

**Prioridade: ALTA** 🔴  
**Dependências:** 
- Tipos de Máquinas (tópico 2)
- Fornecedores (tópico 3) - apenas se `ownership_type = 'rented'`

**Necessário para:** Registrar alocações e operações

### O que é necessário:

- **Todas as máquinas que serão gerenciadas no sistema**
  - Máquinas próprias
  - Máquinas alugadas

### O que cadastrar:

#### Para TODAS as máquinas:
- ✅ Número da unidade (único, ex: "EXC-001", "RET-045")
- ✅ Tipo de máquina
- ✅ Tipo de propriedade:
  - `owned` - Própria
  - `rented` - Alugada

#### Para máquinas ALUGADAS (`ownership_type = 'rented'`):
- ✅ Fornecedor
- ✅ Tipo de cobrança: `daily`, `weekly` ou `monthly`
- ✅ Taxa diária, semanal ou mensal (conforme tipo escolhido)

#### Opcional:
- ✅ Notas/observações

### Onde cadastrar:

- Página: **Máquinas** (`/machines`)
- Botão: **"Nova Máquina"** (ícone +)

### Observações:

- Cada máquina precisa de um `unit_number` único
- Máquinas alugadas precisam ter fornecedor e dados de cobrança
- Máquinas próprias não precisam de fornecedor
- Status inicial será `available` (disponível)
- Máquinas podem ser alocadas para obras depois

---

## 7. Tipos de Extensões (Opcional)

**Prioridade: BAIXA** 🟢  
**Dependências: Nenhuma**  
**Necessário para:** Cadastrar extensões/acessórios

### O que é necessário:

- **Apenas se você utiliza extensões/acessórios nas máquinas**
  - Exemplos: Balde, Martelo Hidráulico, Braço Extendido, etc.

### O que cadastrar:

- ✅ Nome do tipo (ex: "Balde", "Martelo Hidráulico")
- ✅ Descrição (opcional)
- ✅ Tipos de máquinas compatíveis (opcional)

### Onde cadastrar:

- Atualmente via API ou banco de dados diretamente
- Interface pode ser adicionada no futuro

### Observações:

- Este passo é **opcional**
- Só é necessário se você utiliza extensões/acessórios
- Pode ser feito depois, conforme necessidade

---

## 8. Extensões de Máquinas (Opcional)

**Prioridade: BAIXA** 🟢  
**Dependências:** 
- Tipos de Extensões (tópico 7)
- Máquinas (tópico 6)

**Necessário para:** Gerenciar extensões/acessórios

### O que é necessário:

- **Extensões físicas que serão anexadas às máquinas**
  - Exemplo: Balde #001, Martelo Hidráulico #002

### O que cadastrar:

- ✅ Número da unidade da extensão (único)
- ✅ Tipo de extensão
- ✅ Tipo de propriedade (`owned` ou `rented`)
- ✅ Dados de cobrança (se alugada)
- ✅ Máquina à qual está anexada (se aplicável)

### Onde cadastrar:

- Atualmente via API ou banco de dados diretamente
- Interface pode ser adicionada no futuro

### Observações:

- Este passo é **opcional**
- Só é necessário se você utiliza extensões/acessórios
- Pode ser feito depois, conforme necessidade

---

## 9. Configuração de Permissões

**Prioridade: MÉDIA** 🟡  
**Dependências: Usuários Internos (tópico 1)**

### O que é necessário:

- **Configurar permissões adequadas para cada usuário interno**
  - Garantir que cada usuário tenha acesso apenas ao que precisa

### Permissões disponíveis:

| Permissão | Descrição | Recomendado para |
|-----------|-----------|------------------|
| `can_view_dashboard` | Ver dashboard | Todos |
| `can_view_map` | Ver mapa de obras | Operadores, Admin |
| `can_manage_sites` | Gerenciar obras | Admin, Operadores |
| `can_manage_machines` | Gerenciar máquinas | Admin |
| `can_register_events` | Registrar alocações | Operadores, Admin |
| `can_approve_events` | Aprovar alocações | Admin, Supervisores |
| `can_view_financial` | Ver relatórios financeiros | Admin, Financeiro |
| `can_manage_suppliers` | Gerenciar fornecedores | Admin |
| `can_manage_users` | Gerenciar usuários | Admin, Dev |
| `can_view_logs` | Ver logs do sistema | Admin, Dev |

### Onde configurar:

- Página: **Usuários** (`/usuarios`)
- Aba: **Usuários**
- Editar cada usuário e ajustar permissões

### Observações:

- Usuários `admin` e `dev` têm todas as permissões automaticamente
- Usuários `operador` precisam ter permissões configuradas manualmente
- Configure conforme a necessidade de cada usuário

---

## 10. Checklist Final

Antes de colocar o sistema em produção, verifique:

### ✅ Configuração Básica
- [ ] Pelo menos 1 usuário admin/dev cadastrado
- [ ] Todos os tipos de máquinas cadastrados
- [ ] Pelo menos 1 obra cadastrada (se for alocar máquinas)
- [ ] Pelo menos 1 máquina cadastrada (se for registrar alocações)

### ✅ Se utiliza máquinas alugadas:
- [ ] Todos os fornecedores de aluguel cadastrados
- [ ] Todas as máquinas alugadas cadastradas com dados de cobrança

### ✅ Se utiliza manutenção externa:
- [ ] Fornecedores de manutenção cadastrados
- [ ] Usuários fornecedores criados (se necessário)

### ✅ Se utiliza extensões:
- [ ] Tipos de extensões cadastrados
- [ ] Extensões físicas cadastradas

### ✅ Usuários e Permissões:
- [ ] Todos os usuários internos necessários cadastrados
- [ ] Permissões configuradas adequadamente para cada usuário
- [ ] Usuários fornecedores criados (se necessário)

### ✅ Dados de Teste:
- [ ] Remover dados de teste/desenvolvimento
- [ ] Validar que todas as obras têm coordenadas corretas
- [ ] Validar que todas as máquinas têm tipos corretos

---

## 📝 Notas Importantes

### Ordem de Cadastro Recomendada:

1. **Usuários Internos** (admin/dev) - PRIMEIRO
2. **Tipos de Máquinas** - ANTES de cadastrar máquinas
3. **Fornecedores** - ANTES de cadastrar máquinas alugadas ou usuários fornecedores
4. **Obras** - ANTES de alocar máquinas
5. **Máquinas** - DEPOIS de tipos e fornecedores
6. **Usuários Fornecedores** - DEPOIS de fornecedores
7. **Extensões** - OPCIONAL, quando necessário

### O que NÃO é obrigatório inicialmente:

- ❌ Todas as obras futuras (podem ser cadastradas conforme necessário)
- ❌ Todas as máquinas de todos os fornecedores (apenas as que serão utilizadas)
- ❌ Todos os funcionários fornecedores (apenas os que precisam acessar)
- ❌ Extensões (opcional)
- ❌ Obras arquivadas (podem ser arquivadas depois)

### O que é MÍNIMO para começar:

- ✅ 1 usuário admin/dev
- ✅ 1 tipo de máquina
- ✅ 1 máquina (própria ou alugada)
- ✅ 1 obra (se for alocar máquinas)

Com isso, já é possível começar a registrar alocações e usar o sistema básico.

---

## 🚀 Próximos Passos Após Configuração

Após completar a configuração inicial:

1. **Testar o fluxo completo:**
   - Criar uma alocação de máquina para uma obra
   - Aprovar a alocação
   - Verificar no mapa
   - Verificar métricas

2. **Treinar usuários:**
   - Mostrar como registrar alocações
   - Mostrar como aprovar eventos
   - Mostrar como visualizar relatórios

3. **Configurar rotinas:**
   - Definir quem registra alocações
   - Definir quem aprova eventos
   - Definir frequência de revisão de métricas

---

**Última atualização:** 2024  
**Versão do documento:** 1.0
