import {
  FOOD_HEAD_EXCLUSION_RADIUS,
  FOOD_PICKUP_RADIUS,
  GROWTH_PER_FOOD,
  INITIAL_BODY_SEGMENTS,
  SNAKE_SPEED
} from '../../src/game/constants';
import type { StartGameRequest, SubmitResultRequest } from '../../src/shared/ranking-api';

const USERNAME_MAX_CODE_POINTS = 24;
const PLAYER_ID_MAX_LENGTH = 128;
const MAX_FOOD_EATEN = 10_000;
const SESSION_MAX_AGE_MS = 6 * 60 * 60 * 1_000;
const CLIENT_CLOCK_GRACE_MS = 5_000;
const THEORETICAL_FOOD_TRAVEL_MS =
  ((FOOD_HEAD_EXCLUSION_RADIUS - FOOD_PICKUP_RADIUS) / SNAKE_SPEED) * 1_000;
const MIN_ACTIVE_MS_PER_FOOD = Math.min(200, Math.floor(THEORETICAL_FOOD_TRAVEL_MS));
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F-\u009F]/u;
const PLAYER_ID_PATTERN = /^[A-Za-z0-9._:-]+$/;

function fail(message: string): never {
  throw new Error(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireNonNegativeInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    return fail(`${field} must be a finite non-negative integer.`);
  }
  return value;
}

export function normalizeUsername(input: unknown): string {
  if (typeof input !== 'string') return fail('username must be a string.');

  const username = input.trim().normalize('NFC');
  const length = [...username].length;
  if (length < 1 || length > USERNAME_MAX_CODE_POINTS) {
    return fail(`username must contain 1..${USERNAME_MAX_CODE_POINTS} Unicode code points.`);
  }
  if (CONTROL_CHARACTERS.test(username)) {
    return fail('username contains control characters.');
  }
  return username;
}

export function validatePlayerId(input: unknown): string {
  if (typeof input !== 'string') return fail('playerId must be a string.');
  if (input.length < 1 || input.length > PLAYER_ID_MAX_LENGTH || !PLAYER_ID_PATTERN.test(input)) {
    return fail('playerId has an invalid format.');
  }
  return input;
}

export function validateStartRequest(input: unknown): StartGameRequest {
  if (!isRecord(input)) return fail('request body must be an object.');
  return {
    playerId: validatePlayerId(input.playerId),
    username: normalizeUsername(input.username)
  };
}

export function validateResultRequest(
  input: unknown,
  serverElapsedMs: number
): SubmitResultRequest {
  if (!isRecord(input)) return fail('request body must be an object.');
  const elapsed = requireNonNegativeInteger(serverElapsedMs, 'serverElapsedMs');
  const playerId = validatePlayerId(input.playerId);
  const username = normalizeUsername(input.username);
  const foodEaten = requireNonNegativeInteger(input.foodEaten, 'foodEaten');
  const maxLength = requireNonNegativeInteger(input.maxLength, 'maxLength');
  const durationMs = requireNonNegativeInteger(input.durationMs, 'durationMs');

  if (foodEaten > MAX_FOOD_EATEN) return fail('foodEaten exceeds the V1 limit.');

  const expectedLength = INITIAL_BODY_SEGMENTS + foodEaten * GROWTH_PER_FOOD;
  if (maxLength !== expectedLength) return fail('maxLength does not match canonical growth.');

  if (durationMs < foodEaten * MIN_ACTIVE_MS_PER_FOOD) {
    return fail('durationMs is implausibly short for foodEaten.');
  }

  if (durationMs > elapsed + CLIENT_CLOCK_GRACE_MS) {
    return fail('durationMs exceeds server elapsed time allowance.');
  }

  return { playerId, username, maxLength, foodEaten, durationMs };
}

export function validateSessionAge(serverElapsedMs: number): void {
  const elapsed = requireNonNegativeInteger(serverElapsedMs, 'serverElapsedMs');
  if (elapsed > SESSION_MAX_AGE_MS) {
    fail('session is expired.');
  }
}
