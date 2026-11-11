# Household Chores

A chores board for people who share a house or an apartment.

Live: https://household-chores.useribraim.workers.dev

## What it does

- **Your week.** Each person signs in and sees their chores for the week. One tap marks a chore as done.
- **Weekly rotation.** Each chore moves to the next roommate each week.
- **Floor plan.** The house is a plan of rooms. A room shows who has it this week, and it turns red when it has an open ping.
- **Pings.** Tap a room, select a short note such as "Dishes in the sink", and send. The ping goes to the roommate who has that room this week.
- **Anonymous pings.** This is the default. An anonymous ping stores no sender: the database row has `sender_user_id = NULL`, so the operator cannot recover the sender. In a house of two people, the other person still knows who sent it.
- **Photos.** Take a photo, choose one, drop one or paste one. The browser reduces it to a JPEG of 1200 pixels, which removes the camera metadata. The photo is deleted when the ping is resolved.
- **Set up.** A new house starts with five rooms and one chore for each room. A separate page changes the rooms, the chores and the invitation link.

## Stack, provisioned with Stripe Projects

| Service | Provider | Plan |
| - | - | - |
| Hosting | Cloudflare Workers | Free |
| Database | Cloudflare D1 | Free |
| Sign-in | Clerk | Hobby |

```bash
stripe projects add cloudflare/workers:free
stripe projects add cloudflare/d1
stripe projects add cloudflare/workers
stripe projects add clerk/hobby
stripe projects add clerk/auth
```

The application is a Hono server on a Worker with server-rendered pages. It has no client framework.

## Run it locally

Create `.dev.vars` with a local user. This replaces Clerk on your machine only.

```
LOCAL_USER_ID=local_user_1
LOCAL_USER_NAME=Your name
```

```bash
npm install
npm run migrate:local
npm run dev
npm test
```

## Limits

- The ping is visible in the application only. It sends no email and no push notification.
- Sign-in uses a Clerk development instance.
- The rotation uses UTC weeks that start on Monday.
