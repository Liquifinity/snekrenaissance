PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY NOT NULL,
  username TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY NOT NULL,
  player_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  finalized_at INTEGER,
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'accepted', 'rejected')),
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL UNIQUE,
  player_id TEXT NOT NULL,
  username_snapshot TEXT NOT NULL,
  max_length INTEGER NOT NULL,
  food_eaten INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  accepted_at INTEGER NOT NULL,
  FOREIGN KEY (game_id) REFERENCES games(id),
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE INDEX IF NOT EXISTS idx_scores_player_best
  ON scores(player_id, max_length DESC, duration_ms ASC, accepted_at ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_scores_global_rank
  ON scores(max_length DESC, duration_ms ASC, accepted_at ASC, id ASC);
