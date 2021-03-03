const {
  mockEnvironment,
  context,
  callHandlerWithQuery,
  disableConsoleLog,
} = require("./test-utils");

mockEnvironment();

describe("Recorder Lambda", () => {
  describe("no action", () => {
    beforeAll(() => {
      disableConsoleLog();
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("provides help", () => {
      callHandlerWithQuery({});
      expect(context.succeed).toHaveBeenCalledTimes(1);
      expect(context.succeed).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          body:
            "{\"error\":{\"message\":\"Invalid parameter: action. Valid values 'start', 'stop', 'download', 'delete'\"}}",
        })
      );
    });
  });
});
