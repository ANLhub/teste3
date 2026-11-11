const videoInput = document.getElementById("creatorVideoInput");
const chooseVideoButton = document.getElementById("chooseCreatorVideo");
const video = document.getElementById("creatorVideo");
const preview = document.querySelector(".creator-preview");
const fileName = document.getElementById("creatorFileName");
const emptyState = document.getElementById("creatorEmptyState");
const exportProgressOverlay = document.getElementById("exportProgressOverlay");
const exportProgressTitle = document.getElementById("exportProgressTitle");
const exportProgressBar = document.getElementById("exportProgressBar");
const exportProgressLabel = document.getElementById("exportProgressLabel");
const startSlider = document.getElementById("trimStart");
const endSlider = document.getElementById("trimEnd");
const trimViewport = document.getElementById("trimViewport");
const trimTimeline = document.querySelector(".trim-timeline");
const trimFilmstrip = document.getElementById("trimFilmstrip");
const trimPlayhead = document.getElementById("trimPlayhead");
const timelineZoom = document.getElementById("timelineZoom");
const timelineZoomValue = document.getElementById("timelineZoomValue");
const timelineFrameSettingsButton = document.getElementById("toggleTimelineFrameSettings");
const timelineFrameSettings = document.getElementById("timelineFrameSettings");
const timelineFrameSkip = document.getElementById("timelineFrameSkip");
const timelineFrameSkipValue = document.getElementById("timelineFrameSkipValue");
const selection = document.getElementById("trimSelection");
const startTime = document.getElementById("trimStartTime");
const endTime = document.getElementById("trimEndTime");
const captureButton = document.getElementById("captureFrame");
const createGifButton = document.getElementById("createGif");
const previewGifButton = document.getElementById("previewGif");
const previewClipButton = document.getElementById("previewClip");
const cancelGifSelectionButton = document.getElementById("cancelGifSelection");
const createGifLabel = createGifButton.querySelector("[data-i18n]");
const createClipButton = document.getElementById("createClip");
const status = document.getElementById("creatorStatus");

let videoUrl = "";
let selectedFile = null;
let gifSelectionPrepared = false;
let previousGifSelection = null;
let statusKey = "";
let statusValues = {};
let clipAudioContext = null;
let clipAudioSource = null;
let clipAudioGain = null;
let clipAudioVolumeListenerAdded = false;
let filmstripRequestId = 0;
let filmstripTimer = 0;
let playheadAnimationFrame = 0;
let activePreview = null;

const translate =
    (key, values = {}) => window.languageText
        ? window.languageText(key, values)
        : key;

const GIF_MAX_DURATION = 30;
const GIF_FRAME_RATE = 10;
const GIF_MAX_WIDTH = 480;
const GIF_PALETTE_SAMPLE_COUNT = 48;
const TIMELINE_RANGE = 10000;


function setCreatorStatus(key, values = {}) {

    statusKey = key;
    statusValues = values;

    status.textContent =
        key ? translate(key, values) : "";

}


document.addEventListener(
    "app-language-change",
    () => {

        setCreatorStatus(statusKey, statusValues);
        updateGifButtonLabel();
        updatePreviewButtonLabels();

    }
);

cancelGifSelectionButton.addEventListener("click", cancelGifSelection);


function updateGifButtonLabel() {

    const labelKey =
        gifSelectionPrepared ? "creator.createGif" : "creator.prepareGif";
    const titleKey =
        gifSelectionPrepared ? "creator.gifTitle" : "creator.prepareGifTitle";

    createGifLabel.textContent = translate(labelKey);
    createGifButton.title = translate(titleKey);

}

function updatePreviewButtonLabels() {

    previewGifButton.textContent = translate(
        activePreview && activePreview.button === previewGifButton
            ? "creator.stopPreview"
            : "creator.previewGif"
    );
    previewClipButton.textContent = translate(
        activePreview && activePreview.button === previewClipButton
            ? "creator.stopPreview"
            : "creator.previewClip"
    );

}


function updatePlayhead() {

    if (!Number.isFinite(video.duration) || video.duration <= 0) {
        trimPlayhead.hidden = true;
        return;
    }

    const fraction = Math.min(1, Math.max(0, video.currentTime / video.duration));
    trimPlayhead.style.left = `${fraction * 100}%`;
    trimPlayhead.hidden = video.paused && !activePreview && exportProgressOverlay.hidden;

    if (activePreview) {
        const playheadPosition = fraction * trimTimeline.scrollWidth;
        const viewportStart = trimViewport.scrollLeft;
        const viewportEnd = viewportStart + trimViewport.clientWidth;

        if (playheadPosition < viewportStart + 36) {
            trimViewport.scrollLeft = Math.max(0, playheadPosition - 36);
        } else if (playheadPosition > viewportEnd - 36) {
            trimViewport.scrollLeft = Math.min(
                trimTimeline.scrollWidth - trimViewport.clientWidth,
                playheadPosition - trimViewport.clientWidth + 36
            );
        }
    }

}


