-- Add tsvector column for full-text search
ALTER TABLE "collection_items" ADD COLUMN "search_vector" tsvector;

-- Create GIN index on search_vector
CREATE INDEX "collection_items_search_vector_idx" ON "collection_items" USING GIN ("search_vector");

-- Function to build the search vector from item fields
CREATE OR REPLACE FUNCTION collection_items_search_vector_update() RETURNS trigger AS $$
DECLARE
  custom_text text := '';
  materials_text text := '';
  tags_text text := '';
BEGIN
  -- Extract text values from custom_fields JSONB
  IF NEW.custom_fields IS NOT NULL THEN
    SELECT string_agg(value::text, ' ')
    INTO custom_text
    FROM jsonb_each_text(NEW.custom_fields);
  END IF;

  -- Join materials array
  IF NEW.materials IS NOT NULL THEN
    SELECT array_to_string(NEW.materials, ' ') INTO materials_text;
  END IF;

  -- Join tags array
  IF NEW.tags IS NOT NULL THEN
    SELECT array_to_string(NEW.tags, ' ') INTO tags_text;
  END IF;

  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.period, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.style, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.origin_country, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.maker_attribution, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.provenance_narrative, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(materials_text, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(tags_text, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(custom_text, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.notes, '')), 'D');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on INSERT and UPDATE
CREATE TRIGGER collection_items_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "collection_items"
  FOR EACH ROW
  EXECUTE FUNCTION collection_items_search_vector_update();

-- Backfill existing rows
UPDATE "collection_items" SET "search_vector" = "search_vector";
