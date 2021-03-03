// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

"use strict";

console.log("Version: 4-wix");

const AWS = require("aws-sdk");
const { S3Utils } = require("./s3");
const ecs = new AWS.ECS();
let s3;

const ecsClusterArn = process.env.ecsClusterArn;
const ecsTaskDefinitionArn = process.env.ecsTaskDefinitionArn;
const ecsContainerName = process.env.ecsContainerName;
const recordingArtifactsBucket = process.env.recordingArtifactsBucket;

let responseBody = {
  message: "",
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
  let responded = false;

  const respond = (response) => {
    if (!responded) {
      context.succeed(response);
      callback(null, response);
      responded = true;
    }
  };

  console.log("Received event: ", event);

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
      };
      response = {
        statusCode: 400,
        headers: {},
        body: JSON.stringify({ error: responseBody }, null, " "),
      };
      respond(response);
      return false;
    }

    return true;
  };

  console.log("Recording action: " + getParameter("action"));
  action = getParameter("action");

  switch ((action || "").toLowerCase()) {
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

      return startRecording(event, respond, targetURL, recordingName);

    case "stop":
      if (!ensureParameterExists("taskId")) {
        break;
      }

      console.log("ECS task ID: " + getParameter("taskId"));
      taskId = getParameter("taskId");
      return stopRecording(event, respond, taskId);

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
          respond(response);
          callback(null, response);
        })
        .catch((e) => {
          response = {
            statusCode: e.statusCode,
            headers: {},
            body: JSON.stringify(
              {
                error: e,
              },
              null,
              " "
            ),
          };

          respond(response);
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
          respond(response);
        })
        .catch((e) => {
          response = {
            statusCode: e.statusCode,
            headers: {},
            body: JSON.stringify({ error: e }, null, " "),
          };
          respond(response);
        });

      break;

    default:
      responseBody = {
        message:
          "Invalid parameter: action. Valid values 'start', 'stop', 'download', 'delete'",
      };
      response = {
        statusCode: 400,
        headers: {},
        body: JSON.stringify({ error: responseBody }),
      };
  }

  if (!isAsync) {
    console.log("Response: " + JSON.stringify(response));
    respond(response);
  }
};

function startRecording(event, respond, targetURL, recordingName) {
  let ecsRunTaskParams = {
    cluster: ecsClusterArn,
    launchType: "EC2",
    count: 1,
    overrides: {
      containerOverrides: [
        {
          environment: [
            {
              name: "RECORDER_DELAY",
              value: 7,
            },
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
      response.body = JSON.stringify({ error: err }, null, 1);
      respond(response);
    } else {
      console.log("Response:", data);

      if (data.tasks.length && data.tasks[0].taskArn) {
        response.statusCode = 200;

        response.body = JSON.stringify(
          { taskArn: data.tasks[0].taskArn },
          null,
          1
        );
      } else {
        response.statusCode = 500;

        response.body = JSON.stringify(
          { error: { message: "Failed to start recording task!" } },
          null,
          1
        );
      }

      respond(response);
    }
  });
}

function stopRecording(event, respond, taskId) {
  let ecsStopTaskParam = {
    cluster: ecsClusterArn,
    task: taskId,
  };

  ecs.stopTask(ecsStopTaskParam, function (err, data) {
    if (err) {
      console.log(err); // an error occurred
      response.statusCode = err.statusCode;
      response.body = JSON.stringify({ error: err }, null, 1);
      respond(response);
    } else {
      console.log(data); // successful response
      response.statusCode = 200;
      responseBody = data;
      response.body = JSON.stringify({ data }, null, 1);
      console.log("Stop task succeeded.", response);
      respond(response);
    }
  });
}
