-- Add status enum type
DO $$ BEGIN
    CREATE TYPE recommendation_status AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add status column
ALTER TABLE tag_recommendations 
ADD COLUMN IF NOT EXISTS status recommendation_status DEFAULT 'pending';

-- Update status based on existing is_accepted field
UPDATE tag_recommendations 
SET status = CASE 
    WHEN is_accepted = true THEN 'accepted'::recommendation_status
    WHEN feedback_reason IS NOT NULL THEN 'rejected'::recommendation_status
    ELSE 'pending'::recommendation_status
END;

-- Create index
CREATE INDEX IF NOT EXISTS idx_tag_recommendations_status ON tag_recommendations(status);

-- Add check constraint (optional, ensures data consistency)
-- ALTER TABLE tag_recommendations 
-- ADD CONSTRAINT chk_status_consistency 
-- CHECK (
--     (status = 'accepted' AND is_accepted = true) OR
--     (status = 'rejected' AND is_accepted = false) OR
--     (status = 'pending' AND is_accepted = false)
-- );

COMMENT ON COLUMN tag_recommendations.status IS 'Recommendation status: pending, accepted, rejected';
