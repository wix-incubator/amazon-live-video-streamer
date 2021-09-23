const {
  TARGET_URL,
  RTMP_SERVER_URL,
  STREAM_KEY,
  STREAMING_TASK_ARN,
  mockEnvironment,
  context,
  getTaskDefinition,
  callHandlerWithBodyArguments,
  callHandlerWithQuery,
  disableConsoleLog,
} = require("./test-utils");

mockEnvironment();
const { ecsMock } = require("aws-sdk");

describe("Streamer Lambda", () => {
  describe("start", () => {
    beforeAll(() => {
      disableConsoleLog();
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("works using query parameters", () => {
      callHandlerWithQuery({
        action: "start",
        targetUrl: TARGET_URL,
        rtmpServerUrl: RTMP_SERVER_URL,
        streamKey: STREAM_KEY,
      });

      expect(ecsMock.runTask).toHaveBeenCalledTimes(1);

      expect(ecsMock.runTask).toHaveBeenCalledWith(
        getTaskDefinition(),
        expect.anything()
      );

      expect(context.succeed).toHaveBeenCalledTimes(1);
      expect(context.succeed).toHaveBeenCalledWith(
        expect.objectContaining({
          body: JSON.stringify(
            {
              taskArn: STREAMING_TASK_ARN,
            },
            null,
            1
          ),
          statusCode: 200,
        })
      );
    });

    it("works using post parameters", () => {
      callHandlerWithBodyArguments({
        action: "start",
        targetUrl: TARGET_URL,
        rtmpServerUrl: RTMP_SERVER_URL,
        streamKey: STREAM_KEY,
      });

      expect(ecsMock.runTask).toHaveBeenCalledTimes(1);

      expect(ecsMock.runTask).toHaveBeenCalledWith(
        getTaskDefinition(),
        expect.anything()
      );

      expect(context.succeed).toHaveBeenCalledTimes(1);
      expect(context.succeed).toHaveBeenCalledWith(
        expect.objectContaining({
          body: JSON.stringify(
            {
              taskArn: STREAMING_TASK_ARN,
            },
            null,
            1
          ),
          statusCode: 200,
        })
      );
    });

    it("works using mixed case action", () => {
      callHandlerWithQuery({
        action: "StarT",
        targetUrl: TARGET_URL,
        rtmpServerUrl: RTMP_SERVER_URL,
        streamKey: STREAM_KEY,
      });

      expect(context.succeed).toHaveBeenCalledWith(
        expect.objectContaining({
          body: JSON.stringify(
            {
              taskArn: STREAMING_TASK_ARN,
            },
            null,
            1
          ),
          statusCode: 200,
        })
      );
    });

    it("returns error when no task ARN is available", () => {
      const defaultRunTask = ecsMock.runTask;

      ecsMock.runTask = jest.fn((_, cb) => {
        cb(null, { tasks: [] });
      });

      callHandlerWithQuery({
        action: "start",
        targetUrl: TARGET_URL,
        rtmpServerUrl: RTMP_SERVER_URL,
        streamKey: STREAM_KEY,
      });

      expect(ecsMock.runTask).toHaveBeenCalledTimes(1);

      expect(ecsMock.runTask).toHaveBeenCalledWith(
        getTaskDefinition(),
        expect.anything()
      );

      expect(context.succeed).toHaveBeenCalledTimes(1);
      expect(context.succeed).toHaveBeenCalledWith(
        expect.objectContaining({
          body: JSON.stringify(
            {
              error: {
                message: "Failed to start streaming task!",
              },
            },
            null,
            1
          ),
          statusCode: 500,
        })
      );

      ecsMock.runTask = defaultRunTask;
    });

    it("returns error when task launch fails", () => {
      const defaultRunTask = ecsMock.runTask;

      const objError = { message: "Some Error", statusCode: 501 };

      ecsMock.runTask = jest.fn((_, cb) => {
        cb(objError);
      });

      callHandlerWithQuery({
        action: "start",
        targetUrl: TARGET_URL,
        rtmpServerUrl: RTMP_SERVER_URL,
        streamKey: STREAM_KEY,
      });

      expect(ecsMock.runTask).toHaveBeenCalledTimes(1);

      expect(ecsMock.runTask).toHaveBeenCalledWith(
        getTaskDefinition(),
        expect.anything()
      );

      expect(context.succeed).toHaveBeenCalledTimes(1);
      expect(context.succeed).toHaveBeenCalledWith(
        expect.objectContaining({
          body: JSON.stringify(
            {
              error: objError,
            },
            null,
            1
          ),
          statusCode: objError.statusCode,
        })
      );

      ecsMock.runTask = defaultRunTask;
    });

    it("returns error if targetUrl is not provided", () => {
      callHandlerWithQuery({
        action: "start",
        rtmpServerUrl: RTMP_SERVER_URL,
        streamKey: STREAM_KEY,
      });

      expect(ecsMock.runTask).not.toHaveBeenCalled();

      expect(context.succeed).toHaveBeenCalledTimes(1);

      expect(context.succeed).toHaveBeenCalledWith(
        expect.objectContaining({
          body: JSON.stringify(
            {
              error: {
                message: "Missing parameter: targetUrl",
              },
            },
            null,
            1
          ),
          statusCode: 400,
        })
      );
    });

    it("returns error if rtmpServerUrl is not provided", () => {
      callHandlerWithQuery({
        action: "start",
        targetUrl: TARGET_URL,
        streamKey: STREAM_KEY,
      });

      expect(ecsMock.runTask).not.toHaveBeenCalled();

      expect(context.succeed).toHaveBeenCalledTimes(1);

      expect(context.succeed).toHaveBeenCalledWith(
        expect.objectContaining({
          body: JSON.stringify(
            {
              error: {
                message: "Missing parameter: rtmpServerUrl",
              },
            },
            null,
            1
          ),
          statusCode: 400,
        })
      );
    });

    it("returns error if streamKey is not provided", () => {
      callHandlerWithQuery({
        action: "start",
        targetUrl: TARGET_URL,
        rtmpServerUrl: RTMP_SERVER_URL,
      });

      expect(ecsMock.runTask).not.toHaveBeenCalled();

      expect(context.succeed).toHaveBeenCalledTimes(1);

      expect(context.succeed).toHaveBeenCalledWith(
        expect.objectContaining({
          body: JSON.stringify(
            {
              error: {
                message: "Missing parameter: streamKey",
              },
            },
            null,
            1
          ),
          statusCode: 400,
        })
      );
    });
  });
});
