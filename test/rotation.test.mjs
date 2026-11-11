import test from "node:test";
import assert from "node:assert/strict";
import { weekIndex, weekStart, assignChores } from "../src/rotation.mjs";

test("a week starts on Monday and ends on Sunday (UTC)", () => {
  const monday = new Date("2026-11-09T00:00:00Z");
  const sunday = new Date("2026-11-15T23:59:59Z");
  const nextMonday = new Date("2026-11-16T00:00:00Z");
  assert.equal(weekIndex(monday), weekIndex(sunday));
  assert.equal(weekIndex(nextMonday), weekIndex(monday) + 1);
  assert.equal(weekStart(weekIndex(sunday)).toISOString(), monday.toISOString());
});

test("each chore moves to the next member each week", () => {
  const chores = ["bins", "bathroom", "kitchen"];
  const members = ["a", "b", "c"];
  const first = assignChores(chores, members, 0).map((row) => row.member);
  const second = assignChores(chores, members, 1).map((row) => row.member);
  assert.deepEqual(first, ["a", "b", "c"]);
  assert.deepEqual(second, ["b", "c", "a"]);
});

test("every member gets every chore once in a full cycle", () => {
  const chores = ["bins", "bathroom"];
  const members = ["a", "b", "c"];
  const seen = new Set();
  for (let week = 0; week < members.length; week++) {
    for (const row of assignChores(chores, members, week)) seen.add(`${row.chore}:${row.member}`);
  }
  assert.equal(seen.size, chores.length * members.length);
});

test("a house with no members has no assignee", () => {
  assert.deepEqual(assignChores(["bins"], [], 5), [{ chore: "bins", member: null }]);
});
