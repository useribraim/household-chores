import type { Child } from "hono/jsx";
import { raw } from "hono/html";
import type { Area, Assignment, Member, Report } from "./index";
import { layoutFloorPlan } from "./floor_plan.mjs";

const STYLE = `
:root { --bg:#f6f4ef; --card:#fff; --ink:#1d1b16; --muted:#6b665c; --line:#e2ddd2; --accent:#2f6f4f; --done:#e6f2ea; --mine:#fff7dc; --alert:#fde3dc; --badge:#c8432b; }
@media (prefers-color-scheme: dark) { :root { --bg:#171613; --card:#22201c; --ink:#f1ede4; --muted:#a39d90; --line:#37342d; --accent:#7fc79f; --done:#203328; --mine:#3a3320; --alert:#47241d; --badge:#e0624a; } }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 680px; margin: 0 auto; padding: 24px 16px 64px; }
header { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:20px; }
h1 { font-size: 1.6rem; margin: 0; } h2 { font-size: 1.05rem; margin: 28px 0 10px; color: var(--muted); font-weight:600; }
a { color: var(--accent); }
.card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:14px 16px; margin-bottom:10px; display:flex; align-items:center; gap:12px; }
.card.done { background:var(--done); } .card.mine { background:var(--mine); } .card.mine.done { background:var(--done); }
.card .grow { flex:1; min-width:0; } .name { font-weight:600; } .who { color:var(--muted); font-size:.92rem; }
.done .name { text-decoration: line-through; }
button, input[type=text] { font: inherit; border-radius: 8px; border:1px solid var(--line); padding: 8px 12px; background:var(--card); color:var(--ink); }
button { cursor:pointer; } button.primary { background:var(--accent); color:var(--bg); border-color:var(--accent); font-weight:600; }
button.quiet { border:none; background:none; color:var(--muted); padding:4px 8px; }
#sign-in input { background:#fff; color:#111; }
form.row { display:flex; gap:8px; } form.row input { flex:1; min-width:0; }
.pill { display:inline-block; padding:2px 10px; border:1px solid var(--line); border-radius:999px; margin:0 6px 6px 0; font-size:.92rem; }
.invite { word-break: break-all; font-size:.9rem; color:var(--muted); }
.plan { width:100%; height:auto; display:block; border-radius:10px; }
.plan rect { fill:var(--card); stroke:var(--ink); stroke-width:4; }
.plan a:hover rect { fill:var(--mine); } .plan .mine rect { fill:var(--mine); } .plan .alert rect { fill:var(--alert); }
.plan text { fill:var(--ink); font: 600 17px system-ui, sans-serif; } .plan text.sub { fill:var(--muted); font-weight:400; font-size:13px; }
.plan circle { fill:var(--badge); } .plan text.count { fill:#fff; font-size:13px; text-anchor:middle; }
.ping { background:var(--alert); border:1px solid var(--line); border-radius:12px; padding:12px 16px; margin-bottom:10px; }
.ping img { max-width:100%; border-radius:8px; margin-top:8px; display:block; }
.ping .meta { color:var(--muted); font-size:.9rem; } .ping form { margin-top:8px; }
.stack { display:flex; flex-direction:column; gap:10px; background:var(--card); border:1px solid var(--line); border-radius:12px; padding:14px 16px; }
select, textarea { font:inherit; border-radius:8px; border:1px solid var(--line); padding:8px 12px; background:var(--card); color:var(--ink); width:100%; }
label.check { display:flex; gap:8px; align-items:center; } #preview { max-width:100%; border-radius:8px; display:none; }
table { width:100%; border-collapse:collapse; font-size:.95rem; } td { padding:6px 0; border-bottom:1px solid var(--line); } td:last-child { text-align:right; color:var(--muted); }
`;

// The Clerk front-end host is encoded in the publishable key.
function clerkFrontendHost(publishableKey: string): string {
  const encoded = publishableKey.split("_")[2] ?? "";
  try {
    return atob(encoded).replace(/\$$/, "");
  } catch {
    return "";
  }
}

