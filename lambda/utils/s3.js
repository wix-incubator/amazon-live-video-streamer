// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const AWS = require("aws-sdk");
const { log } = require("./log");

class S3Utils {
  constructor(bucket, key) {
    this.bucket = bucket;
    this.key = key;
    this.fileS3 = new AWS.S3({ params: { Bucket: bucket, Key: key } });
    log(
      `Constructed S3 object with bucket "${this.bucket}" and key: "${this.key}"`
    );
  }

  getUrl() {
    return new Promise((resolve, reject) => {
      let params = { Bucket: this.bucket, Key: this.key };

      log("Gathering signed S3 URL...");

      this.fileS3.getSignedUrl("getObject", params, (err, url) => {
        if (err) {
          reject({ ...err, statusCode: 500 });
        } else {
          resolve(url);
        }
      });
    });
  }

  remove() {
    return new Promise((resolve) => {
      log("Deleting S3 object...");

      this.fileS3.deleteObject((err, data) => {
        if (err) {
          throw { ...err, statusCode: 500 };
        }

        resolve();
      });
    });
  }
}

module.exports = {
  S3Utils,
};
