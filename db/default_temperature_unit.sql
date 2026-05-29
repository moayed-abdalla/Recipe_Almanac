-- Default temperature unit preference for recipe step conversions (C = Celsius, F = Fahrenheit)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS default_temperature_unit TEXT NOT NULL DEFAULT 'C'
  CHECK (default_temperature_unit IN ('C', 'F'));
