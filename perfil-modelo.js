(() => {

    const DATABASE_NAME = "video-studio-models";
    const DATABASE_VERSION = 2;
    const STORE_NAME = "models";
    const GALLERY_CONFIRM_DELETE_KEY = "video-studio-model-gallery-confirm-delete";
    const status = document.getElementById("profileStatus");
    const profile = document.getElementById("modelProfile");
    const image = document.getElementById("profilePhoto");
    const imageFrame = image.closest(".profile-photo-frame");
    const imagePlaceholder = document.getElementById("profilePhotoPlaceholder");
    const name = document.getElementById("profileName");
    const alternateNames = document.getElementById("profileAlternateNames");
    const description = document.getElementById("profileDescription");
    const tagsSection = document.getElementById("profileTagsSection");
    const tagsContainer = document.getElementById("profileTags");
    const gallerySection = document.getElementById("profileGallerySection");
    const galleryInput = document.getElementById("profileGalleryInput");
    const addGalleryPhotosButton = document.getElementById("addProfileGalleryPhotos");
    const gallerySettingsButton = document.getElementById("profileGallerySettingsButton");
    const gallerySettings = document.getElementById("profileGallerySettings");
    const confirmGalleryDeleteInput = document.getElementById("confirmProfileGalleryDelete");
    const galleryStatus = document.getElementById("profileGalleryStatus");
    const galleryEmpty = document.getElementById("profileGalleryEmpty");
    const galleryContainer = document.getElementById("profileGallery");
    const galleryViewer = document.getElementById("profileGalleryViewer");
    const galleryViewerContent = document.querySelector(".profile-gallery-viewer-content");
    const galleryViewerPhoto = document.getElementById("profileGalleryViewerPhoto");
    const galleryViewerPosition = document.getElementById("profileGalleryViewerPosition");
    const closeGalleryViewerButton = document.getElementById("closeProfileGalleryViewer");
    const previousGalleryPhotoButton = document.getElementById("previousProfileGalleryPhoto");
    const nextGalleryPhotoButton = document.getElementById("nextProfileGalleryPhoto");
    const deleteGalleryPhotoButton = document.getElementById("deleteProfileGalleryPhoto");
    const zoomGalleryPhotoButton = document.getElementById("zoomProfileGalleryPhoto");
    const galleryZoomIntensity = document.getElementById("profileGalleryZoomIntensity");
    const linksContainer = document.getElementById("profileLinks");
    const emptyLinks = document.getElementById("profileLinksEmpty");
    const editButton = document.getElementById("editModelButton");
    const editDialog = document.getElementById("profileEditDialog");
    const editForm = document.getElementById("profileEditForm");
    const editName = document.getElementById("profileEditName");
    const editAlternateNames = document.getElementById("profileEditAlternateNames");
    const editDescription = document.getElementById("profileEditDescription");
    const editTags = document.getElementById("profileEditTags");
    const editLinks = document.getElementById("profileEditLinks");
    const editPhoto = document.getElementById("profileEditPhoto");
    const editCategory = document.getElementById("profileEditCategory");
    const editRarity = document.getElementById("profileEditRarity");
    const editStatus = document.getElementById("profileEditStatus");
    const saveButton = document.getElementById("saveProfileEdit");
    let currentModel;
    let photoUrl;
    let galleryUrls = [];
    let currentGalleryIndex = -1;
    let galleryDrag = null;
    let confirmGalleryDeletion = true;
    let loadedModelName = "";

    try {
        confirmGalleryDeletion = localStorage.getItem(GALLERY_CONFIRM_DELETE_KEY) !== "false";
    } catch (error) {
        console.error("Could not read the gallery deletion preference.", error);
        setGalleryStatus(window.languageText("profile.gallerySettingsError"), true);
    }
    confirmGalleryDeleteInput.checked = confirmGalleryDeletion;

    const photoCropObserver = "ResizeObserver" in window
        ? new ResizeObserver(() => {
            if (currentModel && image.naturalWidth) {
                window.ModelPhotoUtils.applyCrop(image, imageFrame, currentModel.photoCrop);
            }
        })
        : null;
    if (photoCropObserver) {
        photoCropObserver.observe(imageFrame);
    }

    image.addEventListener("load", () => {
        if (currentModel) {
            window.ModelPhotoUtils.applyCrop(image, imageFrame, currentModel.photoCrop);
        }
    });

    function updatePageTitle() {

        document.title = loadedModelName
            ? `${loadedModelName} | ${window.languageText("title.profile")}`
            : window.languageText("title.profile");

    }

    function showStatus(message) {

        status.textContent = message;
        status.hidden = false;

    }

    function openDatabase() {

        return new Promise((resolve, reject) => {

            if (!("indexedDB" in window)) {
                reject(new Error("IndexedDB is not supported."));
                return;
            }

            const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
            request.onupgradeneeded = () => {
                if (!request.result.objectStoreNames.contains(STORE_NAME)) {
                    const store = request.result.createObjectStore(STORE_NAME, {
                        keyPath: "id"
                    });
                    store.createIndex("category", "category");
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
            request.onblocked = () => reject(new Error("The model database upgrade was blocked."));

        });

    }

    function getModel(database, id) {

        return new Promise((resolve, reject) => {

            const transaction = database.transaction(STORE_NAME, "readonly");
            const request = transaction.objectStore(STORE_NAME).get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
            transaction.onabort = () => reject(transaction.error);

        });

    }

    function saveModel(database, model) {

        return new Promise((resolve, reject) => {

            const transaction = database.transaction(STORE_NAME, "readwrite");
            transaction.objectStore(STORE_NAME).put(model);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);

        });

    }

    function setEditStatus(message, isError = true) {

        editStatus.textContent = message;
        editStatus.classList.toggle("is-error", isError);
        editStatus.hidden = !message;

    }

    function setGalleryStatus(message, isError = false) {

        galleryStatus.textContent = message;
        galleryStatus.classList.toggle("is-error", isError);
        galleryStatus.hidden = !message;

    }

    function updateGalleryViewer() {

        const photos = Array.isArray(currentModel.customGallery)
            ? currentModel.customGallery
            : [];
        if (currentGalleryIndex < 0 || currentGalleryIndex >= photos.length) {
            galleryViewer.close();
            currentGalleryIndex = -1;
            return;
        }

        galleryViewerPhoto.src = galleryUrls[currentGalleryIndex];
        galleryViewerPhoto.alt = `${currentModel.name} — ${currentGalleryIndex + 1}`;
        galleryViewerPhoto.classList.remove("is-zoomed");
        galleryViewerContent.classList.remove("is-zoomed");
        galleryViewerPhoto.style.removeProperty("--gallery-pan-x");
        galleryViewerPhoto.style.removeProperty("--gallery-pan-y");
        galleryViewerPhoto.style.setProperty("--gallery-zoom-scale", "1.5");
        galleryDrag = null;
        galleryZoomIntensity.value = "1.5";
        galleryZoomIntensity.disabled = true;
        zoomGalleryPhotoButton.classList.remove("is-zoomed");
        zoomGalleryPhotoButton.setAttribute("aria-pressed", "false");
        zoomGalleryPhotoButton.setAttribute(
            "aria-label",
            window.languageText("profile.galleryZoomIn")
        );
        zoomGalleryPhotoButton.title = window.languageText("profile.galleryZoomIn");
        galleryViewerPosition.textContent = `${currentGalleryIndex + 1} / ${photos.length}`;
        const navigationDisabled = photos.length < 2;
        previousGalleryPhotoButton.disabled = navigationDisabled;
        nextGalleryPhotoButton.disabled = navigationDisabled;

    }

    function openGalleryPhoto(index) {

        currentGalleryIndex = index;
        updateGalleryViewer();
        if (!galleryViewer.open) {
            galleryViewer.showModal();
            document.body.classList.add("is-gallery-viewer-open");
            window.getSelection()?.removeAllRanges();
        }

    }

    function renderGallery() {

        galleryUrls.forEach(url => URL.revokeObjectURL(url));
        galleryUrls = [];
        galleryContainer.replaceChildren();

        const photos = Array.isArray(currentModel.customGallery)
            ? currentModel.customGallery
            : [];
        photos.forEach((photo, index) => {
            if (!(photo instanceof Blob) || !photo.type.startsWith("image/")) {
                throw new Error("The saved custom gallery contains an invalid image.");
            }

            const photoUrl = URL.createObjectURL(photo);
            galleryUrls.push(photoUrl);
            const figure = document.createElement("figure");
            figure.className = "profile-gallery-item";

            const openButton = document.createElement("button");
            openButton.className = "profile-gallery-open";
            openButton.type = "button";
            openButton.setAttribute("aria-label", `${currentModel.name} — ${index + 1}`);
            openButton.addEventListener("click", () => openGalleryPhoto(index));

            const thumbnail = document.createElement("img");
            thumbnail.src = photoUrl;
            thumbnail.alt = `${currentModel.name} — ${index + 1}`;
            thumbnail.loading = "lazy";
            openButton.append(thumbnail);
            figure.append(openButton);
            galleryContainer.append(figure);
        });

        galleryEmpty.hidden = photos.length > 0;
        gallerySection.hidden = false;

    }

    async function saveGallery(nextPhotos) {

        let database;
        try {
            database = await openDatabase();
            const updatedModel = { ...currentModel, customGallery: nextPhotos };
            await saveModel(database, updatedModel);
            currentModel = updatedModel;
            renderGallery();
            return true;
        } finally {
            if (database) {
                database.close();
            }
        }

    }

    async function removeGalleryPhoto(index, button) {

        if (!currentModel || !Array.isArray(currentModel.customGallery)) {
            return;
        }

        if (
            confirmGalleryDeletion &&
            !window.confirm(window.languageText("profile.galleryConfirmDeletePrompt"))
        ) {
            return;
        }

        button.disabled = true;
        setGalleryStatus("");
        const nextPhotos = currentModel.customGallery.filter((photo, photoIndex) => photoIndex !== index);
        try {
            await saveGallery(nextPhotos);
            if (nextPhotos.length) {
                currentGalleryIndex = Math.min(index, nextPhotos.length - 1);
                updateGalleryViewer();
            } else {
                galleryViewer.close();
                currentGalleryIndex = -1;
            }
        } catch (error) {
            console.error("Could not remove a custom gallery photo.", error);
            setGalleryStatus(window.languageText("profile.galleryError"), true);
        } finally {
            button.disabled = false;
        }

    }

    function moveGalleryViewer(direction) {

        const photos = Array.isArray(currentModel.customGallery)
            ? currentModel.customGallery
            : [];
        if (photos.length < 2) {
            return;
        }

        currentGalleryIndex = (
            currentGalleryIndex + direction + photos.length
        ) % photos.length;
        updateGalleryViewer();

    }

    function toggleGalleryZoom() {

        const isZoomed = galleryViewerPhoto.classList.toggle("is-zoomed");
        galleryViewerContent.classList.toggle("is-zoomed", isZoomed);
        galleryZoomIntensity.disabled = !isZoomed;
        galleryViewerPhoto.style.setProperty(
            "--gallery-zoom-scale",
            galleryZoomIntensity.value
        );
        if (!isZoomed) {
            galleryViewerPhoto.style.removeProperty("--gallery-pan-x");
            galleryViewerPhoto.style.removeProperty("--gallery-pan-y");
            galleryDrag = null;
        }
        zoomGalleryPhotoButton.classList.toggle("is-zoomed", isZoomed);
        const label = window.languageText(
            isZoomed ? "profile.galleryZoomOut" : "profile.galleryZoomIn"
        );
        zoomGalleryPhotoButton.setAttribute("aria-pressed", String(isZoomed));
        zoomGalleryPhotoButton.setAttribute("aria-label", label);
        zoomGalleryPhotoButton.title = label;

    }

    function startGalleryPhotoDrag(event) {

        if (!galleryViewerPhoto.classList.contains("is-zoomed") || event.button !== 0) {
            return;
        }

        event.preventDefault();
        galleryDrag = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            panX: Number.parseFloat(galleryViewerPhoto.style.getPropertyValue("--gallery-pan-x")) || 0,
            panY: Number.parseFloat(galleryViewerPhoto.style.getPropertyValue("--gallery-pan-y")) || 0
        };
        galleryViewerPhoto.classList.add("is-dragging");
        galleryViewerPhoto.setPointerCapture(event.pointerId);

    }

    function moveGalleryPhoto(event) {

        if (!galleryDrag || event.pointerId !== galleryDrag.pointerId) {
            return;
        }

        event.preventDefault();
        const scale = Number(galleryZoomIntensity.value);
        const maxPanX = galleryViewerPhoto.offsetWidth * (scale - 1) / 2;
        const maxPanY = galleryViewerPhoto.offsetHeight * (scale - 1) / 2;
        const panX = galleryDrag.panX + event.clientX - galleryDrag.startX;
        const panY = galleryDrag.panY + event.clientY - galleryDrag.startY;
        galleryViewerPhoto.style.setProperty(
            "--gallery-pan-x",
            `${Math.max(-maxPanX, Math.min(maxPanX, panX))}px`
        );
        galleryViewerPhoto.style.setProperty(
            "--gallery-pan-y",
            `${Math.max(-maxPanY, Math.min(maxPanY, panY))}px`
        );

    }

    function updateGalleryZoomIntensity() {

        const scale = Number(galleryZoomIntensity.value);
        galleryViewerPhoto.style.setProperty("--gallery-zoom-scale", String(scale));
        if (!galleryViewerPhoto.classList.contains("is-zoomed")) {
            return;
        }

        const maxPanX = galleryViewerPhoto.offsetWidth * (scale - 1) / 2;
        const maxPanY = galleryViewerPhoto.offsetHeight * (scale - 1) / 2;
        const panX = Number.parseFloat(galleryViewerPhoto.style.getPropertyValue("--gallery-pan-x")) || 0;
        const panY = Number.parseFloat(galleryViewerPhoto.style.getPropertyValue("--gallery-pan-y")) || 0;
        galleryViewerPhoto.style.setProperty(
            "--gallery-pan-x",
            `${Math.max(-maxPanX, Math.min(maxPanX, panX))}px`
        );
        galleryViewerPhoto.style.setProperty(
            "--gallery-pan-y",
            `${Math.max(-maxPanY, Math.min(maxPanY, panY))}px`
        );

    }

    function setConfirmGalleryDeletion(checked) {

        const previousValue = confirmGalleryDeletion;
        confirmGalleryDeletion = checked;
        try {
            localStorage.setItem(GALLERY_CONFIRM_DELETE_KEY, String(checked));
            setGalleryStatus("");
        } catch (error) {
            console.error("Could not save the gallery deletion preference.", error);
            confirmGalleryDeletion = previousValue;
            confirmGalleryDeleteInput.checked = previousValue;
            setGalleryStatus(window.languageText("profile.gallerySettingsError"), true);
        }

    }

    function finishGalleryPhotoDrag(event) {

        if (!galleryDrag || event.pointerId !== galleryDrag.pointerId) {
            return;
        }

        galleryDrag = null;
        galleryViewerPhoto.classList.remove("is-dragging");
        if (galleryViewerPhoto.hasPointerCapture(event.pointerId)) {
            galleryViewerPhoto.releasePointerCapture(event.pointerId);
        }

    }

    function createEditLinkRow(link = {}) {

        const row = document.createElement("div");
        row.className = "model-link-row";

        const labelInput = document.createElement("input");
        labelInput.type = "text";
        labelInput.maxLength = 60;
        labelInput.value = link.label || "";
        labelInput.placeholder = window.languageText("models.linkNamePlaceholder");
        labelInput.setAttribute("aria-label", labelInput.placeholder);

        const urlInput = document.createElement("input");
        urlInput.type = "text";
        urlInput.inputMode = "url";
        urlInput.maxLength = 2048;
        urlInput.value = link.url || "";
        urlInput.placeholder = window.languageText("models.linkUrlPlaceholder");
        urlInput.setAttribute(
            "aria-label",
            window.getSiteLanguage() === "en" ? "Link URL" : "URL do link"
        );

        labelInput.dataset.autoGenerated = String(!labelInput.value);
        const updateSiteName = () => {
            if (!labelInput.value.trim() || labelInput.dataset.autoGenerated === "true") {
                const siteName = window.ModelLinkUtils.getSiteName(urlInput.value.trim());
                labelInput.value = siteName;
                labelInput.dataset.autoGenerated = String(Boolean(siteName));
            }
        };
        urlInput.addEventListener("input", updateSiteName);
        labelInput.addEventListener("input", () => {
            labelInput.dataset.autoGenerated = String(!labelInput.value.trim());
            if (!labelInput.value.trim()) {
                updateSiteName();
            }
        });
        updateSiteName();

        const removeButton = document.createElement("button");
        removeButton.className = "model-link-remove";
        removeButton.type = "button";
        removeButton.textContent = "×";
        removeButton.title = window.languageText("models.removeLink");
        removeButton.setAttribute("aria-label", removeButton.title);
        removeButton.addEventListener("click", () => row.remove());

        row.append(labelInput, urlInput, removeButton);
        return row;

    }

    function openEditDialog() {

        if (!currentModel) {
            return;
        }

        editForm.reset();
        editName.value = currentModel.name;
        editAlternateNames.value = Array.isArray(currentModel.alternateNames)
            ? currentModel.alternateNames.join(", ")
            : "";
        editDescription.value = currentModel.description || "";
        editTags.value = Array.isArray(currentModel.tags)
            ? currentModel.tags.map(tag => `#${tag}`).join(" ")
            : "";
        editCategory.value = currentModel.category;
        editRarity.value = currentModel.rarity || "common";
        editLinks.replaceChildren(
            ...(Array.isArray(currentModel.links) && currentModel.links.length
                ? currentModel.links
                : [{}]
            ).map(createEditLinkRow)
        );
        setEditStatus("");
        editDialog.showModal();
        editName.focus();

    }

    function parseAlternateNames(value) {
        const uniqueNames = new Map();
        String(value || "")
            .split(/[,\n]+/)
            .map(alternateName => alternateName.trim())
            .filter(Boolean)
            .forEach(alternateName => {
                const normalizedName = alternateName.toLocaleLowerCase();
                if (!uniqueNames.has(normalizedName)) {
                    uniqueNames.set(normalizedName, alternateName);
                }
            });
        return [...uniqueNames.values()];
    }

    function readEditLinks() {

        const links = [];

        for (const row of editLinks.querySelectorAll(".model-link-row")) {

            const [labelInput, urlInput] = row.querySelectorAll("input");
            const label = labelInput.value.trim();
            const url = urlInput.value.trim();

            if (!label && !url) {
                continue;
            }

            if (!label || !url) {
                setEditStatus(window.languageText("profile.linkIncomplete"));
                (label ? urlInput : labelInput).focus();
                return null;
            }

            let parsedUrl;
            try {
                parsedUrl = new URL(url);
            } catch (error) {
                setEditStatus(window.languageText("profile.linkInvalid"));
                urlInput.focus();
                return null;
            }

            if (!["http:", "https:", "mailto:", "tel:"].includes(parsedUrl.protocol)) {
                setEditStatus(window.languageText("profile.linkInvalid"));
                urlInput.focus();
                return null;
            }

            links.push({ label, url });

        }

        return links;

    }

    function renderModel(model) {

        if (model.photo != null && (!(model.photo instanceof Blob) || !model.photo.type.startsWith("image/"))) {
            throw new Error("The saved model has no valid image blob.");
        }

        const modelLinks = Array.isArray(model.links) ? model.links : [];
        const safeLinks = modelLinks.map(link => {
            const parsedUrl = new URL(link.url);
            if (!["http:", "https:", "mailto:", "tel:"].includes(parsedUrl.protocol)) {
                throw new Error("The model contains an unsupported profile link.");
            }
            return { label: String(link.label), url: parsedUrl.href };
        });

        if (photoUrl) {
            URL.revokeObjectURL(photoUrl);
        }
        photoUrl = model.photo instanceof Blob ? URL.createObjectURL(model.photo) : null;
        currentModel = model;
        image.hidden = !photoUrl;
        imagePlaceholder.hidden = Boolean(photoUrl);
        if (photoUrl) {
            image.src = photoUrl;
            image.alt = model.name;
        } else {
            image.removeAttribute("src");
            image.alt = "";
            imagePlaceholder.setAttribute("aria-label", window.languageText("models.noImage"));
        }
        name.textContent = model.name;
        alternateNames.textContent = Array.isArray(model.alternateNames)
            ? model.alternateNames.join(", ")
            : "";
        loadedModelName = model.name;
        updatePageTitle();
        description.textContent = model.description || "";
        description.hidden = !model.description;
        const tags = Array.isArray(model.tags)
            ? model.tags.map(tag => String(tag).replace(/^#+/, "")).filter(Boolean)
            : [];
        tagsContainer.replaceChildren();
        tags.forEach(tag => {
            const tagElement = document.createElement("span");
            tagElement.className = "profile-tag";
            tagElement.textContent = `#${tag}`;
            tagsContainer.append(tagElement);
        });
        tagsSection.hidden = tags.length === 0;

        linksContainer.replaceChildren();
        safeLinks.forEach(link => {
            const anchor = document.createElement("a");
            anchor.className = "profile-link-button";
            anchor.href = link.url;
            anchor.target = "_blank";
            anchor.rel = "noopener noreferrer";
            const iconContainer = document.createElement("span");
            iconContainer.className = "profile-link-icon";
            iconContainer.setAttribute("aria-hidden", "true");

            const fallbackIcon = document.createElement("span");
            fallbackIcon.className = "profile-link-icon-fallback";
            fallbackIcon.textContent = "↗";

            const favicon = document.createElement("img");
            favicon.className = "profile-link-favicon";
            favicon.alt = "";
            favicon.referrerPolicy = "no-referrer";
            favicon.addEventListener("error", () => {
                favicon.hidden = true;
                fallbackIcon.hidden = false;
            }, { once: true });

            const faviconUrl = window.ModelLinkUtils.getFaviconUrl(link.url);
            favicon.hidden = !faviconUrl;
            fallbackIcon.hidden = Boolean(faviconUrl);
            if (faviconUrl) {
                favicon.src = faviconUrl;
            }

            const label = document.createElement("span");
            label.className = "profile-link-label";
            label.textContent = link.label;
            iconContainer.append(favicon, fallbackIcon);
            anchor.append(iconContainer, label);
            linksContainer.append(anchor);
        });
        emptyLinks.hidden = safeLinks.length > 0;
        profile.hidden = false;
        editButton.hidden = false;
        renderGallery();

    }

    async function loadProfile() {

        const id = new URLSearchParams(window.location.search).get("id");
        if (!id) {
            showStatus(window.languageText("profile.notFound"));
            return;
        }

        try {

            const database = await openDatabase();
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.close();
                showStatus(window.languageText("profile.notFound"));
                return;
            }
            const model = await getModel(database, id);
            database.close();

            if (!model) {
                showStatus(window.languageText("profile.notFound"));
                return;
            }

            renderModel(model);

        } catch (error) {

            console.error("Could not load the model profile.", error);
            showStatus(window.languageText("profile.loadError"));

        }

    }

    editButton.addEventListener("click", openEditDialog);
    closeGalleryViewerButton.addEventListener("click", () => galleryViewer.close());
    gallerySettingsButton.addEventListener("click", () => {
        const shouldOpen = gallerySettings.hidden;
        gallerySettings.hidden = !shouldOpen;
        gallerySettingsButton.setAttribute("aria-expanded", String(shouldOpen));
    });
    gallerySettings.addEventListener("click", event => event.stopPropagation());
    document.addEventListener("click", event => {
        if (!event.target.closest(".profile-gallery-settings-selector")) {
            gallerySettings.hidden = true;
            gallerySettingsButton.setAttribute("aria-expanded", "false");
        }
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !gallerySettings.hidden) {
            gallerySettings.hidden = true;
            gallerySettingsButton.setAttribute("aria-expanded", "false");
            gallerySettingsButton.focus();
        }
    });
    confirmGalleryDeleteInput.addEventListener("change", () => {
        setConfirmGalleryDeletion(confirmGalleryDeleteInput.checked);
    });
    previousGalleryPhotoButton.addEventListener("click", () => moveGalleryViewer(-1));
    nextGalleryPhotoButton.addEventListener("click", () => moveGalleryViewer(1));
    zoomGalleryPhotoButton.addEventListener("click", toggleGalleryZoom);
    galleryZoomIntensity.addEventListener("input", updateGalleryZoomIntensity);
    galleryViewerPhoto.addEventListener("pointerdown", startGalleryPhotoDrag);
    galleryViewerPhoto.addEventListener("pointermove", moveGalleryPhoto);
    galleryViewerPhoto.addEventListener("pointerup", finishGalleryPhotoDrag);
    galleryViewerPhoto.addEventListener("pointercancel", finishGalleryPhotoDrag);
    galleryViewerPhoto.addEventListener("lostpointercapture", finishGalleryPhotoDrag);
    galleryViewerPhoto.addEventListener("dragstart", event => event.preventDefault());
    galleryViewer.addEventListener("close", () => {
        document.body.classList.remove("is-gallery-viewer-open");
        galleryDrag = null;
        galleryViewerPhoto.classList.remove("is-dragging");
    });
    [previousGalleryPhotoButton, nextGalleryPhotoButton].forEach(button => {
        button.addEventListener("pointerdown", event => event.preventDefault());
    });
    deleteGalleryPhotoButton.addEventListener("click", () => {
        removeGalleryPhoto(currentGalleryIndex, deleteGalleryPhotoButton);
    });
    galleryViewer.addEventListener("click", event => {
        if (event.target === galleryViewer) {
            galleryViewer.close();
        }
    });
    galleryViewer.addEventListener("keydown", event => {
        if (event.key === "ArrowLeft") {
            event.preventDefault();
            moveGalleryViewer(-1);
        } else if (event.key === "ArrowRight") {
            event.preventDefault();
            moveGalleryViewer(1);
        }
    });
    addGalleryPhotosButton.addEventListener("click", () => galleryInput.click());
    galleryInput.addEventListener("change", async () => {
        const selectedPhotos = Array.from(galleryInput.files || []);
        galleryInput.value = "";
        if (!selectedPhotos.length) {
            return;
        }

        if (selectedPhotos.some(photo => !photo.type.startsWith("image/"))) {
            setGalleryStatus(window.languageText("profile.galleryInvalid"), true);
            return;
        }

        addGalleryPhotosButton.disabled = true;
        setGalleryStatus("");
        try {
            const currentPhotos = Array.isArray(currentModel.customGallery)
                ? currentModel.customGallery
                : [];
            await saveGallery([...currentPhotos, ...selectedPhotos]);
            setGalleryStatus(window.languageText("profile.galleryAdded"));
        } catch (error) {
            console.error("Could not add custom gallery photos.", error);
            setGalleryStatus(window.languageText("profile.galleryError"), true);
        } finally {
            addGalleryPhotosButton.disabled = false;
        }
    });
    document.getElementById("closeProfileEdit").addEventListener("click", () => editDialog.close());
    document.getElementById("cancelProfileEdit").addEventListener("click", () => editDialog.close());
    document.getElementById("addProfileEditLink").addEventListener("click", () => {
        editLinks.append(createEditLinkRow());
    });

    editForm.addEventListener("submit", async event => {

        event.preventDefault();
        setEditStatus("");

        const modelLinks = readEditLinks();
        if (!modelLinks) {
            return;
        }

        const nameValue = editName.value.trim();
        if (!nameValue) {
            editName.focus();
            editName.reportValidity();
            return;
        }

        const photo = editPhoto.files[0];
        if (photo && !photo.type.startsWith("image/")) {
            setEditStatus(window.languageText("profile.invalidPhoto"));
            editPhoto.focus();
            return;
        }

        saveButton.disabled = true;
        let database;

        try {

            const preparedPhoto = photo
                ? await window.ModelPhotoUtils.prepare(photo)
                : null;
            database = await openDatabase();
            const updatedModel = {
                ...currentModel,
                name: nameValue,
                alternateNames: parseAlternateNames(editAlternateNames.value),
                description: editDescription.value.trim(),
                tags: editTags.value
                    .split(/[\s,]+/)
                    .map(tag => tag.replace(/^#+/, "").replace(/[^\p{L}\p{N}_-]/gu, ""))
                    .filter(Boolean)
                    .filter((tag, index, values) => values.findIndex(value => value.toLocaleLowerCase() === tag.toLocaleLowerCase()) === index),
                links: modelLinks,
                photo: preparedPhoto || currentModel.photo,
                photoCrop: preparedPhoto
                    ? window.ModelPhotoUtils.normalizeCrop()
                    : window.ModelPhotoUtils.normalizeCrop(currentModel.photoCrop),
                category: editCategory.value,
                rarity: editRarity.value
            };
            await saveModel(database, updatedModel);
            renderModel(updatedModel);
            editDialog.close();

        } catch (error) {

            console.error("Could not save the model profile.", error);
            setEditStatus(window.languageText("profile.saveError"));

        } finally {

            if (database) {
                database.close();
            }
            saveButton.disabled = false;

        }

    });

    document.addEventListener("app-language-change", updatePageTitle);
    document.addEventListener("app-language-change", () => {
        if (currentModel && !currentModel.photo) {
            imagePlaceholder.setAttribute("aria-label", window.languageText("models.noImage"));
        }
        editLinks.querySelectorAll(".model-link-row").forEach(row => {
            const [labelInput, urlInput] = row.querySelectorAll("input");
            labelInput.placeholder = window.languageText("models.linkNamePlaceholder");
            labelInput.setAttribute("aria-label", labelInput.placeholder);
            urlInput.placeholder = window.languageText("models.linkUrlPlaceholder");
            urlInput.setAttribute(
                "aria-label",
                window.getSiteLanguage() === "en" ? "Link URL" : "URL do link"
            );
            const removeButton = row.querySelector("button");
            removeButton.title = window.languageText("models.removeLink");
            removeButton.setAttribute("aria-label", removeButton.title);
        });
        deleteGalleryPhotoButton.title = window.languageText("profile.galleryRemove");
        deleteGalleryPhotoButton.setAttribute(
            "aria-label",
            window.languageText("profile.galleryRemove")
        );
    });

    window.addEventListener("pagehide", () => {
        if (photoUrl) {
            URL.revokeObjectURL(photoUrl);
        }
        galleryUrls.forEach(url => URL.revokeObjectURL(url));
    });

    loadProfile();

})();
