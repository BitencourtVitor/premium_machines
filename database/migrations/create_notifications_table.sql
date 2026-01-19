-- Migration: Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES allocation_events(id) ON DELETE CASCADE,
    root_type VARCHAR(50) NOT NULL,
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    trigger_date TIMESTAMP WITH TIME ZONE NOT NULL,
    archived_by JSONB DEFAULT '[]'::jsonb,
    viewed_by JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_notifications_root_type ON notifications(root_type);
CREATE INDEX IF NOT EXISTS idx_notifications_trigger_date ON notifications(trigger_date);

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow admins and devs to see all notifications
CREATE POLICY "Admins and devs can view all notifications"
ON notifications FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'dev')
  )
);

-- Allow admins and devs to update notifications (for archiving/viewing)
CREATE POLICY "Admins and devs can update notifications"
ON notifications FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'dev')
  )
);
