// Compute a simple rectangular floor plan for a list of areas.
// The plan is a set of rows. Row widths alternate so that the result
// looks like rooms in an apartment and not like a uniform table.

const PLAN_WIDTH = 600;
const ROW_HEIGHT = 150;
const ROOMS_PER_ROW = 3;
const WIDTH_PATTERNS = [
  [5, 3, 4],
  [3, 5, 4],
  [4, 4, 4],
];

/** Return { width, height, rooms: [{ area, x, y, width, height }] }. */
export function layoutFloorPlan(areas) {
  const rooms = [];
  const rowCount = Math.ceil(areas.length / ROOMS_PER_ROW);
  for (let row = 0; row < rowCount; row++) {
    const rowAreas = areas.slice(row * ROOMS_PER_ROW, (row + 1) * ROOMS_PER_ROW);
    const weights = WIDTH_PATTERNS[row % WIDTH_PATTERNS.length].slice(0, rowAreas.length);
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let x = 0;
    rowAreas.forEach((area, index) => {
      const isLast = index === rowAreas.length - 1;
      const width = isLast ? PLAN_WIDTH - x : Math.round((PLAN_WIDTH * weights[index]) / total);
      rooms.push({ area, x, y: row * ROW_HEIGHT, width, height: ROW_HEIGHT });
      x += width;
    });
  }
  return { width: PLAN_WIDTH, height: Math.max(rowCount, 1) * ROW_HEIGHT, rooms };
}
