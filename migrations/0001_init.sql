-- PadelTime initial schema
-- Auth tables (Better Auth core schema) + app tables.

CREATE TABLE `user` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `email` text NOT NULL,
  `email_verified` integer NOT NULL DEFAULT 0,
  `image` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
CREATE UNIQUE INDEX `uq_user_email` ON `user` (`email`);

CREATE TABLE `session` (
  `id` text PRIMARY KEY NOT NULL,
  `expires_at` integer NOT NULL,
  `token` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `ip_address` text,
  `user_agent` text,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE
);
CREATE UNIQUE INDEX `uq_session_token` ON `session` (`token`);
CREATE INDEX `ix_session_user` ON `session` (`user_id`);

CREATE TABLE `account` (
  `id` text PRIMARY KEY NOT NULL,
  `account_id` text NOT NULL,
  `provider_id` text NOT NULL,
  `issuer` text NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `access_token` text,
  `refresh_token` text,
  `id_token` text,
  `access_token_expires_at` integer,
  `refresh_token_expires_at` integer,
  `scope` text,
  `password` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
CREATE INDEX `ix_account_user` ON `account` (`user_id`);

CREATE TABLE `verification` (
  `id` text PRIMARY KEY NOT NULL,
  `identifier` text NOT NULL,
  `value` text NOT NULL,
  `expires_at` integer NOT NULL,
  `created_at` integer,
  `updated_at` integer
);

-- App tables

CREATE TABLE `groups` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `owner_id` text NOT NULL REFERENCES `user`(`id`),
  `created_at` integer NOT NULL
);

CREATE TABLE `group_members` (
  `id` text PRIMARY KEY NOT NULL,
  `group_id` text NOT NULL REFERENCES `groups`(`id`) ON DELETE CASCADE,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `role` text NOT NULL DEFAULT 'member',
  `created_at` integer NOT NULL
);
CREATE UNIQUE INDEX `uq_group_member` ON `group_members` (`group_id`,`user_id`);
CREATE INDEX `ix_gm_user` ON `group_members` (`user_id`);

CREATE TABLE `game_sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `group_id` text NOT NULL REFERENCES `groups`(`id`) ON DELETE CASCADE,
  `name` text NOT NULL,
  `venue` text,
  `starts_at` integer,
  `courts` integer NOT NULL DEFAULT 2,
  `max_players` integer NOT NULL DEFAULT 12,
  `points_per_match` integer NOT NULL DEFAULT 24,
  `format` text NOT NULL DEFAULT 'americano',
  `status` text NOT NULL DEFAULT 'draft',
  `invite_code` text NOT NULL,
  `created_by` text NOT NULL REFERENCES `user`(`id`),
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
CREATE UNIQUE INDEX `uq_gs_invite` ON `game_sessions` (`invite_code`);
CREATE INDEX `ix_gs_group` ON `game_sessions` (`group_id`);

CREATE TABLE `session_players` (
  `id` text PRIMARY KEY NOT NULL,
  `session_id` text NOT NULL REFERENCES `game_sessions`(`id`) ON DELETE CASCADE,
  `user_id` text REFERENCES `user`(`id`) ON DELETE SET NULL,
  `guest_name` text,
  `status` text NOT NULL DEFAULT 'confirmed',
  `joined_at` integer NOT NULL,
  `checked_in_at` integer
);
CREATE INDEX `ix_sp_session` ON `session_players` (`session_id`);
CREATE UNIQUE INDEX `uq_sp_user` ON `session_players` (`session_id`,`user_id`);

CREATE TABLE `rounds` (
  `id` text PRIMARY KEY NOT NULL,
  `session_id` text NOT NULL REFERENCES `game_sessions`(`id`) ON DELETE CASCADE,
  `number` integer NOT NULL,
  `byes_json` text NOT NULL DEFAULT '[]',
  `created_at` integer NOT NULL
);
CREATE INDEX `ix_rounds_session` ON `rounds` (`session_id`);
CREATE UNIQUE INDEX `uq_round_number` ON `rounds` (`session_id`,`number`);

CREATE TABLE `matches` (
  `id` text PRIMARY KEY NOT NULL,
  `session_id` text NOT NULL REFERENCES `game_sessions`(`id`) ON DELETE CASCADE,
  `round_id` text NOT NULL REFERENCES `rounds`(`id`) ON DELETE CASCADE,
  `court` integer NOT NULL,
  `a1` text NOT NULL,
  `a2` text NOT NULL,
  `b1` text NOT NULL,
  `b2` text NOT NULL,
  `score_a` integer,
  `score_b` integer,
  `status` text NOT NULL DEFAULT 'pending',
  `submitted_by` text,
  `submitted_at` integer,
  `confirmed_by` text,
  `confirmed_at` integer
);
CREATE INDEX `ix_matches_session` ON `matches` (`session_id`);
CREATE INDEX `ix_matches_round` ON `matches` (`round_id`);

CREATE TABLE `player_results` (
  `id` text PRIMARY KEY NOT NULL,
  `session_id` text NOT NULL REFERENCES `game_sessions`(`id`) ON DELETE CASCADE,
  `round_id` text NOT NULL,
  `match_id` text NOT NULL REFERENCES `matches`(`id`) ON DELETE CASCADE,
  `player_id` text NOT NULL,
  `partner_id` text NOT NULL,
  `points_for` integer NOT NULL,
  `points_against` integer NOT NULL,
  `result` text NOT NULL,
  `created_at` integer NOT NULL
);
CREATE INDEX `ix_pr_session` ON `player_results` (`session_id`);
CREATE INDEX `ix_pr_match` ON `player_results` (`match_id`);
CREATE INDEX `ix_pr_player` ON `player_results` (`player_id`);

CREATE TABLE `score_audit` (
  `id` text PRIMARY KEY NOT NULL,
  `session_id` text NOT NULL REFERENCES `game_sessions`(`id`) ON DELETE CASCADE,
  `match_id` text NOT NULL,
  `actor_user_id` text,
  `action` text NOT NULL,
  `score_a` integer,
  `score_b` integer,
  `created_at` integer NOT NULL
);
CREATE INDEX `ix_audit_session` ON `score_audit` (`session_id`);
