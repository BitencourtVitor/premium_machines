CREATE TABLE IF NOT EXISTS email_recipients (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL UNIQUE,
  nome       TEXT NOT NULL,
  lista      TEXT NOT NULL DEFAULT 'geral'
             CHECK (lista IN ('geral', 'manutencao_corretiva')),
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
