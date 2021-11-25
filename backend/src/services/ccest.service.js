const _ = require('lodash');
const couchbaseService = require('@christianya/ccest-core-services');

const dbSettings = {
    "uri": "http://localhost",
    "clusterUri": "localhost",
    "bucketName": "ccest-dev",
    "username": "ccest-admin",
    "password": "Welcome#1",
}

const runCouchbaseQuery = async (statement, options) => {
    let queryResponse = await couchbaseService.runQuery(statement, options);
    return _.get(queryResponse, "response");
};

const install = async () => {
    await couchbaseService.createBucket(
        _.get(dbSettings, "bucketName"),
        dbSettings
    );
    await couchbaseService.setupIndexes(
        _.get(dbSettings, "bucketName"),
        undefined,
        dbSettings
    );
    return true;
};

async function verifyUser(parameters) {
    try {
        let statement = `SELECT meta().id,record.* FROM \`${_.get(dbSettings, "bucketName")}\` as record WHERE typeName = 'User' AND username = '${_.get(parameters, "username")}'`
        let response = await runCouchbaseQuery(
            statement,
            dbSettings
        );
        let responseData = _.get(response, "data.results[0]");
        if (responseData && _.get(responseData, "password") === _.get(parameters, "password")) {
            return {
                "statusCode": 200,
                "errors": [],
                "data": responseData
            }
        } else {
            return {
                "statusCode": 401,
                "errors": [
                    {
                        "code": "UNAUTHORIZED",
                        "message": "Invalid Credentials"
                    }
                ],
                "data": null
            }
        }
    } catch (error) {
        return {
            "statusCode": 500,
            "errors": [
                {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "Internal Server Error"
                }
            ],
            "data": null
        }
    }
}

const login = async (parameters) => {
    await verifyUser(parameters);
    const {user} = await parameters.context.authenticate("graphql-local", {
        email: parameters.username,
        password: parameters.password
    });
    await parameters.context.login(user);
    return {
        "statusCode": 200,
        "errors": [],
        "data": user
    }

};

let ccestService = {
    login: login,
    install: install,
    verifyUser: verifyUser
};
module.exports = ccestService;
