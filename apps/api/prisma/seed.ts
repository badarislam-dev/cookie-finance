import {
  PrismaClient,
  FormatType,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.review.deleteMany();
  await prisma.bookFormat.deleteMany();
  await prisma.bookGenre.deleteMany();
  await prisma.bookAuthor.deleteMany();
  await prisma.book.deleteMany();
  await prisma.user.deleteMany();
  await prisma.author.deleteMany();
  await prisma.genre.deleteMany();
  await prisma.publisher.deleteMany();

  const publishers = await Promise.all(
    ["Penguin", "HarperCollins", "Tor", "O'Reilly", "Random House"].map((name) =>
      prisma.publisher.create({ data: { name } })
    )
  );

  const genres = await Promise.all(
    [
      "Fiction",
      "Science Fiction",
      "Fantasy",
      "Biography",
      "History",
      "Technology",
      "Mystery",
      "Romance",
    ].map((name) => prisma.genre.create({ data: { name } }))
  );

  const authorNames = [
    "Jane Austen",
    "Isaac Asimov",
    "Ursula K. Le Guin",
    "Ada Lovelace",
    "James Clear",
    "Mary Shelley",
    "Terry Pratchett",
    "Octavia Butler",
    "Neil Gaiman",
    "Brandon Sanderson",
  ];
  const authors = await Promise.all(
    authorNames.map((name) => prisma.author.create({ data: { name } }))
  );

  const users = await Promise.all(
    Array.from({ length: 24 }, (_, i) =>
      prisma.user.create({
        data: { name: `Reader ${i + 1}` },
      })
    )
  );

  const bookSpecs: {
    title: string;
    price: number;
    publisherIdx: number;
    authorIdx: number[];
    genreIdx: number[];
    formats: FormatType[];
  }[] = [
    {
      title: "Pride and Prejudice",
      price: 12.99,
      publisherIdx: 0,
      authorIdx: [0],
      genreIdx: [0, 7],
      formats: [FormatType.HARDCOVER, FormatType.SOFTCOVER, FormatType.EREADER],
    },
    {
      title: "Foundation",
      price: 14.5,
      publisherIdx: 1,
      authorIdx: [1],
      genreIdx: [1],
      formats: [FormatType.SOFTCOVER, FormatType.AUDIOBOOK, FormatType.EREADER],
    },
    {
      title: "The Left Hand of Darkness",
      price: 15.0,
      publisherIdx: 2,
      authorIdx: [2],
      genreIdx: [1, 2],
      formats: [FormatType.HARDCOVER, FormatType.EREADER],
    },
    {
      title: "Atomic Habits",
      price: 18.99,
      publisherIdx: 4,
      authorIdx: [4],
      genreIdx: [3],
      formats: [FormatType.HARDCOVER, FormatType.SOFTCOVER, FormatType.AUDIOBOOK],
    },
    {
      title: "Frankenstein",
      price: 9.99,
      publisherIdx: 0,
      authorIdx: [5],
      genreIdx: [0, 1],
      formats: [FormatType.SOFTCOVER, FormatType.EREADER],
    },
    {
      title: "Good Omens",
      price: 16.0,
      publisherIdx: 0,
      authorIdx: [6, 8],
      genreIdx: [0, 2],
      formats: [FormatType.HARDCOVER, FormatType.AUDIOBOOK],
    },
    {
      title: "Parable of the Sower",
      price: 17.25,
      publisherIdx: 1,
      authorIdx: [7],
      genreIdx: [1],
      formats: [FormatType.SOFTCOVER, FormatType.EREADER],
    },
    {
      title: "American Gods",
      price: 19.5,
      publisherIdx: 4,
      authorIdx: [8],
      genreIdx: [2, 6],
      formats: [FormatType.HARDCOVER, FormatType.SOFTCOVER, FormatType.AUDIOBOOK],
    },
    {
      title: "The Way of Kings",
      price: 22.0,
      publisherIdx: 2,
      authorIdx: [9],
      genreIdx: [2],
      formats: [FormatType.HARDCOVER, FormatType.SOFTCOVER, FormatType.EREADER],
    },
    {
      title: "Clean Code",
      price: 42.0,
      publisherIdx: 3,
      authorIdx: [4],
      genreIdx: [5],
      formats: [FormatType.SOFTCOVER, FormatType.EREADER],
    },
    {
      title: "The Pragmatic Programmer",
      price: 49.99,
      publisherIdx: 3,
      authorIdx: [4],
      genreIdx: [5],
      formats: [FormatType.SOFTCOVER, FormatType.HARDCOVER],
    },
    {
      title: "Sapiens",
      price: 21.0,
      publisherIdx: 4,
      authorIdx: [4],
      genreIdx: [4],
      formats: [FormatType.HARDCOVER, FormatType.AUDIOBOOK],
    },
  ];

  for (const spec of bookSpecs) {
    const book = await prisma.book.create({
      data: {
        title: spec.title,
        price: spec.price,
        publisherId: publishers[spec.publisherIdx].id,
        authors: {
          create: spec.authorIdx.map((i) => ({
            author: { connect: { id: authors[i].id } },
          })),
        },
        genres: {
          create: spec.genreIdx.map((i) => ({
            genre: { connect: { id: genres[i].id } },
          })),
        },
        formats: {
          create: spec.formats.map((type) => ({ type })),
        },
      },
    });

    await prisma.review.createMany({
      data: [
        { bookId: book.id, userId: users[0].id, rating: 5 },
        { bookId: book.id, userId: users[1].id, rating: 4 },
      ],
    });
  }

  console.log(
    `Seeded ${publishers.length} publishers, ${genres.length} genres, ${authors.length} authors, ${users.length} users, ${bookSpecs.length} books.`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
