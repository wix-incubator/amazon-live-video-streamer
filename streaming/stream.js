// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const { spawn } = require("child_process");

const TARGET_URL = process.env.TARGET_URL || "Not present in environment";
console.log(`[streaming process] TARGET_URL: ${TARGET_URL}`);

const RTMP_SERVER_URL = process.env.RTMP_SERVER_URL || "Not present in environment";
console.log(`[streaming process] RTMP_SERVER_URL: ${RTMP_SERVER_URL}`);

const STREAM_KEY = process.env.STREAM_KEY || "Not present in environment";
console.log(`[streaming process] STREAM_KEY: ${STREAM_KEY}`);

const args = process.argv.slice(2);
const BROWSER_SCREEN_WIDTH = args[0];
const BROWSER_SCREEN_HEIGHT = args[1];
console.log(
  `[streaming process] BROWSER_SCREEN_WIDTH: ${BROWSER_SCREEN_WIDTH}, BROWSER_SCREEN_HEIGHT: ${BROWSER_SCREEN_HEIGHT}`
);

const VIDEO_FRAMERATE = 30;
const VIDEO_GOP = VIDEO_FRAMERATE * 2;
const AUDIO_BITRATE = "160k";
const AUDIO_SAMPLERATE = 44100;
const AUDIO_CHANNELS = 2;
const DISPLAY = process.env.DISPLAY;

// We will forcefully kill streamer if it does not end after 25h
const MAX_STREAMING_DURATION =
  process.env.MAX_STREAMING_DURATION || 25 * 60 * 60;

let remainingSeconds = Number(MAX_STREAMING_DURATION);
let streamingDurationInterval;

const ffmpegArgs = [
  "-hide_banner",
  "-loglevel",
  "error",
  // disable interaction via stdin
  "-nostdin",
  // screen image size
  "-s",
  `${BROWSER_SCREEN_WIDTH}x${BROWSER_SCREEN_HEIGHT}`,
  // video frame rate
  "-r",
  `${VIDEO_FRAMERATE}`,
  // hides the mouse cursor from the resulting video
  "-draw_mouse",
  "0",
  "-thread_queue_size",
  "1024",
  // grab the x11 display as video input
  "-f",
  "x11grab",
  "-i",
  `${DISPLAY}`,
  // grab pulse as audio input
  "-f",
  "alsa",
  "-i",
  "pulse",
  "-ac",
  "2",
  // codec video with libx264
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-level:v",
  "4.2",
  "-profile:v",
  "main",
  "-preset",
  "ultrafast",
  "-tune",
  "zerolatency",
  "-x264opts",
  "nal-hrd=cbr:no-scenecut",
  "-x264-params",
  "nal-hrd=cbr:no-scenecut",
  "-minrate",
  "800k",
  "-maxrate",
  "2500k",
  "-bufsize",
  "8000k",
  "-b:v",
  "1000k",
  "-g",
  `${VIDEO_GOP}`,
  // apply a fixed delay to the audio stream in order to synchronize it with the video stream
  "-filter_complex",
  "adelay=delays=1000|1000",
  // codec audio with aac
  "-c:a",
  "aac",
  "-b:a",
  `${AUDIO_BITRATE}`,
  "-ac",
  `${AUDIO_CHANNELS}`,
  "-ar",
  `${AUDIO_SAMPLERATE}`,
  "-threads",
  "8",
  // adjust fragmentation to prevent seeking(resolve issue: muxer does not support non seekable output)
  "-movflags",
  "frag_keyframe+empty_moov",
  "-flvflags",
  "no_duration_filesize",
  "-f",
  "flv",
  `${RTMP_SERVER_URL}/${STREAM_KEY}`,
]
console.log(
  `[streaming process] ffmpeg ${ffmpegArgs.join(' ')}`
);
const transcodeStreamToOutput = spawn("ffmpeg", ffmpegArgs);

transcodeStreamToOutput.stderr.on("data", (data) => {
  console.log(
    `[transcodeStreamToOutput process] stderr: ${new Date().toISOString()} ffmpeg: ${data}`
  );
});

// event handler for docker stop, not exit until upload completes
process.on("SIGTERM", (code, signal) => {
  console.log(
    `[streaming process] exited with code ${code} and signal ${signal}(SIGTERM)`
  );
  clearInterval(streamingDurationInterval);
  process.kill(transcodeStreamToOutput.pid, "SIGTERM");
});

// debug use - event handler for ctrl + c
process.on("SIGINT", (code, signal) => {
  console.log(
    `[streaming process] exited with code ${code} and signal ${signal}(SIGINT)`
  );
  clearInterval(streamingDurationInterval);
  process.kill("SIGTERM");
});

process.on("exit", function (code) {
  clearInterval(streamingDurationInterval);
  console.log("[streaming process] exit code", code);
});

streamingDurationInterval = setInterval(() => {
  remainingSeconds--;

  if (remainingSeconds < 0) {
    clearInterval(streamingDurationInterval);
    console.log("[streaming process] task is running for too long - killing");
    process.kill(transcodeStreamToOutput.pid, "SIGTERM");
  }
}, 1000);
