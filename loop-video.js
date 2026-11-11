const videoInput = document.getElementById("loopVideoInput");
const chooseVideoButton = document.getElementById("chooseLoopVideo");
const fileName = document.getElementById("loopFileName");
const video = document.getElementById("loopVideo");
const preview = document.querySelector(".loop-preview");
const reverseCanvas = document.getElementById("loopReverseCanvas");
const reverseContext = reverseCanvas.getContext("2d");
const emptyState = document.getElementById("loopEmptyState");
const startSlider = document.getElementById("loopStart");
const endSlider = document.getElementById("loopEnd");
const trimViewport = document.querySelector(".loop-panel .trim-viewport");
const trimTimeline = document.querySelector(".loop-panel .trim-timeline");
const timelineZoom = document.getElementById("loopTimelineZoom");
const timelineZoomValue = document.getElementById("loopTimelineZoomValue");
const selection = document.getElementById("loopSelection");
const startTime = document.getElementById("loopStartTime");
const endTime = document.getElementById("loopEndTime");
const playButton = document.getElementById("playLoop");
const pauseButton = document.getElementById("pauseLoop");
const stopButton = document.getElementById("stopLoop");
const outputDurationInput = document.getElementById("loopOutputDuration");
const generateVideoButton = document.getElementById("generateLoopVideo");
const status = document.getElementById("loopStatus");
const settingsButton = document.getElementById("loopSettingsButton");
const settingsMenu = document.getElementById("loopSettingsMenu");
const pingPongCheckbox = document.getElementById("loopPingPong");
const reverseAudioMode = document.getElementById("loopReverseAudioMode");
const fadeCheckbox = document.getElementById("loopFade");
const fadeDuration = document.getElementById("loopFadeDuration");
const fadeDurationValue = document.getElementById("loopFadeDurationValue");

const TIMELINE_RANGE = 10000;
const MAX_REVERSE_FRAMES = 600;
const MAX_REVERSE_PIXELS = 96000000;
const REVERSE_FRAME_RATE = 30;
const MAX_REVERSE_AUDIO_SECONDS = 120;
const translate =
    (key, values = {}) => window.languageText
        ? window.languageText(key, values)
        : key;
let videoUrl = "";
let selectedFile = null;
let loopActive = false;
let loopExporting = false;
let loopSeeking = false;
let loopDirection = "idle";
let reverseFrames = [];
let frameCaptureRequest = 0;
let reversePlaybackRequest = 0;
let pendingFrameCapture = null;
let nextCaptureTime = 0;
let captureInterval = 0;
let captureGeneration = 0;
let reverseFrameIndex = 0;
let reverseElapsed = 0;
let reverseLastTimestamp = 0;
let reverseDuration = 0;
let fadeAnimationRequest = 0;
let redirectingNativePlay = false;
let audioContext = null;
let mediaAudioSource = null;
let audioProcessor = null;
let audioOutputGain = null;
let capturedAudioChunks = [];
let capturedAudioSampleRate = 0;
let capturedAudioChannelCount = 0;
let reverseAudioSource = null;


