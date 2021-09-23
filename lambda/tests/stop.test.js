const {
  STREAMING_TASK_ARN,
  mockEnvironment,
  context,
  callHandlerWithBodyArguments,
  callHandlerWithQuery,
  disableConsoleLog,
} = require("./test-utils");

mockEnvironment();
const { ecsMock } = require("aws-sdk");

describe("Streamer Lambda", () => {
  describe("stop", () => {
    beforeAll(() => {
      disableConsoleLog();
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("works using query parameters", () => {
      callHandlerWithQuery({
        action: "stop",
        taskId: STREAMING_TASK_ARN,
      });

      expect(ecsMock.stopTask).toHaveBeenCalledTimes(1);

      expect(ecsMock.stopTask).toHaveBeenCalledWith(
        {
          cluster: process.env.ecsClusterArn,
          task: STREAMING_TASK_ARN,
        },
        expect.anything()
      );

      expect(context.succeed).toHaveBeenCalledTimes(1);

      expect(context.succeed).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 200,
        })
      );
    });

    it("works using post parameters", () => {
      callHandlerWithBodyArguments({
        action: "stop",
        taskId: STREAMING_TASK_ARN,
      });

      expect(ecsMock.stopTask).toHaveBeenCalledTimes(1);

      expect(ecsMock.stopTask).toHaveBeenCalledWith(
        {
          cluster: process.env.ecsClusterArn,
          task: STREAMING_TASK_ARN,
        },
        expect.anything()
      );

      expect(context.succeed).toHaveBeenCalledTimes(1);

      expect(context.succeed).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 200,
        })
      );
    });

    it("works using mixed case action", () => {
      callHandlerWithQuery({
        action: "StoP",
        taskId: STREAMING_TASK_ARN,
      });

      expect(ecsMock.stopTask).toHaveBeenCalledTimes(1);

      expect(ecsMock.stopTask).toHaveBeenCalledWith(
        {
          cluster: process.env.ecsClusterArn,
          task: STREAMING_TASK_ARN,
        },
        expect.anything()
      );

      expect(context.succeed).toHaveBeenCalledTimes(1);

      expect(context.succeed).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 200,
        })
      );
    });

    it("returns error when stopping fails", () => {
      const defaultStopTask = ecsMock.stopTask;

      const objError = { message: "Some Error", statusCode: 501 };

      ecsMock.stopTask = jest.fn((_, cb) => {
        cb(objError);
      });

      callHandlerWithQuery({
        action: "stop",
        taskId: STREAMING_TASK_ARN,
      });

      expect(ecsMock.stopTask).toHaveBeenCalledTimes(1);

      expect(ecsMock.stopTask).toHaveBeenCalledWith(
        {
          cluster: process.env.ecsClusterArn,
          task: STREAMING_TASK_ARN,
        },
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
          statusCode: 501,
        })
      );

      ecsMock.stopTask = defaultStopTask;
    });

    it("returns error if taskId is not provided", () => {
      callHandlerWithQuery({
        action: "stop",
      });

      expect(ecsMock.stopTask).not.toHaveBeenCalled();

      expect(context.succeed).toHaveBeenCalledTimes(1);

      expect(context.succeed).toHaveBeenCalledWith(
        expect.objectContaining({
          body: JSON.stringify(
            {
              error: {
                message: "Missing parameter: taskId",
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
