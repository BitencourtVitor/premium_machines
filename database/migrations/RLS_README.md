# Row Level Security (RLS) - Premium Machines

## Visão Geral

Este projeto usa autenticação customizada (PIN) em vez do sistema de autenticação nativo do Supabase. Isso requer uma abordagem especial para implementar RLS.

## Estrutura

O arquivo `rls_policies.sql` contém:
- Funções helper para obter informações do usuário atual
- Políticas RLS para todas as tabelas
- Funções de verificação de permissões

## Como Funciona

As políticas RLS usam funções que leem variáveis de sessão configuradas via `SET LOCAL` em transações:

- `current_user_id()` - Retorna o ID do usuário atual
- `current_user_role()` - Retorna o role do usuário atual  
- `current_user_supplier_id()` - Retorna o supplier_id do usuário atual
- `user_has_permission(permission_name)` - Verifica se o usuário tem uma permissão específica

## Opções de Implementação

### Opção 1: Usar Service Role Key (Atual)

**Vantagens:**
- Simples de implementar
- Não requer mudanças no código existente
- RLS é bypassado, mas você pode implementar permissões na aplicação

**Desvantagens:**
- RLS não é aplicado no banco de dados
- Menos seguro se houver acesso direto ao banco

**Como usar:**
```typescript
import { supabaseServer } from '@/lib/supabase-server'
// Usa service role key - bypassa RLS
const { data } = await supabaseServer.from('machines').select('*')
```

### Opção 2: Usar Anon Key com Contexto (Recomendado para Produção)

**Vantagens:**
- RLS é aplicado no banco de dados
- Mais seguro
- Proteção mesmo se houver acesso direto ao banco

**Desvantagens:**
- Requer configurar contexto antes de cada query
- Mais complexo de implementar

**Como usar:**
```typescript
import { queryWithRLS } from '@/lib/supabase-rls'
import { getSessionUser } from '@/lib/session'

const user = getSessionUser()
const { data, error } = await queryWithRLS(user, async (client) => {
  return await client.from('machines').select('*')
})
```

**Nota:** Esta abordagem requer que você configure o contexto do usuário antes de cada query. Veja a seção "Configurando Contexto" abaixo.

### Opção 3: Funções SQL com Parâmetros

Criar funções SQL que recebem `user_id` como parâmetro e retornam dados filtrados:

```sql
CREATE FUNCTION get_user_machines(p_user_id UUID)
RETURNS TABLE(...) AS $$
  -- Lógica de filtro baseada em user_id
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Configurando Contexto do Usuário

Para usar RLS com anon key, você precisa configurar o contexto antes de cada query:

```typescript
// 1. Configurar contexto via função SQL
await supabaseServer.rpc('exec_with_user_context', {
  p_user_id: user.id,
  p_user_role: user.role,
  p_user_supplier_id: user.supplier_id || null
})

// 2. Fazer queries com anon key (que respeita RLS)
const client = createClient(url, anonKey)
const { data } = await client.from('machines').select('*')
```

**IMPORTANTE:** O contexto é válido apenas para a sessão/transação atual. Você precisa configurá-lo antes de cada conjunto de queries.

## Políticas Implementadas

### Por Role

- **admin/dev**: Acesso total a todas as tabelas
- **operador**: Acesso baseado em permissões específicas (can_manage_*, can_view_*, etc.)
- **fornecedor**: Acesso apenas a dados relacionados ao seu `supplier_id`

### Tabelas Protegidas

Todas as tabelas principais têm RLS habilitado:
- `users`
- `suppliers`
- `sites`
- `machine_types`
- `machines`
- `extension_types`
- `machine_extensions`
- `allocation_events`
- `financial_snapshots`
- `audit_logs`
- `login_attempts`

## Aplicando as Políticas

Execute o arquivo de migração no Supabase:

```bash
# Via Supabase CLI
supabase db reset

# Ou via SQL Editor no dashboard do Supabase
# Cole o conteúdo de rls_policies.sql e execute
```

## Testando RLS

1. Conecte ao banco com diferentes usuários
2. Tente fazer queries nas tabelas
3. Verifique se apenas os dados permitidos são retornados

Exemplo de teste:
```sql
-- Configurar contexto como operador
SELECT exec_with_user_context(
  'user-id-aqui'::UUID,
  'operador',
  NULL
);

-- Tentar selecionar máquinas
SELECT * FROM machines;
-- Deve retornar apenas máquinas permitidas para operador
```

## Migração Gradual

Se você já está usando service role key, pode migrar gradualmente:

1. Aplique as políticas RLS (elas não afetam service role key)
2. Teste as políticas com anon key em desenvolvimento
3. Migre endpoints críticos primeiro
4. Migre o resto gradualmente

## Notas Importantes

- **Service Role Key**: Bypassa RLS completamente. Use apenas em operações administrativas.
- **Anon Key**: Respeita RLS. Use para operações normais da aplicação.
- **Contexto**: Deve ser configurado antes de cada query quando usando anon key.
- **Performance**: RLS adiciona uma pequena sobrecarga, mas é geralmente negligenciável.
