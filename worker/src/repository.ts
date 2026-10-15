import type { D1Database } from './env';

export type GameRecord = {
  id: string;
  playerId: string;
  startedAt: number;
  finalizedAt: number | null;
  status: 'started' | 'accepted' | 'rejected';
};

export type ScoreRecord = {
  id: number;
  gameId: string;
  playerId: string;
  username: string;
  maxLength: number;
  foodEaten: number;
  durationMs: number;
  acceptedAt: number;
};

export type AcceptedScoreInput = {
  gameId: string;
  playerId: string;
  username: string;
  maxLength: number;
  foodEaten: number;
  durationMs: number;
  acceptedAt: number;
};

export async function upsertPlayer(
  db: D1Database,
  playerId: string,
  username: string,
  nowMs: number
): Promise<void> {
  await db.prepare(`
    INSERT INTO players (id, username, created_at, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      username = excluded.username,
      updated_at = excluded.updated_at
  `).bind(playerId, username, nowMs, nowMs).run();
}

export async function createGame(
  db: D1Database,
  gameId: string,
  playerId: string,
  startedAtMs: number
): Promise<void> {
  await db.prepare(`
    INSERT INTO games (id, player_id, started_at, finalized_at, status)
    VALUES (?, ?, ?, NULL, 'started')
  `).bind(gameId, playerId, startedAtMs).run();
}

export async function getGame(db: D1Database, gameId: string): Promise<GameRecord | null> {
  return db.prepare(`
    SELECT
      id,
      player_id AS playerId,
      started_at AS startedAt,
      finalized_at AS finalizedAt,
      status
    FROM games
    WHERE id = ?
  `).bind(gameId).first<GameRecord>();
}

export async function getScoreByGame(
  db: D1Database,
  gameId: string
): Promise<ScoreRecord | null> {
  return db.prepare(`
    SELECT
      id,
      game_id AS gameId,
      player_id AS playerId,
      username_snapshot AS username,
      max_length AS maxLength,
      food_eaten AS foodEaten,
      duration_ms AS durationMs,
      accepted_at AS acceptedAt
    FROM scores
    WHERE game_id = ?
  `).bind(gameId).first<ScoreRecord>();
}

export async function finalizeAcceptedScore(
  db: D1Database,
  input: AcceptedScoreInput
): Promise<ScoreRecord> {
  const insertScore = db.prepare(`
    INSERT INTO scores (
      game_id,
      player_id,
      username_snapshot,
      max_length,
      food_eaten,
      duration_ms,
      accepted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    input.gameId,
    input.playerId,
    input.username,
    input.maxLength,
    input.foodEaten,
    input.durationMs,
    input.acceptedAt
  );

  const finalizeGame = db.prepare(`
    UPDATE games
    SET status = 'accepted', finalized_at = ?
    WHERE id = ? AND player_id = ? AND status = 'started'
  `).bind(input.acceptedAt, input.gameId, input.playerId);

  await db.batch([insertScore, finalizeGame]);

  const score = await getScoreByGame(db, input.gameId);
  if (!score) {
    throw new Error('Accepted score was not persisted.');
  }
  return score;
}
