-- Add character customization columns to kids table
-- This migration adds support for the 2D paper-doll avatar system

ALTER TABLE public.kids
ADD COLUMN IF NOT EXISTS equipped jsonb NOT NULL DEFAULT '{"base":"base-boy","hat":null,"outfit":null,"weapon":null}',
ADD COLUMN IF NOT EXISTS owned_items text[] NOT NULL DEFAULT ARRAY['base-boy', 'base-girl'],
ADD COLUMN IF NOT EXISTS coins integer NOT NULL DEFAULT 0;
