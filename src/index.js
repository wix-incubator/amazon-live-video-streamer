// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

"use strict";

console.log("v3wix");

var AWS = require("aws-sdk");
const { S3Utils } = require("./s3");
var ecs = new AWS.ECS();
let s3;

// Reading environment variables
const ecsClusterArn = process.env.ecsClusterArn;
const ecsTaskDefinitionArn = process.env.ecsTaskDefinitionArn;
const ecsContainerName = process.env.ecsContainerName;
const recordingArtifactsBucket = process.env.recordingArtifactsBucket;

let responseBody = {
  message: "",
  input: "",
};

let response = {
  statusCode: 200,
  headers: {},
  body: "",
};

exports.handler = function (event, context, callback) {
  let targetURL = "";
  let recordingName = "";
  let taskId = "";
  let action = "";
  let isAsync = false;

  console.log(event);
  responseBody.input = event;

  let getParameter = (parameterName) => {
    if (
      event.queryStringParameters &&
      event.queryStringParameters[parameterName]
    ) {
      return decodeURIComponent(event.queryStringParameters[parameterName]);
    } else {
      let parsedBody = {};

      try {
        parsedBody = JSON.parse(event.body);
      } catch (e) {}

      return parsedBody[parameterName];
    }
  };

  let ensureParameterExists = (parameterName) => {
    let parsedBody = {};

    try {
      parsedBody = JSON.parse(event.body);
    } catch (e) {}

    if (
      (!event.queryStringParameters ||
        !event.queryStringParameters[parameterName]) &&
      !parsedBody[parameterName]
    ) {
      responseBody = {
        message: `Missing parameter: ${parameterName}`,
        input: event,
      };
      response = {
        statusCode: 400,
        headers: {},
        body: JSON.stringify({ error: responseBody }, null, " "),
      };
      context.succeed(response);
      return false;
    }

    return true;
  };

  console.log("Recording action: " + getParameter("action"));
  action = getParameter("action");

  switch (action.toLowerCase()) {
    case "start":
      if (
        !ensureParameterExists("targetURL") ||
        !ensureParameterExists("recordingName")
      ) {
        break;
      }

      console.log("Target URL: " + getParameter("targetURL"));
      console.log("Recording file name: " + getParameter("recordingName"));
      targetURL = getParameter("targetURL");
      recordingName = getParameter("recordingName");

      return startRecording(event, context, callback, targetURL, recordingName);

    case "stop":
      if (!ensureParameterExists("taskId")) {
        break;
      }

      console.log("ECS task ID: " + getParameter("taskId"));
      taskId = getParameter("taskId");
      return stopRecording(event, context, taskId);

    case "download":
      if (!ensureParameterExists("recordingName")) {
        break;
      }

      console.log("Recording file name: " + getParameter("recordingName"));
      recordingName = getParameter("recordingName");

      s3 = new S3Utils(recordingArtifactsBucket, `${recordingName}.mp4`);

      isAsync = true;

      s3.getUrl()
        .then((url) => {
          responseBody = {
            url,
          };

          response = {
            statusCode: 200,
            headers: {},
            body: JSON.stringify(responseBody, null, " "),
          };

          console.log("download response: " + JSON.stringify(response));
          context.succeed(response);
          callback(null, response);
        })
        .catch((e) => {
          response = {
            statusCode: 500,
            headers: {},
            body: JSON.stringify({ error: e }, null, " "),
          };

          context.succeed(response);
          callback(null, response);
        });

      break;

    case "delete":
      if (!ensureParameterExists("recordingName")) {
        break;
      }

      console.log("Recording file name: " + getParameter("recordingName"));
      recordingName = getParameter("recordingName");

      s3 = new S3Utils(recordingArtifactsBucket, `${recordingName}.mp4`);

      isAsync = true;

      s3.remove()
        .then(() => {
          responseBody = {
            message: `OK`,
          };

          response = {
            statusCode: 200,
            headers: {},
            body: JSON.stringify(responseBody, null, " "),
          };

          console.log("delete response: " + JSON.stringify(response));
          context.succeed(response);
          callback(null, response);
        })
        .catch(() => {
          responseBody = {
            message: `Could not delete recording: ${recordingName}`,
            input: event,
          };
          response = {
            statusCode: 500,
            headers: {},
            body: JSON.stringify({ error: responseBody }, null, " "),
          };
          context.succeed(response);
          callback(null, response);
        });

      break;

    default:
      responseBody = {
        message:
          "Invalid parameter: action. Valid values 'start', 'stop', 'download', 'delete'",
        input: event,
      };
      response = {
        statusCode: 400,
        headers: {},
        body: JSON.stringify({ error: responseBody }),
      };
  }

  if (!isAsync) {
    console.log("response: " + JSON.stringify(response));
    callback(null, response);
  }
};

function startRecording(event, context, callback, targetURL, recordingName) {
  let ecsRunTaskParams = {
    cluster: ecsClusterArn,
    launchType: "EC2",
    count: 1,
    overrides: {
      containerOverrides: [
        {
          environment: [
            {
              name: "TARGET_URL",
              value: targetURL,
            },
            {
              name: "OUTPUT_FILE_NAME",
              value: recordingName,
            },
            {
              name: "RECORDING_ARTIFACTS_BUCKET",
              value: recordingArtifactsBucket,
            },
          ],
          name: ecsContainerName,
        },
      ],
    },
    placementConstraints: [
      {
        type: "distinctInstance",
      },
    ],
    taskDefinition: ecsTaskDefinitionArn,
  };

  ecs.runTask(ecsRunTaskParams, function (err, data) {
    if (err) {
      console.log(err); // an error occurred
      response.statusCode = err.statusCode;
      response.body = JSON.stringify({ error: err }, null, " ");
      context.succeed(response);
    } else {
      // TODO: always return JSON >>>object<<<

      console.log(data); // successful response
      response.statusCode = 200;
      response.body = JSON.stringify(
        data.tasks.length && data.tasks[0].taskArn
          ? { taskArn: data.tasks[0].taskArn }
          : { data },
        null,
        " "
      );
      context.succeed(response);
    }
  });
}

function stopRecording(event, context, taskId) {
  let ecsStopTaskParam = {
    cluster: ecsClusterArn,
    task: taskId,
  };

  ecs.stopTask(ecsStopTaskParam, function (err, data) {
    if (err) {
      console.log(err); // an error occurred
      response.statusCode = err.statusCode;
      response.body = JSON.stringify({ error: err }, null, " ");
      context.succeed(response);
    } else {
      console.log(data); // successful response
      response.statusCode = 200;
      responseBody = data;
      response.body = JSON.stringify({ data }, null, " ");
      console.log("Stop task succeeded.", response);
      context.succeed(response);
    }
  });
}
