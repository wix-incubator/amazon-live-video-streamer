const {
  RECORDING_NAME,
  DOWNLOAD_URL,
  mockEnvironment,
  context,
  callHandlerWithBodyArguments,
  callHandlerWithQuery,
  flushPromises,
  disableConsoleLog,
} = require("./test-utils");

mockEnvironment();
const { ecsMock, s3Mock } = require("aws-sdk");

describe("Recorder Lambda", () => {
  describe("download", () => {
    beforeAll(() => {
      disableConsoleLog();
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("works using query parameters", async () => {
      callHandlerWithQuery({
        action: "download",
        recordingName: RECORDING_NAME,
      });

      await flushPromises();

      const params = {
        Bucket: process.env.recordingArtifactsBucket,
        Key: `${RECORDING_NAME}.mp4`,
      };

      expect(s3Mock.init).toHaveBeenCalledTimes(1);
      expect(s3Mock.init).toHaveBeenCalledWith({ params });

      expect(s3Mock.getSignedUrl).toHaveBeenCalledTimes(1);

      expect(s3Mock.getSignedUrl).toHaveBeenCalledWith(
        "getObject",
        params,
        expect.anything()
      );

      expect(context.succeed).toHaveBeenCalledTimes(1);
      expect(context.succeed).toHaveBeenCalledWith(
        expect.objectContaining({
          body: JSON.stringify(
            {
              url: DOWNLOAD_URL,
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
        action: "download",
        recordingName: RECORDING_NAME,
      });

      await flushPromises();

      const params = {
        Bucket: process.env.recordingArtifactsBucket,
        Key: `${RECORDING_NAME}.mp4`,
      };

      expect(s3Mock.init).toHaveBeenCalledTimes(1);
      expect(s3Mock.init).toHaveBeenCalledWith({ params });

      expect(s3Mock.getSignedUrl).toHaveBeenCalledTimes(1);

      expect(s3Mock.getSignedUrl).toHaveBeenCalledWith(
        "getObject",
        params,
        expect.anything()
      );

      expect(context.succeed).toHaveBeenCalledTimes(1);
      expect(context.succeed).toHaveBeenCalledWith(
        expect.objectContaining({
          body: JSON.stringify(
            {
              url: DOWNLOAD_URL,
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
        action: "DownloaD",
        recordingName: RECORDING_NAME,
      });

      await flushPromises();

      const params = {
        Bucket: process.env.recordingArtifactsBucket,
        Key: `${RECORDING_NAME}.mp4`,
      };

      expect(s3Mock.init).toHaveBeenCalledTimes(1);
      expect(s3Mock.init).toHaveBeenCalledWith({ params });

      expect(s3Mock.getSignedUrl).toHaveBeenCalledTimes(1);

      expect(s3Mock.getSignedUrl).toHaveBeenCalledWith(
        "getObject",
        params,
        expect.anything()
      );

      expect(context.succeed).toHaveBeenCalledTimes(1);
      expect(context.succeed).toHaveBeenCalledWith(
        expect.objectContaining({
          body: JSON.stringify(
            {
              url: DOWNLOAD_URL,
            },
            null,
            1
          ),
          statusCode: 200,
        })
      );
    });

    it("returns error when download fails", async () => {
      const defaultGetSignedUrl = s3Mock.getSignedUrl;

      const objError = { message: "Some Error", statusCode: 500 };

      s3Mock.getSignedUrl = jest.fn((type, params, cb) => {
        cb(objError);
      });

      callHandlerWithQuery({
        action: "download",
        recordingName: RECORDING_NAME,
      });

      await flushPromises();

      const params = {
        Bucket: process.env.recordingArtifactsBucket,
        Key: `${RECORDING_NAME}.mp4`,
      };

      expect(s3Mock.init).toHaveBeenCalledTimes(1);
      expect(s3Mock.init).toHaveBeenCalledWith({ params });

      expect(s3Mock.getSignedUrl).toHaveBeenCalledTimes(1);

      expect(s3Mock.getSignedUrl).toHaveBeenCalledWith(
        "getObject",
        params,
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
          statusCode: 500,
        })
      );

      s3Mock.getSignedUrl = defaultGetSignedUrl;
    });

    it("returns error if recordingName is not provided", () => {
      callHandlerWithQuery({
        action: "download",
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