function animatePlayhead() {

    updatePlayhead();

    if (!video.paused) {
        playheadAnimationFrame =
            window.requestAnimationFrame(animatePlayhead);
    } else {
        playheadAnimationFrame = 0;
    }

}


function startPlayheadAnimation() {

    if (!playheadAnimationFrame) {
        playheadAnimationFrame =
            window.requestAnimationFrame(animatePlayhead);
    }

}


function getTrimRange() {

    const firstMarker = Number(startSlider.value);
    const secondMarker = Number(endSlider.value);

    return {
        start: video.duration * Math.min(firstMarker, secondMarker) / TIMELINE_RANGE,
        end: video.duration * Math.max(firstMarker, secondMarker) / TIMELINE_RANGE
    };

}


function stopPreview(pauseVideo = true) {

    activePreview = null;
    updatePreviewButtonLabels();

    if (pauseVideo) {
        video.pause();
    }

    if (playheadAnimationFrame) {
        window.cancelAnimationFrame(playheadAnimationFrame);
        playheadAnimationFrame = 0;
    }

    updatePlayhead();

}


async function previewTrim(button) {

    if (activePreview) {
        if (activePreview.button === button) {
            stopPreview();
            return;
        }

        stopPreview();
    }

    if (!video.videoWidth || !Number.isFinite(video.duration) || video.duration <= 0) {
        setCreatorStatus("creator.invalidVideo");
        return;
    }

    const { start, end } = getTrimRange();
    if (end <= start) {
        setCreatorStatus("creator.clipInvalidRange");
        return;
    }

    if (!video.paused) {
        await new Promise(resolve => {
            video.addEventListener("pause", resolve, { once: true });
            video.pause();
        });
    }

    const preview = { button, start, end };
    activePreview = preview;
    updatePreviewButtonLabels();

    try {
        await seekVideo(start);

        if (activePreview !== preview) {
            return;
        }

        await video.play();
        startPlayheadAnimation();
        setCreatorStatus("");
    } catch (error) {
        if (activePreview === preview) {
            stopPreview(false);
            setCreatorStatus("creator.previewError", {
                error: error instanceof Error
                    ? error.message
                    : translate("creator.clipUnknownError")
            });
        }
    }

}


function updatePreviewVisibility() {

    previewGifButton.hidden = !gifSelectionPrepared;

}


