import test from "node:test";
import assert from "node:assert/strict";
import { layoutFloorPlan } from "../src/floor_plan.mjs";

test("each row fills the full plan width with no overlap", () => {
  for (let count = 1; count <= 10; count++) {
    const plan = layoutFloorPlan(Array.from({ length: count }, (_, index) => `area ${index}`));
    assert.equal(plan.rooms.length, count);
    const rows = Map.groupBy(plan.rooms, (room) => room.y);
    for (const rooms of rows.values()) {
      let x = 0;
      for (const room of rooms) {
        assert.equal(room.x, x);
        assert.ok(room.width > 0);
        x += room.width;
      }
      assert.equal(x, plan.width);
    }
  }
});

test("an empty house gives an empty plan", () => {
  assert.equal(layoutFloorPlan([]).rooms.length, 0);
});
