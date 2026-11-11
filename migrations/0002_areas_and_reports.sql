CREATE TABLE areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  house_id TEXT NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);
CREATE INDEX areas_by_house ON areas (house_id);

ALTER TABLE chores ADD COLUMN area_id INTEGER REFERENCES areas(id) ON DELETE SET NULL;

-- A report is a ping about one area. An anonymous report stores no sender:
-- sender_user_id is NULL, so the sender cannot be recovered from the database.
CREATE TABLE reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  house_id TEXT NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  target_user_id TEXT,
  sender_user_id TEXT,
  note TEXT NOT NULL DEFAULT '',
  photo BLOB,
  created_on TEXT NOT NULL DEFAULT CURRENT_DATE,
  resolved_at TEXT
);
CREATE INDEX reports_by_house ON reports (house_id, resolved_at);
