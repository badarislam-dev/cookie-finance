import { gql } from "apollo-server";

export const typeDefs = gql`
  enum FormatType {
    HARDCOVER
    SOFTCOVER
    AUDIOBOOK
    EREADER
  }

  type Publisher {
    id: ID!
    name: String!
  }

  type Author {
    id: ID!
    name: String!
  }

  type Genre {
    id: ID!
    name: String!
  }

  type Format {
    id: ID!
    type: FormatType!
  }

  type User {
    id: ID!
    name: String!
  }

  type Book {
    id: ID!
    title: String!
    price: Float!
    publisher: Publisher!
    authors: [Author!]!
    genres: [Genre!]!
    formats: [Format!]!
    avgRating: Float!
    reviewCount: Int!
    hasReviewed(userId: ID!): Boolean!
  }

  type BookConnection {
    edges: [Book!]!
    nextCursor: String
  }

  type OrderItem {
    id: ID!
    book: Book!
    format: FormatType!
    quantity: Int!
    unitPrice: Float!
    lineTotal: Float!
  }

  type Order {
    id: ID!
    userId: ID!
    createdAt: String!
    items: [OrderItem!]!
    totalPrice: Float!
  }

  type GenreUnits {
    genreId: ID!
    genreName: String!
    unitsSold: Int!
  }

  type SalesSummary {
    totalUnitsSold: Int!
    unitsByGenre: [GenreUnits!]!
  }

  input CheckoutLineInput {
    bookId: ID!
    format: FormatType!
    quantity: Int!
  }

  type Query {
    books(
      search: String
      genreId: ID
      cursor: String
      limit: Int!
    ): BookConnection!
    users(search: String, limit: Int): [User!]!
    genres: [Genre!]!
    orders(userId: ID!): [Order!]!
    salesSummary: SalesSummary!
  }

  type Mutation {
    addReview(bookId: ID!, userId: ID!, rating: Int!): Boolean!
    checkout(userId: ID!, items: [CheckoutLineInput!]!): Order!
  }
`;
