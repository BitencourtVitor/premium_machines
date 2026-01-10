-- Criar usuário: Vitor Bitencourt
-- PIN: 130620
-- Role: dev
-- Email: vitor@premiumgrpinc.com

INSERT INTO users (
  id,
  nome,
  email,
  pin_hash,
  role,
  can_view_dashboard,
  can_view_map,
  can_manage_sites,
  can_manage_machines,
  can_register_events,
  can_approve_events,
  can_view_financial,
  can_manage_suppliers,
  can_manage_users,
  can_view_logs,
  validado
) VALUES (
  gen_random_uuid(),
  'Vitor Bitencourt',
  'vitor@premiumgrpinc.com',
  '$2a$10$l.RLzYiQvZ1o5Ap46BlOfeiCOUYcPhOAi83hY679JMDIfAMk6uFWC',
  'dev',
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true
);
