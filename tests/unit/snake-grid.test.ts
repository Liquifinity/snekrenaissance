import { describe, expect, it } from 'vitest';
import {
  addGrowth,
  commitSnakeStep,
  createGridSnake,
  occupiedCellKeys,
  snakeHead,
  snakeTail
} from '../../src/game/snake';
import { cellKey } from '../../src/game/grid-topology';

describe('GridSnakeState', () => {
  it('creates six unique face-adjacent cells centered at the approved head cell without wrap seams', () => {
    const snake = createGridSnake();
    expect(snake.segments).toHaveLength(6);
    expect(snakeHead(snake).cell).toEqual({ x: 4, y: 4, z: 4 });
    expect(occupiedCellKeys(snake).size).toBe(6);
    expect(new Set(snake.segments.map((segment) => segment.id)).size).toBe(6);

    for (let index = 1; index < snake.segments.length; index += 1) {
      const a = snake.segments[index - 1].cell;
      const b = snake.segments[index].cell;
      const distance = Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);
      expect(distance).toBe(1);
    }
  });

  it('moves each stable segment id into its predecessor previous cell on a normal step', () => {
    const snake = createGridSnake();
    const before = snake.segments.map((segment) => ({ id: segment.id, cell: { ...segment.cell } }));
    const oldTail = snakeTail(snake).cell;

    const transition = commitSnakeStep(snake, { x: 4, y: 4, z: 5 });

    expect(transition.grew).toBe(false);
    expect(transition.bornSegmentId).toBeNull();
    expect(snake.segments).toHaveLength(6);
    expect(snake.segments[0]).toEqual({ id: before[0].id, cell: { x: 4, y: 4, z: 5 } });

    for (let index = 1; index < snake.segments.length; index += 1) {
      expect(snake.segments[index]).toEqual({
        id: before[index].id,
        cell: before[index - 1].cell
      });
    }

    expect(occupiedCellKeys(snake).has(cellKey(oldTail))).toBe(false);
    expect(transition.previousSegments).toEqual(before);
    expect(transition.currentSegments).toEqual(snake.segments);
  });

  it('queues growth without fabricating cells and then births exactly one stable tail id per step', () => {
    const snake = createGridSnake();
    const originalLength = snake.segments.length;
    const originalIds = snake.segments.map((segment) => segment.id);
    const firstPreviousTail = { ...snakeTail(snake).cell };

    addGrowth(snake, 2);
    expect(snake.pendingGrowth).toBe(2);
    expect(snake.segments).toHaveLength(originalLength);

    const first = commitSnakeStep(snake, { x: 4, y: 4, z: 5 });
    expect(first.grew).toBe(true);
    expect(first.bornSegmentId).not.toBeNull();
    expect(snake.pendingGrowth).toBe(1);
    expect(snake.segments).toHaveLength(originalLength + 1);
    expect(snakeTail(snake).cell).toEqual(firstPreviousTail);
    expect(snake.segments.slice(0, originalIds.length).map((segment) => segment.id)).toEqual(originalIds);

    const firstBornId = first.bornSegmentId;
    const secondPreviousTail = { ...snakeTail(snake).cell };
    const second = commitSnakeStep(snake, { x: 4, y: 4, z: 6 });

    expect(second.grew).toBe(true);
    expect(second.bornSegmentId).not.toBeNull();
    expect(second.bornSegmentId).not.toBe(firstBornId);
    expect(snake.pendingGrowth).toBe(0);
    expect(snake.segments).toHaveLength(originalLength + 2);
    expect(snakeTail(snake).cell).toEqual(secondPreviousTail);
    expect(new Set(snake.segments.map((segment) => segment.id)).size).toBe(originalLength + 2);
  });

  it('rejects invalid growth amounts', () => {
    const snake = createGridSnake();
    expect(() => addGrowth(snake, -1)).toThrow('growth');
    expect(() => addGrowth(snake, 1.5)).toThrow('growth');
  });
});
