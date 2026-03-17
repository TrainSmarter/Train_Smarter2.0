-- Migration: Add "0" (healthy/none) default option to illness and soreness categories
-- These categories previously started at 1, meaning athletes could only select
-- a severity level but had no way to indicate "not sick" or "no soreness".

-- 1. Update illness: add "0" = "Nicht krank" / "Not sick", set min_value to 0
UPDATE feedback_categories
SET
  min_value = 0,
  scale_labels = '{"0": {"de": "Nicht krank", "en": "Not sick"}, "1": {"de": "Leicht krank", "en": "Slightly sick"}, "2": {"de": "Krank", "en": "Sick"}}'::jsonb,
  updated_at = now()
WHERE slug = 'illness';

-- 2. Update soreness: add "0" = "Keiner" / "None", set min_value to 0
UPDATE feedback_categories
SET
  min_value = 0,
  scale_labels = '{"0": {"de": "Keiner", "en": "None"}, "1": {"de": "Leicht", "en": "Light"}, "2": {"de": "Stark", "en": "Strong"}}'::jsonb,
  updated_at = now()
WHERE slug = 'soreness';
