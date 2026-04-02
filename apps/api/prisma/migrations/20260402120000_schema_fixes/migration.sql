-- Rename Book.createdat -> createdAt (align with Prisma model)
ALTER TABLE "Book" RENAME COLUMN "createdat" TO "createdAt";

-- Search-friendly indexes (B-tree; ILIKE contains benefits from pg_trgm in production)
CREATE INDEX "Book_title_idx" ON "Book"("title");
CREATE INDEX "Author_name_idx" ON "Author"("name");

-- One row per (book, format) for data integrity
CREATE UNIQUE INDEX "BookFormat_bookId_type_key" ON "BookFormat"("bookId", "type");

-- Enforce review rating range at the database level
ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5);
