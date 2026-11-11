const videoInput = document.getElementById("randomVideoInput");
const chooseVideosButton = document.getElementById("chooseRandomVideos");
const settingsButton = document.getElementById("randomPlayerSettingsButton");
const settingsMenu = document.getElementById("randomPlayerSettingsMenu");
const previewSizeInput = document.getElementById("randomPlayerPreviewSize");
const previewSizeValue = document.getElementById("randomPlayerPreviewSizeValue");
const durationInput = document.getElementById("randomVideoDuration");
const randomStartInput = document.getElementById("randomVideoStartRandom");
const fadeInput = document.getElementById("randomVideoFade");
const transitionModeInput = document.getElementById("randomVideoTransitionMode");
const fadeDurationInput = document.getElementById("randomVideoFadeDuration");
const fadeDurationValue = document.getElementById("randomVideoFadeDurationValue");
const preview = document.getElementById("randomPlayerPreview");
let video = document.getElementById("randomPlayerVideo");
let nextVideo = document.getElementById("randomPlayerNextVideo");
const emptyState = document.getElementById("randomPlayerEmptyState");
const volumeInput = document.getElementById("randomPlayerVolume");
const volumeValue = document.getElementById("randomPlayerVolumeValue");
const status = document.getElementById("randomPlayerStatus");

const DEFAULT_DWELL_SECONDS = 30;

let selectedVideos = [];
let currentVideoIndex = -1;
let playbackToken = 0;
let dwellTimer = 0;
let timerStartedAt = 0;
let remainingMs = DEFAULT_DWELL_SECONDS * 1000;
let statusKey = "randomPlayer.statusEmpty";
let statusValues = {};
let isSwitchingVideo = false;
let lastValidDuration = DEFAULT_DWELL_SECONDS;


function text(key, values = {}) {

    return window.languageText(key, values);

}


function setStatus(key, values = {}) {

    statusKey = key;
    statusValues = values;
    status.textContent = text(key, values);

}


function getDwellDurationMs() {

    const seconds = Number(durationInput.value);

    if (
        !Number.isInteger(seconds) ||
        seconds < Number(durationInput.min) ||
        seconds > Number(durationInput.max)
    ) {

        durationInput.setCustomValidity(text("randomPlayer.invalidDuration"));
        durationInput.reportValidity();
        durationInput.value = String(lastValidDuration);
        setStatus("randomPlayer.invalidDuration");

        return null;

    }

    durationInput.setCustomValidity("");
    lastValidDuration = seconds;

    return seconds * 1000;

}


function clearDwellTimer(preserveRemaining) {

    if (dwellTimer) {

        window.clearTimeout(dwellTimer);
        dwellTimer = 0;

    }

    if (preserveRemaining && timerStartedAt) {

        remainingMs = Math.max(
            0,
            remainingMs - (performance.now() - timerStartedAt)
        );

    }

    timerStartedAt = 0;

}


function scheduleDwellTimer() {

    clearDwellTimer(false);

    if (video.paused || video.ended || currentVideoIndex < 0) {

        return;

    }

    timerStartedAt = performance.now();
    dwellTimer = window.setTimeout(
        () => {

            dwellTimer = 0;
            timerStartedAt = 0;
            selectNextVideo();

        },
        Math.max(0, remainingMs)
    );

}


function chooseNextIndex() {

    if (selectedVideos.length <= 1) {

        return 0;

    }

    let nextIndex = Math.floor(Math.random() * selectedVideos.length);

    while (nextIndex === currentVideoIndex) {

        nextIndex = Math.floor(Math.random() * selectedVideos.length);

    }

    return nextIndex;

}


async function startCurrentVideo(player, token, nextIndex) {

    if (token !== playbackToken) {

        return;

    }

    if (!Number.isFinite(player.duration)) {

        finishVideoFade(player, token);
        setStatus("randomPlayer.videoError");
        resumeCurrentVideo(token);

        return;

    }

    if (randomStartInput.checked && player.duration > 0) {

        const randomTime = Math.random() * player.duration;

        if (randomTime > 0) {

            try {

                await new Promise(
                (resolve, reject) => {

                    const onSeeked = () => {

                        cleanup();
                        resolve();

                    };
                    const onError = () => {

                        cleanup();
                        reject(new Error(text("randomPlayer.seekError")));

                    };
                    const cleanup = () => {

                        player.removeEventListener("seeked", onSeeked);
                        player.removeEventListener("error", onError);

                    };

                    player.addEventListener("seeked", onSeeked, { once: true });
                    player.addEventListener("error", onError, { once: true });
                    player.currentTime = randomTime;

                }
                );

            } catch (error) {

                if (token === playbackToken) {

                    console.warn("Could not seek to a random video position.", error);
                    setStatus("randomPlayer.seekError");
                    finishVideoFade(player, token);
                    resumeCurrentVideo(token);

                }

                return;

            }

        }

    }

    if (token !== playbackToken) {

        return;

    }

    const useTransition =
        fadeInput.checked &&
        Boolean(video.currentSrc) &&
        currentVideoIndex !== nextIndex;

    try {

        player.volume = useTransition
            ? 0
            : Number(volumeInput.value);
        await player.play();

    } catch (error) {

        if (token !== playbackToken) {

            return;

        }

        console.warn("Could not start the selected video automatically.", error);
        setStatus("randomPlayer.playError");
        resumeCurrentVideo(token);
        return;

    }

    if (token !== playbackToken) {

        player.pause();

        return;

    }

    await transitionToVideo(player, video, token, useTransition);
    if (token !== playbackToken) {

        return;

    }

    currentVideoIndex = nextIndex;
    remainingMs = Number(durationInput.value) * 1000;
    isSwitchingVideo = false;
    scheduleDwellTimer();
    setStatus("randomPlayer.playing", {
        seconds: Math.ceil(remainingMs / 1000)
    });

}


