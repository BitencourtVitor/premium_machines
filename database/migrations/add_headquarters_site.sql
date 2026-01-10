-- Adicionar campo para identificar sede da empresa
ALTER TABLE sites ADD COLUMN IF NOT EXISTS is_headquarters BOOLEAN DEFAULT false;

-- Criar índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_sites_headquarters ON sites(is_headquarters) WHERE is_headquarters = true;

-- Inserir sede da empresa (apenas se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM sites WHERE is_headquarters = true
  ) THEN
    INSERT INTO sites (
      id,
      title,
      address,
      latitude,
      longitude,
      city,
      state,
      country,
      is_headquarters,
      ativo,
      place_type,
      geocoding_confidence,
      notas
    ) VALUES (
      gen_random_uuid(),
      'Premium Group Inc. - Sede',
      '1B Landing Lane, Hopedale, MA',
      42.1031736,
      -71.51192172278277,
      'Hopedale',
      'MA',
      'United States',
      true,
      true,
      'headquarters',
      1.0,
      'Sede da empresa Premium Group Inc.'
    );
  END IF;
END $$;
