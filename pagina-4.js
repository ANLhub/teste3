const videoInput = document.getElementById("rhythmVideoInput");
const chooseVideoButton = document.getElementById("chooseRhythmVideo");
const fileName = document.getElementById("rhythmFileName");
const video = document.getElementById("rhythmVideo");
const preview = document.getElementById("rhythmPreview");
const horizontalTrack = document.getElementById("rhythmHorizontalTrack");
const horizontalCanvas = document.getElementById("rhythmHorizontalCanvas");
const horizontalContext = horizontalCanvas.getContext("2d");
const emptyState = document.getElementById("rhythmEmptyState");
const status = document.getElementById("rhythmStatus");
const settingsButton = document.getElementById("rhythmSettingsButton");
const settingsMenu = document.getElementById("rhythmSettingsMenu");
const helpButton = document.getElementById("rhythmHelpButton");
const helpPopup = document.getElementById("rhythmHelpPopup");
const helpCloseButton = document.getElementById("rhythmHelpClose");
const difficultyLabel = document.getElementById("rhythmDifficultyLabel");
const difficultyDescription = document.getElementById("rhythmDifficultyDescription");
const difficultyButtons =
    Array.from(document.querySelectorAll("[data-difficulty]"));
const colorInputs =
    Array.from(document.querySelectorAll("[data-rhythm-color]"));

const DIFFICULTIES = {
    easy: {
        label: "Easy",
        description: "Slow beats, roomy gaps, and rare doubles.",
        minimumGap: 1.45,
        maximumGap: 2.3,
        minimumTravel: 1.9,
        maximumTravel: 3.1,
        simultaneousChance: 0.08
    },
    normal: {
        label: "Normal",
        description: "A balanced stream with occasional simultaneous beats.",
        minimumGap: 0.85,
        maximumGap: 1.55,
        minimumTravel: 1.35,
        maximumTravel: 2.35,
        simultaneousChance: 0.2
    },
    hard: {
        label: "Hard",
        description: "Quicker beats, shorter gaps, and frequent doubles.",
        minimumGap: 0.48,
        maximumGap: 1.05,
        minimumTravel: 0.9,
        maximumTravel: 1.75,
        simultaneousChance: 0.34
    },
    expert: {
        label: "Expert",
        description: "Fast, dense patterns with regular multi-lane bursts.",
        minimumGap: 0.3,
        maximumGap: 0.78,
        minimumTravel: 0.62,
        maximumTravel: 1.35,
        simultaneousChance: 0.48
    }
};

const RHYTHM_COLORS = [
    { id: "pink", label: "Pink", color: "#ff68b4" },
    { id: "blue", label: "Blue", color: "#65e8ff" },
    { id: "orange", label: "Orange", color: "#ffc268" },
    { id: "purple", label: "Purple", color: "#ad8aff" }
];
const MAX_GENERATED_NOTES = 20000;
const TARGET_GLOW_WINDOW = 0.13;

let videoUrl = "";
let difficulty = "normal";
let chart = [];
let maximumTravelTime = 0;
let animationRequest = 0;
let lastHorizontalCanvasWidth = 0;
let lastHorizontalCanvasHeight = 0;


function getEnabledColors() {

    const selectedIds = new Set(
        colorInputs
            .filter(input => input.checked)
            .map(input => input.dataset.rhythmColor)
    );

    return RHYTHM_COLORS.filter(color => selectedIds.has(color.id));

}


function randomBetween(minimum, maximum) {

    return minimum + Math.random() * (maximum - minimum);

}


function generateChart(duration) {

    if (!Number.isFinite(duration) || duration <= 0) {

        chart = [];
        maximumTravelTime = 0;

        return;

    }

    const settings = DIFFICULTIES[difficulty];
    const notes = [];
    let beatTime = 0;
    let longestTravelTime = 0;
    const enabledColors = getEnabledColors();

    while (beatTime < duration && notes.length < MAX_GENERATED_NOTES) {

        const firstTravelTime = randomBetween(
            settings.minimumTravel,
            settings.maximumTravel
        );

        if (notes.length === 0) {

            beatTime = firstTravelTime + randomBetween(0.25, 0.65);

            if (beatTime >= duration) {

                break;

            }

        }

        let groupSize = 1;

        if (Math.random() < settings.simultaneousChance) {

            groupSize = Math.random() < 0.2 ? 3 : 2;

        }

        groupSize = Math.min(groupSize, enabledColors.length);
        const lanes = Array.from(
            { length: enabledColors.length },
            (_, index) => index
        );

        for (let index = lanes.length - 1; index > 0; index--) {

            const swapIndex = Math.floor(Math.random() * (index + 1));
            [lanes[index], lanes[swapIndex]] =
                [lanes[swapIndex], lanes[index]];

        }

        lanes.length = groupSize;

        for (const lane of lanes) {

            const travelTime =
                notes.length === 0
                    ? firstTravelTime
                    : randomBetween(
                        settings.minimumTravel,
                        settings.maximumTravel
                    );

            notes.push({
                lane,
                hitTime: beatTime,
                travelTime,
                spawnTime: beatTime - travelTime
            });
            longestTravelTime = Math.max(longestTravelTime, travelTime);

        }

        beatTime += randomBetween(settings.minimumGap, settings.maximumGap);

    }

    chart = notes.sort((first, second) => first.spawnTime - second.spawnTime);
    maximumTravelTime = longestTravelTime;

}


