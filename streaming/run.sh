#!/bin/bash

# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

_kill_procs() {
  kill -TERM $node
  wait $node
  kill -TERM $xvfb
}

# Setup a trap to catch SIGTERM/SIGINT and relay it to child processes
trap _kill_procs SIGTERM SIGINT

echo v1-wix

set -xeo pipefail

export SCREEN_WIDTH=${STREAMING_SCREEN_WIDTH:-1280}
export SCREEN_HEIGHT=${STREAMING_SCREEN_HEIGHT:-720}
BROWSER_URL="${TARGET_URL}"
XVFB_WHD="${SCREEN_WIDTH}x${SCREEN_HEIGHT}x24"
X_SERVER_NUM=99

ffmpeg -version
cvlc --version

# Start PulseAudio server
pulseaudio -D --exit-idle-time=-1
pacmd load-module module-virtual-sink sink_name=v1  # Load a virtual sink as `v1`
pacmd set-default-sink v1  # Set the `v1` as the default sink device
pacmd set-default-source v1.monitor  # Set the monitor of the v1 sink to be the default source
pactl list short sources

# Start X11 virtual framebuffer
sudo Xvfb :${X_SERVER_NUM} -ac -screen 0 $XVFB_WHD -nolisten tcp &
xvfb=$!
export DISPLAY=:${X_SERVER_NUM}.0

node /streaming/puppeteer.js &
node=$!

wait $node
wait $xvfb
