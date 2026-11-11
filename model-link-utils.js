(() => {

    const knownSiteNames = new Map([
        ["discord.com", "Discord"],
        ["facebook.com", "Facebook"],
        ["github.com", "GitHub"],
        ["instagram.com", "Instagram"],
        ["linkedin.com", "LinkedIn"],
        ["pinterest.com", "Pinterest"],
        ["reddit.com", "Reddit"],
        ["soundcloud.com", "SoundCloud"],
        ["spotify.com", "Spotify"],
        ["tiktok.com", "TikTok"],
        ["twitch.tv", "Twitch"],
        ["twitter.com", "X"],
        ["x.com", "X"],
        ["youtube.com", "YouTube"],
        ["youtu.be", "YouTube"],
        ["wa.me", "WhatsApp"],
        ["whatsapp.com", "WhatsApp"],
        ["t.me", "Telegram"],
        ["telegram.me", "Telegram"]
    ]);

    function parseWebUrl(value) {

        try {
            const url = new URL(value);
            return ["http:", "https:"].includes(url.protocol) ? url : null;
        } catch (error) {
            return null;
        }

    }

    function getSiteName(value) {

        const url = parseWebUrl(value);
        if (!url) {
            return "";
        }

        const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
        for (const [knownDomain, name] of knownSiteNames) {
            if (hostname === knownDomain || hostname.endsWith(`.${knownDomain}`)) {
                return name;
            }
        }

        const sitePart = hostname
            .replace(/^www\./, "")
            .split(".")
            .find(part => !["app", "link", "links", "m", "mobile", "web"].includes(part));

        if (!sitePart) {
            return hostname;
        }

        return sitePart.charAt(0).toUpperCase() + sitePart.slice(1);

    }

    function getFaviconUrl(value) {

        const url = parseWebUrl(value);
        return url ? new URL("/favicon.ico", url.origin).href : "";

    }

    window.ModelLinkUtils = { getFaviconUrl, getSiteName };

})();
