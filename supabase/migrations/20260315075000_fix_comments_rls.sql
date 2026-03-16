-- Ensure comments can be inserted by anyone (the API route handles validation)
-- Drop potentially conflicting insert policies and create a permissive one
DO $$ BEGIN
  -- Try dropping existing insert policies that may conflict
  BEGIN DROP POLICY "Anyone can insert tag comments" ON comments; EXCEPTION WHEN undefined_object THEN NULL; END;
  BEGIN DROP POLICY "Anyone can insert comments" ON comments; EXCEPTION WHEN undefined_object THEN NULL; END;
  BEGIN DROP POLICY "allow_insert_comments" ON comments; EXCEPTION WHEN undefined_object THEN NULL; END;
END $$;

-- Create a single permissive insert policy
CREATE POLICY "Allow all comment inserts" ON comments FOR INSERT WITH CHECK (true);

-- Ensure read access is also open
DO $$ BEGIN
  BEGIN DROP POLICY "Anyone can read tag comments" ON comments; EXCEPTION WHEN undefined_object THEN NULL; END;
END $$;

CREATE POLICY "Allow all comment reads" ON comments FOR SELECT USING (true);
