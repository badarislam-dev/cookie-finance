# Bookstore (Cookie Finance assignment)

Full-stack bookstore: **Node + GraphQL (Apollo Server) + Prisma + PostgreSQL** API, **React + Vite + Apollo Client** web app, **Vitest** tests.

## Setup

Requirements: **Node 20+**, **pnpm**, **PostgreSQL 14+**.

1. **Install dependencies** (from repo root):

   ```bash
   pnpm install
   ```

2. **Configure the database** — copy env and set `DATABASE_URL`:

   ```bash
   cd apps/api
   copy .env.example .env
   ```

   Edit `apps/api/.env` so `DATABASE_URL` points at a database you can migrate (example: `postgresql://USER:PASSWORD@localhost:5432/bookstore`).

3. **Apply migrations and seed sample data**:

   ```bash
   cd ../..
   pnpm db:migrate
   pnpm db:seed
   ```

   If you hit errors from an old DB state (e.g. column already renamed), for a clean dev database you can run `pnpm --filter api exec prisma migrate reset` (destructive).

4. **Run the app** — from repo root, start API and web together:

   ```bash
   pnpm dev
   ```

   - GraphQL API: [http://localhost:4000/](http://localhost:4000/) (Apollo Sandbox / POST to same URL)
   - Web UI: [http://localhost:5173/](http://localhost:5173/)

   Or run each app in its own terminal:

   ```bash
   cd apps/api && pnpm dev
   cd apps/web && pnpm dev
   ```

5. **Tests** (Vitest — backend + frontend):

   ```bash
   pnpm test
   ```

## Architectural decisions

- **Pagination**: **Cursor-based** on `Book.id` with stable `orderBy: { id: "asc" }`. Offset pagination would shift pages when rows are inserted; cursors stay consistent for “load more” UX at ~10k books.
- **Search**: Prisma `contains` + `mode: "insensitive"` on `Book.title` and related `Author.name`. **B-tree indexes** on `Book.title` and `Author.name` (see migration). For production-scale fuzzy search, consider PostgreSQL `pg_trgm` or full-text search; documented here as a tradeoff.
- **Book formats**: **`BookFormat` rows** per book — one row per `(bookId, format)` with `@@unique([bookId, type])`, matching the four enum values (hardcover, softcover, audiobook, e-reader).
- **Orders**: **`OrderItem.price`** stores the list price at checkout so historical orders stay correct if `Book.price` changes later.
- **Reviews**: **One review per user per book** enforced with `@@unique([userId, bookId])` and `Review_rating_check` (1–5) in SQL.
- **Prisma version**: Pinned to **Prisma 6** for a conventional `DATABASE_URL` in `schema.prisma`, `prisma generate` without Prisma 7 driver adapters, and predictable CLI behavior in a small assignment repo.

## Two additional features (timebox)

1. **User picker with name filter** — `users(search, limit)` query plus a text filter narrows the dropdown. Scales better than rendering ~1000 `<option>` elements with no filtering (assignment’s usability hint).
2. **Indexed title/author columns** — B-tree indexes on `Book.title` and `Author.name` to support catalog search at larger row counts; noted as a baseline before trigram/FTS.

## AI output I intentionally changed

- **Prisma tooling**: The repo had an invalid `prisma.config.js` / Prisma 7 expectations. I **removed** the broken config, **pinned Prisma 6**, and kept `datasource.url` in `schema.prisma` so `pnpm install` and `prisma generate` work reliably without the Prisma 7 adapter stack for this exercise.

## Assumptions & tradeoffs

- **Cart** is kept in **React state** until **checkout**; the server only persists completed orders (no server-side cart table), which matches “checkout creates order and clears cart” with minimal scope.
- **Reporting “by genre”** attributes each order line’s quantity to **every genre** linked to that book (so sums across genres can exceed total units if you add them naively). Total **units sold** is the sum of line quantities.
- **README scope reductions** are called out here per the assignment (not everything at production scale in ~3 hours).