export function Layout(props: { title: string; publishableKey?: string; signedIn: boolean; children?: Child }) {
  const host = props.publishableKey ? clerkFrontendHost(props.publishableKey) : "";
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{props.title} · Household Chores</title>
        <style>{raw(STYLE)}</style>
        {host && (
          <script
            async
            crossorigin="anonymous"
            data-clerk-publishable-key={props.publishableKey}
            src={`https://${host}/npm/@clerk/clerk-js@5/dist/clerk.browser.js`}
          ></script>
        )}
      </head>
      <body>
        <main>
          <header>
            <h1>{props.title}</h1>
            <div id="account"></div>
          </header>
          {props.children}
        </main>
        {host &&
          raw(`<script>
window.addEventListener("load", async () => {
  if (!window.Clerk) return;
  await window.Clerk.load();
  const signedInOnServer = ${props.signedIn ? "true" : "false"};
  const signInElement = document.getElementById("sign-in");
  if (window.Clerk.user) {
    window.Clerk.mountUserButton(document.getElementById("account"));
    if (!signedInOnServer) window.location.reload();
  } else if (signInElement) {
    window.Clerk.mountSignIn(signInElement, { forceRedirectUrl: window.location.href, signUpForceRedirectUrl: window.location.href });
  } else {
    window.location.href = "/";
  }
});
</script>`)}
      </body>
    </html>
  );
}

export function SignInPage() {
  return (
    <div>
      <p>Sign in to see who does which chore this week.</p>
      <div id="sign-in"></div>
    </div>
  );
}

export function HouseListPage(props: { houses: { id: string; name: string }[] }) {
  return (
    <div>
      {props.houses.map((house) => (
        <a class="card" href={`/h/${house.id}`}>
          <span class="grow name">{house.name}</span>
        </a>
      ))}
      <h2>Create a house</h2>
      <form class="row" method="post" action="/houses">
        <input type="text" name="name" placeholder="House name, for example 12 Rathmines Road" required maxlength={60} />
        <button class="primary" type="submit">Create</button>
      </form>
      <p class="who">To join a house, open the invitation link that a roommate sent you.</p>
    </div>
  );
}

type HouseData = {
  house: { id: string; name: string };
  currentUserId: string;
  members: Member[];
  areas: Area[];
  thisWeek: Assignment[];
  nextWeek: Assignment[];
  completedBy: Map<number, string>;
  reports: Report[];
};

function memberName(data: HouseData, userId: string | null, fallback: string): string {
  if (!userId) return fallback;
  if (userId === data.currentUserId) return "you";
  return data.members.find((member) => member.user_id === userId)?.display_name ?? "a roommate";
}

// The members who have a chore in this area in the current week.
function responsibleMembers(data: HouseData, areaId: number): Member[] {
  const seen = new Map<string, Member>();
  for (const { chore, member } of data.thisWeek) {
    if (chore.area_id === areaId && member) seen.set(member.user_id, member);
  }
  return [...seen.values()];
}

function FloorPlan(props: { data: HouseData }) {
  const { data } = props;
  const plan = layoutFloorPlan(data.areas);
  return (
    <svg class="plan" viewBox={`-4 -4 ${plan.width + 8} ${plan.height + 8}`} role="img" aria-label="Floor plan of the house">
      {plan.rooms.map((room: { area: Area; x: number; y: number; width: number; height: number }) => {
        const open = data.reports.filter((report) => report.area_id === room.area.id).length;
        const responsible = responsibleMembers(data, room.area.id);
        const mine = responsible.some((member) => member.user_id === data.currentUserId);
        const names = responsible.map((member) => (member.user_id === data.currentUserId ? "You" : member.display_name));
        return (
          <a href={`/h/${data.house.id}/a/${room.area.id}`} class={open ? "alert" : mine ? "mine" : ""}>
            <rect x={room.x} y={room.y} width={room.width} height={room.height} />
            <text x={room.x + 14} y={room.y + 30}>{room.area.name}</text>
            <text class="sub" x={room.x + 14} y={room.y + 52}>{names.join(", ") || "No chore"}</text>
            {open > 0 && <circle cx={room.x + room.width - 24} cy={room.y + 26} r="13" />}
            {open > 0 && <text class="count" x={room.x + room.width - 24} y={room.y + 31}>{open}</text>}
          </a>
        );
      })}
    </svg>
  );
}

