import { Hono } from "hono";
import type { Context } from "hono";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { assignChores, weekIndex, weekStart } from "./rotation.mjs";
import { Layout, SignInPage, HouseListPage, HousePage, SetupPage } from "./pages";

type Bindings = {
  DB: D1Database;
  CLERK_PUBLISHABLE_KEY: string;
  CLERK_SECRET_KEY: string;
  // Local development only. Set both in .dev.vars to run without Clerk.
  LOCAL_USER_ID?: string;
  LOCAL_USER_NAME?: string;
};
type Variables = { userId: string | null };
type App = { Bindings: Bindings; Variables: Variables };

export type Member = { id: number; user_id: string; display_name: string };
export type Chore = { id: number; name: string; area_id: number | null };
export type Area = { id: number; name: string };
export type Assignment = { chore: Chore; member: Member | null };
export type Report = {
  id: number;
  area_id: number;
  target_user_id: string | null;
  sender_user_id: string | null;
  note: string;
  has_photo: number;
  created_on: string;
};

// A new house starts with these rooms and one chore for each room.
const DEFAULT_AREAS: [string, string][] = [
  ["Kitchen", "Wash up and wipe the surfaces"],
  ["Living room", "Tidy and hoover"],
  ["Bathroom", "Clean the bathroom"],
  ["Hall", "Mop the floors"],
  ["Bins", "Take out the bins"],
];
const MAXIMUM_PHOTO_BYTES = 1_500_000;

const app = new Hono<App>();

const isLocalMode = (c: Context<App>) => Boolean(c.env.LOCAL_USER_ID);

// Reject a state-changing request that does not come from this origin.
app.use("*", async (c, next) => {
  if (c.req.method !== "GET" && c.req.method !== "HEAD") {
    const origin = c.req.header("origin");
    if (origin && origin !== new URL(c.req.url).origin) return c.text("Cross-origin request refused", 403);
  }
  await next();
});

app.use("*", async (c, next) => {
  if (isLocalMode(c)) {
    c.set("userId", c.env.LOCAL_USER_ID ?? null);
    return next();
  }
  return clerkMiddleware()(c, async () => {
    c.set("userId", getAuth(c)?.userId ?? null);
    await next();
  });
});

async function displayName(c: Context<App>, userId: string): Promise<string> {
  if (isLocalMode(c)) return c.env.LOCAL_USER_NAME ?? "Local user";
  const user = await c.get("clerk").users.getUser(userId);
  return (
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    user.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "Roommate"
  );
}

function signIn(c: Context<App>) {
  return c.html(
    <Layout title="Sign in" publishableKey={c.env.CLERK_PUBLISHABLE_KEY} signedIn={false}>
      <SignInPage />
    </Layout>,
  );
}

function randomToken(bytes: number): string {
  const buffer = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(buffer, (value) => value.toString(16).padStart(2, "0")).join("");
}

async function membership(c: Context<App>, houseId: string, userId: string) {
  return c.env.DB.prepare("SELECT id FROM members WHERE house_id = ? AND user_id = ?")
    .bind(houseId, userId)
    .first<{ id: number }>();
}

app.get("/", async (c) => {
  const userId = c.get("userId");
  if (!userId) return signIn(c);
  const { results } = await c.env.DB.prepare(
    "SELECT h.id, h.name FROM houses h JOIN members m ON m.house_id = h.id WHERE m.user_id = ? ORDER BY h.created_at",
  )
    .bind(userId)
    .all<{ id: string; name: string }>();
  if (results.length === 1) return c.redirect(`/h/${results[0].id}`);
  return c.html(
    <Layout title="Your houses" publishableKey={c.env.CLERK_PUBLISHABLE_KEY} signedIn>
      <HouseListPage houses={results} />
    </Layout>,
  );
});

