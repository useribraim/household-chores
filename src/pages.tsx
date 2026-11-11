import type { Child } from "hono/jsx";
import { raw } from "hono/html";
import type { Area, Assignment, Member, Report } from "./index";
import { layoutFloorPlan } from "./floor_plan.mjs";

const STYLE = `
:root {
  --bg:#f7f3ec; --card:#ffffff; --ink:#24211c; --muted:#7b7467; --line:#e9e2d5;
  --accent:#2f7a57; --accent-ink:#ffffff; --soft:#e9f3ec; --mine:#fff1c9; --mine-line:#edd48a;
  --alert:#ffe8e0; --alert-line:#f3b5a3; --alert-ink:#b23c22; --wall:#3a352d; --shadow:0 1px 2px rgba(40,30,10,.06), 0 6px 20px rgba(40,30,10,.06);
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg:#161512; --card:#211f1b; --ink:#f2eee6; --muted:#a69f91; --line:#34312a;
    --accent:#79c79b; --accent-ink:#10231a; --soft:#1e2e25; --mine:#3b3319; --mine-line:#6a5a24;
    --alert:#43231c; --alert-line:#7a3a2b; --alert-ink:#ffb4a0; --wall:#d8d2c5; --shadow:0 1px 2px rgba(0,0,0,.3), 0 6px 20px rgba(0,0,0,.25);
  }
}
* { box-sizing:border-box; }
html { -webkit-text-size-adjust:100%; }
body { margin:0; background:var(--bg); color:var(--ink); font:17px/1.45 ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width:560px; margin:0 auto; padding:18px 16px 72px; }
a { color:var(--accent); text-decoration:none; }
.top { display:flex; align-items:center; justify-content:space-between; gap:12px; min-height:36px; margin-bottom:18px; }
.top .house { font-weight:700; color:var(--muted); font-size:.95rem; letter-spacing:.01em; }
h1 { font-size:1.9rem; line-height:1.15; margin:0 0 2px; letter-spacing:-.01em; }
.sub { color:var(--muted); margin:0 0 22px; }
h2 { font-size:.82rem; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); margin:30px 0 10px; font-weight:700; }
.card { background:var(--card); border-radius:18px; box-shadow:var(--shadow); padding:14px 16px; margin-bottom:10px; }
.row { display:flex; align-items:center; gap:14px; }
.grow { flex:1; min-width:0; }
.title { font-weight:650; font-size:1.05rem; }
.hint { color:var(--muted); font-size:.9rem; }
.empty { color:var(--muted); background:transparent; border:1.5px dashed var(--line); border-radius:18px; padding:16px; text-align:center; }

button, input, select, textarea { font:inherit; color:inherit; }
.check { width:44px; height:44px; flex:none; border-radius:50%; border:2px solid var(--muted); background:var(--card); cursor:pointer; font-size:1.2rem; line-height:1; display:grid; place-items:center; color:transparent; transition:transform .08s; }
.check:active { transform:scale(.92); }
.done .check { background:var(--accent); border-color:var(--accent); color:var(--accent-ink); }
.done .title { text-decoration:line-through; color:var(--muted); }
.chore.mine { background:var(--mine); box-shadow:none; border:1px solid var(--mine-line); }
.chore.mine.done { background:var(--soft); border-color:transparent; }

.btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; border:none; border-radius:14px; padding:12px 18px; background:var(--accent); color:var(--accent-ink); font-weight:700; cursor:pointer; width:100%; }
.btn.small { width:auto; padding:8px 14px; border-radius:12px; font-size:.92rem; }
.btn.ghost { background:transparent; color:var(--ink); border:1.5px solid var(--line); font-weight:600; }
.field { width:100%; border:1.5px solid var(--line); background:var(--card); border-radius:14px; padding:12px 14px; }
.field:focus { outline:2px solid var(--accent); outline-offset:1px; border-color:transparent; }
.inline { display:flex; gap:8px; } .inline .field { flex:1; min-width:0; } .inline .btn { width:auto; }

.avatar { width:32px; height:32px; flex:none; border-radius:50%; display:grid; place-items:center; font-weight:700; font-size:.9rem; color:#fff; }
.person { display:flex; gap:12px; align-items:flex-start; padding:10px 0; border-bottom:1px solid var(--line); }
.person:last-child { border-bottom:none; }
.tags { display:flex; flex-wrap:wrap; gap:6px; margin-top:4px; }
.tag { font-size:.85rem; padding:3px 10px; border-radius:999px; background:var(--bg); color:var(--ink); }
.tag.ok { background:var(--soft); color:var(--accent); text-decoration:line-through; }

.plan { width:100%; height:auto; display:block; }
.plan .room rect { fill:var(--card); stroke:var(--wall); stroke-width:5; stroke-linejoin:round; cursor:pointer; transition:fill .12s; }
.plan .room:hover rect { fill:var(--soft); }
.plan .room.mine rect { fill:var(--mine); }
.plan .room.alert rect { fill:var(--alert); }
.plan text { fill:var(--ink); font:650 22px ui-rounded, system-ui, sans-serif; pointer-events:none; }
.plan text.icon { font-size:34px; }
.plan text.who { fill:var(--muted); font-weight:500; font-size:17px; }
.plan .badge circle { fill:var(--alert-ink); } .plan .badge text { fill:#fff; font-size:17px; text-anchor:middle; }

.ping { background:var(--alert); border:1px solid var(--alert-line); border-radius:18px; padding:14px 16px; margin-bottom:10px; }
.ping .from { font-size:.85rem; color:var(--alert-ink); font-weight:650; margin-bottom:2px; }
.ping img { width:100%; border-radius:12px; margin-top:10px; display:block; }
.ping form { margin-top:10px; }

.toast { background:var(--accent); color:var(--accent-ink); border-radius:14px; padding:12px 16px; margin-bottom:16px; font-weight:650; }
.foot { display:flex; gap:10px; margin-top:28px; } .foot a { flex:1; text-align:center; }

dialog { border:none; padding:0; background:var(--bg); color:var(--ink); width:100%; max-width:560px; max-height:88vh; border-radius:24px 24px 0 0; margin:auto auto 0; overflow:auto; }
@media (min-width:620px) { dialog { border-radius:24px; margin:auto; } }
dialog::backdrop { background:rgba(20,15,5,.45); }
.sheet { padding:20px 18px 26px; }
.sheet-head { display:flex; align-items:center; gap:12px; margin-bottom:14px; }
.sheet-head .icon { font-size:2rem; } .sheet-head h3 { margin:0; font-size:1.4rem; }
.close { width:36px; height:36px; border-radius:50%; border:none; background:var(--line); cursor:pointer; font-size:1rem; }
.chips { display:flex; flex-wrap:wrap; gap:8px; margin:10px 0; }
.chip { border:1.5px solid var(--line); background:var(--card); border-radius:999px; padding:8px 14px; cursor:pointer; font-size:.95rem; }
.chip.on { border-color:var(--accent); background:var(--soft); color:var(--accent); font-weight:650; }
.photo { display:inline-flex; align-items:center; gap:8px; border:1.5px dashed var(--line); border-radius:14px; padding:10px 14px; cursor:pointer; color:var(--muted); }
.photo input { display:none; }
.photo:active { transform:scale(.98); }
.photo-buttons { display:flex; flex-wrap:wrap; gap:8px; }
.photo-zone { border-radius:16px; margin-top:10px; transition:outline-color .1s; outline:2px dashed transparent; outline-offset:4px; }
.photo-zone.over { outline-color:var(--accent); background:var(--soft); }
.drop-hint { display:none; margin-top:6px; }
@media (hover:hover) and (pointer:fine) { .photo.camera { display:none; } .drop-hint { display:block; } }
.photo-preview { position:relative; margin-top:10px; }
.photo-preview img { width:100%; border-radius:12px; display:block; }
.photo-preview .remove { position:absolute; top:8px; right:8px; border:none; border-radius:999px; padding:6px 12px; background:rgba(20,15,5,.75); color:#fff; cursor:pointer; font-size:.9rem; font-weight:650; }
.photo-error { margin-top:8px; color:var(--alert-ink); background:var(--alert); border:1px solid var(--alert-line); border-radius:12px; padding:10px 12px; font-size:.92rem; }
.btn[disabled] { opacity:.65; cursor:progress; }
[hidden] { display:none !important; }
.options { display:flex; align-items:center; justify-content:space-between; gap:10px; margin:12px 0; flex-wrap:wrap; }
.switch { display:inline-flex; align-items:center; gap:8px; cursor:pointer; }
.switch input { appearance:none; -webkit-appearance:none; width:44px; height:26px; border-radius:999px; background:var(--line); position:relative; margin:0; cursor:pointer; transition:background .15s; }
.switch input::after { content:""; position:absolute; top:3px; left:3px; width:20px; height:20px; border-radius:50%; background:#fff; transition:left .15s; }
.switch input:checked { background:var(--accent); } .switch input:checked::after { left:21px; }
select.to { border:1.5px solid var(--line); background:var(--card); border-radius:12px; padding:8px 10px; max-width:55%; }
.x { border:none; background:none; color:var(--muted); cursor:pointer; padding:6px 8px; font-size:1rem; }
.pill { display:inline-flex; align-items:center; gap:4px; background:var(--card); border-radius:999px; padding:6px 6px 6px 14px; margin:0 8px 8px 0; box-shadow:var(--shadow); }
.pill.plain { padding:6px 14px; }
.hero { text-align:center; padding:28px 0 8px; } .hero .big { font-size:3rem; } .hero p { color:var(--muted); margin:6px 0 20px; }
#sign-in { display:flex; justify-content:center; } #sign-in input { background:#fff; color:#111; }
`;