function ReportCard(props: { data: HouseData; report: Report; back: string; showArea: boolean }) {
  const { data, report } = props;
  const area = data.areas.find((row) => row.id === report.area_id);
  return (
    <div class="ping">
      <div class="meta">
        {props.showArea && area ? `${area.name} · ` : ""}
        from {memberName(data, report.sender_user_id, "an anonymous roommate")} · for{" "}
        {memberName(data, report.target_user_id, "everyone")} · {report.created_on}
      </div>
      {report.note && <div>{report.note}</div>}
      {report.has_photo ? (
        <img src={`/h/${data.house.id}/reports/${report.id}/photo`} alt="Photo attached to the ping" loading="lazy" />
      ) : null}
      <form method="post" action={`/h/${data.house.id}/reports/${report.id}/resolve`}>
        <input type="hidden" name="back" value={props.back} />
        <button type="submit">Mark as resolved</button>
      </form>
    </div>
  );
}

function ChoreCard(props: { data: HouseData; assignment: Assignment; back: string }) {
  const { data } = props;
  const { chore, member } = props.assignment;
  const doneBy = data.completedBy.get(chore.id);
  const mine = member?.user_id === data.currentUserId;
  const area = data.areas.find((row) => row.id === chore.area_id);
  return (
    <div class={`card${doneBy ? " done" : ""}${mine ? " mine" : ""}`}>
      <form method="post" action={`/h/${data.house.id}/chores/${chore.id}/toggle`}>
        <button type="submit" aria-label={doneBy ? "Mark as not done" : "Mark as done"}>{doneBy ? "✓" : "○"}</button>
      </form>
      <div class="grow">
        <div class="name">{chore.name}</div>
        <div class="who">
          {mine ? "You" : (member?.display_name ?? "Nobody")}
          {area ? ` · ${area.name}` : ""}
          {doneBy ? ` · done by ${memberName(data, doneBy, "a roommate")}` : ""}
        </div>
      </div>
      <form method="post" action={`/h/${data.house.id}/chores/${chore.id}/delete`}>
        <button class="quiet" type="submit" aria-label={`Remove ${chore.name}`}>Remove</button>
      </form>
    </div>
  );
}

export function HousePage(props: HouseData & { inviteUrl: string; weekStartsOn: Date }) {
  const weekLabel = props.weekStartsOn.toLocaleDateString("en-IE", { day: "numeric", month: "long", timeZone: "UTC" });
  const back = `/h/${props.house.id}`;
  const forMe = props.reports.filter((report) => report.target_user_id === props.currentUserId);
  const others = props.reports.filter((report) => report.target_user_id !== props.currentUserId);
  return (
    <div>
      {forMe.length > 0 && <h2>Pings for you</h2>}
      {forMe.map((report) => <ReportCard data={props} report={report} back={back} showArea />)}

      <h2>The house. Select an area to see it or to send a ping.</h2>
      <FloorPlan data={props} />
      <form class="row" method="post" action={`/h/${props.house.id}/areas`} style="margin-top:10px">
        <input type="text" name="name" placeholder="Add an area, for example Balcony" required maxlength={40} />
        <button type="submit">Add area</button>
      </form>

      <h2>This week (from Monday {weekLabel})</h2>
      {props.thisWeek.length === 0 && <p class="who">No chores yet. Add the first chore below.</p>}
      {props.thisWeek.map((assignment) => <ChoreCard data={props} assignment={assignment} back={back} />)}
      <form class="row" method="post" action={`/h/${props.house.id}/chores`}>
        <input type="text" name="name" placeholder="Add a chore, for example Take out the bins" required maxlength={60} />
        <select name="area_id" style="width:auto" aria-label="Area">
          <option value="">No area</option>
          {props.areas.map((area) => <option value={String(area.id)}>{area.name}</option>)}
        </select>
        <button class="primary" type="submit">Add</button>
      </form>

      {others.length > 0 && <h2>Other open pings</h2>}
      {others.map((report) => <ReportCard data={props} report={report} back={back} showArea />)}

      {props.nextWeek.length > 0 && (
        <div>
          <h2>Next week</h2>
          <table>
            {props.nextWeek.map(({ chore, member }) => (
              <tr>
                <td>{chore.name}</td>
                <td>{member?.user_id === props.currentUserId ? "You" : (member?.display_name ?? "Nobody")}</td>
              </tr>
            ))}
          </table>
        </div>
      )}

      <h2>Roommates</h2>
      <div>{props.members.map((member) => <span class="pill">{member.display_name}</span>)}</div>
      <p class="who">Send this invitation link to a roommate:</p>
      <p class="invite">{props.inviteUrl}</p>
      <p><a href="/">All houses</a></p>
    </div>
  );
}

