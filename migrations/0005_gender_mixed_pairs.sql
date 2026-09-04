-- Player gender (woman / man, null = not set) and the per-session "mixed pairs" option.
ALTER TABLE session_players ADD COLUMN gender text;
ALTER TABLE game_sessions ADD COLUMN mixed_pairs integer NOT NULL DEFAULT 0;
