# Live Video Streamer

Forked from :
https://github.com/wix-incubator/amazon-live-video-recorder

Based on Amazon Chime recorder demo project:
https://github.com/aws-samples/amazon-chime-sdk-recording-demo

Setup was based on this documentation:
https://aws.amazon.com/blogs/business-productivity/how-to-enable-client-side-recording-using-the-amazon-chime-sdk/

Note that solution was modified based on custom requirements and is not exactly same as the one provided by Amazon.

Additional information can be found in internal Slack channel for live-video.

**Security/access related details may never be added to this project or its README file.**

---

## Testing container locally

Build docker image locally:
```
docker build -t livevideo-streamer .
```

Run it:
```
docker run \
  -p 127.0.0.1:1935:1935/tcp \
  --env "TARGET_URL=https://website" \
  --env "RTMP_STREAM_URL=rtmp://streaming_destination/streaming_key" \
  livevideo-streamer
```

## Installation

Apart from a few minor changes, installation is based on following documentation:
https://aws.amazon.com/blogs/business-productivity/how-to-enable-client-side-recording-using-the-amazon-chime-sdk/

Installation is performed via Cloud9 environment - it is a pre-configured thin client with terminal and IDE in it.

To create/use Cloud9, connect to AWS console and search for Cloud9 service. Make sure you are in the correct region in order to see already available VMs.

Should you need to create a new environment, use following options:

- Create a new no-ingress EC2 instance for environment (access via Systems Manager)
- t3-medium machine
- Ubuntu Server 18.04 LTS

In case installation is performed on a new AWS account, you would need to create a repository:

```
aws ecr create-repository --repository-name livevideo-streamer
```

Please note that names used might need to be changed. For example, when it comes to S3 - bucket names must be unique globally.

Then inside Cloud9 one should clone this repository:

```
git clone https://github.com/wix-incubator/amazon-live-video-streamer
```

To build new docker image, run the following command:

```
make ECR_REPO_URI={repository URI}
```

Sometimes build fails due to lack of space on disk. Should this happen, you can increase disk size (in EC2 -> EBS) and repeat make operation. To increase size, run following commands:

```
# Check disk and partition name and use it in commands below
df -h

# Increase volume size (change path and partition number if needed based on df command above)
sudo growpart /dev/nvme0n1 1
sudo resize2fs /dev/nvme0n1p1

# Retry make
make ECR_REPO_URI={repository URI}
```

You can also find URI by going to AWS console and then going into Elastic Container Registry. There will be a list of registries with URIs in the table.

Finally, you need to deploy docker image, configure cloud, S3, network, etc. This is done by using script:

```
node ./deploy.js -b livevideo-streamer -s livevideo-streamer -i {repository URI}:latest -r us-east-1
```

During initial deployment this script is known to sometimes fail due to timeout. Should that happen, changes will automatically be reverted. To work-around the issue try modifying deploy.js script to use _StreamingCloudformationTemplateOnlyNetwork.yaml_ cloud formation template. After running with reduced template, switch back to _StreamingCloudformationTemplateNAT.yaml_ and run the script again.

---

## Deployment of Code Updates

When updating code it is recommended to update/increment echo line in "run.sh" file under "streaming". This way you will be able to confirm that new version is used after deployment by checking CloudWatch logs. Something like this:

```
echo v14-wix
```

Code for Lambda function can be found under "lambda" folder.

Code for streaming logic (which would go to docker image) can be found under "streaming" folder.

When files are changed in the repository, in order to deploy changes following steps need to be performed:

- Connect to AWS console and go to Cloud9 environment. Make sure you have access to it. If not - create a new environment and clone code to it (see installation section). Also, feel free to create new environment if stuck at "Connecting...".
- Build an updated docker image (you can find repository URI by going to AWS console and then going into Elastic Container Registry. There will be a list of registries with URIs in the table):

```
make ECR_REPO_URI={repository URI}
```

- Deploy updated image and new Lambda:

```
node ./deploy.js -s livevideo-streamer -i {repository URI}:latest -r us-east-1
```

There have been cases when above command fails due to token expiration during update. After this happens stack goes into cleanup mode and repeated deploy command will fail until it is finished. It may take up to an hour in some cases. After cleanup is complete, please try deployment again - experience shows that it tends to succeed second time...

