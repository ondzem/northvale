-- SQL Skript pro inicializaci databáze Supabase pro propojení s Pohodou
-- Spusťte tento skript v Supabase SQL Editoru (Dashboard -> SQL Editor -> New Query)

-- 1. Tabulka pro logování synchronizace
CREATE TABLE IF NOT EXISTS public.pohoda_sync_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    direction VARCHAR(10) NOT NULL,        -- 'IN' (do e-shopu) / 'OUT' (do Pohody)
    operation VARCHAR(50) NOT NULL,        -- 'import-stock', 'export-order', 'test-connection'
    status VARCHAR(10) NOT NULL,           -- 'SUCCESS', 'ERROR', 'WARNING'
    message TEXT,                          -- Detailní zpráva o výsledku / chyba
    payload_excerpt TEXT                   -- Ukázka odeslaných/přijatých dat pro snazší debug
);

-- Index pro rychlé řazení logů podle času
CREATE INDEX IF NOT EXISTS idx_pohoda_sync_log_created_at ON public.pohoda_sync_log (created_at DESC);

-- Povolení přístupu k logům pro adminy
-- (Pokud používáte Supabase RLS, můžete přidat pravidla pro admin roli)
ALTER TABLE public.pohoda_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Povolit čtení logů pouze pro authenticated"
    ON public.pohoda_sync_log
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Povolit zápis logů pouze pro service_role"
    ON public.pohoda_sync_log
    FOR INSERT
    TO service_role
    WITH CHECK (true);
