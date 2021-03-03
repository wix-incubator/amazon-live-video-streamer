const TARGET_URL = "https://google.com";
const RECORDING_NAME = "RECORDING_NAME";
const RECORDING_TASK_ARN = "RECORDING_TASK_ARN";
const DOWNLOAD_URL = "DOWNLOAD_URL";

const mockEnvironment = () => {
  process.env.ecsClusterArn = "ECS_CLUSTER_ARN";
  process.env.ecsTaskDefinitionArn = "ECS_TASK_DEFINITION_ARN";
  process.env.ecsContainerName = "ECS_CONTAINER_NAME";
  process.env.recordingArtifactsBucket = "RECORDING_ARTIFACTS_BUCKET";

  // Copy variables due to constraints enforced by Jest
  const RECORDING_TASK_ARN_MOCK = RECORDING_TASK_ARN;
  const DOWNLOAD_URL_MOCK = DOWNLOAD_URL;

  jest.mock("aws-sdk", () => {
    const ecsMock = {
      runTask: jest.fn((_, cb) => {
        cb(null, {
          tasks: [
            {
              taskArn: RECORDING_TASK_ARN_MOCK,
            },
          ],
        });
      }),
      stopTask: jest.fn((_, cb) => {
        cb(null, {});
      }),
    };

    const s3Mock = {
      init: jest.fn(),
      getSignedUrl: jest.fn((type, params, cb) => {
        cb(null, DOWNLOAD_URL_MOCK);
      }),
      deleteObject: jest.fn((cb) => {
        cb(null);
      }),
    };

    return {
      ecsMock,
      s3Mock,
      ECS: class {
        constructor() {
          return ecsMock;
        }
      },
      S3: class {
        constructor(...args) {
          s3Mock.init(...args);
        }

        getSignedUrl = s3Mock.getSignedUrl;
        deleteObject = s3Mock.deleteObject;
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
            name: "RECORDER_DELAY",
            value: 7,
          },
          {
            name: "TARGET_URL",
            value: TARGET_URL,
          },
          {
            name: "OUTPUT_FILE_NAME",
            value: RECORDING_NAME,
          },
          {
            name: "RECORDING_ARTIFACTS_BUCKET",
            value: process.env.recordingArtifactsBucket,
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
  RECORDING_NAME,
  RECORDING_TASK_ARN,
  DOWNLOAD_URL,
  mockEnvironment,
  context,
  eventCallback,
  getTaskDefinition,
  callHandlerWithBodyArguments,
  callHandlerWithQuery,
  flushPromises,
  disableConsoleLog,
};
