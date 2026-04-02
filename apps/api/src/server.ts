import { ApolloServer } from "apollo-server";
import { PrismaClient } from "@prisma/client";
import { typeDefs } from "./schema";
import { resolvers } from "./resolvers";

const prisma = new PrismaClient();

const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: () => ({ prisma }),
    cors: true,
});

server.listen({ port: 4000}).then(({ url }) => {
    console.log(`Server ready at ${url}`)
})