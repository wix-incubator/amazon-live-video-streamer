const TARGET_URL = "https://127.0.0.1/somepage";
const RTMP_STREAM_URL = "rtmp://127.0.0.1/livestream/token";
const STREAMING_TASK_ARN = "STREAMING_TASK_ARN";

const mockEnvironment = () => {
  process.env.ecsClusterArn = "ECS_CLUSTER_ARN";
  process.env.ecsTaskDefinitionArn = "ECS_TASK_DEFINITION_ARN";
  process.env.ecsContainerName = "ECS_CONTAINER_NAME";

  // Copy variables due to constraints enforced by Jest
  const STREAMING_TASK_ARN_MOCK = STREAMING_TASK_ARN;

  jest.mock("aws-sdk", () => {
    const ecsMock = {
      runTask: jest.fn((_, cb) => {
        cb(null, {
          tasks: [
            {
              taskArn: STREAMING_TASK_ARN_MOCK,
            },
          ],
        });
      }),
      stopTask: jest.fn((_, cb) => {
        cb(null, {});
      }),
    };

    return {
      ecsMock,
      ECS: class {
        constructor() {
          return ecsMock;
        }
      },
    };
  });
};

const context = {
  succeed: jest.fn(),
};

const eventCallback = jest.fn();

const getTaskDefinition = () => ({
  cluster: process.env.ecsClusterArn,
  count: 1,
  launchType: "EC2",
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
            value: TARGET_URL,
          },
          {
            name: "RTMP_STREAM_URL",
            value: RTMP_STREAM_URL,
          },
        ],
        name: process.env.ecsContainerName,
      },
    ],
  },
  placementConstraints: [
    {
      type: "distinctInstance",
    },
  ],
  taskDefinition: process.env.ecsTaskDefinitionArn,
});

const callHandlerWithBodyArguments = (args) => {
  const { handler } = require("../index");

  handler(
    {
      body: JSON.stringify(args),
    },
    context,
    eventCallback
  );
};

const callHandlerWithQuery = (queryStringParameters) => {
  const { handler } = require("../index");

  handler(
    {
      queryStringParameters,
    },
    context,
    eventCallback
  );
};

const flushPromises = () => new Promise(setImmediate);

const disableConsoleLog = () => {
  console.log = () => {};
};

module.exports = {
  TARGET_URL,
  RTMP_STREAM_URL,
  STREAMING_TASK_ARN,
  mockEnvironment,
  context,
  eventCallback,
  getTaskDefinition,
  callHandlerWithBodyArguments,
  callHandlerWithQuery,
  flushPromises,
  disableConsoleLog,
};
