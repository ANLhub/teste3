const feedbackFooter = document.querySelector(".site-footer");
const feedbackGuideLink =
    feedbackFooter?.querySelector('a[href="como-usar.html"]');

if (feedbackFooter && feedbackGuideLink) {

    const feedbackText = key =>
        window.languageText
            ? window.languageText(key)
            : key;
    const openButton = document.createElement("button");

    openButton.className = "feedback-open-button";
    openButton.type = "button";
    openButton.setAttribute("aria-haspopup", "dialog");
    openButton.setAttribute("aria-controls", "feedbackDialog");
    openButton.dataset.i18n = "feedback.open";
    openButton.textContent = feedbackText("feedback.open");
    feedbackGuideLink.insertAdjacentElement("afterend", openButton);

    const dialog = document.createElement("dialog");

    dialog.id = "feedbackDialog";
    dialog.className = "feedback-dialog";
    dialog.setAttribute("aria-labelledby", "feedbackTitle");
    dialog.innerHTML = `
        <form class="feedback-form">
            <div class="feedback-dialog-heading">
                <h2 id="feedbackTitle" data-i18n="feedback.title">Enviar feedback</h2>
                <button
                    class="feedback-close-button"
                    type="button"
                    aria-label="Fechar"
                    data-i18n-aria-label="feedback.close"
                    data-i18n-title="feedback.close">×</button>
            </div>
            <label for="feedbackEmail" data-i18n="feedback.emailLabel">Seu e-mail</label>
            <input
                id="feedbackEmail"
                name="email"
                type="email"
                autocomplete="email"
                required>
            <label for="feedbackMessage" data-i18n="feedback.messageLabel">Seu feedback</label>
            <textarea
                id="feedbackMessage"
                name="message"
                rows="7"
                maxlength="5000"
                required
                aria-describedby="feedbackTextHint"></textarea>
            <p id="feedbackTextHint" class="feedback-hint" data-i18n="feedback.textHint">
                Somente texto. Não inclua links; não é possível anexar arquivos.
            </p>
            <p
                class="feedback-status"
                role="status"
                aria-live="polite"></p>
            <button
                class="feedback-submit-button"
                type="submit"
                data-i18n="feedback.submit">Enviar feedback</button>
        </form>
    `;

    document.body.append(dialog);

    const feedbackForm = dialog.querySelector(".feedback-form");
    const messageInput = dialog.querySelector("#feedbackMessage");
    const feedbackStatus = dialog.querySelector(".feedback-status");
    const closeButton = dialog.querySelector(".feedback-close-button");
    let feedbackStatusKey = "";
    const linkPattern =
        /(?:\b[a-z][a-z\d+.-]*:\/\/\S+|\b(?:www\.|mailto:|ftp:|file:)\S+|\b[a-z\d-]+(?:\.[a-z\d-]+)+\b)/i;

    function updateFeedbackLanguage() {

        dialog.querySelectorAll("[data-i18n]")
            .forEach(
                element => {

                    element.textContent =
                        feedbackText(element.dataset.i18n);

                }
            );

        dialog.querySelectorAll("[data-i18n-aria-label]")
            .forEach(
                element => {

                    element.setAttribute(
                        "aria-label",
                        feedbackText(element.dataset.i18nAriaLabel)
                    );

                }
            );

        dialog.querySelectorAll("[data-i18n-title]")
            .forEach(
                element => {

                    element.title =
                        feedbackText(element.dataset.i18nTitle);

                }
            );

        openButton.textContent = feedbackText("feedback.open");
        validateFeedbackText();
        feedbackStatus.textContent =
            feedbackStatusKey ? feedbackText(feedbackStatusKey) : "";

    }

    function validateFeedbackText() {

        const containsLink = linkPattern.test(messageInput.value);

        messageInput.setCustomValidity(
            containsLink
                ? feedbackText("feedback.linksNotAllowed")
                : ""
        );

        return !containsLink;

    }

    openButton.addEventListener(
        "click",
        () => {

            feedbackStatusKey = "";
            feedbackStatus.textContent = "";
            dialog.showModal();

        }
    );

    closeButton.addEventListener("click", () => dialog.close());

    dialog.addEventListener(
        "click",
        event => {

            if (event.target === dialog) {

                dialog.close();

            }

        }
    );

    messageInput.addEventListener(
        "input",
        () => {

            validateFeedbackText();
            feedbackStatusKey = "";
            feedbackStatus.textContent = "";

        }
    );

    feedbackForm.addEventListener(
        "submit",
        event => {

            event.preventDefault();

            if (!validateFeedbackText()) {

                messageInput.reportValidity();

                return;

            }

            feedbackStatusKey = "feedback.visualOnly";
            feedbackStatus.textContent = feedbackText(feedbackStatusKey);

        }
    );

    document.addEventListener(
        "app-language-change",
        updateFeedbackLanguage
    );

    updateFeedbackLanguage();

}
