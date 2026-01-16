-- Enable RLS for new refueling-related tables
ALTER TABLE fuel_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE refueling_templates ENABLE ROW LEVEL SECURITY;

-- Policies for fuel_suppliers
CREATE POLICY "fuel_suppliers_select"
  ON fuel_suppliers FOR SELECT
  USING (
    current_user_role() IN ('admin', 'dev') OR
    (current_user_role() = 'operador' AND user_has_permission('can_manage_suppliers'))
  );

CREATE POLICY "fuel_suppliers_insert"
  ON fuel_suppliers FOR INSERT
  WITH CHECK (
    current_user_role() IN ('admin', 'dev') OR
    (current_user_role() = 'operador' AND user_has_permission('can_manage_suppliers'))
  );

CREATE POLICY "fuel_suppliers_update"
  ON fuel_suppliers FOR UPDATE
  USING (
    current_user_role() IN ('admin', 'dev') OR
    (current_user_role() = 'operador' AND user_has_permission('can_manage_suppliers'))
  );

CREATE POLICY "fuel_suppliers_delete"
  ON fuel_suppliers FOR DELETE
  USING (
    current_user_role() IN ('admin', 'dev')
  );

-- Policies for refueling_templates
CREATE POLICY "refueling_templates_select"
  ON refueling_templates FOR SELECT
  USING (
    current_user_role() IN ('admin', 'dev') OR
    (current_user_role() = 'operador' AND user_has_permission('can_register_events'))
  );

CREATE POLICY "refueling_templates_insert"
  ON refueling_templates FOR INSERT
  WITH CHECK (
    current_user_role() IN ('admin', 'dev') OR
    (current_user_role() = 'operador' AND user_has_permission('can_register_events'))
  );

CREATE POLICY "refueling_templates_update"
  ON refueling_templates FOR UPDATE
  USING (
    current_user_role() IN ('admin', 'dev') OR
    (current_user_role() = 'operador' AND user_has_permission('can_register_events'))
  );

CREATE POLICY "refueling_templates_delete"
  ON refueling_templates FOR DELETE
  USING (
    current_user_role() IN ('admin', 'dev')
  );

