"use strict";
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const _ = require('lodash');
const session = require('express-session');
const passport = require('passport');
const uuid = require('uuid');
const { ApolloServer, AuthenticationError } = require('apollo-server-express');
const { buildContext, GraphQLLocalStrategy } = require('graphql-passport');
const { gql } = require('apollo-server');

//TODO: important make a env for the project and config the webpack for this API


//TODO: Pass the gql to own file path
const typeDefs = gql `
    type Query {
        hello: String
    }   
`;
//TODO: Pass the resolvers to own file path
const resolvers = {
    Query: {
        hello: () => 'Hello world!'
    }
};

async function startApolloServer(typeDefs, resolvers) {
    // Same ApolloServer initialization as before
    const server = new ApolloServer({
        typeDefs,
        resolvers,
        introspection: true,
        playground: true,
        tracing: true,
        context: ({ req, res }) => {
            return buildContext({ req, res });
        },
        engine: {
            debugPrintReports: true
        },
        formatError: error => {
            /*
             * Something unexpected is wrong
             */
            let responseErrors = _.get(error, "originalError.response.data.errors", []);
            if (responseErrors) {
                console.error(responseErrors); // log the error
            } else {
                console.error(error); // log the error
            }
            return error; //{message: 'Internal Server Error'} // do not reveal error details to the client
        },

    });

    // Required logic for integrating with Express
    await server.start();

    const app = express();
    app.use(cors());
    app.use(express.static("public"));

    server.applyMiddleware({
        app,
        cors: false
    });

    // Modified server startup
    await new Promise(resolve => app.listen({ port: 4000 }, resolve));
    console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`);
}

startApolloServer(typeDefs, resolvers);