function finishVideoFade(player, token) {

    if (token === playbackToken) {

        player.classList.remove("is-fading-in", "is-fading-out");

    }

}


function resumeCurrentVideo(token) {

    if (token !== playbackToken) {

        return;

    }

    isSwitchingVideo = false;

    if (!video.paused) {

        remainingMs = Number(durationInput.value) * 1000;
        scheduleDwellTimer();

    }

}


function waitForTransition(durationMs) {

    return new Promise(resolve => {

        window.setTimeout(resolve, durationMs);

    });


}


async function transitionToVideo(incomingVideo, outgoingVideo, token, useTransition) {

    const hasOutgoingVideo = Boolean(outgoingVideo.currentSrc);
    const durationMs = useTransition
        ? Number(fadeDurationInput.value) * 1000
        : 0;

    preview.classList.add("has-video");
    emptyState.hidden = true;

    if (!hasOutgoingVideo || durationMs === 0) {

        outgoingVideo.pause();
        outgoingVideo.classList.remove("is-active", "is-fading-in", "is-fading-out");
        incomingVideo.classList.add("is-active");

    } else {

        const isCrossfade = transitionModeInput.value === "crossfade";

        if (!isCrossfade) {

            outgoingVideo.classList.add("is-fading-out");
            await waitForTransition(durationMs);

            if (token !== playbackToken) {

                incomingVideo.pause();

                return;

            }

        }

        outgoingVideo.pause();
        incomingVideo.classList.add("is-active");
        outgoingVideo.classList.remove("is-active");
        incomingVideo.classList.add("is-fading-in");

        if (isCrossfade) {

            outgoingVideo.classList.add("is-fading-out");

            await Promise.all([
                waitForTransition(durationMs),
                transitionAudio(outgoingVideo, incomingVideo, durationMs)
            ]);

        } else {

            incomingVideo.volume = Number(volumeInput.value);
            await waitForTransition(durationMs);

        }

        if (token !== playbackToken) {

            incomingVideo.pause();

            return;

        }

    }

    outgoingVideo.controls = false;
    outgoingVideo.classList.remove("is-active", "is-fading-in", "is-fading-out");
    incomingVideo.controls = true;
    incomingVideo.classList.remove("is-fading-in", "is-fading-out");
    incomingVideo.classList.add("is-active");
    video = incomingVideo;
    nextVideo = outgoingVideo;

}


function transitionAudio(outgoingVideo, incomingVideo, durationMs) {

    const startTime = performance.now();
    const outgoingVolume = outgoingVideo.volume;
    const incomingVolume = Number(volumeInput.value);

    return new Promise(resolve => {

        const update = now => {

            const progress = Math.max(
                0,
                Math.min(1, (now - startTime) / durationMs)
            );

            outgoingVideo.volume = Math.max(
                0,
                Math.min(1, outgoingVolume * (1 - progress))
            );
            incomingVideo.volume = Math.max(
                0,
                Math.min(1, incomingVolume * progress)
            );

            if (progress < 1) {

                window.requestAnimationFrame(update);

                return;

            }

            resolve();

        };

        window.requestAnimationFrame(update);

    });

}


function updateFadeDuration() {

    const duration = Number(fadeDurationInput.value);

    fadeDurationValue.value = `${duration.toLocaleString()} s`;
    fadeDurationValue.textContent = fadeDurationValue.value;
    preview.style.setProperty(
        "--random-player-fade-duration",
        `${duration * 1000}ms`
    );

}


function updatePreviewSize() {

    const height = Number(previewSizeInput.value);

    preview.style.setProperty(
        "--random-player-preview-height",
        `${height}px`
    );
    previewSizeValue.value = `${height} px`;
    previewSizeValue.textContent = previewSizeValue.value;

}


