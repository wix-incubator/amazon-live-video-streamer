// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

"use strict";

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

  if (event.queryStringParameters && event.queryStringParameters.action) {
    console.log("Recording action: " + event.queryStringParameters.action);
    action = event.queryStringParameters.action;
  }

  let ensureParameterExists = (parameterName) => {
    if (
      !event.queryStringParameters ||
      !event.queryStringParameters[parameterName]
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

  switch (action.toLowerCase()) {
    case "start":
      if (
        !ensureParameterExists("targetURL") ||
        !ensureParameterExists("recordingName")
      ) {
        break;
      }

      console.log("Target URL: " + event.queryStringParameters.targetURL);
      console.log(
        "Recording file name: " + event.queryStringParameters.recordingName
      );
      targetURL = decodeURIComponent(event.queryStringParameters.targetURL);
      recordingName = decodeURIComponent(
        event.queryStringParameters.recordingName
      );

      return startRecording(event, context, callback, targetURL, recordingName);

    case "stop":
      if (!ensureParameterExists("taskId")) {
        break;
      }

      console.log("ECS task ID: " + event.queryStringParameters.taskId);
      taskId = event.queryStringParameters.taskId;
      return stopRecording(event, context, taskId);

    case "download":
      if (!ensureParameterExists("recordingName")) {
        break;
      }

      console.log(
        "Recording file name: " + event.queryStringParameters.recordingName
      );

      recordingName = decodeURIComponent(
        event.queryStringParameters.recordingName
      );

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

      console.log(
        "Recording file name: " + event.queryStringParameters.recordingName
      );

      recordingName = decodeURIComponent(
        event.queryStringParameters.recordingName
      );

      s3 = new S3Utils(recordingArtifactsBucket, `${recordingName}.mp4`);

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

          context.succeed(response);
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
        });

      break;

    default:
      responseBody = {
        message:
          "Invalid parameter: recordingAction. Valid values 'start', 'stop', 'download', 'delete'",
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
