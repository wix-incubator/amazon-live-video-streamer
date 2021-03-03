const { log } = require("./log");

const respondFactory = (context, callback) => {
  let responded = false;

  return (response) => {
    if (!responded) {
      log("Responding with: ", response);
      context.succeed(response);
      callback(null, response);
      responded = true;
    } else {
      log("Attempted (failed) to respond for a second time with: ", response);
    }
  };
};

module.exports = { respondFactory };