function formatTime(seconds) {

    if (!Number.isFinite(seconds)) {

        return "00:00";

    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;

}


function formatExportDuration(seconds) {

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return hours
        ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
        : `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;

}


function getLoopExportMimeType() {

    if (
        typeof MediaRecorder === "undefined" ||
        typeof MediaRecorder.isTypeSupported !== "function"
    ) {

        return "";

    }

    return [
        "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
        "video/mp4;codecs=avc1.42E01E",
        "video/mp4",
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm"
    ].find(type => MediaRecorder.isTypeSupported(type)) || "";

}


function getLoopRange() {

    const firstMarker = Number(startSlider.value);
    const secondMarker = Number(endSlider.value);

    return {
        start:
            video.duration * Math.min(firstMarker, secondMarker) /
            TIMELINE_RANGE,
        end:
            video.duration * Math.max(firstMarker, secondMarker) /
            TIMELINE_RANGE
    };

}


async function generatePingPongLoopVideo(outputDuration, mimeType) {

    const originalTime = video.currentTime;
    const originalControls = video.controls;
    const fileBaseName =
        (selectedFile ? selectedFile.name : "video")
            .replace(/\.[^.]+$/, "") || "video";
    const options = { mimeType };
    const scale = Math.min(
        1,
        1920 / video.videoWidth,
        1080 / video.videoHeight
    );
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    exportCanvas.height = Math.max(1, Math.round(video.videoHeight * scale));

    const exportContext = exportCanvas.getContext("2d");

    if (!exportContext || typeof exportCanvas.captureStream !== "function") {

        status.textContent = translate("loop.unsupported");

        return;

    }

    let stream;
    let sourceAudioStream;
    let audioDestination;
    let recorder;
    let recordingFinished;
    let recordingStarted = false;
    let progressTimer = 0;
    let frameRequest = 0;
    let audioConnected = false;
    let chunks = [];

    stopLoopPlayback("");
    loopExporting = true;
    generateVideoButton.disabled = true;
    outputDurationInput.disabled = true;
    chooseVideoButton.disabled = true;
    playButton.disabled = true;
    pauseButton.disabled = true;
    stopButton.disabled = true;
    startSlider.disabled = true;
    endSlider.disabled = true;
    timelineZoom.disabled = true;
    video.controls = false;

    try {

        await seekVideo(getLoopRange().start);

        if (
            reverseAudioMode.value !== "mute" ||
            fadeCheckbox.checked
        ) {

            initializeAudioCapture();
            await audioContext.resume();

        }

        stream = exportCanvas.captureStream(30);

        if (audioContext && audioOutputGain) {

            audioDestination = audioContext.createMediaStreamDestination();
            audioOutputGain.connect(audioDestination);
            audioConnected = true;
            audioDestination.stream
                .getAudioTracks()
                .forEach(track => stream.addTrack(track));

        } else {

            sourceAudioStream = video.captureStream
                ? video.captureStream()
                : video.mozCaptureStream();

            sourceAudioStream
                .getAudioTracks()
                .forEach(track => stream.addTrack(track));

        }

        if (!stream.getVideoTracks().length) {

            throw new Error(translate("loop.noVideoTrack"));

        }

        const drawExportFrame = () => {

            if (!loopExporting) {

                frameRequest = 0;

                return;

            }

            const isReverse = loopDirection === "reverse";
            const source = isReverse ? reverseCanvas : video;
            const timestamp = isReverse && reverseFrames.length
                ? reverseFrames[reverseFrameIndex].timestamp
                : video.currentTime;

            exportContext.clearRect(
                0,
                0,
                exportCanvas.width,
                exportCanvas.height
            );
            exportContext.globalAlpha = getFadeLevel(timestamp);

            try {

                exportContext.drawImage(
                    source,
                    0,
                    0,
                    exportCanvas.width,
                    exportCanvas.height
                );

            } catch (error) {

                loopExporting = false;
                rejectPlayback(
                    error instanceof Error
                        ? error
                        : new Error(translate("loop.recordError"))
                );

                return;

            } finally {

                exportContext.globalAlpha = 1;

            }

            frameRequest =
                requestAnimationFrame(drawExportFrame);

        };

        exportContext.drawImage(
            video,
            0,
            0,
            exportCanvas.width,
            exportCanvas.height
        );

        let resolvePlayback;
        let rejectPlayback;
        const playbackFinished = new Promise(
            (resolve, reject) => {

                resolvePlayback = resolve;
                rejectPlayback = reject;

            }
        );

        recorder = new MediaRecorder(stream, options);

        recordingFinished = new Promise(
            (resolve, reject) => {

                recorder.addEventListener(
                    "dataavailable",
                    event => {

                        if (event.data.size) {

                            chunks.push(event.data);

                        }

                    }
                );

                recorder.addEventListener(
                    "error",
                    event => reject(
                        event.error ||
                        new Error(translate("loop.recordError"))
                    ),
                    { once: true }
                );

                recorder.addEventListener(
                    "stop",
                    () => {

                        if (!chunks.length) {

                            reject(new Error(translate("loop.empty")));

                            return;

                        }

                        resolve(
                            new Blob(chunks, { type: recorder.mimeType })
                        );

                    },
                    { once: true }
                );

            }
        );

        await startLoopPlayback();

        if (!loopActive) {

            throw new Error(
                status.textContent || translate("loop.recordError")
            );

        }

        recorder.start(1000);
        recordingStarted = true;
        const targetDurationMs = outputDuration * 1000;
        const recordingStartedAt = performance.now();

        frameRequest = requestAnimationFrame(drawExportFrame);
        progressTimer = window.setInterval(
            () => {

                const elapsedMs = performance.now() - recordingStartedAt;
                const elapsedSeconds =
                    Math.min(outputDuration, Math.floor(elapsedMs / 1000));
                const percent = Math.min(
                    99,
                    Math.floor(elapsedMs / targetDurationMs * 100)
                );

                status.textContent = translate(
                    "loop.generating",
                    {
                        percent,
                        elapsed: formatExportDuration(elapsedSeconds),
                        duration: formatExportDuration(outputDuration)
                    }
                );

                if (!loopActive) {

                    clearInterval(progressTimer);
                    progressTimer = 0;
                    loopExporting = false;
                    recorder.stop();
                    rejectPlayback(
                        new Error(translate("loop.playbackInterrupted"))
                    );

                    return;

                }

                if (elapsedMs < targetDurationMs) {

                    return;

                }

                clearInterval(progressTimer);
                progressTimer = 0;
                loopExporting = false;
                cancelAnimationFrame(frameRequest);
                frameRequest = 0;
                stopLoopPlayback("");

                if (recorder.state !== "inactive") {

                    recorder.stop();

                }

                resolvePlayback();

            },
            50
        );

        await Promise.race([
            playbackFinished,
            recordingFinished.then(
                () => {

                    if (loopExporting) {

                        throw new Error(translate("loop.empty"));

                    }

                }
            )
        ]);

        const recordedBlob = await recordingFinished;
        const fileExtension =
            (recorder.mimeType || "").toLowerCase().includes("mp4")
                ? "mp4"
                : "webm";
        const downloadUrl = URL.createObjectURL(recordedBlob);
        const download = document.createElement("a");

        download.href = downloadUrl;
        download.download =
            `${fileBaseName}_loop_${outputDuration}s.${fileExtension}`;
        download.click();

        setTimeout(() => URL.revokeObjectURL(downloadUrl), 60000);
        status.textContent = translate("loop.ready");

    } catch (error) {

        status.textContent = translate(
            "loop.error",
            {
                error: error instanceof Error
                    ? error.message
                    : translate("loop.recordError")
            }
        );

    } finally {

        loopExporting = false;
        clearInterval(progressTimer);
        cancelAnimationFrame(frameRequest);

        if (loopActive) {

            stopLoopPlayback("");

        } else {

            video.pause();

        }

        if (recorder && recorder.state !== "inactive") {

            recorder.stop();

        }

        if (recordingStarted && recordingFinished) {

            await recordingFinished.catch(() => null);

        }

        if (stream) {

            stream.getTracks().forEach(track => track.stop());

        }

        if (sourceAudioStream) {

            sourceAudioStream.getTracks().forEach(track => track.stop());

        }

        if (audioConnected && audioDestination) {

            audioOutputGain.disconnect(audioDestination);

        }

        video.controls = originalControls;
        video.style.opacity = "";
        reverseCanvas.style.opacity = "";

        try {

            await seekVideo(originalTime);

        } catch (error) {

            status.textContent = translate(
                "loop.error",
                {
                    error: error instanceof Error
                        ? error.message
                        : translate("loop.seekError")
                }
            );

        }

        generateVideoButton.disabled = false;
        outputDurationInput.disabled = false;
        chooseVideoButton.disabled = false;
        playButton.disabled = false;
        pauseButton.disabled = false;
        stopButton.disabled = false;
        startSlider.disabled = false;
        endSlider.disabled = false;

    }

}


async function generateLoopVideo() {

    const { start, end } = getLoopRange();
    const selectedDuration = end - start;
    const outputDuration = Number(outputDurationInput.value);
    const mimeType = getLoopExportMimeType();

    if (!video.videoWidth || !Number.isFinite(video.duration)) {

        status.textContent = translate("loop.invalidVideo");

        return;

    }

    if (selectedDuration <= 0) {

        status.textContent = translate("loop.invalidRange");

        return;

    }

    if (!Number.isSafeInteger(outputDuration) || outputDuration <= 0) {

        status.textContent = translate("loop.invalidDuration");

        return;

    }

    if (
        !mimeType ||
        (!video.captureStream && !video.mozCaptureStream)
    ) {

        status.textContent = translate("loop.unsupported");

        return;

    }

    if (pingPongCheckbox.checked) {

        await generatePingPongLoopVideo(outputDuration, mimeType);

        return;

    }

    const originalTime = video.currentTime;
    const originalControls = video.controls;
    const fileBaseName =
        (selectedFile ? selectedFile.name : "video")
            .replace(/\.[^.]+$/, "") || "video";
    const options = { mimeType };
    let stream;
    let recorder;
    let chunks = [];
    let recordingFinished;
    let progressTimer = 0;

    stopLoopPlayback("");
    loopExporting = true;
    generateVideoButton.disabled = true;
    outputDurationInput.disabled = true;
    chooseVideoButton.disabled = true;
    playButton.disabled = true;
    pauseButton.disabled = true;
    stopButton.disabled = true;
    startSlider.disabled = true;
    endSlider.disabled = true;
    timelineZoom.disabled = true;
    video.controls = false;

    try {

        await seekVideo(start);

        stream = video.captureStream
            ? video.captureStream()
            : video.mozCaptureStream();

        if (!stream.getVideoTracks().length) {

            throw new Error(translate("loop.noVideoTrack"));

        }

        recorder = new MediaRecorder(stream, options);
        chunks = [];

        recordingFinished = new Promise(
            (resolve, reject) => {

                recorder.addEventListener(
                    "dataavailable",
                    event => {

                        if (event.data.size) {

                            chunks.push(event.data);

                        }

                    }
                );

                recorder.addEventListener(
                    "error",
                    event => reject(
                        event.error ||
                        new Error(translate("loop.recordError"))
                    ),
                    { once: true }
                );

                recorder.addEventListener(
                    "stop",
                    () => {

                        if (!chunks.length) {

                            reject(new Error(translate("loop.empty")));

                            return;

                        }

                        resolve(
                            new Blob(chunks, { type: recorder.mimeType })
                        );

                    },
                    { once: true }
                );

            }
        );

        const targetDurationMs = outputDuration * 1000;
        let restartInProgress = false;
        let resolvePlayback;
        let rejectPlayback;
        const playbackFinished = new Promise(
            (resolve, reject) => {

                resolvePlayback = resolve;
                rejectPlayback = reject;

            }
        );

        recorder.start(1000);
        const recordingStartedAt = performance.now();

        progressTimer = window.setInterval(
            () => {

                const elapsedMs = performance.now() - recordingStartedAt;
                const elapsedSeconds =
                    Math.min(outputDuration, Math.floor(elapsedMs / 1000));
                const percent = Math.min(
                    99,
                    Math.floor(elapsedMs / targetDurationMs * 100)
                );

                status.textContent = translate(
                    "loop.generating",
                    {
                        percent,
                        elapsed: formatExportDuration(elapsedSeconds),
                        duration: formatExportDuration(outputDuration)
                    }
                );

                if (elapsedMs >= targetDurationMs) {

                    clearInterval(progressTimer);
                    progressTimer = 0;
                    loopExporting = false;
                    video.pause();
                    recorder.stop();
                    resolvePlayback();

                    return;

                }

                if (
                    !restartInProgress &&
                    (video.ended ||
                        (!video.seeking && video.currentTime >= end))
                ) {

                    restartInProgress = true;
                    video.pause();

                    seekVideo(start).then(
                        () => {

                            if (!loopExporting) {

                                return;

                            }

                            restartInProgress = false;
                            video.play().catch(rejectPlayback);

                        }
                    ).catch(rejectPlayback);

                }

            },
            50
        );

        await video.play();

        await Promise.race([
            playbackFinished,
            recordingFinished.then(
                () => {

                    if (loopExporting) {

                        throw new Error(translate("loop.empty"));

                    }

                }
            )
        ]);

        const recordedBlob = await recordingFinished;
        const fileExtension =
            (recorder.mimeType || "").toLowerCase().includes("mp4")
                ? "mp4"
                : "webm";
        const videoUrl = URL.createObjectURL(recordedBlob);
        const download = document.createElement("a");

        download.href = videoUrl;
        download.download =
            `${fileBaseName}_loop_${outputDuration}s.${fileExtension}`;
        download.click();

        setTimeout(() => URL.revokeObjectURL(videoUrl), 60000);
        status.textContent = translate("loop.ready");

    } catch (error) {

        status.textContent = translate(
            "loop.error",
            {
                error: error instanceof Error
                    ? error.message
                    : translate("loop.recordError")
            }
        );

    } finally {

        loopExporting = false;
        clearInterval(progressTimer);
        video.pause();

        if (recorder && recorder.state !== "inactive") {

            recorder.stop();

        }

        if (recordingFinished) {

            await recordingFinished.catch(() => null);

        }

        if (stream) {

            stream.getTracks().forEach(track => track.stop());

        }

        video.controls = originalControls;

        try {

            await seekVideo(originalTime);

        } catch (error) {

            status.textContent = translate(
                "loop.error",
                {
                    error: error instanceof Error
                        ? error.message
                        : translate("loop.seekError")
                }
            );

        }

        generateVideoButton.disabled = false;
        outputDurationInput.disabled = false;
        chooseVideoButton.disabled = false;
        playButton.disabled = false;
        pauseButton.disabled = false;
        stopButton.disabled = false;
        startSlider.disabled = false;
        endSlider.disabled = false;
        timelineZoom.disabled = false;

    }

}


function updateSelection() {

    const firstMarker = Number(startSlider.value);
    const secondMarker = Number(endSlider.value);
    const start = Math.min(firstMarker, secondMarker);
    const end = Math.max(firstMarker, secondMarker);

    selection.style.left = `${start / TIMELINE_RANGE * 100}%`;
    selection.style.width =
        `${(end - start) / TIMELINE_RANGE * 100}%`;

    if (Number.isFinite(video.duration)) {

        startTime.textContent =
            formatTime(video.duration * start / TIMELINE_RANGE);
        endTime.textContent =
            formatTime(video.duration * end / TIMELINE_RANGE);

    }

}


function stopLoopPlayback(message = "Loop stopped.") {

    loopActive = false;
    loopDirection = "idle";
    cancelAnimationFrame(fadeAnimationRequest);
    fadeAnimationRequest = 0;
    clearReverseFrames();
    clearCapturedAudio();
    video.style.opacity = "";
    reverseCanvas.style.opacity = "";
    video.pause();
    video.controls = true;
    status.textContent = message;

}


function clearReverseFrames() {

    cancelAnimationFrame(frameCaptureRequest);
    cancelAnimationFrame(reversePlaybackRequest);
    frameCaptureRequest = 0;
    reversePlaybackRequest = 0;
    captureGeneration++;
    pendingFrameCapture = null;
    releaseReverseFrames();
    preview.classList.remove("is-reversing");
    video.style.opacity = "";
    reverseCanvas.style.opacity = "";
    stopReverseAudioPlayback();
    clearCapturedAudio();

}


function releaseReverseFrames() {

    for (const frame of reverseFrames) {

        frame.bitmap.close();

    }

    reverseFrames.length = 0;

}


function clearCapturedAudio() {

    capturedAudioChunks = [];
    capturedAudioSampleRate = 0;
    capturedAudioChannelCount = 0;

}


function stopReverseAudioPlayback() {

    if (!reverseAudioSource) {

        return;

    }

    reverseAudioSource.onended = null;

    try {

        reverseAudioSource.stop();

    } catch (error) {

        if (error.name !== "InvalidStateError") {

            throw error;

        }

    }

    reverseAudioSource.disconnect();
    reverseAudioSource = null;

}


function initializeAudioCapture() {

    if (audioContext) {

        return;

    }

    const AudioContextConstructor =
        window.AudioContext || window.webkitAudioContext;

    if (!AudioContextConstructor) {

        throw new Error("This browser does not support audio capture for reverse playback.");

    }

    audioContext = new AudioContextConstructor();

    mediaAudioSource = audioContext.createMediaElementSource(video);
    audioProcessor = audioContext.createScriptProcessor(4096, 2, 2);
    audioOutputGain = audioContext.createGain();
    audioProcessor.onaudioprocess = captureAndForwardAudio;
    mediaAudioSource.connect(audioProcessor);
    audioProcessor.connect(audioOutputGain);
    audioOutputGain.connect(audioContext.destination);
    syncAudioOutputGain(1);

}


function getFadeLevel(time) {

    if (!fadeCheckbox.checked) {

        return 1;

    }

    const { start, end } = getLoopRange();
    const duration = Math.min(
        Number(fadeDuration.value),
        (end - start) / 2
    );

    if (duration <= 0) {

        return 1;

    }

    return Math.max(
        0,
        Math.min(
            1,
            (time - start) / duration,
            (end - time) / duration
        )
    );

}


function syncAudioOutputGain(fadeLevel) {

    if (!audioOutputGain || !audioContext) {

        return;
    }

    const modeGain =
        loopDirection === "reverse" && reverseAudioMode.value === "mute"
            ? 0
            : 1;
    const volumeGain = video.muted ? 0 : video.volume;
    const targetGain = fadeLevel * modeGain * volumeGain;
    const parameter = audioOutputGain.gain;
    const now = audioContext.currentTime;

    parameter.cancelScheduledValues(now);
    parameter.setTargetAtTime(targetGain, now, 0.025);

}


function updateFadeEffects() {

    if (!loopActive) {

        fadeAnimationRequest = 0;

        return;

    }

    applyFadeEffects();
    fadeAnimationRequest =
        requestAnimationFrame(updateFadeEffects);

}


function applyFadeEffects() {

    if (!loopActive) {

        return;

    }

    const position =
        loopDirection === "reverse" && reverseFrames.length
            ? reverseFrames[reverseFrameIndex].timestamp
            : video.currentTime;
    const fadeLevel = getFadeLevel(position);

    if (loopDirection === "reverse") {

        reverseCanvas.style.opacity = String(fadeLevel);
        video.style.opacity = "0";

    } else {

        video.style.opacity = String(fadeLevel);
        reverseCanvas.style.opacity = "1";

    }

    syncAudioOutputGain(fadeLevel);


}


function startFadeEffects() {

    cancelAnimationFrame(fadeAnimationRequest);

    if (!fadeCheckbox.checked && !audioOutputGain) {

        fadeAnimationRequest = 0;

        return;

    }

    applyFadeEffects();
    fadeAnimationRequest =
        requestAnimationFrame(updateFadeEffects);

}


function captureAndForwardAudio(event) {

    const input = event.inputBuffer;
    const output = event.outputBuffer;
    const channelCount = Math.min(input.numberOfChannels, output.numberOfChannels);

    for (let channel = 0; channel < output.numberOfChannels; channel++) {

        const outputData = output.getChannelData(channel);

        if (channel < channelCount) {

            outputData.set(input.getChannelData(channel));

        } else {

            outputData.fill(0);

        }

    }

    if (
        !loopActive ||
        loopDirection !== "forward" ||
        !pingPongCheckbox.checked ||
        reverseAudioMode.value === "mute" ||
        channelCount === 0
    ) {

        return;

    }

    const { start, end } = getLoopRange();
    const sampleRate = input.sampleRate;
    const blockDuration =
        input.length / sampleRate * video.playbackRate;
    const blockEnd = video.currentTime;
    const blockStart = blockEnd - blockDuration;
    const captureStart = Math.max(start, blockStart);
    const captureEnd = Math.min(end, blockEnd);

    if (captureEnd <= captureStart) {

        return;

    }

    if (end - start > MAX_REVERSE_AUDIO_SECONDS) {

        return;

    }

    const sourceStart = Math.max(
        0,
        Math.floor((captureStart - blockStart) / video.playbackRate * sampleRate)
    );
    const sourceEnd = Math.min(
        input.length,
        Math.ceil((captureEnd - blockStart) / video.playbackRate * sampleRate)
    );

    if (sourceEnd <= sourceStart) {

        return;

    }

    if (!capturedAudioSampleRate) {

        capturedAudioSampleRate = sampleRate;
        capturedAudioChannelCount = channelCount;

    }

    if (
        sampleRate !== capturedAudioSampleRate ||
        channelCount !== capturedAudioChannelCount
    ) {

        return;

    }

    const offset = Math.max(
        0,
        Math.floor((captureStart - start) * sampleRate)
    );
    const chunks = [];

    for (let channel = 0; channel < channelCount; channel++) {

        chunks.push(
            input
                .getChannelData(channel)
                .slice(sourceStart, sourceEnd)
        );

    }

    capturedAudioChunks.push({ offset, channels: chunks });

}


function createCapturedAudioBuffer(reverse) {

    if (!audioContext || !capturedAudioChunks.length) {

        return null;

    }

    const { start, end } = getLoopRange();
    const length = Math.ceil(
        (end - start) * capturedAudioSampleRate
    );
    const buffer = audioContext.createBuffer(
        capturedAudioChannelCount,
        length,
        capturedAudioSampleRate
    );

    for (const chunk of capturedAudioChunks) {

        for (let channel = 0; channel < capturedAudioChannelCount; channel++) {

            const target = buffer.getChannelData(channel);
            const source = chunk.channels[channel];
            const available = Math.min(source.length, target.length - chunk.offset);

            if (available > 0) {

                target.set(source.subarray(0, available), chunk.offset);

            }

        }

    }

    if (reverse) {

        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {

            const samples = buffer.getChannelData(channel);

            for (let left = 0, right = samples.length - 1; left < right; left++, right--) {

                const sample = samples[left];
                samples[left] = samples[right];
                samples[right] = sample;

            }

        }

    }

    clearCapturedAudio();

    return buffer;

}


function startReverseAudioPlayback() {

    if (reverseAudioMode.value === "mute") {

        return;

    }

    const audioBuffer =
        createCapturedAudioBuffer(reverseAudioMode.value === "reverse");

    if (!audioBuffer) {

        return;

    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioOutputGain);
    source.onended = () => {

        if (reverseAudioSource === source) {

            source.disconnect();
            reverseAudioSource = null;

        }

    };
    reverseAudioSource = source;
    source.start();

}


async function prepareReverseFrames(start, end) {

    clearReverseFrames();

    const duration = end - start;
    const requestedFrameCount =
        Math.max(
            2,
            Math.min(
                MAX_REVERSE_FRAMES,
                Math.ceil(duration * REVERSE_FRAME_RATE)
            )
        );

    const deviceScale = window.devicePixelRatio || 1;
    const maximumCaptureScale = Math.min(
        1,
        preview.clientWidth * deviceScale / video.videoWidth,
        Math.min(window.innerHeight * 0.62, 620) *
            deviceScale /
            video.videoHeight
    );

    reverseCanvas.width = Math.max(
        1,
        Math.round(video.videoWidth * maximumCaptureScale)
    );
    reverseCanvas.height = Math.max(
        1,
        Math.round(video.videoHeight * maximumCaptureScale)
    );

    const frameCount = Math.max(
        2,
        Math.min(
            requestedFrameCount,
            Math.floor(
                MAX_REVERSE_PIXELS /
                (reverseCanvas.width * reverseCanvas.height)
            )
        )
    );

    if (!reverseContext) {

        throw new Error("Could not prepare the canvas for reverse playback.");

    }

    nextCaptureTime = start;
    captureInterval = duration / (frameCount - 1);
    await captureCurrentFrame();


}


function captureCurrentFrame() {

    if (
        pendingFrameCapture ||
        reverseFrames.length >= MAX_REVERSE_FRAMES
    ) {

        return pendingFrameCapture || Promise.resolve();

    }

    const timestamp = video.currentTime;
    const generation = captureGeneration;
    let capturePromise;
    capturePromise =
        createImageBitmap(
            video,
            {
                resizeWidth: reverseCanvas.width,
                resizeHeight: reverseCanvas.height,
                resizeQuality: "high"
            }
        ).then(
            bitmap => {

                if (
                    generation !== captureGeneration ||
                    !loopActive ||
                    !["forward", "reverse-pending"].includes(loopDirection) ||
                    !pingPongCheckbox.checked
                ) {

                    bitmap.close();

                    return;

                }

                const previousFrame = reverseFrames[reverseFrames.length - 1];

                if (
                    previousFrame &&
                    timestamp <= previousFrame.timestamp
                ) {

                    bitmap.close();

                    return;

                }

                reverseFrames.push({ bitmap, timestamp });
                nextCaptureTime = timestamp + captureInterval;

            }
        ).finally(
            () => {

                if (pendingFrameCapture === capturePromise) {

                    pendingFrameCapture = null;

                }

            }
        );

    pendingFrameCapture = capturePromise;

    return pendingFrameCapture;


}


function captureForwardFrames() {

    if (
        !loopActive ||
        loopDirection !== "forward" ||
        !pingPongCheckbox.checked
    ) {

        frameCaptureRequest = 0;

        return;

    }

    if (
        video.currentTime >= nextCaptureTime &&
        reverseFrames.length < MAX_REVERSE_FRAMES
    ) {

        captureCurrentFrame().catch(
            error => {

                stopLoopPlayback(
                    error instanceof Error
                        ? `Could not capture frames for reverse playback: ${error.message}`
                        : "Could not capture frames for reverse playback."
                );

            }
        );

    }

    frameCaptureRequest =
        requestAnimationFrame(captureForwardFrames);

}


function renderReverseFrames(timestamp) {

    if (!loopActive || loopDirection !== "reverse") {

        reversePlaybackRequest = 0;

        return;

    }

    if (reverseLastTimestamp === 0) {

        reverseLastTimestamp = timestamp;

    }

    reverseElapsed += timestamp - reverseLastTimestamp;
    reverseLastTimestamp = timestamp;

    const targetTime =
        reverseFrames[reverseFrames.length - 1].timestamp -
        reverseElapsed / 1000;

    while (
        reverseFrameIndex > 0 &&
        reverseFrames[reverseFrameIndex - 1].timestamp >= targetTime
    ) {

        reverseFrameIndex--;

    }

    try {

        reverseContext.drawImage(
            reverseFrames[reverseFrameIndex].bitmap,
            0,
            0,
            reverseCanvas.width,
            reverseCanvas.height
        );

    } catch (error) {

        stopLoopPlayback(
            error instanceof Error
                ? `Could not display reverse playback: ${error.message}`
                : "Could not display reverse playback."
        );

        return;

    }

    if (reverseElapsed >= reverseDuration) {

        finishReversePlayback();

        return;

    }

    reversePlaybackRequest =
        requestAnimationFrame(renderReverseFrames);

}


function finishReversePlayback() {

    reversePlaybackRequest = 0;
    stopReverseAudioPlayback();
    clearCapturedAudio();
    loopDirection = "forward";
    releaseReverseFrames();
    reverseLastTimestamp = 0;
    reverseElapsed = 0;
    loopSeeking = true;

    try {

        video.currentTime = getLoopRange().start;

    } catch (error) {

        loopSeeking = false;
        stopLoopPlayback(
            error instanceof Error
                ? `Could not restart the loop: ${error.message}`
                : "Could not restart the loop."
        );

    }

}


async function beginReversePlayback() {

    if (!loopActive || loopDirection !== "forward") {

        return;

    }

    cancelAnimationFrame(frameCaptureRequest);
    frameCaptureRequest = 0;
    loopDirection = "reverse-pending";
    video.pause();

    try {

        if (pendingFrameCapture) {

            await pendingFrameCapture;

        }

        if (
            reverseFrames.length < MAX_REVERSE_FRAMES &&
            video.currentTime >
                reverseFrames[reverseFrames.length - 1].timestamp
        ) {

            await captureCurrentFrame();

        }

    } catch (error) {

        stopLoopPlayback(
            error instanceof Error
                ? `Could not capture the final reverse frame: ${error.message}`
                : "Could not capture the final reverse frame."
        );

        return;

    }

    if (reverseFrames.length < 2) {

        loopDirection = "forward";
        loopToStart();

        return;

    }

    loopDirection = "reverse";
    preview.classList.add("is-reversing");
    reverseFrameIndex = reverseFrames.length - 1;
    reverseDuration =
        (reverseFrames[reverseFrameIndex].timestamp -
        reverseFrames[0].timestamp) *
        1000;
    reverseElapsed = 0;
    reverseLastTimestamp = 0;

    try {

        reverseContext.drawImage(
            reverseFrames[reverseFrameIndex].bitmap,
            0,
            0,
            reverseCanvas.width,
            reverseCanvas.height
        );
        applyFadeEffects();
        startReverseAudioPlayback();

    } catch (error) {

        stopLoopPlayback(
            error instanceof Error
                ? `Could not play backward audio: ${error.message}`
                : "Could not play backward audio."
        );

        return;

    }

    reversePlaybackRequest =
        requestAnimationFrame(renderReverseFrames);

}


function seekVideo(time) {

    if (Math.abs(video.currentTime - time) < 0.001 && !video.seeking) {

        return Promise.resolve();

    }

    return new Promise(
        (resolve, reject) => {

            const cleanup = () => {

                video.removeEventListener("seeked", onSeeked);
                video.removeEventListener("error", onError);

            };

            const onSeeked = () => {

                cleanup();
                resolve();

            };

            const onError = () => {

                cleanup();
                reject(new Error("The video could not seek to the selected loop start."));

            };

            video.addEventListener("seeked", onSeeked, { once: true });
            video.addEventListener("error", onError, { once: true });

            try {

                video.currentTime = time;

            } catch (error) {

                cleanup();
                reject(error);

            }

        }
    );

}


async function startLoopPlayback() {

    if (!Number.isFinite(video.duration) || !video.duration) {

        status.textContent = "Choose a valid video before starting the loop.";

        return;

    }

    const { start, end } = getLoopRange();

    if (end <= start) {

        status.textContent = "Select a valid segment to loop.";

        return;

    }

    if (
        pingPongCheckbox.checked &&
        reverseAudioMode.value !== "mute" &&
        end - start > MAX_REVERSE_AUDIO_SECONDS
    ) {

        status.textContent =
            `Audio playback during the backward pass supports segments up to ${MAX_REVERSE_AUDIO_SECONDS} seconds. Choose Mute or select a shorter segment.`;

        return;

    }

    loopActive = true;
    loopDirection = "forward";
    video.controls = false;
    const shouldSeek =
        pingPongCheckbox.checked ||
        video.currentTime < start ||
        video.currentTime >= end;

    try {

        if (
            fadeCheckbox.checked ||
            (
                pingPongCheckbox.checked &&
                reverseAudioMode.value !== "mute"
            )
        ) {

            initializeAudioCapture();
            await audioContext.resume();

        }

        if (shouldSeek) {

            await seekVideo(start);

        }

        if (!loopActive) {

            return;

        }

        if (pingPongCheckbox.checked) {

            await prepareReverseFrames(start, end);
            frameCaptureRequest =
                requestAnimationFrame(captureForwardFrames);

        }

        startFadeEffects();
        await video.play();
        status.textContent = pingPongCheckbox.checked
            ? reverseAudioMode.value === "mute"
                ? "Playing forward and backward. Audio is muted during the backward pass."
                : reverseAudioMode.value === "normal"
                    ? "Playing forward and backward. Audio plays forward during the backward pass."
                    : "Playing forward and backward. Audio is reversed during the backward pass."
            : "Looping the selected segment.";

    } catch (error) {

        loopActive = false;
        loopDirection = "idle";
        clearReverseFrames();
        video.controls = true;
        status.textContent =
            error instanceof Error
                ? `Could not start video playback: ${error.message}`
                : "Could not start video playback.";

    }

}


function loopToStart() {

    if (!loopActive || loopSeeking) {

        return;

    }

    loopDirection = "forward";
    loopSeeking = true;
    const { start } = getLoopRange();
    video.currentTime = start;

}


function previewBoundary(time, isEnd) {

    stopLoopPlayback("Loop stopped. Adjust the markers and press Play Loop.");

    const previewTime = isEnd
        ? Math.max(0, time - Math.min(0.04, video.duration / 2))
        : time;

    video.currentTime = previewTime;

}


function updateMarker(movedMarker) {

    let start = Number(startSlider.value);
    let end = Number(endSlider.value);

    if (start === end) {

        if (movedMarker === "start") {

            endSlider.value =
                String(start < TIMELINE_RANGE ? start + 1 : start - 1);

        } else {

            startSlider.value =
                String(end > 0 ? end - 1 : end + 1);

        }

        start = Number(startSlider.value);
        end = Number(endSlider.value);

    }

    updateSelection();
    previewBoundary(
        video.duration * Number(movedMarker === "start" ? startSlider.value : endSlider.value) /
        TIMELINE_RANGE,
        movedMarker === "end"
    );

}


chooseVideoButton.addEventListener(
    "click",
    () => videoInput.click()
);


videoInput.addEventListener(
    "change",
    () => {

        const file = videoInput.files[0];

        if (!file) {

            return;

        }

        if (videoUrl) {

            URL.revokeObjectURL(videoUrl);

        }

        stopLoopPlayback("");
        selectedFile = file;
        videoUrl = URL.createObjectURL(file);
        video.src = videoUrl;
        video.load();
        fileName.textContent = file.name;
        status.textContent = "";
        videoInput.value = "";

    }
);


video.addEventListener(
    "loadedmetadata",
    () => {

        startSlider.disabled = false;
        endSlider.disabled = false;
        timelineZoom.disabled = false;
        playButton.disabled = false;
        pauseButton.disabled = false;
        stopButton.disabled = false;
        outputDurationInput.disabled = false;
        generateVideoButton.disabled = false;
        startSlider.value = "0";
        endSlider.value = String(TIMELINE_RANGE);
        timelineZoom.value = "1";
        timelineZoomValue.textContent = "1x";
        trimTimeline.style.width = "100%";
        trimViewport.scrollLeft = 0;
        preview.classList.add("has-video");
        emptyState.hidden = true;
        updateSelection();
        status.textContent = "Select a segment, then press Play Loop.";

    }
);


startSlider.addEventListener(
    "input",
    () => updateMarker("start")
);


endSlider.addEventListener(
    "input",
    () => updateMarker("end")
);


timelineZoom.addEventListener(
    "input",
    () => {

        const zoom = Number(timelineZoom.value);

        trimTimeline.style.width = `${zoom * 100}%`;
        timelineZoomValue.textContent = `${zoom}x`;

        const selectionCenter =
            (Number(startSlider.value) + Number(endSlider.value)) /
            2 / TIMELINE_RANGE * trimViewport.scrollWidth;

        trimViewport.scrollLeft =
            Math.max(
                0,
                Math.min(
                    selectionCenter - trimViewport.clientWidth / 2,
                    trimViewport.scrollWidth - trimViewport.clientWidth
                )
            );

    }
);


playButton.addEventListener("click", startLoopPlayback);

generateVideoButton.addEventListener("click", generateLoopVideo);


video.addEventListener(
    "play",
    () => {

        if (loopExporting) {

            return;

        }

        if (loopActive) {

            return;

        }

        redirectingNativePlay = true;
        video.pause();
        startLoopPlayback();

    }
);


pauseButton.addEventListener(
    "click",
    () => stopLoopPlayback("Loop paused.")
);


stopButton.addEventListener(
    "click",
    () => {

        stopLoopPlayback("Loop stopped.");
        video.currentTime = getLoopRange().start;

    }
);


video.addEventListener(
    "timeupdate",
    () => {

        const { end } = getLoopRange();

        if (loopActive && !video.seeking && video.currentTime >= end) {

            if (pingPongCheckbox.checked) {

                beginReversePlayback();

            } else {

                loopToStart();

            }

        }

    }
);


video.addEventListener(
    "seeked",
    async () => {

        if (loopSeeking) {

            loopSeeking = false;

            if (loopActive && video.paused) {

                if (pingPongCheckbox.checked) {

                    try {

                        const { start, end } = getLoopRange();

                        await prepareReverseFrames(start, end);
                        frameCaptureRequest =
                            requestAnimationFrame(captureForwardFrames);

                    } catch (error) {

                        stopLoopPlayback(
                            error instanceof Error
                                ? `Could not prepare reverse playback: ${error.message}`
                                : "Could not prepare reverse playback."
                        );

                        return;

                    }

                }

                applyFadeEffects();
                video.play().then(
                    () => startFadeEffects()
                ).catch(error => {

                    cancelAnimationFrame(fadeAnimationRequest);
                    fadeAnimationRequest = 0;
                    loopActive = false;
                    loopDirection = "idle";
                    clearReverseFrames();
                    video.controls = true;
                    status.textContent =
                        `Could not resume video playback: ${error.message}`;

                });

            }

        }

    }
);


video.addEventListener(
    "ended",
    () => {

        if (!loopActive) {

            return;

        }

        if (pingPongCheckbox.checked) {

            beginReversePlayback();

        } else {

            loopToStart();

        }

    }
);


video.addEventListener(
    "pause",
    () => {

        if (redirectingNativePlay) {

            redirectingNativePlay = false;

            return;

        }

        if (
            loopActive &&
            !loopSeeking &&
            loopDirection === "forward"
        ) {

            loopActive = false;
            loopDirection = "idle";
            clearReverseFrames();
            video.controls = true;
            status.textContent = "Loop paused.";

        }

    }
);


pingPongCheckbox.addEventListener(
    "change",
    () => {

        if (loopActive) {

            stopLoopPlayback(
                "Playback stopped because the loop mode changed. Press Play Loop to apply it."
            );

        }

    }
);


reverseAudioMode.addEventListener(
    "change",
    () => {

        if (loopActive) {

            stopLoopPlayback(
                "Playback stopped because the backward audio mode changed. Press Play Loop to apply it."
            );

        }

    }
);


settingsButton.addEventListener(
    "click",
    () => {

        const isOpen =
            settingsButton.getAttribute("aria-expanded") === "true";

        settingsButton.setAttribute("aria-expanded", String(!isOpen));
        settingsMenu.classList.toggle("open", !isOpen);

    }
);


fadeCheckbox.addEventListener(
    "change",
    () => {

        fadeDuration.disabled = !fadeCheckbox.checked;

        if (loopActive) {

            stopLoopPlayback(
                "Playback stopped because the fade setting changed. Press Play Loop to apply it."
            );

        }

    }
);


fadeDuration.addEventListener(
    "input",
    () => {

        fadeDurationValue.value = `${Number(fadeDuration.value).toFixed(1)} s`;
        fadeDurationValue.textContent = fadeDurationValue.value;
        applyFadeEffects();

    }
);


video.addEventListener(
    "volumechange",
    () => {

        if (loopActive) {

            applyFadeEffects();

        } else {

            syncAudioOutputGain(1);

        }

    }
);


document.addEventListener(
    "click",
    event => {

        if (!event.target.closest(".loop-settings-selector")) {

            settingsMenu.classList.remove("open");
            settingsButton.setAttribute("aria-expanded", "false");

        }

    }
);


document.addEventListener(
    "keydown",
    event => {

        if (event.key === "Escape" && settingsMenu.classList.contains("open")) {

            settingsMenu.classList.remove("open");
            settingsButton.setAttribute("aria-expanded", "false");
            settingsButton.focus();

        }

    }
);
