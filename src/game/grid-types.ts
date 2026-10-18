export type GridCell = Readonly<{
  x: number;
  y: number;
  z: number;
}>;

export type GridDirection = '+X' | '-X' | '+Y' | '-Y' | '+Z' | '-Z';

export type AxisVector = Readonly<{
  x: -1 | 0 | 1;
  y: -1 | 0 | 1;
  z: -1 | 0 | 1;
}>;

export type GridStep = Readonly<{
  from: GridCell;
  to: GridCell;
  direction: GridDirection;
  wrappedAxis: 'x' | 'y' | 'z' | null;
  wrapSign: -1 | 0 | 1;
}>;
