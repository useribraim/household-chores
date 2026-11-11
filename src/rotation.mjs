// Weekly chore rotation. Pure functions, no storage access.

const MILLISECONDS_PER_DAY = 86_400_000;
// 1970-01-05 was a Monday. Week 0 starts on that day (UTC).
const FIRST_MONDAY_OFFSET_DAYS = 4;

/** Return the index of the week (Monday to Sunday, UTC) that contains `date`. */
export function weekIndex(date) {
  const days = Math.floor(date.getTime() / MILLISECONDS_PER_DAY);
  return Math.floor((days - FIRST_MONDAY_OFFSET_DAYS) / 7);
}

/** Return the Monday (UTC) on which the given week starts. */
export function weekStart(week) {
  return new Date((week * 7 + FIRST_MONDAY_OFFSET_DAYS) * MILLISECONDS_PER_DAY);
}

/**
 * Assign each chore to one member for the given week.
 * Chore i goes to member (i + week) mod memberCount, so each chore moves
 * to the next member each week and the load stays even.
 */
export function assignChores(chores, members, week) {
  if (members.length === 0) return chores.map((chore) => ({ chore, member: null }));
  return chores.map((chore, position) => {
    const index = (((position + week) % members.length) + members.length) % members.length;
    return { chore, member: members[index] };
  });
}
