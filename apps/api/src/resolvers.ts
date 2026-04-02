import { GraphQLError } from "graphql";
import type { FormatType as PrismaFormat } from "@prisma/client";
import { aggregateSalesByGenre } from "./salesSummary";

const MAX_LIMIT = 50;

export const resolvers = {
  Query: {
    books: async (_: unknown, args: any, ctx: any) => {
      const { search, genreId, cursor, limit } = args;
      const pageSize = Math.min(Math.max(1, limit), MAX_LIMIT);
      const take = pageSize + 1;

      const books = await ctx.prisma.book.findMany({
        take,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { id: "asc" },
        where: {
          AND: [
            search
              ? {
                  OR: [
                    { title: { contains: search, mode: "insensitive" } },
                    {
                      authors: {
                        some: {
                          author: {
                            name: { contains: search, mode: "insensitive" },
                          },
                        },
                      },
                    },
                  ],
                }
              : {},
            genreId
              ? {
                  genres: {
                    some: { genreId },
                  },
                }
              : {},
          ],
        },
      });

      const hasNext = books.length > pageSize;
      const edges = hasNext ? books.slice(0, pageSize) : books;
      const nextCursor = hasNext ? edges[edges.length - 1]?.id ?? null : null;

      return { edges, nextCursor };
    },

    users: async (_: unknown, args: any, ctx: any) => {
      const limit = Math.min(args.limit ?? 500, 1000);
      const search = args.search?.trim();
      return ctx.prisma.user.findMany({
        take: limit,
        orderBy: { name: "asc" },
        where: search
          ? {
              name: { contains: search, mode: "insensitive" },
            }
          : {},
      });
    },

    genres: async (_: unknown, __: unknown, ctx: any) => {
      return ctx.prisma.genre.findMany({ orderBy: { name: "asc" } });
    },

    orders: async (_: unknown, args: { userId: string }, ctx: any) => {
      return ctx.prisma.order.findMany({
        where: { userId: args.userId },
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: { book: true },
          },
        },
      });
    },

    salesSummary: async (_: unknown, __: unknown, ctx: any) => {
      const items = await ctx.prisma.orderItem.findMany({
        include: {
          book: {
            include: {
              genres: { include: { genre: true } },
            },
          },
        },
      });

      const lines = items.map((oi: any) => {
        const genreIds = oi.book.genres.map((bg: any) => bg.genre.id as string);
        const genreNames: Record<string, string> = {};
        for (const bg of oi.book.genres) {
          genreNames[bg.genre.id] = bg.genre.name;
        }
        return {
          quantity: oi.quantity,
          genreIds,
          genreNames,
        };
      });

      return aggregateSalesByGenre(lines);
    },
  },

  Book: {
    publisher: async (parent: { id: string; publisherId?: string }, _: unknown, ctx: any) => {
      if (parent.publisherId) {
        return ctx.prisma.publisher.findUnique({
          where: { id: parent.publisherId },
        });
      }
      const book = await ctx.prisma.book.findUnique({
        where: { id: parent.id },
        select: { publisher: true },
      });
      return book?.publisher;
    },

    authors: async (parent: { id: string }, _: unknown, ctx: any) => {
      const bookAuthors = await ctx.prisma.bookAuthor.findMany({
        where: { bookId: parent.id },
        include: { author: true },
      });
      return bookAuthors.map((ba: any) => ba.author);
    },

    genres: async (parent: { id: string }, _: unknown, ctx: any) => {
      const bookGenres = await ctx.prisma.bookGenre.findMany({
        where: { bookId: parent.id },
        include: { genre: true },
      });
      return bookGenres.map((bg: any) => bg.genre);
    },

    formats: async (parent: { id: string }, _: unknown, ctx: any) => {
      return ctx.prisma.bookFormat.findMany({
        where: { bookId: parent.id },
        orderBy: { type: "asc" },
      });
    },

    avgRating: async (parent: { id: string }, _: unknown, ctx: any) => {
      const agg = await ctx.prisma.review.aggregate({
        where: { bookId: parent.id },
        _avg: { rating: true },
      });
      const v = agg._avg.rating;
      return v != null ? Math.round(v * 10) / 10 : 0;
    },

    reviewCount: async (parent: { id: string }, _: unknown, ctx: any) => {
      return ctx.prisma.review.count({ where: { bookId: parent.id } });
    },

    hasReviewed: async (
      parent: { id: string },
      args: { userId: string },
      ctx: any
    ) => {
      const n = await ctx.prisma.review.count({
        where: { bookId: parent.id, userId: args.userId },
      });
      return n > 0;
    },
  },

  Order: {
    createdAt: (parent: { createdAt: Date }) =>
      parent.createdAt instanceof Date
        ? parent.createdAt.toISOString()
        : String(parent.createdAt),
    items: async (parent: { id: string; items?: unknown }, _: unknown, ctx: any) => {
      if (parent.items) return parent.items;
      return ctx.prisma.orderItem.findMany({
        where: { orderId: parent.id },
        include: { book: true },
      });
    },
    totalPrice: async (parent: { id: string }, _: unknown, ctx: any) => {
      const items = await ctx.prisma.orderItem.findMany({
        where: { orderId: parent.id },
      });
      return items.reduce((sum: number, oi: any) => sum + oi.quantity * oi.price, 0);
    },
  },

  OrderItem: {
    book: async (parent: { bookId: string; book?: unknown }, _: unknown, ctx: any) => {
      if (parent.book) return parent.book;
      return ctx.prisma.book.findUnique({ where: { id: parent.bookId } });
    },
    format: (parent: { format: PrismaFormat }) => parent.format,
    unitPrice: (parent: { price: number }) => parent.price,
    lineTotal: (parent: { price: number; quantity: number }) =>
      parent.price * parent.quantity,
  },

  Format: {
    type: (parent: { type: PrismaFormat }) => parent.type,
  },

  Mutation: {
    addReview: async (_: unknown, args: any, ctx: any) => {
      const { bookId, userId, rating } = args;
      if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        throw new GraphQLError("Rating must be an integer from 1 to 5");
      }
      const existing = await ctx.prisma.review.findFirst({
        where: { userId, bookId },
      });
      if (existing) {
        return false;
      }
      try {
        await ctx.prisma.review.create({
          data: { bookId, userId, rating },
        });
        return true;
      } catch {
        return false;
      }
    },

    checkout: async (_: unknown, args: any, ctx: any) => {
      const { userId, items } = args;
      if (!items?.length) {
        throw new GraphQLError("Cart is empty");
      }

      const order = await ctx.prisma.$transaction(async (tx: any) => {
        const orderRow = await tx.order.create({
          data: { userId },
        });

        for (const line of items) {
          if (line.quantity < 1 || !Number.isInteger(line.quantity)) {
            throw new GraphQLError("Each line must have a positive integer quantity");
          }
          const book = await tx.book.findUnique({ where: { id: line.bookId } });
          if (!book) {
            throw new GraphQLError(`Book not found: ${line.bookId}`);
          }
          const formatOk = await tx.bookFormat.findFirst({
            where: { bookId: line.bookId, type: line.format },
          });
          if (!formatOk) {
            throw new GraphQLError(
              `Format ${line.format} is not available for this book`
            );
          }
          await tx.orderItem.create({
            data: {
              orderId: orderRow.id,
              bookId: line.bookId,
              format: line.format,
              quantity: line.quantity,
              price: book.price,
            },
          });
        }

        return tx.order.findUniqueOrThrow({
          where: { id: orderRow.id },
          include: {
            items: { include: { book: true } },
          },
        });
      });

      return order;
    },
  },
};
