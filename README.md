# Household Chores

A chores board for people who share a house or an apartment.

Live: https://household-chores.useribraim.workers.dev

## What it does

- **Weekly rotation.** Each chore moves to the next roommate each week. Everyone signs in and sees who does what.
- **Floor plan.** The house is a plan of areas (kitchen, bathroom, bins). Select an area to see its chores and its open pings.
- **Pings.** Send a ping about an area to one roommate or to everyone, with a note and a photo of the problem.
- **Anonymous pings.** An anonymous ping stores no sender. The database row has `sender_user_id = NULL`, so the operator cannot recover the sender. In a house of two people, the other person still knows who sent it.
- **Photos.** The browser reduces the photo and re-encodes it, which removes the camera metadata. The photo is deleted when the ping is resolved.

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
