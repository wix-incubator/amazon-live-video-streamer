const AWS = require("aws-sdk");
const ecs = new AWS.ECS();

const { log } = require("./log");

const ecsClusterArn = process.env.ecsClusterArn;
const ecsTaskDefinitionArn = process.env.ecsTaskDefinitionArn;
const ecsContainerName = process.env.ecsContainerName;

const startStreaming = (respond, targetUrl, rtmpStreamUrl) => {
  let ecsRunTaskParams = {
    cluster: ecsClusterArn,
    launchType: "EC2",
    count: 1,
    overrides: {
      containerOverrides: [
        {
          environment: [
            {
              name: "STREAMER_DELAY",
              value: "7",
            },
            {
              name: "TARGET_URL",
              value: targetUrl,
            },
            {
              name: "RTMP_STREAM_URL",
              value: rtmpStreamUrl,
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
          body: JSON.stringify({ taskId: data.tasks[0].taskArn }, null, 1),
        });
      } else {
        respond({
          statusCode: 500,
          body: JSON.stringify(
            { error: { message: "Failed to start streaming task!" } },
            null,
            1
          ),
        });
      }
    }
  });
};

const stopStreaming = (respond, taskId) => {
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

module.exports = { startStreaming, stopStreaming };