function formatTime(seconds) {

    if (!Number.isFinite(seconds)) {

        return "00:00";

    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;

}


function updateTrimDisplay() {

    const start =
        Math.min(Number(startSlider.value), Number(endSlider.value));

    const end =
        Math.max(Number(startSlider.value), Number(endSlider.value));

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


function keepMarkersApart(movedHandle) {

    if (Number(startSlider.value) !== Number(endSlider.value)) {

        return;

    }

    if (movedHandle === "start") {

        endSlider.value =
            String(Number(startSlider.value) < TIMELINE_RANGE
                ? Number(startSlider.value) + 1
                : Number(startSlider.value) - 1);

        return;

    }

    startSlider.value =
        String(Number(endSlider.value) > 0
            ? Number(endSlider.value) - 1
            : Number(endSlider.value) + 1);

}

function getGifMaxMarkerSpan() {

    return Math.max(
        1,
        Math.min(
            TIMELINE_RANGE,
            Math.floor(GIF_MAX_DURATION / video.duration * TIMELINE_RANGE)
        )
    );

}

function constrainGifSelectionHandle(movedHandle) {

    const maxMarkerSpan = getGifMaxMarkerSpan();

    if (movedHandle === "start") {

        const end = Number(endSlider.value);
        const start = Math.min(Number(startSlider.value), end - 1);
        const adjustedEnd = Math.min(
            TIMELINE_RANGE,
            end - start > maxMarkerSpan
                ? start + maxMarkerSpan
                : end
        );
        startSlider.value = String(start);
        endSlider.value = String(adjustedEnd);
        return;

    }

    const start = Number(startSlider.value);
    const end = Math.max(Number(endSlider.value), start + 1);
    const adjustedStart = Math.max(
        0,
        end - start > maxMarkerSpan
            ? end - maxMarkerSpan
            : start
    );
    endSlider.value = String(end);
    startSlider.value = String(adjustedStart);

}

function scheduleFilmstripUpdate() {

    window.clearTimeout(filmstripTimer);
    filmstripTimer = window.setTimeout(createFilmstrip, 180);

}

function getVisibleTimelineRange() {

    const timelineWidth = Math.max(trimTimeline.scrollWidth, 1);
    const viewportWidth = trimViewport.clientWidth;
    const start = Math.min(1, trimViewport.scrollLeft / timelineWidth);
    const end = Math.min(
        1,
        (trimViewport.scrollLeft + viewportWidth) / timelineWidth
    );

    return { start, end };

}

function getFilmstripFrameCount() {

    const zoomBonus = Math.ceil(Math.log2(Number(timelineZoom.value)) * 4);
    const visibleRange = getVisibleTimelineRange();
    const visibleDuration = video.duration * (visibleRange.end - visibleRange.start);
    const minimumInterval = Number(timelineFrameSkip.value) / 30;
    const countAllowedByFrameSkip = Math.max(
        1,
        Math.floor(visibleDuration / minimumInterval)
    );
    const countAllowedByWidth = Math.max(
        24,
        Math.min(96, Math.ceil(trimViewport.clientWidth / 24) + zoomBonus)
    );

    return Math.min(countAllowedByWidth, countAllowedByFrameSkip);

}

function positionFilmstrip() {

    const frameCount = getFilmstripFrameCount();
    trimFilmstrip.style.left = `${trimViewport.scrollLeft}px`;
    trimFilmstrip.style.width = `${trimViewport.clientWidth}px`;
    trimFilmstrip.style.setProperty("--filmstrip-columns", String(frameCount));

    return frameCount;

}

function seekThumbnailVideo(thumbnailVideo, time) {

    if (
        Math.abs(thumbnailVideo.currentTime - time) < 0.001 &&
        thumbnailVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {

        const cleanup = () => {
            thumbnailVideo.removeEventListener("seeked", onSeeked);
            thumbnailVideo.removeEventListener("error", onError);
        };
        const onSeeked = () => {
            cleanup();
            resolve();
        };
        const onError = () => {
            cleanup();
            reject(new Error("Could not seek the video for the timeline preview."));
        };

        thumbnailVideo.addEventListener("seeked", onSeeked, { once: true });
        thumbnailVideo.addEventListener("error", onError, { once: true });

        try {
            thumbnailVideo.currentTime = time;
        } catch (error) {
            cleanup();
            reject(error);
        }

    });

}

async function createFilmstrip() {

    const requestId = ++filmstripRequestId;
    trimFilmstrip.replaceChildren();

    if (!videoUrl || !Number.isFinite(video.duration) || video.duration <= 0) {
        return;
    }

    const thumbnailVideo = document.createElement("video");
    thumbnailVideo.muted = true;
    thumbnailVideo.playsInline = true;
    thumbnailVideo.preload = "auto";
    thumbnailVideo.src = videoUrl;

    const waitForEvent = (target, successEvent, failureEvent) => new Promise((resolve, reject) => {
        const cleanup = () => {
            target.removeEventListener(successEvent, onSuccess);
            target.removeEventListener(failureEvent, onFailure);
        };
        const onSuccess = () => {
            cleanup();
            resolve();
        };
        const onFailure = () => {
            cleanup();
            reject(new Error("Could not decode the video for the timeline preview."));
        };
        target.addEventListener(successEvent, onSuccess, { once: true });
        target.addEventListener(failureEvent, onFailure, { once: true });
    });

    try {

        const metadataReady = waitForEvent(thumbnailVideo, "loadedmetadata", "error");
        thumbnailVideo.load();
        await metadataReady;

        if (thumbnailVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
            const frameReady = waitForEvent(thumbnailVideo, "loadeddata", "error");
            await frameReady;
        }

        const canvas = document.createElement("canvas");
        const columns = positionFilmstrip();
        const visibleRange = getVisibleTimelineRange();
        const thumbnailWidth = 128;
        const thumbnailHeight = 72;
        canvas.width = thumbnailWidth;
        canvas.height = thumbnailHeight;
        const context = canvas.getContext("2d");

        if (!context) {
            throw new Error("Could not create the timeline thumbnail canvas.");
        }

        for (let index = 0; index < columns; index += 1) {

            if (requestId !== filmstripRequestId) {
                return;
            }

            const sampleFraction = visibleRange.start +
                (visibleRange.end - visibleRange.start) * (index + 0.5) / columns;
            const sampleTime = Math.min(
                video.duration - 0.01,
                video.duration * sampleFraction
            );
            await seekThumbnailVideo(thumbnailVideo, Math.max(0, sampleTime));

            if (requestId !== filmstripRequestId) {
                return;
            }

            context.drawImage(thumbnailVideo, 0, 0, thumbnailWidth, thumbnailHeight);

            const frame = document.createElement("div");
            frame.className = "trim-filmstrip-frame";
            frame.style.backgroundImage = `url("${canvas.toDataURL("image/jpeg", 0.72)}")`;
            trimFilmstrip.append(frame);

        }

    } catch (error) {

        if (requestId === filmstripRequestId) {
            console.error("Could not create the video timeline thumbnails.", error);
        }

    } finally {

        thumbnailVideo.pause();
        thumbnailVideo.removeAttribute("src");
        thumbnailVideo.load();

    }

}

trimViewport.addEventListener("scroll", scheduleFilmstripUpdate, { passive: true });

timelineFrameSettingsButton.addEventListener("click", () => {
    timelineFrameSettings.hidden = !timelineFrameSettings.hidden;
    timelineFrameSettingsButton.setAttribute(
        "aria-expanded",
        String(!timelineFrameSettings.hidden)
    );
});

timelineFrameSkip.addEventListener("input", () => {
    timelineFrameSkipValue.value = timelineFrameSkip.value;
    scheduleFilmstripUpdate();
});


function previewTrimBoundary(time, isEndBoundary) {

    if (!Number.isFinite(video.duration)) {

        return;

    }

    const previewTime = isEndBoundary
        ? Math.max(0, time - Math.min(0.04, video.duration / 2))
        : time;

    video.pause();
    video.currentTime = previewTime;

}


function enableEditor() {

    gifSelectionPrepared = false;
    previousGifSelection = null;
    cancelGifSelectionButton.hidden = true;
    updateGifButtonLabel();

    startSlider.disabled = false;
    endSlider.disabled = false;
    timelineZoom.disabled = false;
    previewGifButton.hidden = true;
    previewClipButton.disabled = false;
    captureButton.disabled = false;
    createGifButton.disabled = false;
    createClipButton.disabled = false;
    preview.classList.add("has-video");
    emptyState.hidden = true;

    startSlider.value = 0;
    endSlider.value = String(TIMELINE_RANGE);
    timelineZoom.value = "1";
    timelineZoomValue.textContent = "1x";
    trimTimeline.style.width = "100%";
    trimViewport.scrollLeft = 0;

    updateTrimDisplay();
    createFilmstrip();

}


function seekVideo(time) {

    if (Math.abs(video.currentTime - time) < 0.001 && !video.seeking) {

        return Promise.resolve();

    }

    return new Promise(
        (resolve, reject) => {

            const onSeeked = () => {

                cleanup();
                resolve();

            };

            const onError = () => {

                cleanup();
                reject(new Error(translate("creator.seekError")));

            };

            const cleanup = () => {

                video.removeEventListener("seeked", onSeeked);
                video.removeEventListener("error", onError);

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


function waitForVideoFrame() {

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {

        return Promise.resolve();

    }

    return new Promise(
        (resolve, reject) => {

            const cleanup = () => {

                video.removeEventListener("loadeddata", onLoadedData);
                video.removeEventListener("error", onError);

            };

            const onLoadedData = () => {

                cleanup();
                resolve();

            };

            const onError = () => {

                cleanup();
                reject(new Error(translate("creator.decodeError")));

            };

            video.addEventListener("loadeddata", onLoadedData, { once: true });
            video.addEventListener("error", onError, { once: true });

        }
    );

}


function prepareGifSelection() {

    if (
        !video.videoWidth ||
        !video.videoHeight ||
        !Number.isFinite(video.duration) ||
        video.duration <= 0
    ) {

        setCreatorStatus("creator.invalidVideo");

        return;

    }

    previousGifSelection = {
        start: Number(startSlider.value),
        end: Number(endSlider.value)
    };

    const maxMarkerSpan = getGifMaxMarkerSpan();
    const selectedStart =
        Math.min(Number(startSlider.value), Number(endSlider.value));
    let adjustedStart = selectedStart;
    let adjustedEnd =
        Math.min(TIMELINE_RANGE, adjustedStart + maxMarkerSpan);

    if (adjustedEnd - adjustedStart < maxMarkerSpan) {

        adjustedStart = adjustedEnd - maxMarkerSpan;

    }

    startSlider.value = String(adjustedStart);
    endSlider.value = String(adjustedEnd);
    updateTrimDisplay();
    gifSelectionPrepared = true;
    cancelGifSelectionButton.hidden = false;
    updatePreviewVisibility();
    updateGifButtonLabel();
    setCreatorStatus("");

}

function cancelGifSelection() {

    if (!gifSelectionPrepared || !previousGifSelection) {
        return;
    }

    if (activePreview && activePreview.button === previewGifButton) {
        stopPreview();
    }

    startSlider.value = String(previousGifSelection.start);
    endSlider.value = String(previousGifSelection.end);
    previousGifSelection = null;
    gifSelectionPrepared = false;
    cancelGifSelectionButton.hidden = true;
    updatePreviewVisibility();
    updateGifButtonLabel();
    updateTrimDisplay();
    setCreatorStatus("");

}


async function createGif() {

    const firstMarker = Number(startSlider.value);
    const secondMarker = Number(endSlider.value);

    const start =
        video.duration * Math.min(firstMarker, secondMarker) /
        TIMELINE_RANGE;

    const end =
        video.duration * Math.max(firstMarker, secondMarker) /
        TIMELINE_RANGE;

    const selectedDuration = end - start;

    if (!video.videoWidth || !video.videoHeight || !Number.isFinite(selectedDuration)) {

        setCreatorStatus("creator.invalidVideo");

        return;

    }

    if (selectedDuration <= 0) {

        setCreatorStatus("creator.invalidRange");

        return;

    }

    if (selectedDuration > GIF_MAX_DURATION) {

        setCreatorStatus(
            "creator.tooLong",
            { duration: formatTime(selectedDuration) }
        );

        return;

    }

    const originalTime = video.currentTime;
    const wasPlaying = !video.paused;
    const frameCount =
        Math.max(1, Math.ceil(selectedDuration * GIF_FRAME_RATE));
    const scale = Math.min(1, GIF_MAX_WIDTH / video.videoWidth);
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));
    const canvas = document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", {
        willReadFrequently: true
    });

    if (!context) {

        setCreatorStatus("creator.canvasError");

        return;

    }

    const frames = [];
    const histogram = GifEncoder.createHistogram();
    const paletteSampleCount =
        Math.min(frameCount, GIF_PALETTE_SAMPLE_COUNT);

    exportProgressOverlay.hidden = false;
    exportProgressTitle.textContent = translate("creator.exportProgressTitle");
    exportProgressBar.value = 0;
    exportProgressLabel.textContent =
        translate("creator.exportProgressStarting", { percent: 0 });
    video.pause();
    createGifButton.disabled = true;
    previewGifButton.disabled = true;
    cancelGifSelectionButton.disabled = true;
    createClipButton.disabled = true;
    previewClipButton.disabled = true;
    captureButton.disabled = true;
    chooseVideoButton.disabled = true;
    startSlider.disabled = true;
    endSlider.disabled = true;
    timelineZoom.disabled = true;

    try {

        await waitForVideoFrame();

        for (let sample = 0; sample < paletteSampleCount; sample++) {

            const sampleFrameIndex =
                paletteSampleCount === 1
                    ? 0
                    : Math.round(
                        sample * (frameCount - 1) /
                        (paletteSampleCount - 1)
                    );
            const sampleTime =
                Math.min(
                    start + sampleFrameIndex / GIF_FRAME_RATE,
                    end - 0.001
                );

            await seekVideo(Math.max(0, sampleTime));
            context.drawImage(video, 0, 0, width, height);

            const imageData =
                context.getImageData(0, 0, width, height);

            GifEncoder.addToHistogram(imageData.data, histogram);

            const progress =
                Math.round((sample + 1) / paletteSampleCount * 10);

            exportProgressBar.value = progress;
            exportProgressLabel.textContent =
                translate(
                    "creator.paletteProgress",
                    {
                        current: sample + 1,
                        total: paletteSampleCount,
                        percent: progress
                    }
                );

        }

        const palette = GifEncoder.createPalette(histogram);
        const colorMap = GifEncoder.createColorMap(palette);

        for (let index = 0; index < frameCount; index++) {

            const frameTime =
                Math.min(
                    start + index / GIF_FRAME_RATE,
                    end - 0.001
                );

            await seekVideo(Math.max(0, frameTime));

            context.drawImage(video, 0, 0, width, height);

            const imageData =
                context.getImageData(0, 0, width, height);

            frames.push(
                GifEncoder.quantize(
                    imageData.data,
                    width * height,
                    colorMap,
                    palette,
                    width
                )
            );

            setCreatorStatus(
                "creator.progress",
                {
                    current: index + 1,
                    total: frameCount,
                    percent: Math.round((index + 1) / frameCount * 100)
                }
            );

            const progress =
                10 + Math.round((index + 1) / frameCount * 80);

            exportProgressBar.value = progress;
            exportProgressLabel.textContent =
                translate("creator.exportProgressPreparing", { percent: progress });

        }

        exportProgressBar.value = 95;
        exportProgressLabel.textContent =
            translate("creator.exportProgressFinishing");

        const gifBlob =
            GifEncoder.encode(
                frames,
                width,
                height,
                Math.round(100 / GIF_FRAME_RATE),
                palette
            );

        const gifUrl = URL.createObjectURL(gifBlob);
        const download = document.createElement("a");

        download.href = gifUrl;
        download.download =
            `${fileName.textContent.replace(/\.[^.]+$/, "") || "video"}.gif`;
        download.click();

        setTimeout(
            () => URL.revokeObjectURL(gifUrl),
            1000
        );

        setCreatorStatus(
            "creator.gifReady",
            { width, height, frames: frameCount }
        );
        exportProgressBar.value = 100;
        exportProgressLabel.textContent =
            translate("creator.exportProgressDone");

    } catch (error) {

        setCreatorStatus(
            error instanceof Error
                ? "creator.gifError"
                : "creator.gifErrorGeneric",
            { error: error instanceof Error ? error.message : "" }
        );

    } finally {

        exportProgressOverlay.hidden = true;
        frames.length = 0;
        video.currentTime = originalTime;

        if (wasPlaying) {

            video.play().catch(() => {

                setCreatorStatus(
                    statusKey,
                    statusValues
                );

                status.textContent +=
                    translate("creator.resumeError");

            });

        }

        createGifButton.disabled = false;
        previewGifButton.disabled = false;
        cancelGifSelectionButton.disabled = false;
        createClipButton.disabled = false;
        previewClipButton.disabled = false;
        captureButton.disabled = false;
        chooseVideoButton.disabled = false;
        startSlider.disabled = false;
        endSlider.disabled = false;
        timelineZoom.disabled = false;

    }

}


function getClipMimeType() {

    if (typeof MediaRecorder.isTypeSupported !== "function") {

        return "";

    }

    const supportedTypes = [
        "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
        "video/mp4;codecs=avc1.42E01E",
        "video/mp4"
    ];

    return supportedTypes.find(
        type => MediaRecorder.isTypeSupported(type)
    );

}


async function remuxClipToMp4(clipBlob) {

    const {
        Input,
        ALL_FORMATS,
        BlobSource,
        Output,
        Mp4OutputFormat,
        BufferTarget,
        Conversion
    } = window.Mediabunny || {};

    if (
        !Input ||
        !ALL_FORMATS ||
        !BlobSource ||
        !Output ||
        !Mp4OutputFormat ||
        !BufferTarget ||
        !Conversion
    ) {

        throw new Error(translate("creator.remuxUnavailable"));

    }

    const input = new Input({
        formats: ALL_FORMATS,
        source: new BlobSource(clipBlob)
    });
    const inputHasAudio = Boolean(await input.getPrimaryAudioTrack());
    const output = new Output({
        format: new Mp4OutputFormat({
            fastStart: "in-memory"
        }),
        target: new BufferTarget()
    });
    const conversion = await Conversion.init({
        input,
        output,
        copy: {
            mode: "forced"
        }
    });

    if (!conversion.isValid) {

        throw new Error(
            translate("creator.remuxUnsupportedTracks")
        );

    }

    conversion.onProgress = progress => {

        const percent =
            Math.min(99, 90 + Math.floor(progress * 9));

        exportProgressBar.value = percent;
        exportProgressLabel.textContent =
            translate("creator.remuxProgress", { percent });

    };

    await conversion.execute();

    const buffer = output.target.buffer;

    if (!buffer || !buffer.byteLength) {

        throw new Error(translate("creator.remuxEmpty"));

    }

    const remuxedBlob = new Blob(
        [buffer],
        { type: "video/mp4" }
    );

    if (inputHasAudio) {

        const remuxedInput = new Input({
            formats: ALL_FORMATS,
            source: new BlobSource(remuxedBlob)
        });

        if (!await remuxedInput.getPrimaryAudioTrack()) {

            throw new Error(translate("creator.remuxAudioMissing"));

        }

    }

    return remuxedBlob;

}


function updateClipAudioGain() {

    if (!clipAudioGain || !clipAudioContext) {

        return;

    }

    clipAudioGain.gain.setValueAtTime(
        video.muted ? 0 : video.volume,
        clipAudioContext.currentTime
    );

}


async function attachAudioCaptureFallback(stream) {

    if (typeof AudioContext === "undefined") {

        throw new Error(translate("creator.clipAudioCaptureMissing"));

    }

    if (!clipAudioContext) {

        clipAudioContext = new AudioContext();

    }

    try {

        await clipAudioContext.resume();

        if (!clipAudioSource) {

            clipAudioSource =
                clipAudioContext.createMediaElementSource(video);
            clipAudioGain =
                clipAudioContext.createGain();
            clipAudioSource.connect(clipAudioGain);
            clipAudioGain.connect(clipAudioContext.destination);

            if (!clipAudioVolumeListenerAdded) {

                video.addEventListener(
                    "volumechange",
                    updateClipAudioGain
                );
                clipAudioVolumeListenerAdded = true;

            }

        }

        updateClipAudioGain();

        const destination =
            clipAudioContext.createMediaStreamDestination();
        const audioTrack =
            destination.stream.getAudioTracks()[0];

        if (!audioTrack) {

            throw new Error(
                translate("creator.clipAudioCaptureMissing")
            );

        }

        clipAudioGain.connect(destination);
        stream.addTrack(audioTrack);

        return () => {

            clipAudioGain.disconnect(destination);
            stream.removeTrack(audioTrack);
            audioTrack.stop();

        };

    } catch (error) {

        if (!clipAudioSource && clipAudioContext) {

            await clipAudioContext.close();
            clipAudioContext = null;

        }

        throw new Error(
            translate(
                "creator.clipAudioCaptureFailed",
                {
                    error: error instanceof Error
                        ? error.message
                        : translate("creator.clipUnknownError")
                }
            )
        );

    }

}


function setExportControlsDisabled(disabled) {

    createGifButton.disabled = disabled;
    cancelGifSelectionButton.disabled = disabled;
    createClipButton.disabled = disabled;
    captureButton.disabled = disabled;
    chooseVideoButton.disabled = disabled;
    startSlider.disabled = disabled;
    endSlider.disabled = disabled;
    timelineZoom.disabled = disabled;
    previewGifButton.disabled = disabled;
    previewClipButton.disabled = disabled;

}


async function createClip() {

    const firstMarker = Number(startSlider.value);
    const secondMarker = Number(endSlider.value);
    const start =
        video.duration * Math.min(firstMarker, secondMarker) /
        TIMELINE_RANGE;
    const end =
        video.duration * Math.max(firstMarker, secondMarker) /
        TIMELINE_RANGE;
    const selectedDuration = end - start;
    const mimeType =
        typeof MediaRecorder === "undefined"
            ? ""
            : getClipMimeType();

    if (
        !video.videoWidth ||
        !video.videoHeight ||
        !Number.isFinite(selectedDuration)
    ) {

        setCreatorStatus("creator.clipInvalidVideo");

        return;

    }

    if (selectedDuration <= 0) {

        setCreatorStatus("creator.clipInvalidRange");

        return;

    }

    if (
        typeof MediaRecorder === "undefined" ||
        (!video.captureStream && !video.mozCaptureStream) ||
        !mimeType
    ) {

        setCreatorStatus("creator.clipUnsupported");

        return;

    }

    const originalTime = video.currentTime;
    const wasPlaying = !video.paused;
    const originalControls = video.controls;
    const fileBaseName =
        (selectedFile ? selectedFile.name : "video")
            .replace(/\.[^.]+$/, "") || "video";
    const inputBitrate =
        selectedFile && Number.isFinite(video.duration)
            ? Math.round(selectedFile.size * 8 / video.duration * 1.25)
            : 0;
    const options = {};
    options.mimeType = mimeType;

    if (inputBitrate > 0) {
        options.videoBitsPerSecond =
            Math.max(2500000, inputBitrate);
        options.audioBitsPerSecond = 192000;
    }

    let stream;
    let recorder;
    let chunks = [];
    let stopAtEnd = false;
    let progressTimer = 0;
    let recordingStarted = false;
    let recordingFinished;
    let playbackFinished;
    let cleanupPlayback = () => {};
    let cleanupAudioCapture = () => {};

    exportProgressOverlay.hidden = false;
    exportProgressTitle.textContent = translate("creator.clipProgressTitle");
    exportProgressBar.value = 0;
    exportProgressLabel.textContent =
        translate("creator.clipProgress", { percent: 0 });
    video.pause();
    video.controls = false;
    setExportControlsDisabled(true);

    try {

        await seekVideo(start);
        await waitForVideoFrame();

        stream = video.captureStream
            ? video.captureStream()
            : video.mozCaptureStream();

        if (!stream.getVideoTracks().length) {

            throw new Error(translate("creator.clipNoVideoTrack"));

        }

        if (selectedFile && window.Mediabunny) {

            const sourceInput = new Mediabunny.Input({
                formats: Mediabunny.ALL_FORMATS,
                source: new Mediabunny.BlobSource(selectedFile)
            });

            if (
                await sourceInput.getPrimaryAudioTrack() &&
                !stream.getAudioTracks().length
            ) {

                cleanupAudioCapture =
                    await attachAudioCaptureFallback(stream);

            }

        }

        recorder = new MediaRecorder(stream, options);

        if (!(recorder.mimeType || "").toLowerCase().startsWith("video/mp4")) {

            throw new Error(translate("creator.clipMp4Unsupported"));

        }

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
                        new Error(translate("creator.clipRecordError"))
                    ),
                    { once: true }
                );

                recorder.addEventListener(
                    "stop",
                    () => {

                        if (!chunks.length) {

                            reject(new Error(translate("creator.clipEmpty")));

                            return;

                        }

                        resolve(
                            new Blob(
                                chunks,
                                { type: recorder.mimeType }
                            )
                        );

                    },
                    { once: true }
                );

            }
        );

        playbackFinished = new Promise(
            (resolve, reject) => {

                const cleanup = () => {

                    clearInterval(progressTimer);
                    video.removeEventListener("timeupdate", updateProgress);
                    video.removeEventListener("ended", updateProgress);
                    video.removeEventListener("pause", onPause);

                };

                cleanupPlayback = cleanup;

                const stopRecording = () => {

                    if (recorder.state !== "inactive") {

                        recorder.stop();

                    }

                };

                const finishAtEnd = () => {

                    if (video.currentTime < end && !video.ended) {

                        return;

                    }

                    stopAtEnd = true;
                    video.pause();
                    cleanup();
                    stopRecording();
                    resolve();

                };

                const updateProgress = () => {

                    const percent = Math.min(
                        99,
                        Math.max(
                            0,
                            Math.floor((video.currentTime - start) /
                                selectedDuration * 100)
                        )
                    );

                    exportProgressBar.value = percent;
                    exportProgressLabel.textContent =
                        translate("creator.clipProgress", { percent });

                    finishAtEnd();

                };

                const onPause = () => {

                    if (
                        !stopAtEnd &&
                        recorder.state === "recording" &&
                        video.currentTime < end
                    ) {

                        cleanup();
                        stopRecording();
                        reject(new Error(translate("creator.clipInterrupted")));

                    }

                };

                video.addEventListener("timeupdate", updateProgress);
                video.addEventListener("ended", updateProgress);
                video.addEventListener("pause", onPause);
                progressTimer = window.setInterval(updateProgress, 100);

            }
        );

        recorder.start(1000);
        recordingStarted = true;
        setCreatorStatus("creator.clipRecording");
        await video.play();

        await Promise.race([
            playbackFinished,
            recordingFinished.then(() => playbackFinished)
        ]);

        const recordedBlob = await recordingFinished;
        chunks = [];

        if (!recordedBlob.type.toLowerCase().includes("video/mp4")) {

            throw new Error(translate("creator.clipMp4Unsupported"));

        }

        exportProgressBar.value = 90;
        exportProgressLabel.textContent =
            translate("creator.remuxProgress", { percent: 90 });
        const clipBlob = await remuxClipToMp4(recordedBlob);

        if (!clipBlob.type.toLowerCase().includes("video/mp4")) {

            throw new Error(translate("creator.remuxInvalidOutput"));

        }

        const clipUrl = URL.createObjectURL(clipBlob);
        const download = document.createElement("a");
        download.href = clipUrl;
        download.download = `${fileBaseName}-clip.mp4`;
        download.click();

        setTimeout(
            () => URL.revokeObjectURL(clipUrl),
            60000
        );

        exportProgressBar.value = 100;
        exportProgressLabel.textContent =
            translate("creator.clipProgressDone");
        setCreatorStatus("creator.clipReady");

    } catch (error) {

        stopAtEnd = true;
        cleanupPlayback();
        video.pause();

        if (recorder && recorder.state !== "inactive") {

            recorder.stop();

        }

        if (recordingStarted && recordingFinished) {

            await recordingFinished.catch(() => {});

        }

        setCreatorStatus(
            "creator.clipError",
            {
                error: error instanceof Error
                    ? error.message
                    : translate("creator.clipUnknownError")
            }
        );

    } finally {

        cleanupPlayback();
        clearInterval(progressTimer);

        if (stream) {

            stream.getTracks().forEach(track => track.stop());

        }

        cleanupAudioCapture();
        exportProgressOverlay.hidden = true;
        chunks = [];
        video.controls = originalControls;

        try {

            await seekVideo(originalTime);

        } catch (error) {

            setCreatorStatus(
                "creator.clipRestoreError",
                {
                    error: error instanceof Error
                        ? error.message
                        : translate("creator.clipUnknownError")
                }
            );

        }

        if (wasPlaying) {

            try {

                await video.play();

            } catch (error) {

                setCreatorStatus(
                    "creator.clipResumeError",
                    {
                        error: error instanceof Error
                            ? error.message
                            : translate("creator.clipUnknownError")
                    }
                );

            }

        }

        setExportControlsDisabled(false);

    }

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

        videoUrl = URL.createObjectURL(file);
        selectedFile = file;
        video.src = videoUrl;
        video.load();
        fileName.textContent = file.name;
        setCreatorStatus("");
        videoInput.value = "";

    }
);


