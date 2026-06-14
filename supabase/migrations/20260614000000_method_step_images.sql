-- Per-step optional images, index-aligned with method_steps TEXT[]
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS method_step_image_urls TEXT[] DEFAULT '{}';