app.post("/houses", async (c) => {
  const userId = c.get("userId");
  if (!userId) return c.redirect("/");
  const form = await c.req.parseBody();
  const name = String(form.name ?? "").trim().slice(0, 60);
  if (!name) return c.redirect("/");
  const houseId = randomToken(8);
  const name_ = await displayName(c, userId);
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO houses (id, name, invite_code) VALUES (?, ?, ?)").bind(houseId, name, randomToken(12)),
    c.env.DB.prepare("INSERT INTO members (house_id, user_id, display_name) VALUES (?, ?, ?)").bind(houseId, userId, name_),
    ...DEFAULT_AREAS.map(([area]) => c.env.DB.prepare("INSERT INTO areas (house_id, name) VALUES (?, ?)").bind(houseId, area)),
    ...DEFAULT_AREAS.map(([area, chore]) =>
      c.env.DB.prepare(
        "INSERT INTO chores (house_id, name, area_id) SELECT ?, ?, id FROM areas WHERE house_id = ? AND name = ?",
      ).bind(houseId, chore, houseId, area),
    ),
  ]);
  return c.redirect(`/h/${houseId}`);
});

app.get("/join/:code", async (c) => {
  const userId = c.get("userId");
  if (!userId) return signIn(c);
  const house = await c.env.DB.prepare("SELECT id FROM houses WHERE invite_code = ?")
    .bind(c.req.param("code"))
    .first<{ id: string }>();
  if (!house) return c.text("This invitation link is not valid.", 404);
  await c.env.DB.prepare("INSERT OR IGNORE INTO members (house_id, user_id, display_name) VALUES (?, ?, ?)")
    .bind(house.id, userId, await displayName(c, userId))
    .run();
  return c.redirect(`/h/${house.id}`);
});

async function loadHouse(c: Context<App>, houseId: string, week: number) {
  const [house, members, areas, chores, completions, reports] = await c.env.DB.batch([
    c.env.DB.prepare("SELECT id, name, invite_code FROM houses WHERE id = ?").bind(houseId),
    c.env.DB.prepare("SELECT id, user_id, display_name FROM members WHERE house_id = ? ORDER BY id").bind(houseId),
    c.env.DB.prepare("SELECT id, name FROM areas WHERE house_id = ? ORDER BY id").bind(houseId),
    c.env.DB.prepare("SELECT id, name, area_id FROM chores WHERE house_id = ? ORDER BY id").bind(houseId),
    c.env.DB.prepare(
      "SELECT c.chore_id, c.user_id FROM completions c JOIN chores ch ON ch.id = c.chore_id WHERE ch.house_id = ? AND c.week = ?",
    ).bind(houseId, week),
    c.env.DB.prepare(
      "SELECT id, area_id, target_user_id, sender_user_id, note, photo IS NOT NULL AS has_photo, created_on FROM reports WHERE house_id = ? AND resolved_at IS NULL ORDER BY id DESC",
    ).bind(houseId),
  ]);
  const memberRows = members.results as Member[];
  const choreRows = chores.results as Chore[];
  return {
    house: house.results[0] as { id: string; name: string; invite_code: string },
    members: memberRows,
    areas: areas.results as Area[],
    thisWeek: assignChores(choreRows, memberRows, week) as Assignment[],
    nextWeek: assignChores(choreRows, memberRows, week + 1) as Assignment[],
    completedBy: new Map(
      (completions.results as { chore_id: number; user_id: string }[]).map((row) => [row.chore_id, row.user_id]),
    ),
    reports: reports.results as Report[],
  };
}

app.get("/h/:houseId", async (c) => {
  const userId = c.get("userId");
  if (!userId) return signIn(c);
  const houseId = c.req.param("houseId");
  if (!(await membership(c, houseId, userId))) return c.text("You are not a member of this house.", 403);
  const week = weekIndex(new Date());
  const data = await loadHouse(c, houseId, week);
  return c.html(
    <Layout title={data.house.name} houseName={data.house.name} publishableKey={c.env.CLERK_PUBLISHABLE_KEY} signedIn>
      <HousePage {...data} currentUserId={userId} weekStartsOn={weekStart(week)} pingSent={c.req.query("sent") === "1"} />
    </Layout>,
  );
});

