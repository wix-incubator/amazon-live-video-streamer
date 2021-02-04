// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const AWS = require("aws-sdk");

class S3Utils {
  /**
   * @constructor
   * @param {*} bucket - the S3 bucket name uploaded to
   * @param {*} key - the file name in S3 bucket
   */
  constructor(bucket, key) {
    this.bucket = bucket;
    this.key = key;
    this.fileS3 = new AWS.S3({ params: { Bucket: bucket, Key: key } });
    console.log(
      `[upload process] constructed a S3 object with bucket: ${this.bucket}, key: ${this.key}`
    );
  }

  getUrl() {
    return new Promise((resolve, reject) => {
      this.fileS3.getSignedUrl("getObject", (err, url) => {
        if (err) {
          reject(err);
        } else {
          resolve(url);
        }
      });
    });

    // return new Promise((resolve) => {
    //   this.fileS3.getObject((err, data) => {
    //     if (err) {
    //       console.log(
    //         "[read process] - failure - error handling on failure",
    //         err
    //       );
    //       throw err;
    //     }

    //     console.log(
    //       `[read process] - success - video recording was retrieved: ${this.key}: `,
    //       data
    //     );

    //     resolve(data);
    //   });
    // });
  }

  remove() {
    return new Promise((resolve) => {
      this.fileS3.deleteObject((err, data) => {
        if (err) {
          console.log(
            "[remove process] - failure - error handling on failure",
            err
          );
          throw err;
        }

        console.log(
          `[remove process] - success - video recording was removed: ${this.key}`
        );
        resolve();
      });
    });
  }

  uploadStream(stream) {
    const managedUpload = this.fileS3.upload({ Body: stream }, (err, data) => {
      if (err) {
        console.log(
          "[stream upload process] - failure - error handling on failure",
          err
        );
      } else {
        console.log(
          `[stream upload process] - success - uploaded the file to: ${data.Location}`
        );
        process.exit();
      }
    });
    managedUpload.on("httpUploadProgress", function (event) {
      console.log(
        `[stream upload process]: on httpUploadProgress ${event.loaded} bytes`
      );
    });
  }
}

module.exports = {
  S3Utils,
};
