(() => {

    async function isAnimatedPng(file) {

        const bytes = await file.slice(0, Math.min(file.size, 1024 * 1024)).arrayBuffer();
        const view = new DataView(bytes);
        for (let offset = 8; offset + 8 <= view.byteLength;) {
            const length = view.getUint32(offset);
            const type = String.fromCharCode(
                view.getUint8(offset + 4),
                view.getUint8(offset + 5),
                view.getUint8(offset + 6),
                view.getUint8(offset + 7)
            );
            if (type === "acTL") {
                return true;
            }
            if (type === "IDAT") {
                return false;
            }
            if (offset + 12 + length > view.byteLength) {
                return true;
            }
            offset += 12 + length;
        }

        return false;

    }

    async function prepare(file) {

        if (!file || !file.type.startsWith("image/")) {
            return file;
        }

        let shouldOptimize = file.type === "image/jpeg" || file.type === "image/bmp";
        if (file.type === "image/png") {
            try {
                shouldOptimize = !(await isAnimatedPng(file));
            } catch (error) {
                console.warn("Could not check whether the selected PNG is animated.", error);
                return file;
            }
        }
        if (!shouldOptimize) {
            return file;
        }

        let bitmap;
        try {
            bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
        } catch (error) {
            console.warn("Could not decode the selected image for optimization.", error);
            return file;
        }

        try {
            const canvas = document.createElement("canvas");
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const context = canvas.getContext("2d", { alpha: true });
            if (!context) {
                return file;
            }

            context.drawImage(bitmap, 0, 0);
            const candidates = [file];
            const png = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
            if (png) {
                candidates.push(png);
            }

            const hasTransparency = context.getImageData(0, 0, canvas.width, canvas.height)
                .data.some((value, index) => index % 4 === 3 && value < 255);
            if (!hasTransparency) {
                const jpeg = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.96));
                if (jpeg) {
                    candidates.push(jpeg);
                }
            }

            return candidates.reduce((smallest, candidate) =>
                candidate.size < smallest.size ? candidate : smallest
            );
        } catch (error) {
            console.warn("Could not optimize the selected image; keeping the original.", error);
            return file;
        } finally {
            bitmap.close();
        }

    }

    function normalizeCrop(crop = {}) {

        const x = Number(crop.x);
        const y = Number(crop.y);
        const zoom = Number(crop.zoom);
        return {
            x: Number.isFinite(x) ? Math.min(1, Math.max(-1, x)) : 0,
            y: Number.isFinite(y) ? Math.min(1, Math.max(-1, y)) : 0,
            zoom: Number.isFinite(zoom) ? Math.min(3, Math.max(1, zoom)) : 1
        };

    }

    function getPanRange(image, frame, crop) {

        if (!image.naturalWidth || !image.naturalHeight) {
            return { x: 0, y: 0 };
        }

        const bounds = frame.getBoundingClientRect();
        const coverScale = Math.max(
            bounds.width / image.naturalWidth,
            bounds.height / image.naturalHeight
        );
        const normalizedCrop = normalizeCrop(crop);
        return {
            x: Math.max(0, (image.naturalWidth * coverScale * normalizedCrop.zoom - bounds.width) / 2),
            y: Math.max(0, (image.naturalHeight * coverScale * normalizedCrop.zoom - bounds.height) / 2)
        };

    }

    function applyCrop(image, frame, crop) {

        const normalizedCrop = normalizeCrop(crop);
        const bounds = frame.getBoundingClientRect();
        const coverScale = Math.max(
            bounds.width / image.naturalWidth,
            bounds.height / image.naturalHeight
        );
        const panRange = getPanRange(image, frame, normalizedCrop);
        image.style.position = "absolute";
        image.style.left = "50%";
        image.style.top = "50%";
        image.style.width = `${image.naturalWidth * coverScale}px`;
        image.style.height = `${image.naturalHeight * coverScale}px`;
        image.style.setProperty("--photo-zoom", String(normalizedCrop.zoom));
        image.style.setProperty(
            "--photo-pan-x",
            `${normalizedCrop.x * panRange.x / normalizedCrop.zoom}px`
        );
        image.style.setProperty(
            "--photo-pan-y",
            `${normalizedCrop.y * panRange.y / normalizedCrop.zoom}px`
        );

    }

    window.ModelPhotoUtils = { applyCrop, getPanRange, normalizeCrop, prepare };

})();