const ROOM_ICONS: [RegExp, string][] = [
  [/kitchen/i, "🍳"],
  [/bath|shower|toilet|wc/i, "🚿"],
  [/living|lounge|sitting/i, "🛋️"],
  [/hall|entr|corridor/i, "🚪"],
  [/bin|rubbish|trash|recycl/i, "🗑️"],
  [/bed/i, "🛏️"],
  [/balcon|garden|yard|patio/i, "🪴"],
  [/laundr|utility|wash/i, "🧺"],
];
const roomIcon = (name: string) => ROOM_ICONS.find(([pattern]) => pattern.test(name))?.[1] ?? "🏠";

const QUICK_NOTES: [RegExp, string[]][] = [
  [/kitchen/i, ["Dishes in the sink", "Surfaces need a wipe", "Fridge needs a clear-out"]],
  [/bath|shower|toilet|wc/i, ["Needs a clean", "Hair in the drain", "No toilet paper"]],
  [/bin|rubbish|trash|recycl/i, ["Bins are full", "Bins need to go out"]],
  [/living|lounge|sitting/i, ["Needs a tidy", "Needs a hoover"]],
];
const quickNotes = (name: string) =>
  QUICK_NOTES.find(([pattern]) => pattern.test(name))?.[1] ?? ["Needs a tidy", "Needs a clean"];