app.get("/h/:houseId/setup", async (c) => {
  const userId = c.get("userId");
  if (!userId) return signIn(c);
  const houseId = c.req.param("houseId");
  if (!(await membership(c, houseId, userId))) return c.text("You are not a member of this house.", 403);
  const data = await loadHouse(c, houseId, weekIndex(new Date()));
  return c.html(
    <Layout title="Set up" houseName={data.house.name} publishableKey={c.env.CLERK_PUBLISHABLE_KEY} signedIn>
      <SetupPage {...data} currentUserId={userId} inviteUrl={`${new URL(c.req.url).origin}/join/${data.house.invite_code}`} />
    </Layout>,
  );
});

// A room opens as a sheet on the house page.
app.get("/h/:houseId/a/:areaId", (c) => c.redirect(`/h/${c.req.param("houseId")}#room-${Number(c.req.param("areaId"))}`));

app.post("/h/:houseId/areas/:areaId/delete", async (c) => {
  const userId = c.get("userId");
  const houseId = c.req.param("houseId");
  if (!userId || !(await membership(c, houseId, userId))) return c.text("Forbidden", 403);
  await c.env.DB.prepare("DELETE FROM areas WHERE id = ? AND house_id = ?")
    .bind(Number(c.req.param("areaId")), houseId)
    .run();
  return c.redirect(`/h/${houseId}/setup`);
});

app.post("/h/:houseId/areas", async (c) => {
  const userId = c.get("userId");
  const houseId = c.req.param("houseId");
  if (!userId || !(await membership(c, houseId, userId))) return c.text("Forbidden", 403);
  const form = await c.req.parseBody();
  const name = String(form.name ?? "").trim().slice(0, 40);
  if (name) await c.env.DB.prepare("INSERT INTO areas (house_id, name) VALUES (?, ?)").bind(houseId, name).run();
  return c.redirect(`/h/${houseId}/setup`);
});

// Send a ping about one area, with an optional note and an optional photo.
app.post("/h/:houseId/a/:areaId/reports", async (c) => {
  const userId = c.get("userId");
  const houseId = c.req.param("houseId");
  if (!userId || !(await membership(c, houseId, userId))) return c.text("Forbidden", 403);
  const areaId = Number(c.req.param("areaId"));
  const area = await c.env.DB.prepare("SELECT id FROM areas WHERE id = ? AND house_id = ?")
    .bind(areaId, houseId)
    .first<{ id: number }>();
  if (!area) return c.text("Area not found", 404);

  const form = await c.req.parseBody();
  const note = String(form.note ?? "").trim().slice(0, 280);
  const anonymous = form.anonymous === "on";

  // The target is one member of this house, or nobody (the ping is for everyone).
  let target: string | null = String(form.target ?? "") || null;
  if (target) {
    const member = await membership(c, houseId, target);
    if (!member) target = null;
  }

  // The browser sends the photo as a JPEG data URL after it reduces the size.
  // The re-encoding in the browser also removes the camera metadata.
  let photo: Uint8Array | null = null;
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(form.photo ?? ""));
  if (match) {
    const bytes = Uint8Array.from(atob(match[1]), (character) => character.charCodeAt(0));
    if (bytes.length <= MAXIMUM_PHOTO_BYTES) photo = bytes;
  }
  if (!note && !photo) return c.redirect(`/h/${houseId}#room-${areaId}`);

  await c.env.DB.prepare(
    "INSERT INTO reports (house_id, area_id, target_user_id, sender_user_id, note, photo) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(houseId, areaId, target, anonymous ? null : userId, note, photo ? photo.buffer : null)
    .run();
  return c.redirect(`/h/${houseId}?sent=1`);
});