const PHOTO_SCRIPT = `<script>
// Reduce the photo in the browser before the upload. The new JPEG has no camera metadata.
document.getElementById("photo-file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  const field = document.getElementById("photo-data");
  const preview = document.getElementById("preview");
  field.value = ""; preview.style.display = "none";
  if (!file) return;
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  field.value = canvas.toDataURL("image/jpeg", 0.7);
  preview.src = field.value; preview.style.display = "block";
});
</script>`;

export function AreaPage(props: HouseData & { area: Area }) {
  const back = `/h/${props.house.id}/a/${props.area.id}`;
  const responsible = responsibleMembers(props, props.area.id);
  const reports = props.reports.filter((report) => report.area_id === props.area.id);
  const chores = props.thisWeek.filter(({ chore }) => chore.area_id === props.area.id);
  const defaultTarget = responsible.find((member) => member.user_id !== props.currentUserId)?.user_id ?? "";
  return (
    <div>
      <p><a href={`/h/${props.house.id}`}>← {props.house.name}</a></p>

      <h2>Chores here this week</h2>
      {chores.length === 0 && <p class="who">No chore is assigned to this area.</p>}
      {chores.map((assignment) => <ChoreCard data={props} assignment={assignment} back={back} />)}
      <form class="row" method="post" action={`/h/${props.house.id}/chores`}>
        <input type="hidden" name="area_id" value={String(props.area.id)} />
        <input type="hidden" name="back" value={back} />
        <input type="text" name="name" placeholder={`Add a chore for ${props.area.name}`} required maxlength={60} />
        <button type="submit">Add</button>
      </form>

      <h2>Open pings</h2>
      {reports.length === 0 && <p class="who">No open ping for this area.</p>}
      {reports.map((report) => <ReportCard data={props} report={report} back={back} showArea={false} />)}

      <h2>Send a ping about {props.area.name}</h2>
      <form class="stack" method="post" action={`/h/${props.house.id}/a/${props.area.id}/reports`}>
        <label>
          For
          <select name="target">
            <option value="">Everyone</option>
            {props.members
              .filter((member) => member.user_id !== props.currentUserId)
              .map((member) => (
                <option value={member.user_id} selected={member.user_id === defaultTarget}>
                  {member.display_name}
                  {responsible.includes(member) ? " (has this area this week)" : ""}
                </option>
              ))}
          </select>
        </label>
        <textarea name="note" rows={2} maxlength={280} placeholder="What is the problem? For example: dishes in the sink since Monday"></textarea>
        <label>
          Photo (optional)
          <input type="file" id="photo-file" accept="image/*" capture="environment" />
        </label>
        <img id="preview" alt="Preview of the photo" />
        <input type="hidden" name="photo" id="photo-data" />
        <label class="check">
          <input type="checkbox" name="anonymous" checked /> Send anonymously. The application does not store your name with this ping.
        </label>
        <button class="primary" type="submit">Send ping</button>
      </form>
      {raw(PHOTO_SCRIPT)}
    </div>
  );
}
