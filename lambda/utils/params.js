const { log } = require("./log");

class Params {
  constructor(event, respond) {
    this.event = event;
    this.respond = respond;
  }

  get(parameterName) {
    let result;

    if (
      this.event.queryStringParameters &&
      this.event.queryStringParameters[parameterName]
    ) {
      log(`Parameter "${parameterName}" received via request query string.`);
      result = decodeURIComponent(
        this.event.queryStringParameters[parameterName]
      );
    } else {
      log(`Parameter "${parameterName}" received via request body.`);

      let parsedBody = {};

      try {
        parsedBody = JSON.parse(this.event.body);
      } catch (e) {}

      result = parsedBody[parameterName];
    }

    log(`Parameter "${parameterName}" holds value: `, result);
    return result;
  }

  ensureExists(parameterName) {
    let parsedBody = {};

    try {
      parsedBody = JSON.parse(this.event.body);
    } catch (e) {}

    if (
      (!this.event.queryStringParameters ||
        !this.event.queryStringParameters[parameterName]) &&
      !parsedBody[parameterName]
    ) {
      this.respond({
        statusCode: 400,
        headers: {},
        body: JSON.stringify(
          {
            error: {
              message: `Missing parameter: ${parameterName}`,
            },
          },
          null,
          " "
        ),
      });

      return false;
    }

    return true;
  }

  ensureAllExist(parametersConfig, action) {
    log("Validating required parameters...");

    if (parametersConfig[action]) {
      for (const name of parametersConfig[action]) {
        if (!this.ensureExists(name)) {
          log(`Parameter with name "${name}" was not received!`);
          return false;
        }
      }
    }

    log("All required parameters exist.");
    return true;
  }
}

module.exports = { Params };
