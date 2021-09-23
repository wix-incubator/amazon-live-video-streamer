const TARGET_URL = "https://127.0.0.1/somepage";
const RTMP_SERVER_URL = "rtmp://127.0.0.1/livestream";
const STREAM_KEY = "very-secret";
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
            name: "RTMP_SERVER_URL",
            value: RTMP_SERVER_URL,
          },
          {
            name: "STREAM_KEY",
            value: STREAM_KEY,
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
  RTMP_SERVER_URL,
  STREAM_KEY,
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
