const AWS = require("aws-sdk");
const ecs = new AWS.ECS();

const { log } = require("./log");

const ecsClusterArn = process.env.ecsClusterArn;
const ecsTaskDefinitionArn = process.env.ecsTaskDefinitionArn;
const ecsContainerName = process.env.ecsContainerName;
const recordingArtifactsBucket = process.env.recordingArtifactsBucket;

const startRecording = (respond, targetURL, recordingName) => {
  let ecsRunTaskParams = {
    cluster: ecsClusterArn,
    launchType: "EC2",
    count: 1,
    overrides: {
      containerOverrides: [
        {
          environment: [
            {
              name: "MAX_RECORDING_DURATION", // TEMPORARY TEST
              value: "60",
            },
            {
              name: "RECORDER_DELAY",
              value: "7",
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

  ecs.runTask(ecsRunTaskParams, (err, data) => {
    if (err) {
      respond({
        body: JSON.stringify({ error: err }, null, 1),
        statusCode: err.statusCode,
      });
    } else {
      log("runTask result: ", data);

      if (data.tasks.length && data.tasks[0].taskArn) {
        respond({
          statusCode: 200,
          body: JSON.stringify({ taskArn: data.tasks[0].taskArn }, null, 1),
        });
      } else {
        respond({
          statusCode: 500,
          body: JSON.stringify(
            { error: { message: "Failed to start recording task!" } },
            null,
            1
          ),
        });
      }
    }
  });
};

const stopRecording = (respond, taskId) => {
  let ecsStopTaskParam = {
    cluster: ecsClusterArn,
    task: taskId,
  };

  ecs.stopTask(ecsStopTaskParam, (err) => {
    if (err) {
      respond({
        statusCode: err.statusCode,
        body: JSON.stringify({ error: err }, null, 1),
      });
    } else {
      respond({
        statusCode: 200,
        body: JSON.stringify({ message: "OK" }, null, 1),
      });
    }
  });
};

module.exports = { startRecording, stopRecording };