function resizeHorizontalCanvas() {

    const bounds = horizontalTrack.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(bounds.width * pixelRatio));
    const height = Math.max(1, Math.round(bounds.height * pixelRatio));

    if (
        width === lastHorizontalCanvasWidth &&
        height === lastHorizontalCanvasHeight
    ) {

        return;

    }

    lastHorizontalCanvasWidth = width;
    lastHorizontalCanvasHeight = height;
    horizontalCanvas.width = width;
    horizontalCanvas.height = height;
    horizontalCanvas.style.width = `${bounds.width}px`;
    horizontalCanvas.style.height = `${bounds.height}px`;

}


function renderHorizontalFrame() {

    resizeHorizontalCanvas();
    const width = horizontalTrack.clientWidth;
    const height = horizontalTrack.clientHeight;
    const colors = getEnabledColors();

    horizontalContext.setTransform(
        horizontalCanvas.width / Math.max(1, width),
        0,
        0,
        horizontalCanvas.height / Math.max(1, height),
        0,
        0
    );
    horizontalContext.clearRect(0, 0, width, height);

    if (!colors.length) {

        return;

    }

    const currentTime = video.currentTime;
    const radius = Math.max(9, Math.min(16, height * 0.2));
    const targetX = radius + 12;
    const targetY = height / 2;
    const firstVisibleIndex = lowerBoundSpawn(currentTime - maximumTravelTime);
    const visibleNotes = [];
    let targetGlow = 0;

    horizontalContext.save();
    horizontalContext.strokeStyle = "rgba(255,255,255,.18)";
    horizontalContext.lineWidth = 2;
    horizontalContext.beginPath();
    horizontalContext.moveTo(8, targetY);
    horizontalContext.lineTo(width - 8, targetY);
    horizontalContext.stroke();

    for (
        let index = firstVisibleIndex;
        index < chart.length && chart[index].spawnTime <= currentTime;
        index++
    ) {

        const note = chart[index];

        if (currentTime > note.hitTime + TARGET_GLOW_WINDOW) {

            continue;

        }

        visibleNotes.push(note);
        targetGlow = Math.max(
            targetGlow,
            1 - Math.abs(currentTime - note.hitTime) / TARGET_GLOW_WINDOW
        );

    }

    horizontalContext.save();
    horizontalContext.strokeStyle = "#ffffff";
    horizontalContext.globalAlpha = 0.6 + targetGlow * 0.4;
    horizontalContext.shadowColor = "#ffffff";
    horizontalContext.shadowBlur = targetGlow > 0 ? 10 + targetGlow * 24 : 3;
    horizontalContext.lineWidth = 3;
    horizontalContext.beginPath();
    horizontalContext.arc(
        targetX,
        targetY,
        radius + targetGlow * 4,
        0,
        Math.PI * 2
    );
    horizontalContext.stroke();
    horizontalContext.restore();

    const startX = width - radius - 8;

    for (const note of visibleNotes) {

        const progress = (currentTime - note.spawnTime) / note.travelTime;

        if (progress < 0 || progress > 1) {

            continue;

        }

        const color = colors[note.lane].color;
        const x = startX + (targetX - startX) * progress;
        const glow = Math.max(
            0,
            1 - Math.abs(currentTime - note.hitTime) / TARGET_GLOW_WINDOW
        );

        horizontalContext.save();
        horizontalContext.fillStyle = color;
        horizontalContext.globalAlpha = 0.9;
        horizontalContext.shadowColor = color;
        horizontalContext.shadowBlur = 8 + glow * 22;
        horizontalContext.beginPath();
        horizontalContext.arc(x, targetY, radius * 0.68, 0, Math.PI * 2);
        horizontalContext.fill();
        horizontalContext.globalAlpha = 0.85;
        horizontalContext.fillStyle = "#ffffff";
        horizontalContext.beginPath();
        horizontalContext.arc(
            x - radius * 0.2,
            targetY - radius * 0.2,
            Math.max(1.5, radius * 0.17),
            0,
            Math.PI * 2
        );
        horizontalContext.fill();
        horizontalContext.restore();

    }

    horizontalContext.restore();

}


function renderFrame() {

    renderHorizontalFrame();

}


