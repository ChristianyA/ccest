"use strict";
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const _ = require('lodash');
const session = require('express-session');
const passport = require('passport');
const { v4: uuid4 } = require('uuid');
const {ApolloServer, AuthenticationError} = require('apollo-server-express');
const {buildContext, GraphQLLocalStrategy} = require('graphql-passport');
const {gql} = require('apollo-server');
const fs = require('fs');
const currentDir = process.cwd();
const couchbaseService = require('@christianya/ccest-core-services');
const serverConfig = require('../config/server.config.json');
//read the schema for the app
const graphQLConfig = fs.readFileSync(
    currentDir + "/config/schema.graphqls",
    "utf8"
);
const ccestService = require('./services/ccest.service');

const graphQLResolvers = require("./resolvers/ccest.resolveres");
const path = require("path");


const SESSION_SECRET = _.get(
    process,
    "env.session-secret",
    "49b57992-fd74-11ea-adc1-0242ac12000251c132f2-fd74-11ea-adc1-0242ac12000257e713cc-fd74-11ea-adc1-0242ac120002"
);

const dirPath = path.join(currentDir, "..", "/estimate_maker_api/public/");

process.on("unhandledRejection", (reason, promise) => {
    console.error(
        "Unhandled promise rejection:",
        promise,
        "reason:",
        reason.stack || reason
    );
});

passport.use(
    new GraphQLLocalStrategy(async (email, password, done) => {
        let parameters = {
            username: email,
            password: password
        };
        let user = await ccestService.verifyUser(parameters);
        if (user.data) {
            return done(null, user.data);
        } else {
            return done(null, false);
        }
    })
);

passport.serializeUser(async (user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        //Database Option
        let systemDB = { ..._.get(serverConfig, "ccestConfig") };

        //Open connection to the database
        let securityBucket = await couchbaseService.openBucket(systemDB);

        //Request Document  to the database
        let userResponse = await couchbaseService.requestDocument(
            securityBucket,
            id
        );

        //Get the document value from the user response
        let user = _.get(userResponse, "document.value");

        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

//Create the API express application
const app = express();
const corsOptions = {
    origin: true,
    credentials: true
};
app.use(cors(corsOptions));
app.use(express.static("public"));

app.use(bodyParser.json());

let options = {};

app.use(
    session({
        genid: () => uuid4(),
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: {
            secure: false,
            httpOnly: true,
            maxAge: 3600000
        }
    })
);

app.use(passport.initialize(options));

app.use(passport.session(options));

let resolvers = graphQLResolvers.resolvers;

let typeDefs = gql(graphQLConfig);

let allowedOperations = [
    "introspectionquery",
    "login",
    "logout",
    "register",
    "install"
];

let CCESTApolloPlugin = {
    serverWillStart: function() {
        console.log("Apollo Server Started");
    },
    // Fires whenever a GraphQL request is received from a client.
    requestDidStart(requestContext) {
        const start = Date.now();
        let lastOperationName = "";
        console.log("Request started! Query:\n" + requestContext.request.query);

        return {
            didResolveOperation(apolloContext) {
                let lastOperationName = apolloContext.operationName;
                let context = apolloContext.context;
                let isAuthenticated = context.isAuthenticated();

                if (isAuthenticated) {
                    let user = context.getUser();

                    apolloContext.context.user = {
                        id: user.id,
                        email: user.emailAddress,
                        username: user.username,
                        roles: user.userRoles
                    };
                } else {
                    //If this operation isn't allowed with out authentication throw an error
                    if (
                        !_.includes(
                            _.toLower(allowedOperations),
                            _.toLower(lastOperationName)
                        ) ||
                        lastOperationName === null
                    ) {
                        throw new AuthenticationError(
                            "You must login in to call " + lastOperationName
                        );
                    }
                }
            },
            willSendResponse(apolloContext) {
                const stop = Date.now();
                const elapsed = stop - start;
                const size = JSON.stringify(apolloContext.response).length * 2;
                console.log(
                    `Operation ${lastOperationName} completed in ${elapsed} ms and returned ${size} bytes`
                );
            },

            // Fires whenever Apollo Server will parse a GraphQL
            parsingDidStart() {
                console.log("Parsing started!");
            },

            // Fires whenever Apollo Server will validate a
            // request's document AST against your GraphQL schema.
            validationDidStart() {
                console.log("Validation started!");
            }
        };
    }
};
const server = new ApolloServer({
    typeDefs,
    rootValue: resolvers,
    tracing: true,
    context: ({ req, res }) => {
        return buildContext({ req, res });
    },
    playground: {
        settings: {
            "request.credentials": "same-origin"
        }
    },
    engine: {
        debugPrintReports: true
    },
    plugins: [CCESTApolloPlugin],
    formatError: error => {
        let responseErrors = _.get(error, "originalError.response.data.errors", []);

        if (responseErrors) {
            console.error(responseErrors); // log the error
        } else {
            console.error(error); // log the error
        }

        return error; //{message: 'Internal Server Error'} // do not reveal error details to the client
    }
});


    // Required logic for integrating with Express
     server.start().then(async res => {
         server.applyMiddleware({
             app,
             cors: false
         });

         // Modified server startup
         await new Promise(resolve => app.listen({port: 4000}, resolve));
         console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`);
     });

