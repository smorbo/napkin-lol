# Napkin

**Shut up and draw.**

Napkin is a shared napkin in the browser. Create a room, share the code or the link, and everyone in it draws, types, and chats together in real time. There is no account and nothing to sign up for. Rooms evaporate 24 hours after they are created — export anything you want to keep.

Live at [napkin.lol](https://napkin.lol).

## What it does

- Rooms are created instantly and joined with a 7-character code or a link
- Ink streams onto everyone's canvas mid-stroke, not just when the pen lifts
- Pen, touch, shapes, text, images, and chat on one canvas
- Palm rejection: once a pen is in play, touch only pans and pinches
- Paste an image straight onto the canvas from your clipboard
- An eraser that removes your own strokes
- Everything in a room is deleted 24 hours after the room was created
- Export the canvas as an image before it goes

## Stack

- React 19 with TanStack Start (SSR) and TanStack Router
- Vite 8, Tailwind CSS 4
- Supabase (Postgres, Realtime, Row Level Security) for rooms, canvas objects, and chat
- Nitro, built with the `node-server` preset
- Bun or npm as the package manager

## Run it locally

You need your own Supabase project — Napkin stores nothing anywhere else.

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Apply the database schema: run the SQL files in `supabase/migrations/`, in filename order, against your project (SQL editor, or `supabase db push` with the Supabase CLI).
3. Copy the environment template and fill in your project's values:

   ```sh
   cp .env.example .env
   ```

   You need your project URL, its publishable (anon) key, and — for the scheduled cleanup of expired rooms — the service role key, which is server-only and must never be exposed to a browser.
4. Install and start:

   ```sh
   bun install
   bun run dev
   ```

   With npm: `npm install`, then `npm run dev`. The dev server prints its local URL.
5. For a production build: `bun run build`, then `bun run preview`, or serve the generated `.output` with Node.

## Licence

Napkin is free software, licensed under the GNU Affero General Public License v3.0 — see [LICENSE](LICENSE). If you run a modified version of Napkin as a network service, the AGPL requires you to make your modified source available to its users.

Napkin is a [SNEEDS](https://sneeds.xyz) project, by Send More Brains Inc.
