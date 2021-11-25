const ccestServices = require('../services/ccest.service');
const _ = require("lodash");

/**
 * Return Query or Mutation Result
 *
 * @param {object} parameters - data
 * @returns {object} - return the result
 */
function returnResult(parameters) {
    let statusCode = _.get(parameters, "statusCode");
    let errors = _.get(parameters, "errors");
    let data = _.get(parameters, "data");

    if (_.get(data, "message")) {
        statusCode = 400;
    }
    if (!statusCode) {
        statusCode = -1; //Unknown Result
    }
    return {
        statusCode: statusCode,
        errors: errors,
        data: data
    };
}
let ccestResolvers = {
   login: async (parameters,ctx) => {
      let inputParameters = _.get(parameters, "parameters");
      inputParameters.context = ctx;

       let data =  await ccestServices.login(inputParameters);
       return returnResult(data);

   },
    install: async (parameters) => {
        let inputParameters = _.get(parameters, "parameters");
        let data = await  ccestServices.install(inputParameters);
        return returnResult(data);

    },
};
module["exports"] = { resolvers: ccestResolvers };
