(() => {

    const DATABASE_NAME = "video-studio-models";
    const DATABASE_VERSION = 2;
    const STORE_NAME = "models";
    const GIF_ANIMATION_SETTING_KEY = "video-studio-model-gifs-always-active";
    const RARITIES = ["mythic", "legendary", "epic", "rare", "uncommon", "common"];
    const CURRENT_COLLECTION_KEY = "video-studio-model-collection-v1";
    const COLLECTION_IDS = ["1", "2", "3"];

    const translations = {
        "pt-BR": {
            gifSettingsSaveError: "Não foi possível salvar a preferência de animação dos GIFs.",
            copyName: "Copiar nome",
            copied: "Copiado!",
            copyError: "Não foi possível copiar o nome.",
            edit: "Editar modelo",
            searchImage: "Buscar imagem",
            options: "Opções do modelo",
            delete: "Excluir card",
            deleteHeading: "Excluir card",
            deleteConfirm: "Tem certeza de que deseja excluir o card \"{name}\"?",
            deleteError: "Não foi possível excluir o card. Tente novamente.",
            dragHint: "Arraste os cards para reordenar. Segure sobre outro card para trocar as posições.",
            reorderError: "Não foi possível mover o card. Tente novamente.",
            category6Deleted: "{count} cards da categoria 6 foram excluídos.",
            category6DeleteError: "Não foi possível excluir os cards antigos da categoria 6; eles foram ocultados da galeria.",
            rarity_mythic: "Favoritas",
            rarity_legendary: "Rainhas",
            rarity_epic: "Excelentes",
            rarity_rare: "Muito boas",
            rarity_uncommon: "Boas",
            rarity_common: "Outras",
            exportError: "Não foi possível exportar os cards.",
            importError: "Arquivo de backup inválido ou não foi possível importar os cards.",
            testImportError: "Não foi possível carregar os cards de teste. Selecione o backup JSON na pasta dados-teste.",
            testImportFileHint: "Selecione o backup JSON na pasta dados-teste para importar os cards de teste.",
            exportComplete: "Backup dos {count} cards baixado.",
            importComplete: "{count} cards importados ou atualizados.",
            cropHeading: "Ajustar corte do card",
            cropDragHelp: "A imagem inteira aparece na prévia. Arraste o quadro para escolher o corte.",
            cropZoom: "Zoom",
            cropReset: "Centralizar imagem",
            nameRequired: "Informe o nome da modelo.",
            linkIncomplete: "Preencha o nome e a URL de cada link.",
            linkInvalid: "Use uma URL válida começando com http://, https://, mailto: ou tel:.",
            invalidPhoto: "Selecione um arquivo de imagem válido.",
            invalidCategory: "Selecione uma categoria válida.",
            invalidRarity: "Selecione uma raridade válida.",
            saveError: "Não foi possível salvar o modelo. Tente novamente.",
            updateError: "Não foi possível atualizar o modelo. Tente novamente.",
            loadError: "Não foi possível carregar os modelos salvos."
        },
        en: {
            gifSettingsSaveError: "Could not save the GIF animation preference.",
            copyName: "Copy name",
            copied: "Copied!",
            copyError: "Could not copy the name.",
            edit: "Edit model",
            searchImage: "Search for image",
            options: "Model options",
            delete: "Delete card",
            deleteHeading: "Delete card",
            deleteConfirm: "Are you sure you want to delete the card \"{name}\"?",
            deleteError: "Could not delete the card. Please try again.",
            dragHint: "Drag cards to reorder them. Hold over another card to swap their positions.",
            reorderError: "Could not move the card. Please try again.",
            category6Deleted: "{count} cards from category 6 were deleted.",
            category6DeleteError: "Could not delete the old category 6 cards; they were hidden from the gallery.",
            rarity_mythic: "Favorites",
            rarity_legendary: "Queens",
            rarity_epic: "Excellent",
            rarity_rare: "Very good",
            rarity_uncommon: "Good",
            rarity_common: "Others",
            exportError: "Could not export the model cards.",
            importError: "The backup file is invalid or the cards could not be imported.",
            testImportError: "Could not load the test cards. Select the JSON backup from the dados-teste folder.",
            testImportFileHint: "Select the JSON backup from the dados-teste folder to import the test cards.",
            exportComplete: "Backup of {count} cards downloaded.",
            importComplete: "{count} cards imported or updated.",
            cropHeading: "Adjust card crop",
            cropDragHelp: "The full image is shown. Drag the frame to choose the crop.",
            cropZoom: "Zoom",
            cropReset: "Center image",
            nameRequired: "Enter the model's name.",
            linkIncomplete: "Enter both a name and URL for every link.",
            linkInvalid: "Use a valid URL starting with http://, https://, mailto: or tel:.",
            invalidPhoto: "Choose a valid image file.",
            invalidCategory: "Choose a valid category.",
            invalidRarity: "Choose a valid rarity.",
            saveError: "Could not save the model. Please try again.",
            updateError: "Could not update the model. Please try again.",
            loadError: "Could not load saved models."
        }
    };

    const form = document.getElementById("modelForm");
    const dialog = document.getElementById("modelFormDialog");
    const openButton = document.getElementById("openModelForm");
    const closeButton = document.getElementById("closeModelForm");
    const cancelButton = document.getElementById("cancelModelForm");
    const nameInput = document.getElementById("modelName");
    const alternateNamesInput = document.getElementById("modelAlternateNames");
    const descriptionInput = document.getElementById("modelDescription");
    const tagsInput = document.getElementById("modelTags");
    const tagPresetsToggle = document.getElementById("toggleModelTagPresets");
    const tagPresetsList = document.getElementById("modelTagPresets");
    const tagSearchInput = document.getElementById("modelTagSearch");
    const tagSearchStatus = document.getElementById("modelTagSearchStatus");
    const linksContainer = document.getElementById("modelLinks");
    const addLinkButton = document.getElementById("addModelLink");
    const photoInput = document.getElementById("modelPhoto");
    const photoCropEditor = document.getElementById("modelPhotoCropEditor");
    const photoCropFrame = document.getElementById("modelPhotoCropFrame");
    const photoCropPreview = document.getElementById("modelPhotoCropPreview");
    const photoCropSelection = document.getElementById("modelPhotoCropSelection");
    const photoCropZoom = document.getElementById("modelPhotoCropZoom");
    const resetPhotoCropButton = document.getElementById("resetModelPhotoCrop");
    const categoryInput = document.getElementById("modelCategory");
    const rarityInput = document.getElementById("modelRarity");
    const photoHelp = document.getElementById("modelPhotoHelp");
    const formHeading = document.getElementById("modelFormHeading");
    const submitButton = form.querySelector('button[type="submit"]');
    const formStatus = document.getElementById("modelFormStatus");
    const pageStatus = document.getElementById("modelsPageStatus");
    const deleteDialog = document.getElementById("deleteModelDialog");
    const deletePrompt = document.getElementById("deleteModelPrompt");
    const confirmDeleteButton = document.getElementById("confirmDeleteModel");
    const importModelsInput = document.getElementById("importModelsInput");
    const importTestModelsInput = document.getElementById("importTestModelsInput");
    const exportModelsButton = document.getElementById("exportModelsButton");
    const importModelsButton = document.getElementById("importModelsButton");
    const importTestModelsButton = document.getElementById("importTestModelsButton");
    const modelsTransferStatus = document.getElementById("modelsTransferStatus");
    const modelsPageSettingsButton = document.getElementById("modelsPageSettingsButton");
    const modelsPageSettingsMenu = document.getElementById("modelsPageSettingsMenu");
    const modelsCollectionsButton = document.getElementById("modelsCollectionsButton");
    const modelsCollectionsMenu = document.getElementById("modelsCollectionsMenu");
    const modelGifsAlwaysActiveCheckbox = document.getElementById("modelGifsAlwaysActive");
    const categoryContainers = new Map(
        Array.from(document.querySelectorAll(".model-category"))
            .map(category => [
                category.dataset.category,
                category.querySelector(".model-rarity-groups")
            ])
    );
    const rarityContainers = new Map();
    const photoCropObserver = "ResizeObserver" in window
        ? new ResizeObserver(entries => {
            entries.forEach(({ target }) => {
                const image = target.querySelector(".model-photo");
                if (image) {
                    window.ModelPhotoUtils.applyCrop(image, target, target.photoCrop);
                }
            });
        })
        : null;

    let database;
    let models = [];
    let editingModelId = null;
    let photoCrop = window.ModelPhotoUtils.normalizeCrop();
    let photoCropPreviewUrl = null;
    let photoCropSource = null;
    let cropDragStart = null;
    let currentLanguage = document.documentElement.lang === "en" ? "en" : "pt-BR";
    let currentCollectionId = "1";
    let collectionSwitchRequest = 0;
    let photoUrls = [];
    let pendingDeleteModel = null;
    let draggedModelId = null;
    let categoryOpenStateBeforeSearch = null;
    let pendingCardDrag = null;
    let cardDrag = null;
    let swapHoverTimer = 0;
    let cardDragAnimationFrame = 0;
    let latestCardDragEvent = null;
    let suppressCardClickUntil = 0;
    let gifCards = [];
    let gifsAlwaysActive = true;

    modelsCollectionsButton.disabled = true;

    try {
        const savedCollectionId = localStorage.getItem(CURRENT_COLLECTION_KEY);
        if (COLLECTION_IDS.includes(savedCollectionId)) {
            currentCollectionId = savedCollectionId;
        }
    } catch (error) {
        console.warn("Could not load the selected model collection.", error);
    }

    try {
        const savedSetting = localStorage.getItem(GIF_ANIMATION_SETTING_KEY);
        if (savedSetting === "true" || savedSetting === "false") {
            gifsAlwaysActive = savedSetting === "true";
        }
    } catch (error) {
        console.warn("Could not load the model GIF animation preference.", error);
    }

    modelGifsAlwaysActiveCheckbox.checked = gifsAlwaysActive;

    document.addEventListener("click", event => {
        if (
            performance.now() < suppressCardClickUntil &&
            event.target.closest(".model-card")
        ) {
            event.preventDefault();
            event.stopPropagation();
        }
    }, true);

    function showGifCardImage(gifCard) {

        if (!gifCards.includes(gifCard)) {
            return;
        }

        if (gifsAlwaysActive || gifCard.isPointerOver) {
            gifCard.frame.classList.remove("is-gif-preview-pending");
            if (gifCard.image.src !== gifCard.url) {
                gifCard.image.src = gifCard.url;
            }
            return;
        }

        if (gifCard.posterUrl) {
            gifCard.frame.classList.remove("is-gif-preview-pending");
            if (gifCard.image.src !== gifCard.posterUrl) {
                gifCard.image.src = gifCard.posterUrl;
            }
            return;
        }

        gifCard.frame.classList.add("is-gif-preview-pending");
        gifCard.image.removeAttribute("src");

        if (gifCard.posterFailed) {
            return;
        }

        if (!gifCard.previewPromise) {
            gifCard.previewPromise = createGifCardPoster(gifCard);
        }

    }


    async function createGifCardPoster(gifCard) {

        let bitmap;

        try {

            if (typeof createImageBitmap !== "function") {
                throw new Error("createImageBitmap is not supported.");
            }

            bitmap = await createImageBitmap(gifCard.blob);

            const scale = Math.min(1, 800 / bitmap.width, 1000 / bitmap.height);
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(bitmap.width * scale));
            canvas.height = Math.max(1, Math.round(bitmap.height * scale));

            const context = canvas.getContext("2d");
            if (!context) {
                throw new Error("Could not create a canvas context for the GIF preview.");
            }

            context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

            const poster = await new Promise((resolve, reject) => {
                canvas.toBlob(blob => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error("Could not encode the GIF preview."));
                    }
                }, "image/png");
            });

            if (!gifCards.includes(gifCard)) {
                return;
            }

            gifCard.posterUrl = URL.createObjectURL(poster);
            photoUrls.push(gifCard.posterUrl);
            showGifCardImage(gifCard);

        } catch (error) {

            console.error("Could not create a static preview for a model GIF.", error);

            if (gifCards.includes(gifCard)) {
                gifCard.posterFailed = true;
                gifCard.frame.classList.add("is-gif-preview-pending");
                gifCard.image.removeAttribute("src");
                pageStatus.textContent = translations[currentLanguage].gifPreviewError;
                pageStatus.hidden = false;
            }

        } finally {

            if (bitmap) {
                bitmap.close();
            }

            gifCard.previewPromise = null;

        }

    }

    function getRarity(model) {

        return RARITIES.includes(model.rarity) ? model.rarity : "common";

    }


    function getGroupKey(category, rarity) {

        return `${category}:${rarity}`;

    }


    function compareModelOrder(left, right) {

        const leftPosition = Number.isFinite(left.position) ? left.position : left.createdAt || 0;
        const rightPosition = Number.isFinite(right.position) ? right.position : right.createdAt || 0;

        return leftPosition - rightPosition
            || (left.createdAt || 0) - (right.createdAt || 0)
            || String(left.id).localeCompare(String(right.id));

    }


    function getModelsInGroup(groupKey, source = models) {

        return source
            .filter(model => getGroupKey(String(model.category), getRarity(model)) === groupKey)
            .sort(compareModelOrder);

    }


    function getNextPosition(category, rarity, source = models) {

        return getModelsInGroup(getGroupKey(String(category), rarity), source).length;

    }


    function normalizeModelPositions(savedModels) {

        const groupKeys = new Set(
            savedModels.map(model => getGroupKey(String(model.category), getRarity(model)))
        );
        let changed = false;

        groupKeys.forEach(groupKey => {
            const group = getModelsInGroup(groupKey, savedModels);
            if (group.some(model => !Number.isFinite(model.position))) {
                group.sort((left, right) =>
                    (left.createdAt || 0) - (right.createdAt || 0)
                    || String(left.id).localeCompare(String(right.id))
                ).forEach((model, index) => {
                    model.position = index;
                });
                changed = true;
            }
        });

        return changed;

    }


    function clearCardDragTargets() {

        document.querySelectorAll(
            ".model-category.is-drop-target, .model-rarity-group.is-drop-target"
        ).forEach(element => {
            element.classList.remove("is-drop-target");
        });

    }


    function getDropContainer(target, draggedModel) {

        const cards = target.closest(".model-cards");
        if (cards) {
            return cards;
        }

        const categoryElement = target.closest(".model-category");
        if (!categoryElement) {
            return null;
        }

        const category = categoryElement.dataset.category;
        const categoryGroups = categoryContainers.get(category);
        if (!categoryGroups) {
            return null;
        }

        categoryElement.open = true;
        const rarity = RARITIES.includes(target.closest(".model-rarity-group")?.dataset.rarity)
            ? target.closest(".model-rarity-group").dataset.rarity
            : getRarity(draggedModel);
        return rarityContainers.get(getGroupKey(category, rarity)) || null;

    }


    function setSwapHoverTarget(targetCard) {

        if (cardDrag.hoveredTargetId === targetCard?.dataset.modelId) {
            return;
        }

        window.clearTimeout(swapHoverTimer);
        document.querySelectorAll(".model-card.is-swap-target").forEach(card => {
            card.classList.remove("is-swap-target");
        });
        cardDrag.hoveredTargetId = targetCard?.dataset.modelId || null;
        cardDrag.swapTargetId = null;

        if (!targetCard || !cardDrag.hoveredTargetId) {
            return;
        }

        const state = cardDrag;
        swapHoverTimer = window.setTimeout(() => {
            if (cardDrag !== state || state.hoveredTargetId !== targetCard.dataset.modelId) {
                return;
            }

            state.swapTargetId = targetCard.dataset.modelId;
            targetCard.classList.add("is-swap-target");
        }, 650);

    }


    function animateCardLayout(previousPositions) {

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            return;
        }

        document.querySelectorAll(".model-card[data-model-id]").forEach(card => {
            if (card.classList.contains("is-pointer-dragging")) {
                return;
            }

            const previous = previousPositions.get(card);
            if (!previous) {
                return;
            }

            const next = card.getBoundingClientRect();
            const offsetX = previous.left - next.left;
            const offsetY = previous.top - next.top;
            if (Math.abs(offsetX) < 1 && Math.abs(offsetY) < 1) {
                return;
            }

            card.getAnimations().forEach(animation => animation.cancel());
            card.animate(
                [
                    { transform: `translate3d(${offsetX}px, ${offsetY}px, 0)` },
                    { transform: "translate3d(0, 0, 0)" }
                ],
                {
                    duration: 180,
                    easing: "cubic-bezier(.2,.8,.2,1)"
                }
            );
        });

    }


    function updateCardDrag(event) {

        if (!cardDrag || event.pointerId !== cardDrag.pointerId) {
            return;
        }

        event.preventDefault();
        cardDrag.card.style.left = `${event.clientX - cardDrag.offsetX}px`;
        cardDrag.card.style.top = `${event.clientY - cardDrag.offsetY}px`;

        const pointedElement = document.elementFromPoint(event.clientX, event.clientY);
        if (!pointedElement) {
            return;
        }

        if (pointedElement === cardDrag.placeholder) {
            setSwapHoverTarget(null);
            return;
        }

        const draggedModel = models.find(model => model.id === cardDrag.modelId);
        const container = getDropContainer(pointedElement, draggedModel || {});
        if (!container) {
            return;
        }

        clearCardDragTargets();
        container.closest(".model-category")?.classList.add("is-drop-target");
        container.closest(".model-rarity-group")?.classList.add("is-drop-target");

        let targetCard = pointedElement.closest(".model-card");
        if (!targetCard) {
            const nearestCard = Array.from(
                container.querySelectorAll(":scope > .model-card")
            ).map(card => {
                const bounds = card.getBoundingClientRect();
                return {
                    card,
                    bounds,
                    distance: Math.hypot(
                        event.clientX - (bounds.left + bounds.width / 2),
                        event.clientY - (bounds.top + bounds.height / 2)
                    )
                };
            }).sort((left, right) => left.distance - right.distance)[0];

            if (
                nearestCard &&
                nearestCard.distance <= Math.max(
                    nearestCard.bounds.width * 0.75,
                    nearestCard.bounds.height * 0.65
                )
            ) {
                targetCard = nearestCard.card;
            }
        }
        const previousPositions = new Map(
            Array.from(document.querySelectorAll(".model-card[data-model-id]"), card => [
                card,
                card.getBoundingClientRect()
            ])
        );
        if (targetCard && targetCard !== cardDrag.card && container.contains(targetCard)) {
            const bounds = targetCard.getBoundingClientRect();
            const insertAfter = event.clientX > bounds.left + bounds.width / 2;
            container.insertBefore(
                cardDrag.placeholder,
                insertAfter ? targetCard.nextSibling : targetCard
            );
            cardDrag.placeholder.classList.toggle("drop-after", insertAfter);
            cardDrag.placeholder.classList.toggle("drop-before", !insertAfter);
            setSwapHoverTarget(targetCard);
        } else {
            container.append(cardDrag.placeholder);
            cardDrag.placeholder.classList.remove("drop-before", "drop-after");
            setSwapHoverTarget(null);
        }

        cardDrag.container = container;
        animateCardLayout(previousPositions);

    }


    function beginCardDrag(event) {

        const pending = pendingCardDrag;
        if (!pending || event.pointerId !== pending.pointerId) {
            return;
        }

        const bounds = pending.card.getBoundingClientRect();
        const placeholder = document.createElement("div");
        placeholder.className = "model-card-placeholder";
        placeholder.setAttribute("aria-hidden", "true");
        placeholder.style.width = `${bounds.width}px`;
        placeholder.style.height = `${bounds.height}px`;

        pending.card.after(placeholder);
        pending.card.classList.add("is-dragging", "is-pointer-dragging");
        Object.assign(pending.card.style, {
            position: "fixed",
            left: `${bounds.left}px`,
            top: `${bounds.top}px`,
            width: `${bounds.width}px`,
            height: `${bounds.height}px`,
            margin: "0",
            zIndex: "1000",
            pointerEvents: "none"
        });
        document.body.append(pending.card);

        cardDrag = {
            card: pending.card,
            modelId: pending.card.dataset.modelId,
            pointerId: pending.pointerId,
            offsetX: pending.clientX - bounds.left,
            offsetY: pending.clientY - bounds.top,
            placeholder,
            originParent: placeholder.parentElement,
            originNextSibling: placeholder.nextSibling,
            originalStyles: pending.originalStyles,
            container: placeholder.parentElement,
            hoveredTargetId: null,
            swapTargetId: null
        };
        draggedModelId = cardDrag.modelId;
        pendingCardDrag = null;
        suppressCardClickUntil = performance.now() + 500;
        updateCardDrag(event);

    }


    function restoreDraggedCard(state) {

        state.card.classList.remove("is-dragging", "is-pointer-dragging");
        Object.assign(state.card.style, state.originalStyles);

    }


    async function finishCardDrag(event, cancelled = false) {

        if (cardDrag && event.pointerId === cardDrag.pointerId) {
            if (cardDragAnimationFrame) {
                window.cancelAnimationFrame(cardDragAnimationFrame);
                cardDragAnimationFrame = 0;
            }
            updateCardDrag(event);
            latestCardDragEvent = null;
        }

        if (pendingCardDrag && event.pointerId === pendingCardDrag.pointerId) {
            pendingCardDrag = null;
            return;
        }

        const state = cardDrag;
        if (!state || event.pointerId !== state.pointerId) {
            return;
        }

        window.clearTimeout(swapHoverTimer);
        clearCardDragTargets();
        document.querySelectorAll(".model-card.is-swap-target").forEach(card => {
            card.classList.remove("is-swap-target");
        });
        cardDrag = null;
        draggedModelId = null;
        suppressCardClickUntil = performance.now() + 500;

        restoreDraggedCard(state);

        if (cancelled || !state.container?.isConnected) {
            state.placeholder.remove();
            state.originParent.insertBefore(
                state.card,
                state.originNextSibling?.parentElement === state.originParent
                    ? state.originNextSibling
                    : null
            );
            return;
        }

        if (state.swapTargetId) {
            state.card.remove();
            state.placeholder.remove();
            await swapModels(state.modelId, state.swapTargetId);
            return;
        }

        const destination = state.container;
        state.placeholder.replaceWith(state.card);
        const cardSiblings = Array.from(destination.querySelectorAll(":scope > .model-card"));
        const cardIndex = cardSiblings.indexOf(state.card);
        const nextCard = cardSiblings[cardIndex + 1];
        const previousCard = cardSiblings[cardIndex - 1];
        const targetCard = nextCard || previousCard || null;
        const insertAfter = !nextCard && Boolean(previousCard);

        await moveModel(
            state.modelId,
            destination.dataset.category,
            destination.dataset.rarity,
            targetCard?.dataset.modelId || null,
            insertAfter
        );

    }


    window.addEventListener("pointermove", event => {
        if (
            pendingCardDrag &&
            event.pointerId === pendingCardDrag.pointerId &&
            Math.hypot(
                event.clientX - pendingCardDrag.clientX,
                event.clientY - pendingCardDrag.clientY
            ) > 6
        ) {
            beginCardDrag(event);
        } else if (cardDrag) {
            event.preventDefault();
            latestCardDragEvent = event;
            if (!cardDragAnimationFrame) {
                cardDragAnimationFrame = window.requestAnimationFrame(() => {
                    cardDragAnimationFrame = 0;
                    if (latestCardDragEvent) {
                        updateCardDrag(latestCardDragEvent);
                    }
                    latestCardDragEvent = null;
                });
            }
        }
    }, { passive: false });

    window.addEventListener("pointerup", event => {
        finishCardDrag(event);
    });

    window.addEventListener("pointercancel", event => {
        finishCardDrag(event, true);
    });

    function renderRarityGroups() {

        categoryContainers.forEach((container, category) => {

            container.replaceChildren();

            RARITIES.forEach(rarity => {

                const section = document.createElement("section");
                section.className = "model-rarity-group";
                section.dataset.rarity = rarity;

                const heading = document.createElement("h3");
                heading.className = "model-rarity-heading";
                heading.textContent = translations[currentLanguage][`rarity_${rarity}`];

                const cards = document.createElement("div");
                cards.className = "model-cards";
                cards.dataset.category = category;
                cards.dataset.rarity = rarity;

                const key = `${category}:${rarity}`;
                rarityContainers.set(key, cards);

                section.append(heading, cards);
                container.append(section);

            });

        });

    }


    async function moveModel(modelId, category, rarity, targetModelId, insertAfter) {

        const draggedModel = models.find(model => model.id === modelId);
        if (!draggedModel || !categoryContainers.has(String(category)) || !RARITIES.includes(rarity)) {
            return;
        }

        const sourceKey = getGroupKey(String(draggedModel.category), getRarity(draggedModel));
        const destinationKey = getGroupKey(String(category), rarity);
        const sourceModels = getModelsInGroup(sourceKey).filter(model => model.id !== modelId);
        const destinationModels = sourceKey === destinationKey
            ? sourceModels
            : getModelsInGroup(destinationKey);
        const insertionIndex = targetModelId
            ? destinationModels.findIndex(model => model.id === targetModelId)
            : -1;

        if (targetModelId === modelId) {
            return;
        }

        const nextGroup = [...destinationModels];
        const movedModel = { ...draggedModel, category: String(category), rarity };
        const normalizedIndex = insertionIndex < 0
            ? nextGroup.length
            : insertionIndex + (insertAfter ? 1 : 0);
        nextGroup.splice(normalizedIndex, 0, movedModel);

        const updates = new Map();
        const updatedSource = sourceKey === destinationKey
            ? nextGroup
            : sourceModels;
        updatedSource.forEach((model, index) => {
            updates.set(model.id, { ...model, position: index });
        });
        if (sourceKey !== destinationKey) {
            nextGroup.forEach((model, index) => {
                updates.set(model.id, { ...model, position: index });
            });
        }

        const updatedModels = models.map(model => updates.get(model.id) || model);
        const savedModels = Array.from(updates.values());
        const previousPositions = new Map(
            Array.from(document.querySelectorAll(".model-card[data-model-id]"), card => [
                card.dataset.modelId,
                card.getBoundingClientRect()
            ])
        );

        try {
            await saveModels(savedModels);
            models = updatedModels;
            draggedModelId = null;
            document.querySelectorAll(".is-dragging, .is-drop-target").forEach(element => {
                element.classList.remove("is-dragging", "is-drop-target");
            });
            categoryContainers.get(String(category)).closest(".model-category").open = true;
            renderModels(previousPositions);
        } catch (error) {
            console.error("Could not move the model card.", error);
            pageStatus.textContent = translations[currentLanguage].reorderError;
            pageStatus.hidden = false;
            renderModels();
        }

    }


    async function swapModels(firstModelId, secondModelId) {

        const firstModel = models.find(model => model.id === firstModelId);
        const secondModel = models.find(model => model.id === secondModelId);
        if (!firstModel || !secondModel || firstModel.id === secondModel.id) {
            return;
        }

        const firstRarity = getRarity(firstModel);
        const secondRarity = getRarity(secondModel);
        const sameGroup =
            getGroupKey(String(firstModel.category), firstRarity) ===
            getGroupKey(String(secondModel.category), secondRarity);
        const updates = new Map();

        if (sameGroup) {
            updates.set(firstModel.id, {
                ...firstModel,
                position: secondModel.position
            });
            updates.set(secondModel.id, {
                ...secondModel,
                position: firstModel.position
            });
        } else {
            updates.set(firstModel.id, {
                ...firstModel,
                category: String(secondModel.category),
                rarity: secondRarity,
                position: secondModel.position
            });
            updates.set(secondModel.id, {
                ...secondModel,
                category: String(firstModel.category),
                rarity: firstRarity,
                position: firstModel.position
            });
        }

        const previousPositions = new Map(
            Array.from(document.querySelectorAll(".model-card[data-model-id]"), card => [
                card.dataset.modelId,
                card.getBoundingClientRect()
            ])
        );

        try {
            await saveModels(Array.from(updates.values()));
            models = models.map(model => updates.get(model.id) || model);
            categoryContainers.get(String(firstModel.category))
                ?.closest(".model-category").setAttribute("open", "");
            categoryContainers.get(String(secondModel.category))
                ?.closest(".model-category").setAttribute("open", "");
            renderModels(previousPositions);
        } catch (error) {
            console.error("Could not swap model cards.", error);
            pageStatus.textContent = translations[currentLanguage].reorderError;
            pageStatus.hidden = false;
            renderModels();
        }

    }


    function openDatabase() {

        return new Promise((resolve, reject) => {

            if (!("indexedDB" in window)) {
                reject(new Error("IndexedDB is not supported."));
                return;
            }

            const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

            request.onupgradeneeded = () => {
                const database = request.result;

                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    const store = database.createObjectStore(STORE_NAME, {
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


    function getSavedModels() {

        return new Promise((resolve, reject) => {

            const transaction = database.transaction(STORE_NAME, "readonly");
            const request = transaction.objectStore(STORE_NAME).getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
            transaction.onabort = () => reject(transaction.error);

        });

    }

    function saveModel(model) {

        return new Promise((resolve, reject) => {

            const transaction = database.transaction(STORE_NAME, "readwrite");
            transaction.objectStore(STORE_NAME).put(model);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);

        });

    }


    function saveModels(savedModels) {

        return new Promise((resolve, reject) => {

            const transaction = database.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            savedModels.forEach(model => store.put(model));
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);

        });

    }

    function blobToDataUrl(blob) {

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });

    }

    function dataUrlToBlob(dataUrl) {

        if (dataUrl === null) {
            return null;
        }

        const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/]*={0,2})$/.exec(dataUrl);
        if (!match) {
            throw new Error("The backup contains an invalid model image.");
        }

        const binary = atob(match[2]);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
            bytes[index] = binary.charCodeAt(index);
        }
        return new Blob([bytes], { type: match[1] });

    }

    async function exportModels() {

        if (!database) {
            throw new Error("The model database is not ready.");
        }

        const backupModels = await Promise.all(models.map(async model => {
            if (
                model.photo != null &&
                (!(model.photo instanceof Blob) || !model.photo.type.startsWith("image/"))
            ) {
                throw new Error("A model has no valid image to export.");
            }
            const galleryPhotos = Array.isArray(model.customGallery) ? model.customGallery : [];
            const customGallery = await Promise.all(galleryPhotos.map(async photo => {
                if (!(photo instanceof Blob) || !photo.type.startsWith("image/")) {
                    throw new Error("A model has an invalid custom gallery image.");
                }
                return blobToDataUrl(photo);
            }));

            const { photo, ...modelData } = model;
            return {
                ...modelData,
                category: String(model.category),
                rarity: getRarity(model),
                links: Array.isArray(model.links) ? model.links : [],
                tags: Array.isArray(model.tags) ? model.tags : [],
                photo: photo == null ? null : await blobToDataUrl(photo),
                customGallery
            };
        }));
        const backup = {
            format: "video-studio-models",
            version: 1,
            models: backupModels
        };
        const file = new Blob([JSON.stringify(backup)], { type: "application/json" });
        const downloadUrl = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `modelos-colecao-${currentCollectionId}-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
        modelsTransferStatus.classList.remove("is-error");
        modelsTransferStatus.textContent = translations[currentLanguage].exportComplete
            .replace("{count}", String(backupModels.length));
        modelsTransferStatus.hidden = false;

    }

    async function importModels(file) {

        if (!database) {
            throw new Error("The model database is not ready.");
        }

        const backup = JSON.parse(await file.text());
        if (
            !backup ||
            backup.format !== "video-studio-models" ||
            backup.version !== 1 ||
            !Array.isArray(backup.models)
        ) {
            throw new Error("The selected file is not a supported model backup.");
        }

        const storedModels = await getSavedModels();
        const idsInOtherCollections = new Set(
            storedModels
                .filter(model => model.collectionId !== currentCollectionId)
                .map(model => model.id)
        );
        const importedModels = backup.models.map(model => {
            if (
                !model ||
                typeof model.id !== "string" ||
                !model.id ||
                typeof model.name !== "string" ||
                !model.name.trim() ||
                !categoryContainers.has(String(model.category)) ||
                !RARITIES.includes(model.rarity) ||
                (model.photo != null && typeof model.photo !== "string") ||
                (
                    model.customGallery !== undefined &&
                    (
                        !Array.isArray(model.customGallery) ||
                        model.customGallery.some(photo => typeof photo !== "string")
                    )
                )
            ) {
                throw new Error("The backup contains an invalid model.");
            }

            const links = model.links === undefined ? [] : model.links;
            if (
                !Array.isArray(links) ||
                links.some(link => {
                    if (!link || typeof link.label !== "string" || typeof link.url !== "string") {
                        return true;
                    }
                    try {
                        return !["http:", "https:", "mailto:", "tel:"].includes(new URL(link.url).protocol);
                    } catch (error) {
                        return true;
                    }
                })
            ) {
                throw new Error("The backup contains an invalid profile link.");
            }

            const tags = model.tags === undefined ? [] : model.tags;
            if (!Array.isArray(tags) || tags.some(tag => typeof tag !== "string")) {
                throw new Error("The backup contains invalid tags.");
            }

            const alternateNames = model.alternateNames === undefined ? [] : model.alternateNames;
            if (
                !Array.isArray(alternateNames) ||
                alternateNames.some(alternateName => typeof alternateName !== "string")
            ) {
                throw new Error("The backup contains invalid alternate names.");
            }

            let id = model.id;
            if (idsInOtherCollections.has(id)) {
                do {
                    id = `${model.id}-c${currentCollectionId}-${Math.random().toString(36).slice(2)}`;
                } while (idsInOtherCollections.has(id));
                idsInOtherCollections.add(id);
            }

            return {
                ...model,
                id,
                photo: model.photo == null ? null : dataUrlToBlob(model.photo),
                customGallery: Array.isArray(model.customGallery)
                    ? model.customGallery.map(dataUrlToBlob)
                    : [],
                category: String(model.category),
                links,
                tags,
                alternateNames,
                collectionId: currentCollectionId
            };
        });
        const mergedModels = new Map(models.map(model => [model.id, model]));
        importedModels.forEach(model => mergedModels.set(model.id, model));
        const nextModels = [...mergedModels.values()];

        const groups = new Map();
        nextModels.forEach(model => {
            const key = getGroupKey(String(model.category), getRarity(model));
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(model);
        });
        groups.forEach(group => {
            group.sort(compareModelOrder).forEach((model, index) => {
                model.position = index;
            });
        });

        await saveModels(nextModels);
        models = nextModels;
        renderModels();
        modelsTransferStatus.classList.remove("is-error");
        modelsTransferStatus.textContent = translations[currentLanguage].importComplete
            .replace("{count}", String(importedModels.length));
        modelsTransferStatus.hidden = false;

    }

    function parseTags(value) {

        const uniqueTags = new Map();
        String(value || "")
            .split(/[\s,]+/)
            .map(tag => tag.replace(/^#+/, "").replace(/[^\p{L}\p{N}_-]/gu, ""))
            .filter(Boolean)
            .forEach(tag => {
                const normalizedTag = tag.toLocaleLowerCase();
                if (!uniqueTags.has(normalizedTag)) {
                    uniqueTags.set(normalizedTag, tag);
                }
            });

        return [...uniqueTags.values()];

    }

    function parseAlternateNames(value) {
        const uniqueNames = new Map();
        String(value || "")
            .split(/[,\n]+/)
            .map(name => name.trim())
            .filter(Boolean)
            .forEach(name => {
                const normalizedName = name.toLocaleLowerCase();
                if (!uniqueNames.has(normalizedName)) {
                    uniqueNames.set(normalizedName, name);
                }
            });
        return [...uniqueNames.values()];
    }

    function updateTagPresetButtons() {
        const selectedTags = new Set(
            parseTags(tagsInput.value).map(tag => tag.toLocaleLowerCase())
        );

        tagPresetsList.querySelectorAll("[data-model-tag]").forEach(button => {
            button.setAttribute(
                "aria-pressed",
                String(selectedTags.has(button.dataset.modelTag.toLocaleLowerCase()))
            );
        });
    }

    function togglePresetTag(tag) {
        const tags = parseTags(tagsInput.value);
        const existingTag = tags.find(
            currentTag => currentTag.toLocaleLowerCase() === tag.toLocaleLowerCase()
        );

        if (existingTag) {
            tagsInput.value = tags
                .filter(currentTag => currentTag !== existingTag)
                .map(currentTag => `#${currentTag}`)
                .join(" ");
        } else {
            tagsInput.value = [...tags, tag]
                .map(currentTag => `#${currentTag}`)
                .join(" ");
        }

        updateTagPresetButtons();
        tagsInput.dispatchEvent(new Event("input", { bubbles: true }));
    }


    function deleteModels(modelIds) {

        return new Promise((resolve, reject) => {

            const transaction = database.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            modelIds.forEach(id => store.delete(id));
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);

        });

    }


    function renderModels(previousPositions = null) {

        if (photoCropObserver) {
            photoCropObserver.disconnect();
        }

        const searchValue = tagSearchInput.value.trim();
        const searchTerms = (searchValue.match(/#[\p{L}\p{N}_-]+/gu) || [])
            .map(tag => tag.slice(1).toLocaleLowerCase());
        const nameQuery = searchValue
            .replace(/#[^\s,]*/g, "")
            .trim()
            .toLocaleLowerCase();
        const filteredModels = models.filter(model => {
            if (!searchTerms.length && !nameQuery) {
                return true;
            }

            const tags = Array.isArray(model.tags)
                ? model.tags.map(tag => String(tag).replace(/^#+/, "").toLocaleLowerCase())
                : [];
            const names = [model.name, ...(Array.isArray(model.alternateNames) ? model.alternateNames : [])];
            const nameMatches = !nameQuery || names.some(name =>
                String(name || "").toLocaleLowerCase().includes(nameQuery)
            );
            const tagsMatch = searchTerms.every(term => tags.some(tag => tag.includes(term)));
            return nameMatches && tagsMatch;
        });

        photoUrls.forEach(url => URL.revokeObjectURL(url));
        photoUrls = [];
        gifCards = [];

        categoryContainers.forEach(container => {
            container.replaceChildren();
        });
        rarityContainers.clear();
        renderRarityGroups();

        [...filteredModels].sort(compareModelOrder).forEach(model => {

            const categoryValue = String(model.category);
            const category = categoryContainers.get(categoryValue);

            if (!category) {
                console.error("A saved model has an invalid category.", model);
                return;
            }

            const rarity = getRarity(model);
            const container = rarityContainers.get(getGroupKey(categoryValue, rarity));
            const card = document.createElement("article");
            card.className = "model-card";
            card.dataset.rarity = rarity;
            card.dataset.modelId = model.id;
            card.draggable = false;
            card.addEventListener("pointerdown", event => {
                if (
                    event.button !== 0 ||
                    event.target.closest("button") ||
                    event.target.closest("input")
                ) {
                    return;
                }

                pendingCardDrag = {
                    card,
                    pointerId: event.pointerId,
                    clientX: event.clientX,
                    clientY: event.clientY,
                    originalStyles: {
                        position: card.style.position,
                        left: card.style.left,
                        top: card.style.top,
                        width: card.style.width,
                        height: card.style.height,
                        margin: card.style.margin,
                        zIndex: card.style.zIndex,
                        pointerEvents: card.style.pointerEvents
                    }
                };
            });

            if (model.photo != null && (!(model.photo instanceof Blob) || !model.photo.type.startsWith("image/"))) {
                console.error("A saved model has no valid image blob.", model);
                return;
            }

            const profileLink = document.createElement("a");
            profileLink.className = "model-card-profile";
            profileLink.draggable = false;
            profileLink.href = `perfil-modelo.html?id=${encodeURIComponent(model.id)}`;
            profileLink.setAttribute(
                "aria-label",
                currentLanguage === "en"
                    ? `Open profile: ${model.name}`
                    : `Abrir perfil: ${model.name}`
            );

            const photoFrame = document.createElement("div");
            photoFrame.className = "model-photo-frame";
            photoFrame.photoCrop = model.photoCrop;

            let image;
            if (model.photo instanceof Blob) {
                image = document.createElement("img");
                image.className = "model-photo";
                image.draggable = false;
                image.alt = model.name;
                image.addEventListener("load", () => {
                    window.ModelPhotoUtils.applyCrop(image, photoFrame, model.photoCrop);
                    if (photoCropObserver) {
                        photoCropObserver.observe(photoFrame);
                    }
                });
            } else {
                photoFrame.classList.add("sad-face-placeholder");
                photoFrame.setAttribute("aria-hidden", "true");
                photoFrame.innerHTML = '<svg viewBox="0 0 100 100" focusable="false"><circle cx="50" cy="50" r="36"></circle><circle class="sad-face-eye" cx="38" cy="43" r="3"></circle><circle class="sad-face-eye" cx="62" cy="43" r="3"></circle><path d="M35 68 Q50 52 65 68"></path></svg>';
                const noImageLabel = document.createElement("span");
                noImageLabel.className = "sad-face-label";
                noImageLabel.textContent = window.languageText("models.noImage");
                photoFrame.append(noImageLabel);
            }
            photoFrame.addEventListener("pointermove", event => {
                if (!image) {
                    return;
                }
                if (
                    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
                    card.classList.contains("is-dragging")
                ) {
                    return;
                }

                const bounds = photoFrame.getBoundingClientRect();
                if (!bounds.width || !bounds.height) {
                    return;
                }

                const pointerX = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
                const pointerY = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
                image.style.setProperty("--model-image-x", `${((pointerX - 0.5) * 8).toFixed(2)}px`);
                image.style.setProperty("--model-image-y", `${((pointerY - 0.5) * 8).toFixed(2)}px`);
            });
            photoFrame.addEventListener("pointerleave", () => {
                if (!image) {
                    return;
                }
                image.style.removeProperty("--model-image-x");
                image.style.removeProperty("--model-image-y");

                if (image.gifCard) {
                    image.gifCard.isPointerOver = false;
                    if (!gifsAlwaysActive) {
                        showGifCardImage(image.gifCard);
                    }
                }
            });
            try {
                if (model.photo instanceof Blob && model.photo.type.toLowerCase() === "image/gif") {
                    const gifCard = {
                        blob: model.photo,
                        frame: photoFrame,
                        image,
                        isPointerOver: false,
                        posterUrl: null,
                        posterFailed: false,
                        previewPromise: null,
                        url: URL.createObjectURL(model.photo)
                    };
                    image.gifCard = gifCard;
                    gifCards.push(gifCard);
                    photoUrls.push(gifCard.url);

                    photoFrame.addEventListener("pointerenter", () => {
                        gifCard.isPointerOver = true;
                        if (!gifsAlwaysActive) {
                            showGifCardImage(gifCard);
                        }
                    });

                    if (gifsAlwaysActive) {
                        if (image.src !== gifCard.url) {
                            image.src = gifCard.url;
                        }
                    } else {
                        showGifCardImage(gifCard);
                    }
                } else if (model.photo instanceof Blob) {
                    image.src = URL.createObjectURL(model.photo);
                    photoUrls.push(image.src);
                }
            } catch (error) {
                console.error("Could not display the saved model image.", error, model);
                return;
            }
            if (image) {
                photoFrame.append(image);
            }

            const heading = document.createElement("h2");
            heading.textContent = model.name;

            const nameRow = document.createElement("div");
            nameRow.className = "model-name-row";

            const actions = document.createElement("div");
            actions.className = "model-card-actions";

            const optionsButton = document.createElement("button");
            optionsButton.className = "model-edit-button";
            optionsButton.type = "button";
            optionsButton.textContent = "•••";
            optionsButton.title = translations[currentLanguage].options;
            optionsButton.setAttribute("aria-label", `${translations[currentLanguage].options}: ${model.name}`);
            optionsButton.setAttribute("aria-expanded", "false");

            const menu = document.createElement("div");
            menu.className = "model-card-menu";
            menu.hidden = true;

            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.textContent = translations[currentLanguage].edit;
            editButton.addEventListener("click", () => {
                menu.hidden = true;
                optionsButton.setAttribute("aria-expanded", "false");
                openEditForm(model);
            });

            const searchImageButton = document.createElement("button");
            searchImageButton.type = "button";
            searchImageButton.textContent = translations[currentLanguage].searchImage;
            searchImageButton.addEventListener("click", () => {
                menu.hidden = true;
                optionsButton.setAttribute("aria-expanded", "false");
                const searchUrl = new URL("https://www.google.com/search");
                searchUrl.searchParams.set("tbm", "isch");
                searchUrl.searchParams.set("q", model.name);
                window.open(searchUrl.href, "_blank", "noopener,noreferrer");
                openEditForm(model);
            });

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "model-card-delete";
            deleteButton.textContent = translations[currentLanguage].delete;
            deleteButton.addEventListener("click", () => {
                pendingDeleteModel = model;
                deletePrompt.textContent = translations[currentLanguage].deleteConfirm
                    .replace("{name}", model.name);
                deleteDialog.showModal();
            });

            menu.append(editButton, searchImageButton, deleteButton);
            optionsButton.setAttribute("aria-controls", `model-menu-${model.id}`);
            menu.id = `model-menu-${model.id}`;
            optionsButton.addEventListener("click", () => {
                const shouldOpen = menu.hidden;
                document.querySelectorAll(".model-card-menu").forEach(openMenu => {
                    openMenu.hidden = true;
                    openMenu.parentElement
                        .querySelector(".model-edit-button")
                        .setAttribute("aria-expanded", "false");
                });
                menu.hidden = !shouldOpen;
                optionsButton.setAttribute("aria-expanded", String(shouldOpen));
            });
            actions.append(optionsButton, menu);

            const copyButton = document.createElement("button");
            copyButton.className = "model-copy-button";
            copyButton.type = "button";
            copyButton.textContent = "⧉";
            copyButton.title = translations[currentLanguage].copyName;
            copyButton.setAttribute("aria-label", `${translations[currentLanguage].copyName}: ${model.name}`);
            copyButton.addEventListener("click", async () => {

                try {
                    await navigator.clipboard.writeText(model.name);
                    copyButton.textContent = "✓";
                    copyButton.title = translations[currentLanguage].copied;
                    copyButton.setAttribute("aria-label", `${translations[currentLanguage].copied}: ${model.name}`);
                } catch (error) {
                    console.error("Could not copy the model name.", error);
                    copyButton.title = translations[currentLanguage].copyError;
                    copyButton.setAttribute("aria-label", `${translations[currentLanguage].copyError} ${model.name}`);
                }

            });

            nameRow.append(heading);
            profileLink.append(photoFrame, nameRow);
            card.append(profileLink, actions, copyButton);
            container.append(card);

        });

        const isSearching = searchTerms.length > 0 || Boolean(nameQuery);
        if (isSearching && !categoryOpenStateBeforeSearch) {
            categoryOpenStateBeforeSearch = new Map(
                Array.from(categoryContainers.values(), container => {
                    const category = container.closest(".model-category");
                    return [category, category.open];
                })
            );
        }
        document.querySelectorAll(".model-rarity-group").forEach(group => {
            group.hidden = isSearching && !group.querySelector(".model-card");
        });
        categoryContainers.forEach(container => {
            const category = container.closest(".model-category");
            category.hidden = isSearching && !container.querySelector(".model-card");
            if (isSearching && !category.hidden) {
                category.open = true;
            }
        });
        if (!isSearching && categoryOpenStateBeforeSearch) {
            categoryOpenStateBeforeSearch.forEach((wasOpen, category) => {
                category.open = wasOpen;
            });
            categoryOpenStateBeforeSearch = null;
        }
        tagSearchStatus.hidden = !isSearching || filteredModels.length > 0;
        if (!tagSearchStatus.hidden) {
            tagSearchStatus.textContent = window.languageText("models.noTagResults");
        }

        if (previousPositions && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            requestAnimationFrame(() => {
                document.querySelectorAll(".model-card[data-model-id]").forEach(card => {
                    const previous = previousPositions.get(card.dataset.modelId);
                    if (!previous || !previous.width || !previous.height) {
                        return;
                    }

                    const current = card.getBoundingClientRect();
                    const offsetX = previous.left - current.left;
                    const offsetY = previous.top - current.top;
                    if (offsetX || offsetY) {
                        card.animate(
                            [
                                { transform: `translate(${offsetX}px, ${offsetY}px)` },
                                { transform: "translate(0, 0)" }
                            ],
                            {
                                duration: 240,
                                easing: "cubic-bezier(.2,.8,.2,1)"
                            }
                        );
                    }
                });
            });
        }

    }


    async function confirmDeleteModel() {

        if (!pendingDeleteModel) {
            return;
        }

        confirmDeleteButton.disabled = true;

        try {
            await deleteModels([pendingDeleteModel.id]);
            models = models.filter(model => model.id !== pendingDeleteModel.id);
            pendingDeleteModel = null;
            deleteDialog.close();
            renderModels();
        } catch (error) {
            console.error("Could not delete the model.", error);
            pageStatus.textContent = translations[currentLanguage].deleteError;
            pageStatus.hidden = false;
        } finally {
            confirmDeleteButton.disabled = false;
        }

    }


    function setFormStatus(message, isError) {

        formStatus.textContent = message;
        formStatus.classList.toggle("is-error", isError);
        formStatus.hidden = !message;

    }

    function createLinkRow(link = {}) {

        const row = document.createElement("div");
        row.className = "model-link-row";

        const labelInput = document.createElement("input");
        labelInput.type = "text";
        labelInput.maxLength = 60;
        labelInput.value = link.label || "";
        labelInput.placeholder = currentLanguage === "en" ? "Link name" : "Nome do link";
        labelInput.setAttribute(
            "aria-label",
            currentLanguage === "en" ? "Link name" : "Nome do link"
        );

        const urlInput = document.createElement("input");
        urlInput.type = "text";
        urlInput.inputMode = "url";
        urlInput.maxLength = 2048;
        urlInput.value = link.url || "";
        urlInput.placeholder = "URL (https://...)";
        urlInput.setAttribute(
            "aria-label",
            currentLanguage === "en" ? "Link URL" : "URL do link"
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
        removeButton.title = currentLanguage === "en" ? "Remove link" : "Remover link";
        removeButton.setAttribute("aria-label", removeButton.title);
        removeButton.addEventListener("click", () => row.remove());

        row.append(labelInput, urlInput, removeButton);
        return row;

    }

    function renderLinkRows(links = []) {

        linksContainer.replaceChildren(
            ...(links.length ? links : [{}]).map(createLinkRow)
        );

    }

    function readProfileLinks() {

        const links = [];

        for (const row of linksContainer.querySelectorAll(".model-link-row")) {

            const [labelInput, urlInput] = row.querySelectorAll("input");
            const label = labelInput.value.trim();
            const url = urlInput.value.trim();

            if (!label && !url) {
                continue;
            }

            if (!label || !url) {
                setFormStatus(translations[currentLanguage].linkIncomplete, true);
                (label ? urlInput : labelInput).focus();
                return null;
            }

            let parsedUrl;
            try {
                parsedUrl = new URL(url);
            } catch (error) {
                setFormStatus(translations[currentLanguage].linkInvalid, true);
                urlInput.focus();
                return null;
            }

            if (!["http:", "https:", "mailto:", "tel:"].includes(parsedUrl.protocol)) {
                setFormStatus(translations[currentLanguage].linkInvalid, true);
                urlInput.focus();
                return null;
            }

            links.push({ label, url });

        }

        return links;

    }

    function setPhotoCropPreview(blob, crop = {}) {

        if (photoCropPreviewUrl) {
            URL.revokeObjectURL(photoCropPreviewUrl);
            photoCropPreviewUrl = null;
        }

        photoCropSource = blob instanceof Blob ? blob : null;
        photoCrop = window.ModelPhotoUtils.normalizeCrop(crop);
        photoCropZoom.value = String(photoCrop.zoom);
        photoCropEditor.hidden = !(blob instanceof Blob);
        if (!(blob instanceof Blob)) {
            photoCropPreview.removeAttribute("src");
            return;
        }

        photoCropPreviewUrl = URL.createObjectURL(blob);
        photoCropPreview.src = photoCropPreviewUrl;
        if (photoCropPreview.complete && photoCropPreview.naturalWidth) {
            updatePhotoCropPreview();
        }

    }

    function updatePhotoCropPreview() {

        if (photoCropPreview.naturalWidth && !photoCropEditor.hidden) {
            const stage = photoCropFrame.getBoundingClientRect();
            const scale = Math.min(
                stage.width / photoCropPreview.naturalWidth,
                stage.height / photoCropPreview.naturalHeight
            );
            const imageWidth = photoCropPreview.naturalWidth * scale;
            const imageHeight = photoCropPreview.naturalHeight * scale;
            const imageLeft = (stage.width - imageWidth) / 2;
            const imageTop = (stage.height - imageHeight) / 2;
            const cropAspectRatio = 4 / 5;
            const imageAspectRatio = photoCropPreview.naturalWidth / photoCropPreview.naturalHeight;
            const baseWidth = imageAspectRatio >= cropAspectRatio ? cropAspectRatio / imageAspectRatio : 1;
            const baseHeight = imageAspectRatio >= cropAspectRatio ? 1 : imageAspectRatio / cropAspectRatio;
            const selectionWidth = imageWidth * baseWidth / photoCrop.zoom;
            const selectionHeight = imageHeight * baseHeight / photoCrop.zoom;
            const rangeX = imageWidth - selectionWidth;
            const rangeY = imageHeight - selectionHeight;

            photoCropPreview.style.width = `${imageWidth}px`;
            photoCropPreview.style.height = `${imageHeight}px`;
            photoCropPreview.style.left = `${imageLeft}px`;
            photoCropPreview.style.top = `${imageTop}px`;
            photoCropSelection.style.width = `${selectionWidth}px`;
            photoCropSelection.style.height = `${selectionHeight}px`;
            photoCropSelection.style.left = `${imageLeft + rangeX * (1 - photoCrop.x) / 2}px`;
            photoCropSelection.style.top = `${imageTop + rangeY * (1 - photoCrop.y) / 2}px`;
            photoCropFrame.dataset.panRangeX = String(rangeX);
            photoCropFrame.dataset.panRangeY = String(rangeY);
        }

    }

    function openCreateForm() {

        editingModelId = null;
        form.reset();
        tagPresetsList.hidden = true;
        tagPresetsToggle.setAttribute("aria-expanded", "false");
        updateTagPresetButtons();
        setPhotoCropPreview(null);
        renderLinkRows();
        photoInput.required = false;
        photoHelp.dataset.i18n = "models.photoOptionalCreate";
        photoHelp.textContent = currentLanguage === "en"
                ? "Optional. Download an image from the search, return here, and select it; PNG/JPEG/BMP may be optimized when saved."
                : "Opcional. Baixe uma imagem da busca, volte aqui e selecione-a; PNG/JPEG/BMP podem ser otimizadas ao salvar.";
        photoHelp.hidden = false;
        formHeading.dataset.i18n = "models.formHeading";
        formHeading.textContent = currentLanguage === "en" ? "Create model" : "Criar modelo";
        submitButton.dataset.i18n = "models.save";
        submitButton.textContent = currentLanguage === "en" ? "Save model" : "Salvar modelo";
        setFormStatus("", false);
        dialog.showModal();
        nameInput.focus();

    }


    function openEditForm(model) {

        editingModelId = model.id;
        form.reset();
        nameInput.value = model.name;
        alternateNamesInput.value = parseAlternateNames(model.alternateNames).join(", ");
        descriptionInput.value = model.description || "";
        tagsInput.value = Array.isArray(model.tags)
            ? model.tags.map(tag => `#${tag}`).join(" ")
            : "";
        tagPresetsList.hidden = true;
        tagPresetsToggle.setAttribute("aria-expanded", "false");
        updateTagPresetButtons();
        setPhotoCropPreview(model.photo, model.photoCrop);
        renderLinkRows(Array.isArray(model.links) ? model.links : []);
        categoryInput.value = model.category;
        rarityInput.value = RARITIES.includes(model.rarity) ? model.rarity : "common";
        photoInput.required = false;
        photoHelp.dataset.i18n = "models.photoOptional";
        photoHelp.textContent = currentLanguage === "en"
            ? "Leave blank to keep the current photo. Download an image from the search and select it here; PNG/JPEG/BMP may be optimized when saved."
            : "Deixe em branco para manter a foto atual. Baixe uma imagem da busca e selecione-a aqui; PNG/JPEG/BMP podem ser otimizadas ao salvar.";
        photoHelp.hidden = false;
        formHeading.dataset.i18n = "models.formEditHeading";
        formHeading.textContent = currentLanguage === "en" ? "Edit model" : "Editar modelo";
        submitButton.dataset.i18n = "models.update";
        submitButton.textContent = currentLanguage === "en" ? "Save changes" : "Salvar alterações";
        setFormStatus("", false);
        dialog.showModal();
        updatePhotoCropPreview();
        nameInput.focus();

    }


    openButton.addEventListener("click", openCreateForm);
    tagSearchInput.placeholder = window.languageText("models.searchPlaceholder");
    tagSearchInput.addEventListener("input", () => renderModels());
    tagsInput.addEventListener("input", updateTagPresetButtons);
    tagPresetsToggle.addEventListener("click", () => {
        tagPresetsList.hidden = !tagPresetsList.hidden;
        tagPresetsToggle.setAttribute("aria-expanded", String(!tagPresetsList.hidden));
    });
    tagPresetsList.addEventListener("click", event => {
        const presetButton = event.target.closest("[data-model-tag]");
        if (presetButton) {
            togglePresetTag(presetButton.dataset.modelTag);
        }
    });
    photoInput.addEventListener("change", () => {
        const selectedPhoto = photoInput.files[0];
        if (selectedPhoto) {
            setPhotoCropPreview(selectedPhoto);
        } else if (!editingModelId) {
            setPhotoCropPreview(null);
        }
    });
    photoCropPreview.addEventListener("load", updatePhotoCropPreview);
    photoCropZoom.addEventListener("input", () => {
        photoCrop = window.ModelPhotoUtils.normalizeCrop({
            ...photoCrop,
            zoom: photoCropZoom.value
        });
        updatePhotoCropPreview();
    });
    resetPhotoCropButton.addEventListener("click", () => {
        setPhotoCropPreview(photoCropSource);
    });
    photoCropFrame.addEventListener("pointerdown", event => {
        if (event.button !== 0 || !photoCropPreview.naturalWidth || event.target !== photoCropSelection) {
            return;
        }

        event.preventDefault();
        photoCropFrame.setPointerCapture(event.pointerId);
        cropDragStart = {
            pointerId: event.pointerId,
            clientX: event.clientX,
            clientY: event.clientY,
            crop: { ...photoCrop }
        };
    });
    photoCropFrame.addEventListener("pointermove", event => {
        if (!cropDragStart || cropDragStart.pointerId !== event.pointerId) {
            return;
        }

        const panRangeX = Number(photoCropFrame.dataset.panRangeX);
        const panRangeY = Number(photoCropFrame.dataset.panRangeY);
        photoCrop = window.ModelPhotoUtils.normalizeCrop({
            ...cropDragStart.crop,
            x: panRangeX ? cropDragStart.crop.x - 2 * (event.clientX - cropDragStart.clientX) / panRangeX : 0,
            y: panRangeY ? cropDragStart.crop.y - 2 * (event.clientY - cropDragStart.clientY) / panRangeY : 0
        });
        updatePhotoCropPreview();
    });
    const finishPhotoCropDrag = event => {
        if (cropDragStart && cropDragStart.pointerId === event.pointerId) {
            cropDragStart = null;
        }
    };
    photoCropFrame.addEventListener("pointerup", finishPhotoCropDrag);
    photoCropFrame.addEventListener("pointercancel", finishPhotoCropDrag);
    window.addEventListener("resize", updatePhotoCropPreview);
    dialog.addEventListener("close", () => {
        setPhotoCropPreview(null);
        cropDragStart = null;
    });
    addLinkButton.addEventListener("click", () => {
        linksContainer.append(createLinkRow());
    });

    exportModelsButton.addEventListener("click", async () => {
        exportModelsButton.disabled = true;
        try {
            await exportModels();
        } catch (error) {
            console.error("Could not export model cards.", error);
            modelsTransferStatus.textContent = translations[currentLanguage].exportError;
            modelsTransferStatus.classList.add("is-error");
            modelsTransferStatus.hidden = false;
        } finally {
            exportModelsButton.disabled = false;
        }
    });

    importModelsButton.addEventListener("click", () => importModelsInput.click());
    async function importSelectedModelsFile(input, button, errorMessage) {
        const file = input.files[0];
        input.value = "";
        if (!file) {
            return;
        }

        button.disabled = true;
        try {
            await importModels(file);
        } catch (error) {
            console.error("Could not import model cards.", error);
            modelsTransferStatus.textContent = errorMessage;
            modelsTransferStatus.classList.add("is-error");
            modelsTransferStatus.hidden = false;
        } finally {
            button.disabled = false;
        }
    }

    importModelsInput.addEventListener("change", () => {
        importSelectedModelsFile(
            importModelsInput,
            importModelsButton,
            translations[currentLanguage].importError
        );
    });

    importTestModelsButton.addEventListener("click", async () => {
        if (window.location.protocol === "file:") {
            modelsTransferStatus.classList.remove("is-error");
            modelsTransferStatus.textContent = translations[currentLanguage].testImportFileHint;
            modelsTransferStatus.hidden = false;
            importTestModelsInput.click();
            return;
        }

        importTestModelsButton.disabled = true;
        try {
            const response = await fetch("dados-teste/modelos-colecao-1-2026-11-11.json");
            if (!response.ok) {
                throw new Error(`Could not load the test backup: ${response.status}`);
            }
            await importModels(await response.blob());
        } catch (error) {
            console.error("Could not import test model cards.", error);
            modelsTransferStatus.textContent = translations[currentLanguage].testImportError;
            modelsTransferStatus.classList.add("is-error");
            modelsTransferStatus.hidden = false;
        } finally {
            importTestModelsButton.disabled = false;
        }
    });

    importTestModelsInput.addEventListener("change", () => {
        importSelectedModelsFile(
            importTestModelsInput,
            importTestModelsButton,
            translations[currentLanguage].importError
        );
    });

    closeButton.addEventListener("click", () => dialog.close());
    cancelButton.addEventListener("click", () => dialog.close());
    document.getElementById("closeDeleteModelDialog").addEventListener("click", () => {
        deleteDialog.close();
        pendingDeleteModel = null;
    });
    document.getElementById("cancelDeleteModel").addEventListener("click", () => {
        deleteDialog.close();
        pendingDeleteModel = null;
    });
    confirmDeleteButton.addEventListener("click", confirmDeleteModel);
    deleteDialog.addEventListener("click", event => {
        if (event.target === deleteDialog) {
            deleteDialog.close();
            pendingDeleteModel = null;
        }
    });
    deleteDialog.addEventListener("close", () => {
        pendingDeleteModel = null;
    });

    form.addEventListener("submit", async event => {

        event.preventDefault();
        setFormStatus("", false);

        const name = nameInput.value.trim();
        const alternateNames = parseAlternateNames(alternateNamesInput.value);
        const description = descriptionInput.value.trim();
        const tags = parseTags(tagsInput.value);
        const links = readProfileLinks();
        const photo = photoInput.files[0];
        const selectedPhotoCrop = { ...photoCrop };
        const category = categoryInput.value;
        const rarity = rarityInput.value;

        if (!name) {
            setFormStatus(translations[currentLanguage].nameRequired, true);
            form.reportValidity();
            return;
        }

        if (!links) {
            return;
        }

        if (photo && !photo.type.startsWith("image/")) {
            setFormStatus(translations[currentLanguage].invalidPhoto, true);
            photoInput.focus();
            return;
        }

        if (!categoryContainers.has(category)) {
            setFormStatus(translations[currentLanguage].invalidCategory, true);
            categoryInput.focus();
            return;
        }

        if (!RARITIES.includes(rarity)) {
            setFormStatus(translations[currentLanguage].invalidRarity, true);
            rarityInput.focus();
            return;
        }

        submitButton.disabled = true;

        try {

            const existingModel = models.find(model => model.id === editingModelId);
            const preparedPhoto = photo
                ? await window.ModelPhotoUtils.prepare(photo)
                : null;
            const sameGroup = existingModel
                && String(existingModel.category) === category
                && getRarity(existingModel) === rarity;
            const model = {
                id: editingModelId || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                name,
                alternateNames,
                description,
                tags,
                links,
                photo: preparedPhoto || (existingModel && existingModel.photo) || null,
                photoCrop: preparedPhoto
                    ? selectedPhotoCrop
                    : existingModel && existingModel.photo
                        ? selectedPhotoCrop
                    : existingModel
                        ? window.ModelPhotoUtils.normalizeCrop(existingModel.photoCrop)
                        : window.ModelPhotoUtils.normalizeCrop(),
                category,
                rarity,
                collectionId: existingModel ? existingModel.collectionId : currentCollectionId,
                position: sameGroup && Number.isFinite(existingModel.position)
                    ? existingModel.position
                    : getNextPosition(
                        category,
                        rarity,
                        existingModel ? models.filter(savedModel => savedModel.id !== existingModel.id) : models
                    ),
                createdAt: existingModel ? existingModel.createdAt : Date.now()
            };

            await saveModel(model);
            if (existingModel) {
                models = models.map(savedModel => savedModel.id === model.id ? model : savedModel);
            } else {
                models.push(model);
            }
            renderModels();
            categoryContainers.get(category).closest(".model-category").open = true;
            dialog.close();
            form.reset();
            editingModelId = null;

        } catch (error) {

            console.error("Could not save the model.", error);
            setFormStatus(
                translations[currentLanguage][editingModelId ? "updateError" : "saveError"],
                true
            );

        } finally {

            submitButton.disabled = false;

        }

    });

    function updateCollectionMenu() {
        modelsCollectionsMenu.querySelectorAll("[data-model-collection]").forEach(option => {
            option.setAttribute(
                "aria-pressed",
                String(option.dataset.modelCollection === currentCollectionId)
            );
        });
    }

    async function switchCollection(collectionId) {
        if (!COLLECTION_IDS.includes(collectionId)) {
            return;
        }

        if (collectionId === currentCollectionId) {
            modelsCollectionsMenu.hidden = true;
            modelsCollectionsButton.setAttribute("aria-expanded", "false");
            return;
        }

        const requestId = ++collectionSwitchRequest;
        modelsCollectionsButton.disabled = true;

        try {
            const savedModels = await getSavedModels();
            if (requestId !== collectionSwitchRequest) {
                return;
            }

            currentCollectionId = collectionId;
            models = savedModels.filter(model => model.collectionId === currentCollectionId);
            tagSearchInput.value = "";
            modelsCollectionsMenu.hidden = true;
            modelsCollectionsButton.setAttribute("aria-expanded", "false");
            updateCollectionMenu();

            try {
                localStorage.setItem(CURRENT_COLLECTION_KEY, currentCollectionId);
            } catch (error) {
                console.warn("Could not save the selected model collection.", error);
            }

            renderModels();
        } catch (error) {
            console.error("Could not switch model collections.", error);
            pageStatus.textContent = translations[currentLanguage].loadError;
            pageStatus.hidden = false;
        } finally {
            if (requestId === collectionSwitchRequest) {
                modelsCollectionsButton.disabled = false;
            }
        }
    }

    modelsCollectionsButton.addEventListener("click", event => {
        event.stopPropagation();
        modelsPageSettingsMenu.hidden = true;
        modelsPageSettingsButton.setAttribute("aria-expanded", "false");
        const shouldOpen = modelsCollectionsMenu.hidden;
        modelsCollectionsMenu.hidden = !shouldOpen;
        modelsCollectionsButton.setAttribute("aria-expanded", String(shouldOpen));
    });

    modelsCollectionsMenu.addEventListener("click", event => {
        event.stopPropagation();
        const option = event.target.closest("[data-model-collection]");
        if (option) {
            switchCollection(option.dataset.modelCollection);
        }
    });

    modelsPageSettingsButton.addEventListener("click", event => {
        event.stopPropagation();
        modelsCollectionsMenu.hidden = true;
        modelsCollectionsButton.setAttribute("aria-expanded", "false");
        const shouldOpen = modelsPageSettingsMenu.hidden;
        modelsPageSettingsMenu.hidden = !shouldOpen;
        modelsPageSettingsButton.setAttribute("aria-expanded", String(shouldOpen));
    });

    modelsPageSettingsMenu.addEventListener("click", event => {
        event.stopPropagation();
    });

    document.addEventListener("click", event => {
        if (!event.target.closest(".models-page-settings")) {
            modelsPageSettingsMenu.hidden = true;
            modelsPageSettingsButton.setAttribute("aria-expanded", "false");
            modelsCollectionsMenu.hidden = true;
            modelsCollectionsButton.setAttribute("aria-expanded", "false");
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !modelsCollectionsMenu.hidden) {
            modelsCollectionsMenu.hidden = true;
            modelsCollectionsButton.setAttribute("aria-expanded", "false");
            modelsCollectionsButton.focus();
            return;
        }
        if (event.key === "Escape" && !modelsPageSettingsMenu.hidden) {
            modelsPageSettingsMenu.hidden = true;
            modelsPageSettingsButton.setAttribute("aria-expanded", "false");
            modelsPageSettingsButton.focus();
        }
    });

    modelGifsAlwaysActiveCheckbox.addEventListener("change", () => {
        const previousValue = gifsAlwaysActive;
        const nextValue = modelGifsAlwaysActiveCheckbox.checked;

        try {
            localStorage.setItem(GIF_ANIMATION_SETTING_KEY, String(nextValue));
        } catch (error) {
            console.error("Could not save the model GIF animation preference.", error);
            modelGifsAlwaysActiveCheckbox.checked = previousValue;
            pageStatus.textContent = translations[currentLanguage].gifSettingsSaveError;
            pageStatus.hidden = false;
            return;
        }

        gifsAlwaysActive = nextValue;
        gifCards.forEach(showGifCardImage);
    });

    document.addEventListener("app-language-change", event => {
        currentLanguage = event.detail.language;
        tagSearchInput.placeholder = window.languageText("models.searchPlaceholder");
        if (pendingDeleteModel) {
            deletePrompt.textContent = translations[currentLanguage].deleteConfirm
                .replace("{name}", pendingDeleteModel.name);
        }
        renderModels();
        linksContainer.querySelectorAll(".model-link-row").forEach(row => {
            const [labelInput, urlInput] = row.querySelectorAll("input");
            labelInput.placeholder = currentLanguage === "en" ? "Link name" : "Nome do link";
            labelInput.setAttribute("aria-label", labelInput.placeholder);
            urlInput.setAttribute(
                "aria-label",
                currentLanguage === "en" ? "Link URL" : "URL do link"
            );
            const removeButton = row.querySelector("button");
            removeButton.title = currentLanguage === "en" ? "Remove link" : "Remover link";
            removeButton.setAttribute("aria-label", removeButton.title);
        });
        if (dialog.open) {
            const isEditing = Boolean(editingModelId);
            formHeading.textContent = currentLanguage === "en"
                ? (isEditing ? "Edit model" : "Create model")
                : (isEditing ? "Editar modelo" : "Criar modelo");
            submitButton.textContent = currentLanguage === "en"
                ? (isEditing ? "Save changes" : "Save model")
                : (isEditing ? "Salvar alterações" : "Salvar modelo");
        }
    });

    openDatabase()
        .then(async openedDatabase => {
            database = openedDatabase;
            let savedModels = await getSavedModels();
            let collectionAssignmentsChanged = false;
            savedModels = savedModels.map(model => {
                if (COLLECTION_IDS.includes(model.collectionId)) {
                    return model;
                }

                collectionAssignmentsChanged = true;
                return { ...model, collectionId: "1" };
            });
            if (collectionAssignmentsChanged) {
                await saveModels(savedModels);
            }

            const category6Models = savedModels.filter(model => String(model.category) === "6");
            if (category6Models.length) {
                try {
                    await deleteModels(category6Models.map(model => model.id));
                    pageStatus.textContent = translations[currentLanguage].category6Deleted
                        .replace("{count}", String(category6Models.length));
                } catch (error) {
                    console.error("Could not delete models from removed category 6.", error);
                    pageStatus.textContent = translations[currentLanguage].category6DeleteError;
                }
                pageStatus.hidden = false;
            }

            savedModels = savedModels.filter(model => String(model.category) !== "6");
            let positionsChanged = false;
            COLLECTION_IDS.forEach(collectionId => {
                const collectionModels = savedModels.filter(
                    model => model.collectionId === collectionId
                );
                positionsChanged = normalizeModelPositions(collectionModels) || positionsChanged;
            });
            if (positionsChanged) {
                await saveModels(savedModels);
            }

            models = savedModels.filter(model => model.collectionId === currentCollectionId);
            modelsCollectionsButton.disabled = false;
            updateCollectionMenu();
            renderModels();
        })
        .catch(error => {
            console.error("Could not load saved models.", error);
            pageStatus.textContent = translations[currentLanguage].loadError;
            pageStatus.hidden = false;
        });

    renderRarityGroups();

})();
