-- SpecCheck Database Schema
-- PostgreSQL (Supabase)

-- Component datasheets
CREATE TABLE datasheets (
  part_number TEXT PRIMARY KEY,
  manufacturer TEXT NOT NULL,
  category TEXT NOT NULL,
  specs JSONB NOT NULL,
  datasheet_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_datasheets_manufacturer ON datasheets(manufacturer);
CREATE INDEX idx_datasheets_category ON datasheets(category);
CREATE INDEX idx_datasheets_specs ON datasheets USING GIN(specs);

-- Full-text search on part numbers
ALTER TABLE datasheets ADD COLUMN search_vector TSVECTOR
  GENERATED ALWAYS AS (to_tsvector('english', part_number || ' ' || manufacturer)) STORED;
CREATE INDEX idx_datasheets_search ON datasheets USING GIN(search_vector);

-- User accounts (minimal, for community contributions)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  reputation INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community submissions
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  product_name TEXT NOT NULL,
  listing_url TEXT,
  listing_url_hash TEXT, -- For fast lookup
  claimed_specs JSONB NOT NULL,
  actual_specs JSONB NOT NULL,
  verdict TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  component_list JSONB NOT NULL,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_submissions_listing_hash ON submissions(listing_url_hash);
CREATE INDEX idx_submissions_user ON submissions(user_id);
CREATE INDEX idx_submissions_created ON submissions(created_at DESC);

-- Full-text search on submissions
ALTER TABLE submissions ADD COLUMN search_vector TSVECTOR
  GENERATED ALWAYS AS (to_tsvector('english', product_name || ' ' || verdict)) STORED;
CREATE INDEX idx_submissions_search ON submissions USING GIN(search_vector);

-- Votes on submissions
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  submission_id UUID REFERENCES submissions(id),
  vote_type TEXT CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, submission_id)
);

CREATE INDEX idx_votes_submission ON votes(submission_id);

-- Update reputation on vote
CREATE OR REPLACE FUNCTION update_reputation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET reputation = reputation + CASE WHEN NEW.vote_type = 'up' THEN 1 ELSE -1 END
    WHERE id = (SELECT user_id FROM submissions WHERE id = NEW.submission_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reputation
AFTER INSERT ON votes
FOR EACH ROW EXECUTE FUNCTION update_reputation();