// A stable color for each person, taken from the user identifier.
function avatarColor(userId: string): string {
  let hash = 0;
  for (const character of userId) hash = (hash * 31 + character.charCodeAt(0)) % 360;
  return `hsl(${hash} 55% 45%)`;
}

function Avatar(props: { member: Member }) {
  return (
    <span class="avatar" style={`background:${avatarColor(props.member.user_id)}`} aria-hidden="true">
      {props.member.display_name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

// The Clerk front-end host is encoded in the publishable key.
function clerkFrontendHost(publishableKey: string): string {
  const encoded = publishableKey.split("_")[2] ?? "";
  try {
    return atob(encoded).replace(/\$$/, "");
  } catch {
    return "";
  }
}

const PAGE_SCRIPT = `<script>
// Open a room sheet from the floor plan or from the address.
function openRoom(id) { const sheet = document.getElementById("room-" + id); if (sheet) sheet.showModal(); }
document.querySelectorAll("[data-room]").forEach((link) => link.addEventListener("click", (event) => { event.preventDefault(); openRoom(link.dataset.room); }));
if (location.hash.startsWith("#room-")) openRoom(location.hash.slice(6));
document.querySelectorAll("dialog").forEach((sheet) => sheet.addEventListener("click", (event) => { if (event.target === sheet) sheet.close(); }));

// A quick note fills the text field with one tap.
document.querySelectorAll(".chip[data-note]").forEach((chip) => chip.addEventListener("click", () => {
  const form = chip.closest("form");
  form.querySelectorAll(".chip").forEach((other) => other.classList.toggle("on", other === chip));
  form.querySelector("[name=note]").value = chip.dataset.note;
}));

// Photo for a ping. The browser reduces the photo to a JPEG of at most 1200 pixels.
// The new JPEG holds only the pixels, so the camera metadata (location, device) is gone.
const PHOTO_LIMIT = 1200;
const PHOTO_ERROR = "This photo format cannot be read here. Take the photo again, or use a JPEG or PNG file.";

async function decodePhoto(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (error) {
    // Some browsers read a format through an image element that createImageBitmap refuses.
    const address = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = address;
      await image.decode();
      return image;
    } finally {
      URL.revokeObjectURL(address);
    }
  }
}

function clearPhoto(zone) {
  zone.querySelector("[name=photo]").value = "";
  zone.querySelector(".photo-preview").hidden = true;
  zone.querySelector(".photo-preview img").removeAttribute("src");
  zone.querySelector(".photo-buttons").hidden = false;
  zone.querySelector(".photo-error").hidden = true;
}

async function loadPhoto(zone, file) {
  const send = zone.closest("form").querySelector("button[type=submit]");
  const error = zone.querySelector(".photo-error");
  clearPhoto(zone);
  if (!file) return;
  send.disabled = true;
  try {
    const source = await decodePhoto(file);
    const width = source.naturalWidth || source.width;
    const height = source.naturalHeight || source.height;
    if (!width || !height) throw new Error("empty image");
    const scale = Math.min(1, PHOTO_LIMIT / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", 0.72);
    zone.querySelector("[name=photo]").value = data;
    zone.querySelector(".photo-preview img").src = data;
    zone.querySelector(".photo-preview").hidden = false;
    zone.querySelector(".photo-buttons").hidden = true;
  } catch (failure) {
    error.textContent = PHOTO_ERROR;
    error.hidden = false;
  } finally {
    send.disabled = false;
  }
}

const firstImage = (files) => [...(files || [])].find((file) => file.type.startsWith("image/") || /[.](heic|heif)$/i.test(file.name));

document.querySelectorAll(".photo-zone").forEach((zone) => {
  // The camera button and the library button.
  zone.querySelectorAll("input[type=file]").forEach((input) => input.addEventListener("change", () => {
    const file = input.files[0];
    input.value = "";
    if (file) loadPhoto(zone, file);
  }));
  zone.querySelector(".remove").addEventListener("click", () => clearPhoto(zone));

  // Drag and drop on a computer. The full sheet accepts the drop.
  const sheet = zone.closest("dialog");
  sheet.addEventListener("dragover", (event) => { event.preventDefault(); zone.classList.add("over"); });
  sheet.addEventListener("dragleave", (event) => { if (event.target === sheet || !sheet.contains(event.relatedTarget)) zone.classList.remove("over"); });
  sheet.addEventListener("drop", (event) => {
    event.preventDefault();
    zone.classList.remove("over");
    const file = firstImage(event.dataTransfer.files);
    if (file) loadPhoto(zone, file);
  });
});

// Paste from the clipboard goes to the open room sheet.
document.addEventListener("paste", (event) => {
  const zone = document.querySelector("dialog[open] .photo-zone");
  const file = firstImage(event.clipboardData && event.clipboardData.files);
  if (!zone || !file) return;
  event.preventDefault();
  loadPhoto(zone, file);
});

// Show a "Sending" state after the tap, and refuse a second tap.
document.querySelectorAll("form[data-ping]").forEach((form) => form.addEventListener("submit", (event) => {
  const send = form.querySelector("button[type=submit]");
  if (send.dataset.busy) { event.preventDefault(); return; }
  send.dataset.busy = "1";
  send.dataset.label = send.textContent;
  send.textContent = "Sending…";
  send.setAttribute("aria-busy", "true");
  setTimeout(() => { send.disabled = true; }, 0);
}));
// A page that returns from the browser history must not stay in the "Sending" state.
window.addEventListener("pageshow", () => document.querySelectorAll("form[data-ping] button[type=submit]").forEach((send) => {
  if (!send.dataset.busy) return;
  delete send.dataset.busy;
  send.disabled = false;
  send.removeAttribute("aria-busy");
  send.textContent = send.dataset.label;
}));

document.querySelectorAll("[data-copy]").forEach((button) => button.addEventListener("click", async () => {
  await navigator.clipboard.writeText(button.dataset.copy);
  button.textContent = "Copied";
}));
</script>`;

export function Layout(props: { title: string; houseName?: string; publishableKey?: string; signedIn: boolean; children?: Child }) {
  const host = props.publishableKey ? clerkFrontendHost(props.publishableKey) : "";
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#f7f3ec" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#161512" media="(prefers-color-scheme: dark)" />
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
          <div class="top">
            <span class="house">{props.houseName ?? "Household Chores"}</span>
            <div id="account"></div>
          </div>
          {props.children}
        </main>
        {raw(PAGE_SCRIPT)}
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
      <div class="hero">
        <div class="big">🧹</div>
        <h1>Chores, without the arguments</h1>
        <p>See who does what this week. Point at a mess on the map. Stay anonymous if you like.</p>
      </div>
      <div id="sign-in"></div>
    </div>
  );
}

export function HouseListPage(props: { houses: { id: string; name: string }[] }) {
  return (
    <div>
      {props.houses.length === 0 ? (
        <div class="hero">
          <div class="big">🏡</div>
          <h1>Start your house</h1>
          <p>Give it a name. We add the usual rooms and chores, and you can change them later.</p>
        </div>
      ) : (
        <div>
          <h1>Your houses</h1>
          <p class="sub">Select a house to open it.</p>
          {props.houses.map((house) => (
            <a class="card row" href={`/h/${house.id}`}>
              <span class="grow title">{house.name}</span>
              <span class="hint">Open →</span>
            </a>
          ))}
          <h2>Start a new house</h2>
        </div>
      )}
      <form class="inline" method="post" action="/houses">
        <input class="field" type="text" name="name" placeholder="For example: Flat 4" required maxlength={60} aria-label="House name" />
        <button class="btn" type="submit">Create</button>
      </form>
      <p class="hint" style="text-align:center;margin-top:16px">Did a roommate send you a link? Open that link to join their house.</p>
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

function shortName(data: HouseData, userId: string | null, fallback: string): string {
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
    <svg class="plan" viewBox={`-4 -4 ${plan.width + 8} ${plan.height + 8}`} role="group" aria-label="Floor plan of the house">
      {plan.rooms.map((room: { area: Area; x: number; y: number; width: number; height: number }) => {
        const open = data.reports.filter((report) => report.area_id === room.area.id).length;
        const responsible = responsibleMembers(data, room.area.id);
        const mine = responsible.some((member) => member.user_id === data.currentUserId);
        const names = responsible.map((member) => (member.user_id === data.currentUserId ? "You" : member.display_name));
        return (
          <a
            href={`/h/${data.house.id}/a/${room.area.id}`}
            data-room={String(room.area.id)}
            class={`room${open ? " alert" : mine ? " mine" : ""}`}
            aria-label={`${room.area.name}${open ? `, ${open} open` : ""}`}
          >
            <rect x={room.x} y={room.y} width={room.width} height={room.height} rx="10" />
            <text class="icon" x={room.x + 14} y={room.y + 46}>{roomIcon(room.area.name)}</text>
            <text x={room.x + 14} y={room.y + room.height - 40}>{room.area.name}</text>
            <text class="who" x={room.x + 14} y={room.y + room.height - 16}>{names.join(", ") || "—"}</text>
            {open > 0 && (
              <g class="badge">
                <circle cx={room.x + room.width - 28} cy={room.y + 30} r="17" />
                <text x={room.x + room.width - 28} y={room.y + 36}>{open}</text>
              </g>
            )}
          </a>
        );
      })}
    </svg>
  );
}

function PingCard(props: { data: HouseData; report: Report; showArea: boolean }) {
  const { data, report } = props;
  const area = data.areas.find((row) => row.id === report.area_id);
  const from = report.sender_user_id ? `From ${shortName(data, report.sender_user_id, "")}` : "🙈 Anonymous";
  return (
    <div class="ping">
      <div class="from">
        {props.showArea && area ? `${roomIcon(area.name)} ${area.name} · ` : ""}
        {from}
        {report.target_user_id ? ` · for ${shortName(data, report.target_user_id, "")}` : " · for everyone"}
      </div>
      {report.note && <div class="title">{report.note}</div>}
      {report.has_photo ? (
        <img src={`/h/${data.house.id}/reports/${report.id}/photo`} alt="Photo attached to the ping" loading="lazy" />
      ) : null}
      <form method="post" action={`/h/${data.house.id}/reports/${report.id}/resolve`}>
        <button class="btn small" type="submit">Sorted ✓</button>
      </form>
    </div>
  );
}

function ChoreRow(props: { data: HouseData; assignment: Assignment; showWho: boolean }) {
  const { data } = props;
  const { chore, member } = props.assignment;
  const done = data.completedBy.has(chore.id);
  const mine = member?.user_id === data.currentUserId;
  const area = data.areas.find((row) => row.id === chore.area_id);
  const detail = props.showWho ? (mine ? "You" : (member?.display_name ?? "Nobody")) : area ? `${roomIcon(area.name)} ${area.name}` : "";
  return (
    <form class={`card row chore${mine ? " mine" : ""}${done ? " done" : ""}`} method="post" action={`/h/${data.house.id}/chores/${chore.id}/toggle`}>
      <button class="check" type="submit" aria-label={done ? `Mark ${chore.name} as not done` : `Mark ${chore.name} as done`}>✓</button>
      <div class="grow">
        <div class="title">{chore.name}</div>
        {detail && <div class="hint">{detail}</div>}
      </div>
    </form>
  );
}

function RoomSheet(props: { data: HouseData; area: Area }) {
  const { data, area } = props;
  const responsible = responsibleMembers(data, area.id);
  const chores = data.thisWeek.filter(({ chore }) => chore.area_id === area.id);
  const reports = data.reports.filter((report) => report.area_id === area.id);
  const others = data.members.filter((member) => member.user_id !== data.currentUserId);
  const defaultTarget = responsible.find((member) => member.user_id !== data.currentUserId)?.user_id ?? "";
  const who = responsible.map((member) => (member.user_id === data.currentUserId ? "You" : member.display_name));
  const verb = who.length === 1 && who[0] !== "You" ? "has" : "have";
  return (
    <dialog id={`room-${area.id}`} aria-label={area.name}>
      <div class="sheet">
        <div class="sheet-head">
          <span class="icon">{roomIcon(area.name)}</span>
          <div class="grow">
            <h3>{area.name}</h3>
            <div class="hint">{who.length ? `${who.join(" and ")} ${verb} it this week` : "Nobody has a chore here"}</div>
          </div>
          <form method="dialog">
            <button class="close" aria-label="Close">✕</button>
          </form>
        </div>

        {reports.map((report) => <PingCard data={data} report={report} showArea={false} />)}
        {chores.map((assignment) => <ChoreRow data={data} assignment={assignment} showWho />)}

        <h2>Something wrong here?</h2>
        <form method="post" action={`/h/${data.house.id}/a/${area.id}/reports`} data-ping>
          <div class="chips">
            {quickNotes(area.name).map((note) => (
              <button class="chip" type="button" data-note={note}>{note}</button>
            ))}
          </div>
          <input class="field" type="text" name="note" maxlength={280} placeholder="Or write it in your own words" aria-label="Note" />
          <div class="photo-zone">
            <div class="photo-buttons">
              <label class="photo camera">
                📷 Take a photo
                <input type="file" accept="image/*" capture="environment" />
              </label>
              <label class="photo">
                🖼️ Choose a photo
                <input type="file" accept="image/*" />
              </label>
            </div>
            <div class="hint drop-hint">Or drop a photo here, or paste one.</div>
            <div class="photo-preview" hidden>
              <img alt="The photo that goes with the ping" />
              <button class="remove" type="button">✕ Remove</button>
            </div>
            <div class="photo-error" role="alert" hidden></div>
            <input type="hidden" name="photo" />
          </div>
          <div class="options">
            <label class="switch">
              <input type="checkbox" name="anonymous" checked />
              <span>🙈 Anonymous</span>
            </label>
            {others.length > 0 && (
              <select class="to" name="target" aria-label="Who is the ping for">
                <option value="">For everyone</option>
                {others.map((member) => (
                  <option value={member.user_id} selected={member.user_id === defaultTarget}>For {member.display_name}</option>
                ))}
              </select>
            )}
          </div>
          <button class="btn" type="submit">Send ping</button>
          <p class="hint" style="text-align:center;margin:10px 0 0">An anonymous ping does not store your name.</p>
        </form>
      </div>
    </dialog>
  );
}

export function HousePage(props: HouseData & { weekStartsOn: Date; pingSent: boolean }) {
  const me = props.members.find((member) => member.user_id === props.currentUserId);
  const firstName = me?.display_name.split(" ")[0] ?? "there";
  const weekLabel = props.weekStartsOn.toLocaleDateString("en-IE", { day: "numeric", month: "long", timeZone: "UTC" });
  const myChores = props.thisWeek.filter(({ member }) => member?.user_id === props.currentUserId);
  const left = myChores.filter(({ chore }) => !props.completedBy.has(chore.id)).length;
  const forMe = props.reports.filter((report) => report.target_user_id === props.currentUserId);
  const summary =
    myChores.length === 0 ? "No chores for you this week." : left === 0 ? "All done for this week. Nice." : `${left} ${left === 1 ? "chore" : "chores"} left this week.`;
  return (
    <div>
      {props.pingSent && <div class="toast" role="status">Ping sent ✓</div>}
      <h1>Hi {firstName}</h1>
      <p class="sub">Week of {weekLabel}. {summary}</p>

      {forMe.length > 0 && <h2>Pings for you</h2>}
      {forMe.map((report) => <PingCard data={props} report={report} showArea />)}

      {myChores.length > 0 && <h2>Your chores</h2>}
      {myChores.map((assignment) => <ChoreRow data={props} assignment={assignment} showWho={false} />)}

      <h2>The house</h2>
      {props.areas.length === 0 ? (
        <div class="empty">No rooms yet. <a href={`/h/${props.house.id}/setup`}>Add a room</a></div>
      ) : (
        <div>
          <FloorPlan data={props} />
          <p class="hint" style="text-align:center;margin:10px 0 0">Tap a room to see it or to send a ping.</p>
        </div>
      )}

      <h2>Everyone this week</h2>
      <div class="card">
        {props.members.map((member) => {
          const chores = props.thisWeek.filter((assignment) => assignment.member?.user_id === member.user_id);
          return (
            <div class="person">
              <Avatar member={member} />
              <div class="grow">
                <div class="title">{member.user_id === props.currentUserId ? "You" : member.display_name}</div>
                <div class="tags">
                  {chores.length === 0 && <span class="hint">Free this week</span>}
                  {chores.map(({ chore }) => (
                    <span class={`tag${props.completedBy.has(chore.id) ? " ok" : ""}`}>{chore.name}</span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div class="foot">
        <a class="btn ghost" href={`/h/${props.house.id}/setup`}>⚙️ Set up</a>
        <a class="btn ghost" href={`/h/${props.house.id}/setup#invite`}>➕ Invite</a>
      </div>

      {props.areas.map((area) => <RoomSheet data={props} area={area} />)}
    </div>
  );
}

export function SetupPage(props: HouseData & { inviteUrl: string }) {
  const back = `/h/${props.house.id}/setup`;
  const chores = props.thisWeek.map(({ chore }) => chore);
  return (
    <div>
      <p style="margin:0 0 10px"><a href={`/h/${props.house.id}`}>← Back</a></p>
      <h1>Set up</h1>
      <p class="sub">Change this at any time. The rotation updates itself.</p>

      <h2 id="invite">Invite roommates</h2>
      <div class="card">
        <div class="hint" style="margin-bottom:8px">Send this link. A person who opens it joins the house.</div>
        <div class="inline">
          <input class="field" type="text" readonly value={props.inviteUrl} aria-label="Invitation link" />
          <button class="btn" type="button" data-copy={props.inviteUrl}>Copy</button>
        </div>
        <div style="margin-top:12px">
          {props.members.map((member) => (
            <span class="pill plain">{member.user_id === props.currentUserId ? "You" : member.display_name}</span>
          ))}
        </div>
      </div>

      <h2>Rooms</h2>
      <div>
        {props.areas.map((area) => (
          <form class="pill" method="post" action={`/h/${props.house.id}/areas/${area.id}/delete`}>
            <span>{roomIcon(area.name)} {area.name}</span>
            <button class="x" type="submit" aria-label={`Remove ${area.name}`}>✕</button>
          </form>
        ))}
      </div>
      <form class="inline" method="post" action={`/h/${props.house.id}/areas`}>
        <input type="hidden" name="back" value={back} />
        <input class="field" type="text" name="name" placeholder="Add a room, for example Balcony" required maxlength={40} aria-label="Room name" />
        <button class="btn" type="submit">Add</button>
      </form>

      <h2>Chores</h2>
      {chores.length === 0 && <div class="empty">No chores yet.</div>}
      {chores.map((chore) => {
        const area = props.areas.find((row) => row.id === chore.area_id);
        return (
          <form class="card row" method="post" action={`/h/${props.house.id}/chores/${chore.id}/delete`}>
            <input type="hidden" name="back" value={back} />
            <div class="grow">
              <div class="title">{chore.name}</div>
              <div class="hint">{area ? `${roomIcon(area.name)} ${area.name}` : "No room"}</div>
            </div>
            <button class="x" type="submit" aria-label={`Remove ${chore.name}`}>✕</button>
          </form>
        );
      })}
      <form method="post" action={`/h/${props.house.id}/chores`} style="margin-top:12px">
        <input type="hidden" name="back" value={back} />
        <div class="inline">
          <input class="field" type="text" name="name" placeholder="Add a chore" required maxlength={60} aria-label="Chore name" />
          <select class="field" name="area_id" aria-label="Room" style="flex:0 1 40%">
            <option value="">No room</option>
            {props.areas.map((area) => <option value={String(area.id)}>{area.name}</option>)}
          </select>
        </div>
        <button class="btn" type="submit" style="margin-top:8px">Add chore</button>
      </form>
    </div>
  );
}
