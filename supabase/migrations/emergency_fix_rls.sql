-- EMERGENCY FIX: Complete RLS Reset
-- Run this in Supabase SQL Editor immediately

-- 1. Disable RLS on all tables
ALTER TABLE canvases DISABLE ROW LEVEL SECURITY;
ALTER TABLE nodes DISABLE ROW LEVEL SECURITY;
ALTER TABLE edges DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL policies (comprehensive list)
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on canvases
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'canvases'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON canvases', pol.policyname);
    END LOOP;
    
    -- Drop all policies on nodes
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'nodes'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON nodes', pol.policyname);
    END LOOP;
    
    -- Drop all policies on edges
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'edges'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON edges', pol.policyname);
    END LOOP;
END $$;

-- 3. Create new simple policies for canvases
CREATE POLICY "canvases_all_policy" ON canvases
FOR ALL USING (auth.uid() = user_id);

-- 4. Create new simple policies for nodes
CREATE POLICY "nodes_all_policy" ON nodes
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM canvases 
        WHERE canvases.id = nodes.canvas_id 
        AND canvases.user_id = auth.uid()
    )
);

-- 5. Create new simple policies for edges
CREATE POLICY "edges_all_policy" ON edges
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM canvases 
        WHERE canvases.id = edges.canvas_id 
        AND canvases.user_id = auth.uid()
    )
);

-- 6. Re-enable RLS
ALTER TABLE canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE edges ENABLE ROW LEVEL SECURITY;

-- 7. Verify the fix
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('canvases', 'nodes', 'edges')
ORDER BY tablename, policyname;