import type { LeaderboardEntry, PlayerRankResponse } from '../../src/shared/ranking-api';
import type { D1Database } from './env';

const WORLD_RANK_CTE = `
WITH player_runs AS (
  SELECT
    s.id,
    s.player_id,
    s.max_length,
    s.duration_ms,
    s.accepted_at,
    ROW_NUMBER() OVER (
      PARTITION BY s.player_id
      ORDER BY s.max_length DESC, s.duration_ms ASC, s.accepted_at ASC, s.id ASC
    ) AS player_row
  FROM scores s
),
best_runs AS (
  SELECT
    pr.id,
    pr.player_id,
    p.username,
    pr.max_length,
    pr.duration_ms,
    pr.accepted_at
  FROM player_runs pr
  JOIN players p ON p.id = pr.player_id
  WHERE pr.player_row = 1
),
world_ranked AS (
  SELECT
    id,
    player_id,
    username,
    max_length,
    duration_ms,
    accepted_at,
    ROW_NUMBER() OVER (
      ORDER BY max_length DESC, duration_ms ASC, accepted_at ASC, id ASC
    ) AS rank
  FROM best_runs
)
`;

type LeaderboardRow = {
  rank: number;
  username: string;
  maxLength: number;
  durationMs: number;
  acceptedAt: number;
};

type PlayerRankRow = LeaderboardRow & {
  playerId: string;
};

export async function getLeaderboard(
  db: D1Database,
  limit: number
): Promise<LeaderboardEntry[]> {
  const rows = await db.prepare(`${WORLD_RANK_CTE}
    SELECT
      rank,
      username,
      max_length AS maxLength,
      duration_ms AS durationMs,
      accepted_at AS acceptedAt
    FROM world_ranked
    ORDER BY rank ASC
    LIMIT ?
  `).bind(limit).all<LeaderboardRow>();

  return rows.results ?? [];
}

export async function getPlayerRank(
  db: D1Database,
  playerId: string
): Promise<PlayerRankResponse | null> {
  const row = await db.prepare(`${WORLD_RANK_CTE}
    SELECT
      rank,
      player_id AS playerId,
      username,
      max_length AS maxLength,
      duration_ms AS durationMs,
      accepted_at AS acceptedAt
    FROM world_ranked
    WHERE player_id = ?
  `).bind(playerId).first<PlayerRankRow>();

  if (!row) return null;
  return {
    rank: row.rank,
    username: row.username,
    maxLength: row.maxLength,
    durationMs: row.durationMs
  };
}

export async function rankPlayer(db: D1Database, playerId: string): Promise<number | null> {
  return (await getPlayerRank(db, playerId))?.rank ?? null;
}
