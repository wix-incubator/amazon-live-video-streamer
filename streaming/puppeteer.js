const puppeteer = require('puppeteer-core')
const { spawn } = require("child_process");

const DISPLAY = process.env.DISPLAY;

const SCREEN_WIDTH = process.env.SCREEN_WIDTH || "1280";
console.log(`[streaming process] SCREEN_WIDTH: ${SCREEN_WIDTH}`);

const SCREEN_HEIGHT = process.env.SCREEN_HEIGHT || "720";
log(`SCREEN_HEIGHT: ${SCREEN_HEIGHT}`);

const TARGET_URL = process.env.TARGET_URL || "Not present in environment";
log(`TARGET_URL: ${TARGET_URL}`);

const RTMP_STREAM_URL = process.env.RTMP_STREAM_URL || "Not present in environment";
log(`RTMP_STREAM_URL: ${RTMP_STREAM_URL}`);

(async () => {
    const browser = await puppeteer.launch({
        // Using Chrome because it bundles x264
        executablePath: '/usr/bin/google-chrome-stable',
        headless: false,
        defaultViewport: null,
        args: [
            `--display=${DISPLAY}`,
            '--disable-gpu',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--kiosk',
            `--window-size=${SCREEN_WIDTH},${SCREEN_HEIGHT}`,
            '--start-fullscreen',
            '--start-maximized',
            '--use-fake-ui-for-media-stream',
            '--autoplay-policy=no-user-gesture-required',
        ],
        ignoreDefaultArgs: ['--enable-automation']
    });

    const page = await browser.newPage();
    const version = await page.browser().version();
    log(version)
    page.on('console', (msg) =>
        log('PAGE:' + msg.text())
    );

    await page.goto(TARGET_URL, { waitUntil: 'networkidle2' });
    // Interact with page so that media starts playing
    await page.mouse.click(100, 100, { clickCount: 1, delay: 1000 })

    await page.evaluate(() => console.log(`url is ${location.href}`));

    const VIDEO_FRAMERATE = 30;
    const VIDEO_GOP = VIDEO_FRAMERATE * 2;
    const VIDEO_BITRATE = 1600;
    const AUDIO_BITRATE = '160';
    const AUDIO_SAMPLERATE = 44100;

    const venc = `venc=x264{profile=baseline,preset=ultrafast,tune=zerolatency,vbv-maxrate=${VIDEO_BITRATE},vbv-bufsize=8000,keyint=12,bframes=5,hrd=cbr,x264-scenecut=-1}`
    const videoOpts = `vcodec=h264,${venc},fps=${VIDEO_FRAMERATE},gop=${VIDEO_GOP},vb=${VIDEO_BITRATE}`
    const audioOpts = `acodec=aac,ab=${AUDIO_BITRATE},channels=2,samplerate=${AUDIO_SAMPLERATE}`
    const outputOpts = `access=rtmp,mux=ffmpeg{mux=flv},dst=${RTMP_STREAM_URL}`
    const cvlcArgs = [
        // Capture display device
        'screen://',
        `:screen-fps=${VIDEO_FRAMERATE}`,
        ':screen-left=0',
        ':screen-top=0',
        `:screen-width=${SCREEN_WIDTH}`,
        `:screen-height=${SCREEN_HEIGHT}`,
        // Capture audio device
        '--input-slave=pulse://',
        '--live-caching=1500',
        '--network-caching=300',
        '--ttl=1',
        '--sout',
        `#transcode{${videoOpts},${audioOpts},audio-sync,threads=0}:standard{${outputOpts}}`,
        '--sout-mux-caching=1500',
        // Verbose output
        '-vvv',
    ]

    log(`cvlc ${cvlcArgs.join(' ')}`);
    const cvlc = spawn('cvlc', cvlcArgs);

    cvlc.stdout.on("data", (data) =>
        log(`cvlc stdout: ${data}`)
    );
    cvlc.stderr.on("data", (data) =>
        error(`cvlc stderr: ${data}`)
    );
    cvlc.on("close", (code) => {
        log(
            `cvlc exited with code ${code}`
        );
    });
    // await browser.close();
})()

function log(s) {
    console.log(
        `[streaming process] ${new Date().toISOString()} ${s}`
    );
}

function error(s) {
    console.error(
        `[streaming process] ${new Date().toISOString()} ${s}`
    );
}