video.addEventListener("loadedmetadata", enableEditor);
video.addEventListener("loadedmetadata", updatePlayhead);
video.addEventListener("timeupdate", () => {
    if (activePreview && video.currentTime >= activePreview.end) {
        stopPreview();
        return;
    }

    updatePlayhead();
});
video.addEventListener("seeked", updatePlayhead);
video.addEventListener("seeking", updatePlayhead);
video.addEventListener("playing", startPlayheadAnimation);
video.addEventListener("ended", () => {
    if (activePreview) {
        stopPreview();
    }
});
video.addEventListener("pause", () => {
    if (activePreview) {
        stopPreview(false);
    } else {
        updatePlayhead();
    }
});

previewGifButton.addEventListener("click", () => {
    previewTrim(previewGifButton);
});

previewClipButton.addEventListener("click", () => {
    previewTrim(previewClipButton);
});

createGifButton.addEventListener(
    "click",
    () => {

        if (!gifSelectionPrepared) {

            prepareGifSelection();

            return;

        }

        createGif();

    }
);


createClipButton.addEventListener(
    "click",
    createClip
);


startSlider.addEventListener(
    "input",
    () => {

    if (activePreview) {
        stopPreview();
    }

    if (gifSelectionPrepared) {
        constrainGifSelectionHandle("start");
    } else {
        gifSelectionPrepared = false;
        previousGifSelection = null;
        cancelGifSelectionButton.hidden = true;
        updatePreviewVisibility();
        updateGifButtonLabel();
        keepMarkersApart("start");
    }
    updateTrimDisplay();
    previewTrimBoundary(
            video.duration * Number(startSlider.value) / TIMELINE_RANGE,
            false
        );

    }
);


