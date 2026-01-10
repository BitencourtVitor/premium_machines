# Guia do Usuário - Premium Machines

Este documento fornece instruções detalhadas sobre como usar o sistema Premium Machines, um sistema de gestão de máquinas com geolocalização e controle de alocação.

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Primeiros Passos](#2-primeiros-passos)
3. [Login no Sistema](#3-login-no-sistema)
4. [Dashboard](#4-dashboard)
5. [Mapa de Máquinas](#5-mapa-de-máquinas)
6. [Gestão de Jobsites (Sites)](#6-gestão-de-jobsites-sites)
7. [Gestão de Máquinas](#7-gestão-de-máquinas)
8. [Eventos de Alocação](#8-eventos-de-alocação)
9. [Gestão de Fornecedores](#9-gestão-de-fornecedores)
10. [Relatórios Financeiros](#10-relatórios-financeiros)
11. [Administração de Usuários](#11-administração-de-usuários)
12. [Logs de Auditoria](#12-logs-de-auditoria)
13. [Perfis de Acesso](#13-perfis-de-acesso)
14. [Dicas e Boas Práticas](#14-dicas-e-boas-práticas)

---

## 1. Visão Geral

O **Premium Machines** é um sistema web de gestão de máquinas desenvolvido para:

- **Rastrear localização** de máquinas em jobsites
- **Controlar alocações** e movimentações
- **Registrar eventos operacionais** (paradas, manutenções, etc.)
- **Calcular custos** de máquinas alugadas
- **Gerar relatórios financeiros** consolidados
- **Visualizar em mapa** a distribuição das máquinas

### O que o sistema resolve:

| Problema | Solução |
|----------|---------|
| Onde estão as máquinas? | Mapa com geolocalização em tempo real |
| Quanto tempo ficaram paradas? | Registro de eventos de downtime |
| Qual o custo real? | Cálculo automático com dedução de paradas |
| Quem é responsável? | Vínculo com fornecedores |
| Própria ou alugada? | Classificação por tipo de propriedade |

---

## 2. Primeiros Passos

### Requisitos

- Navegador moderno (Chrome, Firefox, Edge, Safari)
- Conexão com a internet
- Credenciais de acesso (usuário e PIN)

### Acessando o Sistema

1. Abra o navegador
2. Acesse a URL do sistema (fornecida pelo administrador)
3. Você será direcionado para a tela de login

---

## 3. Login no Sistema

### Passo a Passo

1. **Selecione seu usuário** na lista
   - Use a barra de busca para encontrar seu nome rapidamente
   - Os usuários são exibidos com ícone indicando o perfil (Admin, Dev, Operador, Fornecedor)

2. **Digite seu PIN de 6 dígitos**
   - O PIN é numérico e possui exatamente 6 dígitos
   - Os dígitos são mascarados automaticamente (•••••)
   - Após digitar o 6º dígito, o login é processado automaticamente

3. **Aguarde a validação**
   - Se o PIN estiver correto, você será redirecionado ao Dashboard
   - Se estiver incorreto, uma mensagem de erro será exibida

### Proteção contra Tentativas

- **5 tentativas incorretas** bloqueiam o acesso por 5 minutos
- Um contador regressivo mostra o tempo restante do bloqueio
- Após o tempo, você pode tentar novamente

### Problemas de Acesso?

- **PIN esquecido**: Contate o administrador do sistema
- **Usuário não aparece na lista**: Seu cadastro pode estar pendente de validação
- **Bloqueado**: Aguarde o tempo indicado no contador

---

## 4. Dashboard

O Dashboard é a página inicial após o login, oferecendo uma visão geral do sistema.

### Informações Exibidas

- **Total de Máquinas**: Quantidade total cadastrada
- **Máquinas Alocadas**: Quantas estão em jobsites
- **Máquinas Disponíveis**: Quantas estão livres
- **Máquinas em Manutenção**: Quantas estão paradas
- **Eventos Pendentes**: Aguardando aprovação
- **Resumo por Fornecedor**: Distribuição de máquinas alugadas

### Ações Rápidas

- Acessar o mapa de máquinas
- Registrar novo evento
- Ver eventos pendentes
- Acessar relatórios

---

## 5. Mapa de Máquinas

O mapa exibe a localização geográfica de todas as máquinas alocadas.

### Funcionalidades

- **Visualização por Jobsite**: Cada ponto representa um jobsite
- **Cluster de Máquinas**: Jobsites com múltiplas máquinas mostram contador
- **Detalhes ao Clicar**: Informações da máquina e jobsite
- **Filtros**: Por tipo de máquina, fornecedor, status

### Legenda de Cores

- 🟢 **Verde**: Máquina operando normalmente
- 🟡 **Amarelo**: Máquina com evento pendente
- 🔴 **Vermelho**: Máquina parada/manutenção
- 🔵 **Azul**: Máquina própria
- 🟠 **Laranja**: Máquina alugada

### Interação com o Mapa

1. **Zoom**: Use scroll do mouse ou botões +/-
2. **Arrastar**: Clique e arraste para mover
3. **Clicar em Ponto**: Ver detalhes do jobsite/máquina
4. **Buscar Endereço**: Use a barra de busca

---

## 6. Gestão de Jobsites (Sites)

Jobsites são os locais físicos (bairros) onde as máquinas operam.

### Cadastrar Novo Jobsite

1. Acesse **Jobsites** no menu lateral
2. Clique em **+ Novo Jobsite**
3. Preencha os campos:
   - **Nome/Título**: Identificação do jobsite (bairro)
   - **Endereço**: Endereço completo
   - **Notas**: Observações adicionais
4. O sistema geocodifica automaticamente o endereço
5. Confira a localização no mapa preview
6. Clique em **Salvar**

### Editar Jobsite

1. Clique no jobsite desejado na lista
2. Edite os campos necessários
3. Clique em **Salvar**

### Campos Importantes

| Campo | Descrição |
|-------|-----------|
| Título | Nome identificador do jobsite (bairro) |
| Endereço | Endereço físico completo |
| Latitude/Longitude | Coordenadas (preenchidas automaticamente) |
| Cidade/Estado | Extraídos do endereço |
| Ativo | Se o jobsite está em operação |
| Notas | Observações livres |

---

## 7. Gestão de Máquinas

### Cadastrar Nova Máquina

1. Acesse **Máquinas** no menu lateral
2. Clique em **+ Nova Máquina**
3. Preencha os campos obrigatórios:
   - **Número da Unidade**: Identificador único (ex: "ESC-001")
   - **Tipo de Máquina**: Escavadeira, Retroescavadeira, etc.
   - **Tipo de Propriedade**: Própria ou Alugada

4. Se for **Alugada**, preencha também:
   - **Fornecedor**: Selecione da lista
   - **Tipo de Cobrança**: Diária, Semanal ou Mensal
   - **Valor da Diária/Semanal/Mensal**

5. Clique em **Salvar**

### Status das Máquinas

| Status | Descrição |
|--------|-----------|
| Disponível | Pronta para alocação |
| Alocada | Em operação em um jobsite |
| Manutenção | Parada para reparo |
| Inativa | Fora de operação |

### Alocar Máquina

1. Selecione a máquina na lista
2. Clique em **Alocar**
3. Selecione o jobsite de destino
4. Informe a data de início
5. Adicione observações se necessário
6. Clique em **Confirmar**

### Desalocar Máquina

1. Selecione a máquina alocada
2. Clique em **Encerrar Alocação**
3. Informe a data de término
4. Adicione observações se necessário
5. Clique em **Confirmar**

---

## 8. Eventos de Alocação

Eventos registram tudo que acontece com as máquinas.

### Tipos de Eventos

| Evento | Descrição |
|--------|-----------|
| start_allocation | Início de alocação em jobsite |
| end_allocation | Fim de alocação |
| downtime_start | Início de parada |
| downtime_end | Fim de parada |
| correction | Correção de evento anterior |
| extension_attach | Extensão acoplada |
| extension_detach | Extensão removida |

### Registrar Evento de Parada

1. Acesse **Eventos** no menu
2. Clique em **+ Novo Evento**
3. Selecione a máquina
4. Escolha **Início de Parada**
5. Selecione o motivo:
   - **Defeito**: Problema mecânico
   - **Falta de Insumo**: Falta de combustível, peças, etc.
   - **Clima**: Condições climáticas adversas
   - **Falta de Operador**: Sem operador disponível
   - **Feriado**: Dia não trabalhado
   - **Outro**: Outros motivos
6. Descreva detalhes no campo de observações
7. Clique em **Registrar**

### Aprovar Eventos (Administradores)

1. Acesse **Eventos Pendentes**
2. Revise os detalhes do evento
3. Clique em **Aprovar** ou **Rejeitar**
4. Se rejeitar, informe o motivo

### Impacto nas Cobranças

- Eventos de parada **aprovados** são deduzidos da cobrança
- Apenas administradores podem aprovar eventos
- O sistema recalcula automaticamente os valores

---

## 9. Gestão de Fornecedores

Fornecedores são empresas que alugam máquinas.

### Cadastrar Fornecedor

1. Acesse **Fornecedores** no menu
2. Clique em **+ Novo Fornecedor**
3. Preencha os campos:
   - **Nome**: Razão social
   - **CNPJ**: Documento fiscal
   - **Email**: Contato principal
   - **Telefone**: Número de contato
   - **Endereço**: Sede do fornecedor
   - **Nome do Contato**: Pessoa responsável

4. Clique em **Salvar**

### Visualizar Máquinas do Fornecedor

1. Clique no fornecedor na lista
2. Acesse a aba **Máquinas**
3. Veja todas as máquinas vinculadas

---

## 10. Relatórios Financeiros

Relatórios consolidam informações de custos.

### Tipos de Relatórios

1. **Por Período**
   - Selecione data inicial e final
   - Veja custos totais no período

2. **Por Jobsite**
   - Custos detalhados por jobsite
   - Máquinas alocadas e tempo de operação

3. **Por Fornecedor**
   - Valores a pagar por fornecedor
   - Detalhamento de máquinas

4. **Por Máquina**
   - Histórico completo de alocações
   - Cálculo de dias cobráveis

### Campos do Relatório

| Campo | Descrição |
|-------|-----------|
| Total de Dias | Dias do período |
| Dias Parados | Dias com parada aprovada |
| Dias Cobráveis | Dias efetivamente cobrados |
| Valor Diário | Taxa diária da máquina |
| Custo Estimado | Valor total calculado |

### Exportar Relatórios

- **PDF**: Para impressão ou arquivamento
- **Excel**: Para análise em planilhas
- **CSV**: Para importação em outros sistemas

---

## 11. Administração de Usuários

### Criar Novo Usuário

1. Acesse **Usuários** no menu
2. Clique em **+ Novo Usuário**
3. Preencha os campos:
   - **Nome**: Nome completo
   - **Email**: Email corporativo
   - **PIN**: Código de 6 dígitos
   - **Perfil**: Admin, Operador, Fornecedor, Dev

4. Configure as permissões:
   - Visualizar Dashboard
   - Visualizar Mapa
   - Gerenciar Jobsites
   - Gerenciar Máquinas
   - Registrar Eventos
   - Aprovar Eventos
   - Visualizar Financeiro
   - Gerenciar Fornecedores
   - Gerenciar Usuários
   - Visualizar Logs

5. Clique em **Salvar**

### Validar Usuário

1. Novos usuários ficam pendentes de validação
2. Acesse a lista de usuários
3. Clique em **Validar** no usuário pendente

### Redefinir PIN

1. Selecione o usuário
2. Clique em **Redefinir PIN**
3. Informe o novo PIN
4. Confirme a alteração

---

## 12. Logs de Auditoria

O sistema registra todas as ações para auditoria.

### O que é Registrado

- Criação, edição e exclusão de registros
- Quem fez a ação
- Quando foi feita
- Dados antes e depois da alteração

### Consultar Logs

1. Acesse **Logs** no menu
2. Use os filtros:
   - **Entidade**: Usuários, Máquinas, Obras, etc.
   - **Ação**: Inserção, Atualização, Exclusão
   - **Usuário**: Quem executou
   - **Período**: Data inicial e final

3. Clique em um log para ver detalhes

---

## 13. Perfis de Acesso

### Admin

- Acesso total ao sistema
- Aprova eventos
- Gerencia usuários
- Visualiza dados financeiros

### Operador

- Registra eventos operacionais
- Visualiza máquinas e jobsites
- **NÃO** acessa valores financeiros consolidados
- **NÃO** aprova eventos

### Fornecedor

- Visualiza apenas suas máquinas
- Visualiza solicitações relacionadas
- **NÃO** vê outros jobsites ou máquinas
- **NÃO** vê valores consolidados globais

### Developer (Dev)

- Acesso total ao sistema
- Mesmas permissões do Admin
- Destinado à equipe técnica

---

## 14. Dicas e Boas Práticas

### Segurança

- ✅ Não compartilhe seu PIN
- ✅ Faça logout ao sair do computador
- ✅ Use um PIN forte (não use 123456)
- ✅ Altere seu PIN periodicamente

### Uso Diário

- ✅ Registre eventos o mais rápido possível
- ✅ Adicione descrições detalhadas
- ✅ Confira a localização no mapa após cadastrar jobsites
- ✅ Verifique eventos pendentes regularmente (admins)

### Relatórios

- ✅ Gere relatórios mensais para acompanhamento
- ✅ Compare custos entre períodos
- ✅ Identifique máquinas com muitas paradas

### Problemas Comuns

| Problema | Solução |
|----------|---------|
| Endereço não encontrado | Digite o endereço completo com cidade e estado |
| Máquina não aparece no mapa | Verifique se está alocada em um jobsite |
| Evento não foi aprovado | Aguarde revisão do administrador |
| Valor incorreto | Verifique se eventos de parada foram aprovados |

---

## Suporte

Em caso de dúvidas ou problemas:

- **Email**: suporte@premiumgrpinc.com
- **Documentação Técnica**: `/docs/` no repositório

---

*Premium Machines v1.0.0 - Sistema de Gestão de Máquinas com Geolocalização*