async function selectNextVideo() {

    if (!selectedVideos.length) {

        return;

    }

    const durationMs = getDwellDurationMs();

    if (durationMs === null) {

        video.pause();

        return;

    }

    clearDwellTimer(false);
    remainingMs = durationMs;
    playbackToken++;
    const token = playbackToken;
    const nextIndex = chooseNextIndex();
    const item = selectedVideos[nextIndex];
    const targetVideo = nextVideo;

    isSwitchingVideo = true;

    targetVideo.pause();
    targetVideo.removeAttribute("src");
    targetVideo.load();
    targetVideo.controls = false;
    targetVideo.classList.remove("is-active", "is-fading-in", "is-fading-out");
    setStatus("randomPlayer.loading");

    const onMetadata = () => startCurrentVideo(targetVideo, token, nextIndex);
    const onError = () => {

        if (token === playbackToken && targetVideo === nextVideo) {

            setStatus("randomPlayer.videoError");
            resumeCurrentVideo(token);

        }

    };

    targetVideo.addEventListener(
        "loadedmetadata",
        onMetadata,
        { once: true }
    );
    targetVideo.addEventListener("error", onError, { once: true });
    targetVideo.src = item.url;
    targetVideo.load();

}


function replaceSelectedVideos(files) {

    clearDwellTimer(false);
    isSwitchingVideo = true;
    video.pause();
    nextVideo.pause();
    playbackToken++;
    video.removeAttribute("src");
    video.load();
    nextVideo.removeAttribute("src");
    nextVideo.load();
    video.controls = true;
    nextVideo.controls = false;
    video.classList.add("is-active");
    video.classList.remove("is-fading-in", "is-fading-out");
    nextVideo.classList.remove("is-active", "is-fading-in", "is-fading-out");

    for (const item of selectedVideos) {

        URL.revokeObjectURL(item.url);

    }

    selectedVideos = files.map(
        file => ({
            file,
            url: URL.createObjectURL(file)
        })
    );
    currentVideoIndex = -1;
    preview.classList.remove("has-video");
    emptyState.hidden = false;
    remainingMs = DEFAULT_DWELL_SECONDS * 1000;

    if (selectedVideos.length) {

        selectNextVideo();

    } else {

        setStatus("randomPlayer.statusEmpty");

    }

}


chooseVideosButton.addEventListener(
    "click",
    () => videoInput.click()
);


videoInput.addEventListener(
    "change",
    () => {

        const files = Array.from(videoInput.files)
            .filter(file => file.type.startsWith("video/"));

        videoInput.value = "";

        if (!files.length) {

            setStatus("randomPlayer.noValidVideos");

            return;

        }

        replaceSelectedVideos(files);

    }
);


function attachVideoEvents(player) {

    player.addEventListener(
        "play",
        () => {

            if (player !== video || isSwitchingVideo) {

                return;

            }

            if (!timerStartedAt) {

                scheduleDwellTimer();

            }

            setStatus("randomPlayer.playing", {
                seconds: Math.ceil(remainingMs / 1000)
            });

        }
    );

    player.addEventListener(
        "pause",
        () => {

            if (player !== video || isSwitchingVideo || !player.paused) {

                return;

            }

            clearDwellTimer(true);

            if (currentVideoIndex >= 0 && selectedVideos.length) {

                setStatus("randomPlayer.paused");

            }

        }
    );

    player.addEventListener(
        "error",
        () => {

            if (player === video && currentVideoIndex >= 0 && selectedVideos.length) {

                setStatus("randomPlayer.videoError");

            }

        }
    );

}


attachVideoEvents(video);
attachVideoEvents(nextVideo);

settingsButton.addEventListener(
    "click",
    () => {

        const isOpen =
            settingsButton.getAttribute("aria-expanded") === "true";

        settingsButton.setAttribute("aria-expanded", String(!isOpen));
        settingsMenu.classList.toggle("open", !isOpen);

    }
);


fadeInput.addEventListener(
    "change",
    () => {

        transitionModeInput.disabled = !fadeInput.checked;
        fadeDurationInput.disabled = !fadeInput.checked;

    }
);


fadeDurationInput.addEventListener("input", updateFadeDuration);
previewSizeInput.addEventListener("input", updatePreviewSize);


durationInput.addEventListener(
    "change",
    () => {

        const durationMs = getDwellDurationMs();

        if (durationMs === null) {

            return;

        }

        remainingMs = durationMs;

        if (!video.paused) {

            scheduleDwellTimer();
            setStatus("randomPlayer.playing", {
                seconds: Math.ceil(remainingMs / 1000)
            });

        }

    }
);


randomStartInput.addEventListener(
    "change",
    () => {

        setStatus(
            randomStartInput.checked
                ? "randomPlayer.randomStartEnabled"
                : "randomPlayer.randomStartDisabled"
        );

    }
);


document.addEventListener(
    "click",
    event => {

        if (!event.target.closest(".random-player-settings")) {

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


document.addEventListener(
    "app-language-change",
    () => {

        status.textContent = text(statusKey, statusValues);

    }
);


function updateVolume() {

    const volume = Number(volumeInput.value);

    video.volume = volume;
    nextVideo.volume = volume;
    volumeValue.value = `${Math.round(volume * 100)}%`;
    volumeValue.textContent = volumeValue.value;

}


volumeInput.addEventListener("input", updateVolume);
updateVolume();
updateFadeDuration();
updatePreviewSize();