app.get("/h/:houseId/reports/:reportId/photo", async (c) => {
  const userId = c.get("userId");
  const houseId = c.req.param("houseId");
  if (!userId || !(await membership(c, houseId, userId))) return c.text("Forbidden", 403);
  const row = await c.env.DB.prepare("SELECT photo FROM reports WHERE id = ? AND house_id = ?")
    .bind(Number(c.req.param("reportId")), houseId)
    .first<{ photo: ArrayBuffer | number[] | null }>();
  if (!row?.photo) return c.text("Photo not found", 404);
  const bytes = row.photo instanceof ArrayBuffer ? new Uint8Array(row.photo) : Uint8Array.from(row.photo);
  return c.body(bytes, 200, { "content-type": "image/jpeg", "cache-control": "private, max-age=3600" });
});

app.post("/h/:houseId/reports/:reportId/resolve", async (c) => {
  const userId = c.get("userId");
  const houseId = c.req.param("houseId");
  if (!userId || !(await membership(c, houseId, userId))) return c.text("Forbidden", 403);
  // A resolved report keeps no photo.
  await c.env.DB.prepare(
    "UPDATE reports SET resolved_at = CURRENT_TIMESTAMP, photo = NULL WHERE id = ? AND house_id = ? AND resolved_at IS NULL",
  )
    .bind(Number(c.req.param("reportId")), houseId)
    .run();
  const back = String((await c.req.parseBody()).back ?? "");
  return c.redirect(back.startsWith(`/h/${houseId}`) ? back : `/h/${houseId}`);
});

app.post("/h/:houseId/chores", async (c) => {
  const userId = c.get("userId");
  const houseId = c.req.param("houseId");
  if (!userId || !(await membership(c, houseId, userId))) return c.text("Forbidden", 403);
  const form = await c.req.parseBody();
  const name = String(form.name ?? "").trim().slice(0, 60);
  const areaId = Number(form.area_id) || null;
  if (name) {
    await c.env.DB.prepare(
      "INSERT INTO chores (house_id, name, area_id) SELECT ?, ?, (SELECT id FROM areas WHERE id = ? AND house_id = ?)",
    )
      .bind(houseId, name, areaId, houseId)
      .run();
  }
  const back = String(form.back ?? "");
  return c.redirect(back.startsWith(`/h/${houseId}`) ? back : `/h/${houseId}`);
});

// Return to the page that sent the form, when that page belongs to this house.
async function redirectBack(c: Context<App>, houseId: string) {
  const back = String((await c.req.parseBody()).back ?? "");
  return c.redirect(back.startsWith(`/h/${houseId}`) ? back : `/h/${houseId}`);
}

app.post("/h/:houseId/chores/:choreId/delete", async (c) => {
  const userId = c.get("userId");
  const houseId = c.req.param("houseId");
  if (!userId || !(await membership(c, houseId, userId))) return c.text("Forbidden", 403);
  await c.env.DB.prepare("DELETE FROM chores WHERE id = ? AND house_id = ?")
    .bind(Number(c.req.param("choreId")), houseId)
    .run();
  return redirectBack(c, houseId);
});

// Mark a chore as done for the current week, or clear the mark.
app.post("/h/:houseId/chores/:choreId/toggle", async (c) => {
  const userId = c.get("userId");
  const houseId = c.req.param("houseId");
  if (!userId || !(await membership(c, houseId, userId))) return c.text("Forbidden", 403);
  const chore = await c.env.DB.prepare("SELECT id FROM chores WHERE id = ? AND house_id = ?")
    .bind(Number(c.req.param("choreId")), houseId)
    .first<{ id: number }>();
  if (!chore) return c.text("Chore not found", 404);
  const week = weekIndex(new Date());
  const removed = await c.env.DB.prepare("DELETE FROM completions WHERE chore_id = ? AND week = ?")
    .bind(chore.id, week)
    .run();
  if (removed.meta.changes === 0) {
    await c.env.DB.prepare("INSERT INTO completions (chore_id, week, user_id) VALUES (?, ?, ?)")
      .bind(chore.id, week, userId)
      .run();
  }
  return redirectBack(c, houseId);
});

export default app;
