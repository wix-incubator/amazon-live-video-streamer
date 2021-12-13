// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

"use strict";

const VERSION = 13;

console.log(`Version: ${VERSION}-wix`);

const { Params } = require("./utils/params");
const { respondFactory } = require("./utils/response");
const { startStreaming, stopStreaming } = require("./utils/streaming");
const { setNamespace, log } = require("./utils/log");

exports.handler = function (event, context, callback) {
  setNamespace("Handler");

  const respond = respondFactory(context, callback);
  const params = new Params(event, respond);

  log("Received event: ", event);

  const action = (params.get("action") || "").toLowerCase();

  log("Handling action: ", action);

  const parametersConfig = {
    start: ["targetUrl", "rtmpStreamUrl"],
    stop: ["taskId"],
  };

  log("Required parameters configuration: ", parametersConfig);

  const parametersValid = params.ensureAllExist(parametersConfig, action);

  if (parametersValid) {
    switch (action) {
      case "start":
        setNamespace(action);

        return startStreaming(
          respond,
          params.get("targetUrl"),
          params.get("rtmpStreamUrl"),
        );
      case "stop":
        setNamespace(action);

        return stopStreaming(respond, params.get("taskId"));

      default:
        respond({
          statusCode: 400,
          body: JSON.stringify({
            error: {
              message:
                "Invalid parameter: action. Valid values 'start', 'stop'",
            },
          }),
        });
    }
  }
};
