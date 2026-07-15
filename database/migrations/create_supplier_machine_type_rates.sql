-- Módulo de custo: preço por categoria (machine_type) vinculado a fornecedor.
--
-- Histórico de preço: cada reajuste do fornecedor vira uma NOVA linha com um
-- effective_from mais recente, em vez de sobrescrever a linha existente. A taxa
-- vigente numa data X é a linha com o maior effective_from que seja <= X. Isso
-- garante que alocações já encerradas antes de um reajuste continuem sendo
-- calculadas com a taxa que estava valendo na época.
--
-- "4 semanas" (four_week_rate) é o tier que o fornecedor chama de "mês", mas
-- padronizado como 4 semanas inteiras (28 dias corridos), não mês-calendário.
--
-- override_* representa o preço negociado especificamente para a Premium (a
-- empresa dona deste sistema) com aquele fornecedor, quando existir — prevalece
-- sobre o preço-base (*_rate) na hora de calcular custo. Sistema é de uma
-- empresa só, por isso não há uma tabela de "clientes" — o override é direto
-- na linha de (supplier, machine_type, effective_from).

CREATE TABLE public.supplier_machine_type_rates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  supplier_id uuid NOT NULL,
  machine_type_id uuid NOT NULL,
  daily_rate numeric,
  weekly_rate numeric,
  four_week_rate numeric,
  override_daily_rate numeric,
  override_weekly_rate numeric,
  override_four_week_rate numeric,
  effective_from date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT supplier_machine_type_rates_pkey PRIMARY KEY (id),
  CONSTRAINT supplier_machine_type_rates_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id),
  CONSTRAINT supplier_machine_type_rates_machine_type_id_fkey FOREIGN KEY (machine_type_id) REFERENCES public.machine_types(id),
  CONSTRAINT supplier_machine_type_rates_unique UNIQUE (supplier_id, machine_type_id, effective_from)
);

CREATE INDEX idx_supplier_machine_type_rates_lookup
  ON public.supplier_machine_type_rates (supplier_id, machine_type_id, effective_from DESC);