Once above steps are completed, test streaming, then open CloudWatch, go to "Log groups", go to "StreamingLogGroup", find logs of your test streamer and confirm that echo'ed version at the top of the logs matches your updated version.

Should version not update automatically, instances may need to be updated manually to contain the new image:

- Go to AWS console and into Elastic Container Service.
- Select Streamer cluster, go to "Instances" tab and select option to drain all instances. This should wait for instances to complete tasks and prevent them from accepting new ones. Auto-scaling mechanism should launch new instances to compensate for drained ones. New instances will contain updated docker image.
- Once instances are drained, they can be terminated by going to AWS console and into EC2 service. There you will find "instances" section. After selecting drained instances - there is an option above the table to terminate them.

Be careful - do not terminate instances which do not belong to streaming service. Also, do not terminate instances which are still running tasks.

---

## Debugging

Should something fail, both Lambda and Streamer are producing logs. To locate these logs, connect to AWS console and go to CloudWatch service.

Go to "Log groups". There will be 2 groups which will provide valuable information:

- /aws/lambda/StreamingLambda - Lambda logs
- StreamingLogGroup - streamer logs

Please note that streamer logs will contain a lot of instances of "xdotool mousemove 1 100 click 1". This is because streamer needs to simulate click in order to enable auto-play on browser. However, problem is that it is not known exactly when this click needs to be emulated. As a result, this simulated click is repeated continuously.

---

## Fault testing
https://github.com/alexei-led/pumba

TODO

---

## AutoScale Configuration

Main thing which needs to be configured for the Streamer is auto-scaling. Need to make sure that maximum, minimum and desired amount of instances suits the actual usage situation.

This can be done by going to AWS console, then to Cloud Formation, parameters. Inside parameters look for following keys:

- DesiredCapacity - amount of instances which should normally be required (must be above min and below max values)
- EcsAsgMaxSize - maximum amount of instances allowed
- EcsAsgMinSize - minimum amount of instances allowed

See "How auto-scale works" for more details below.

---

## How streaming works

There are 2 components to the whole solution:

- Lambda function - interface for streamer. Accepts requests for starting/stopping live streaming.
- Streamer - docker image which contains FireFox, ffmpeg and NodeJS script for managing the screen capture and streaming process.

How streaming process looks like:

- Lambda function is called asking to start streaming to the provided `rtmp://` address (incl. token).
- Lambda function launches a streaming task which occupies 1 of available free instances (Virtual Machines).
- Streamer opens FireFox in kiosk mode and loads provided Live Video URL. This URL opens UX which is specifically designed for streaming.
- Mouse click is simulated in order to enable auto-play on browser. Without this browser will not be able to launch video with audio on its own and streamer will fail.
- After a delay Node.JS script initializes `ffmpeg` which captures whole screen of the virtual machine.
- Output of ffmpeg is streamed directly out to the provided `rtmp://` address.

At some point streaming needs to be stopped. In such case Lambda function is called with taskId asking to stop streaming task. This action terminates task, which finalizes RTMP stream and releases instance for taking another task later.

Note that if streaming is not stopped due to some malfunction - Node.JS script has an emergency termination logic which would kill the task after a certain time.

---

## How AutoScale works

During initial deployment following configuration was used:

- Maximum of 1000 instances are allowed.
- Minimum of 50 instances are allowed.
- It is desired to have 50 instances.
- Aim is to have 60% of instances with tasks. Should percentage increase, new instances would need to be fired up. Should it decrease, overhead instance should be terminated.
- When adding/removing instances - maximum of 100 instances may be added/removed in a single go.
- When adding/removing instances - minimum of 5 instances may be added/removed in a single go.

Initially after deployment - 50 empty (without tasks) instances are launched.

Once more than 30 instances become occupied with tasks, additional instances are launched. New instances take approx. 300 seconds to be prepared and to appear in the list.

Amount of instances can further increase up to 1000.

Should amount of streams decrease, instances will be terminated to try and maintain no more than 60% instances occupied with tasks.

Scale down would stop once there are 50 instances and no further instances would be terminated.
