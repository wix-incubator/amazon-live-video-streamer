const {
  TARGET_URL,
  RECORDING_NAME,
  RECORDING_TASK_ARN,
  mockEnvironment,
  context,
  getTaskDefinition,
  callHandlerWithBodyArguments,
  callHandlerWithQuery,
  disableConsoleLog,
} = require("./test-utils");

mockEnvironment();
const { ecsMock } = require("aws-sdk");

describe("Recorder Lambda", () => {
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
        targetURL: TARGET_URL,
        recordingName: RECORDING_NAME,
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
              taskArn: RECORDING_TASK_ARN,
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
        targetURL: TARGET_URL,
        recordingName: RECORDING_NAME,
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
              taskArn: RECORDING_TASK_ARN,
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
        targetURL: TARGET_URL,
        recordingName: RECORDING_NAME,
      });

      expect(context.succeed).toHaveBeenCalledWith(
        expect.objectContaining({
          body: JSON.stringify(
            {
              taskArn: RECORDING_TASK_ARN,
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
        targetURL: TARGET_URL,
        recordingName: RECORDING_NAME,
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
                message: "Failed to start recording task!",
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
        targetURL: TARGET_URL,
        recordingName: RECORDING_NAME,
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

    it("returns error if targetURL is not provided", () => {
      callHandlerWithQuery({
        action: "start",
        recordingName: RECORDING_NAME,
      });

      expect(ecsMock.runTask).not.toHaveBeenCalled();

      expect(context.succeed).toHaveBeenCalledTimes(1);

      expect(context.succeed).toHaveBeenCalledWith(
        expect.objectContaining({
          body: JSON.stringify(
            {
              error: {
                message: "Missing parameter: targetURL",
              },
            },
            null,
            1
          ),
          statusCode: 400,
        })
      );
    });

    it("returns error if recordingName is not provided", () => {
      callHandlerWithQuery({
        action: "start",
        targetURL: TARGET_URL,
      });

      expect(ecsMock.runTask).not.toHaveBeenCalled();

      expect(context.succeed).toHaveBeenCalledTimes(1);

      expect(context.succeed).toHaveBeenCalledWith(
        expect.objectContaining({
          body: JSON.stringify(
            {
              error: {
                message: "Missing parameter: recordingName",
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