function lowerBoundSpawn(time) {

    let low = 0;
    let high = chart.length;

    while (low < high) {

        const middle = Math.floor((low + high) / 2);

        if (chart[middle].spawnTime < time) {

            low = middle + 1;

        } else {

            high = middle;

        }

    }

    return low;

}


function animate() {

    renderFrame();

    if (video.paused || video.ended) {

        animationRequest = 0;

        return;

    }

    animationRequest = requestAnimationFrame(animate);

}


function startAnimation() {

    cancelAnimationFrame(animationRequest);
    renderFrame();
    animationRequest = requestAnimationFrame(animate);

}


function stopAnimation() {

    cancelAnimationFrame(animationRequest);
    animationRequest = 0;
    renderFrame();

}


function setDifficulty(value) {

    if (!DIFFICULTIES[value]) {

        return;

    }

    difficulty = value;
    difficultyLabel.textContent = DIFFICULTIES[value].label;
    difficultyDescription.textContent = DIFFICULTIES[value].description;

    for (const button of difficultyButtons) {

        button.setAttribute(
            "aria-pressed",
            String(button.dataset.difficulty === value)
        );

    }

    if (Number.isFinite(video.duration) && video.duration > 0) {

        generateChart(video.duration);
        status.textContent =
            `${chart.length} beats generated · ${DIFFICULTIES[value].label} difficulty.`;
        renderFrame();

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

        stopAnimation();

        if (videoUrl) {

            URL.revokeObjectURL(videoUrl);

        }

        videoUrl = URL.createObjectURL(file);
        video.src = videoUrl;
        video.load();
        fileName.textContent = file.name;
        status.textContent = "Loading video and generating the beat pattern...";
        chart = [];
        videoInput.value = "";

    }
);


video.addEventListener(
    "loadedmetadata",
    () => {

        preview.classList.add("has-video");
        emptyState.hidden = true;
        generateChart(video.duration);
        renderFrame();
        status.textContent =
            `${chart.length} beats generated · ${DIFFICULTIES[difficulty].label} difficulty. Press Play to start.`;

    }
);


video.addEventListener("play", startAnimation);
video.addEventListener("pause", stopAnimation);
video.addEventListener("ended", stopAnimation);
video.addEventListener("seeked", renderFrame);
video.addEventListener("timeupdate", () => {

    if (video.paused) {

        renderFrame();

    }

});


window.addEventListener("resize", renderFrame);

if ("ResizeObserver" in window) {

    const resizeObserver = new ResizeObserver(renderFrame);
    resizeObserver.observe(horizontalTrack);

}


settingsButton.addEventListener(
    "click",
    () => {

        const isOpen =
            settingsButton.getAttribute("aria-expanded") === "true";

        helpPopup.hidden = true;
        helpPopup.classList.remove("open");
        helpButton.setAttribute("aria-expanded", "false");
        settingsButton.setAttribute("aria-expanded", String(!isOpen));
        settingsMenu.classList.toggle("open", !isOpen);

    }
);


function closeHelpPopup(returnFocus = false) {

    helpPopup.hidden = true;
    helpButton.setAttribute("aria-expanded", "false");

    if (returnFocus) {

        helpButton.focus();

    }

}


helpButton.addEventListener(
    "click",
    () => {

        const isOpen = !helpPopup.hidden;

        settingsMenu.classList.remove("open");
        settingsButton.setAttribute("aria-expanded", "false");
        helpPopup.hidden = isOpen;
        helpPopup.classList.toggle("open", !isOpen);
        helpButton.setAttribute("aria-expanded", String(!isOpen));

    }
);


helpCloseButton.addEventListener(
    "click",
    () => closeHelpPopup(true)
);


for (const button of difficultyButtons) {

    button.addEventListener(
        "click",
        () => {

            setDifficulty(button.dataset.difficulty);
            settingsMenu.classList.remove("open");
            settingsButton.setAttribute("aria-expanded", "false");

        }
    );

}


for (const input of colorInputs) {

    input.addEventListener(
        "change",
        () => {

            if (!getEnabledColors().length) {

                input.checked = true;
                status.textContent = "At least one ball color must remain enabled.";

                return;

            }

            if (Number.isFinite(video.duration) && video.duration > 0) {

                generateChart(video.duration);
                status.textContent =
                    `${chart.length} beats generated · ${DIFFICULTIES[difficulty].label} difficulty.`;

            }

            renderFrame();

        }
    );

}


document.addEventListener(
    "click",
    event => {

        if (!event.target.closest(".rhythm-settings-selector")) {

            settingsMenu.classList.remove("open");
            settingsButton.setAttribute("aria-expanded", "false");

        }

        if (!event.target.closest(".rhythm-help-selector")) {

            closeHelpPopup();

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

        if (event.key === "Escape" && !helpPopup.hidden) {

            closeHelpPopup(true);

        }

    }
);
