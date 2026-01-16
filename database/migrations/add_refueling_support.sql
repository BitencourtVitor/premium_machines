CREATE TABLE IF NOT EXISTS fuel_suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fuel_suppliers_active ON fuel_suppliers(is_active);

CREATE TABLE IF NOT EXISTS refueling_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    fuel_supplier_id UUID REFERENCES fuel_suppliers(id) ON DELETE SET NULL,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    time_of_day TIME NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refueling_templates_site ON refueling_templates(site_id);
CREATE INDEX IF NOT EXISTS idx_refueling_templates_machine ON refueling_templates(machine_id);
CREATE INDEX IF NOT EXISTS idx_refueling_templates_supplier ON refueling_templates(fuel_supplier_id);
CREATE INDEX IF NOT EXISTS idx_refueling_templates_active ON refueling_templates(is_active);

ALTER TABLE allocation_events
ADD COLUMN IF NOT EXISTS has_refueling BOOLEAN NOT NULL DEFAULT FALSE;

