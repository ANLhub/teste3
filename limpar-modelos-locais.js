(() => {
    const DATABASE_NAME = "video-studio-models";
    const STORE_NAME = "models";
    const clearButton = document.getElementById("clearModelDataBtn");
    const status = document.getElementById("clearModelDataStatus");

    function languageText(key) {
        return window.languageText ? window.languageText(key) : key;
    }

    function clearSavedModels() {
        return new Promise((resolve, reject) => {
            if (!("indexedDB" in window)) {
                reject(new Error("IndexedDB is not supported."));
                return;
            }

            const request = indexedDB.open(DATABASE_NAME);

            request.onerror = () => reject(request.error || new Error("Could not open the model database."));
            request.onblocked = () => reject(new Error("Opening the model database was blocked."));
            request.onsuccess = () => {
                const database = request.result;

                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    database.close();
                    resolve();
                    return;
                }

                let transaction;
                try {
                    transaction = database.transaction(STORE_NAME, "readwrite");
                    transaction.objectStore(STORE_NAME).clear();
                } catch (error) {
                    database.close();
                    reject(error);
                    return;
                }

                transaction.oncomplete = () => {
                    database.close();
                    resolve();
                };
                transaction.onerror = () => {
                    const error = transaction.error || new Error("Could not clear the model database.");
                    database.close();
                    reject(error);
                };
                transaction.onabort = () => {
                    const error = transaction.error || new Error("Clearing the model database was aborted.");
                    database.close();
                    reject(error);
                };
            };
        });
    }

    clearButton.addEventListener("click", async () => {
        if (!window.confirm(languageText("models.clearLocalDataConfirm"))) {
            return;
        }

        clearButton.disabled = true;
        status.hidden = false;
        status.textContent = languageText("models.clearLocalDataWorking");

        try {
            await clearSavedModels();
            status.textContent = languageText("models.clearLocalDataDone");
            window.setTimeout(() => window.location.reload(), 800);
        } catch (error) {
            console.error("Could not clear locally saved model data.", error);
            status.textContent = languageText("models.clearLocalDataError");
        } finally {
            clearButton.disabled = false;
        }
    });
})();