endSlider.addEventListener(
    "input",
    () => {

        if (activePreview) {
            stopPreview();
        }

        if (gifSelectionPrepared) {
            constrainGifSelectionHandle("end");
        } else {
            gifSelectionPrepared = false;
            previousGifSelection = null;
            cancelGifSelectionButton.hidden = true;
            updatePreviewVisibility();
            updateGifButtonLabel();
            keepMarkersApart("end");
        }
        updateTrimDisplay();
        previewTrimBoundary(
            video.duration * Number(endSlider.value) / TIMELINE_RANGE,
            true
        );

    }
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
        scheduleFilmstripUpdate();

    }
);


captureButton.addEventListener(
    "click",
    () => {

        if (!video.videoWidth || !video.videoHeight) {

            setCreatorStatus("creator.waitVideo");

            return;

        }

        const canvas = document.createElement("canvas");

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext("2d");

        if (!context) {

            setCreatorStatus("creator.captureError");

            return;

        }

        context.drawImage(
            video,
            0,
            0,
            canvas.width,
            canvas.height
        );

        canvas.toBlob(
            blob => {

                if (!blob) {

                    setCreatorStatus("creator.captureEncodeError");

                    return;

                }

                const imageUrl = URL.createObjectURL(blob);
                const download = document.createElement("a");

                download.href = imageUrl;
                download.download = "print-do-video.png";
                download.click();

                setTimeout(
                    () => URL.revokeObjectURL(imageUrl),
                    1000
                );

                setCreatorStatus("creator.captureDone");

            },
            "image/png"
        );

    }
);
