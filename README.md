# AisuVault

A dark-themed document vault for notes and private files, built for Vercel.

## Stack

Next.js, TypeScript, Tailwind CSS, Supabase Auth/Postgres/Storage, and Vercel.

## Local setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local` and add the project URL and publishable key.
4. Run `npm install` and `npm run dev`.

The current UI is a deployed product slice. Database-backed auth, CRUD routes, and storage wiring are the next integration step once Supabase environment variables are configured.
