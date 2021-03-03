const {
  RECORDING_NAME,
  mockEnvironment,
  context,
  callHandlerWithBodyArguments,
  callHandlerWithQuery,
  flushPromises,
  disableConsoleLog,
} = require("./test-utils");

mockEnvironment();
const { s3Mock } = require("aws-sdk");

describe("Recorder Lambda", () => {
  describe("delete", () => {
    beforeAll(() => {
      disableConsoleLog();
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("works using query parameters", async () => {
      callHandlerWithQuery({
        action: "delete",
        recordingName: RECORDING_NAME,
      });

      await flushPromises();

      const params = {
        Bucket: process.env.recordingArtifactsBucket,
        Key: `${RECORDING_NAME}.mp4`,
      };

      expect(s3Mock.init).toHaveBeenCalledTimes(1);
      expect(s3Mock.init).toHaveBeenCalledWith({ params });

      expect(s3Mock.deleteObject).toHaveBeenCalledTimes(1);

      expect(context.succeed).toHaveBeenCalledTimes(1);
      expect(context.succeed).toHaveBeenCalledWith(
        expect.objectContaining({
          body: JSON.stringify(
            {
              message: "OK",
            },
            null,
            1
          ),
          statusCode: 200,
        })
      );
    });

    it("works using post parameters", async () => {
      callHandlerWithBodyArguments({
        action: "delete",
        recordingName: RECORDING_NAME,
      });

      await flushPromises();

      const params = {
        Bucket: process.env.recordingArtifactsBucket,
        Key: `${RECORDING_NAME}.mp4`,
      };

      expect(s3Mock.init).toHaveBeenCalledTimes(1);
      expect(s3Mock.init).toHaveBeenCalledWith({ params });

      expect(s3Mock.deleteObject).toHaveBeenCalledTimes(1);

      expect(context.succeed).toHaveBeenCalledTimes(1);
      expect(context.succeed).toHaveBeenCalledWith(
        expect.objectContaining({
          body: JSON.stringify(
            {
              message: "OK",
            },
            null,
            1
          ),
          statusCode: 200,
        })
      );
    });

    it("works using mixed case action", async () => {
      callHandlerWithQuery({
        action: "DeletE",
        recordingName: RECORDING_NAME,
      });

      await flushPromises();

      const params = {
        Bucket: process.env.recordingArtifactsBucket,
        Key: `${RECORDING_NAME}.mp4`,
      };

      expect(s3Mock.init).toHaveBeenCalledTimes(1);
      expect(s3Mock.init).toHaveBeenCalledWith({ params });

      expect(s3Mock.deleteObject).toHaveBeenCalledTimes(1);

      expect(context.succeed).toHaveBeenCalledTimes(1);
      expect(context.succeed).toHaveBeenCalledWith(
        expect.objectContaining({
          body: JSON.stringify(
            {
              message: "OK",
            },
            null,
            1
          ),
          statusCode: 200,
        })
      );
    });

    it("returns error when deletion fails", async () => {
      const defaultDeleteObject = s3Mock.deleteObject;

      const objError = { message: "Some Error", statusCode: 500 };

      s3Mock.deleteObject = jest.fn((cb) => {
        cb(objError);
      });

      callHandlerWithQuery({
        action: "delete",
        recordingName: RECORDING_NAME,
      });

      await flushPromises();

      const params = {
        Bucket: process.env.recordingArtifactsBucket,
        Key: `${RECORDING_NAME}.mp4`,
      };

      expect(s3Mock.init).toHaveBeenCalledTimes(1);
      expect(s3Mock.init).toHaveBeenCalledWith({ params });

      expect(s3Mock.deleteObject).toHaveBeenCalledTimes(1);

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
          statusCode: 500,
        })
      );

      s3Mock.deleteObject = defaultDeleteObject;
    });

    it("returns error if recordingName is not provided", () => {
      callHandlerWithQuery({
        action: "delete",
      });

      expect(s3Mock.init).not.toHaveBeenCalled();

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
