(() => {

    const COLOR_BINS_PER_CHANNEL = 32;
    const COLOR_BIN_COUNT = COLOR_BINS_PER_CHANNEL ** 3;


    function createHistogram() {

        return new Uint32Array(COLOR_BIN_COUNT);

    }


    function getColorBin(red, green, blue) {

        return ((red >> 3) << 10) | ((green >> 3) << 5) | (blue >> 3);

    }


    function addToHistogram(rgba, histogram) {

        if (histogram.length !== COLOR_BIN_COUNT) {

            throw new Error("O histograma de cores possui dimensões inválidas.");

        }

        for (let offset = 0; offset < rgba.length; offset += 4) {

            histogram[
                getColorBin(
                    rgba[offset],
                    rgba[offset + 1],
                    rgba[offset + 2]
                )
            ]++;

        }

    }


    function getBinColor(bin, channelShift) {

        return (((bin >> channelShift) & 31) << 3) + 4;

    }


    function measureColorRange(points) {

        const minimum = [255, 255, 255];
        const maximum = [0, 0, 0];

        for (const point of points) {

            minimum[0] = Math.min(minimum[0], point.red);
            minimum[1] = Math.min(minimum[1], point.green);
            minimum[2] = Math.min(minimum[2], point.blue);
            maximum[0] = Math.max(maximum[0], point.red);
            maximum[1] = Math.max(maximum[1], point.green);
            maximum[2] = Math.max(maximum[2], point.blue);

        }

        return maximum.map((value, channel) => value - minimum[channel]);

    }


    function createPalette(histogram) {

        if (histogram.length !== COLOR_BIN_COUNT) {

            throw new Error("O histograma de cores possui dimensões inválidas.");

        }

        const points = [];

        for (let bin = 0; bin < histogram.length; bin++) {

            const count = histogram[bin];

            if (count > 0) {

                points.push({
                    bin,
                    count,
                    red: getBinColor(bin, 10),
                    green: getBinColor(bin, 5),
                    blue: getBinColor(bin, 0)
                });

            }

        }

        if (!points.length) {

            throw new Error("Não foi possível encontrar cores nos quadros do GIF.");

        }

        const boxes = [points];

        while (boxes.length < 256) {

            let selectedBoxIndex = -1;
            let selectedChannel = 0;
            let selectedScore = -1;

            for (let boxIndex = 0; boxIndex < boxes.length; boxIndex++) {

                const box = boxes[boxIndex];

                if (box.length < 2) {

                    continue;

                }

                const ranges = measureColorRange(box);
                const channel = ranges.indexOf(Math.max(...ranges));
                const weight = box.reduce((total, point) => total + point.count, 0);
                const score = ranges[channel] * Math.sqrt(weight);

                if (score > selectedScore) {

                    selectedBoxIndex = boxIndex;
                    selectedChannel = channel;
                    selectedScore = score;

                }

            }

            if (selectedBoxIndex < 0) {

                break;

            }

            const box = boxes.splice(selectedBoxIndex, 1)[0];
            const channelNames = ["red", "green", "blue"];
            const channelName = channelNames[selectedChannel];

            box.sort((first, second) => first[channelName] - second[channelName]);

            const totalWeight =
                box.reduce((total, point) => total + point.count, 0);
            const halfWeight = totalWeight / 2;
            let accumulatedWeight = 0;
            let splitIndex = 0;

            while (
                splitIndex < box.length - 1 &&
                accumulatedWeight < halfWeight
            ) {

                accumulatedWeight += box[splitIndex].count;
                splitIndex++;

            }

            boxes.push(box.slice(0, splitIndex));
            boxes.push(box.slice(splitIndex));

        }

        const palette = new Uint8Array(256 * 3);

        boxes.forEach(
            (box, colorIndex) => {

                let totalWeight = 0;
                let red = 0;
                let green = 0;
                let blue = 0;

                for (const point of box) {

                    totalWeight += point.count;
                    red += point.red * point.count;
                    green += point.green * point.count;
                    blue += point.blue * point.count;

                }

                palette[colorIndex * 3] = Math.round(red / totalWeight);
                palette[colorIndex * 3 + 1] = Math.round(green / totalWeight);
                palette[colorIndex * 3 + 2] = Math.round(blue / totalWeight);

            }
        );

        for (let colorIndex = boxes.length; colorIndex < 256; colorIndex++) {

            palette.set(palette.subarray(0, 3), colorIndex * 3);

        }

        return palette;

    }


    function createColorMap(palette) {

        if (palette.length !== 256 * 3) {

            throw new Error("A paleta do GIF possui dimensões inválidas.");

        }

        const colorMap = new Uint8Array(COLOR_BIN_COUNT);

        for (let bin = 0; bin < COLOR_BIN_COUNT; bin++) {

            const red = getBinColor(bin, 10);
            const green = getBinColor(bin, 5);
            const blue = getBinColor(bin, 0);
            let closestIndex = 0;
            let closestDistance = Infinity;

            for (let colorIndex = 0; colorIndex < 256; colorIndex++) {

                const offset = colorIndex * 3;
                const redDistance = red - palette[offset];
                const greenDistance = green - palette[offset + 1];
                const blueDistance = blue - palette[offset + 2];
                const distance =
                    redDistance * redDistance * 3 +
                    greenDistance * greenDistance * 4 +
                    blueDistance * blueDistance * 2;

                if (distance < closestDistance) {

                    closestDistance = distance;
                    closestIndex = colorIndex;

                }

            }

            colorMap[bin] = closestIndex;

        }

        return colorMap;

    }


    function quantize(rgba, pixelCount, colorMap, palette, width) {

        if (
            rgba.length < pixelCount * 4 ||
            colorMap.length !== COLOR_BIN_COUNT ||
            palette.length !== 256 * 3 ||
            !Number.isInteger(width) ||
            width < 1 ||
            pixelCount % width !== 0
        ) {

            throw new Error("Os dados do quadro possuem dimensões inválidas.");

        }

        const indexedPixels = new Uint8Array(pixelCount);
        let currentRedError = new Float32Array(width + 2);
        let currentGreenError = new Float32Array(width + 2);
        let currentBlueError = new Float32Array(width + 2);
        let nextRedError = new Float32Array(width + 2);
        let nextGreenError = new Float32Array(width + 2);
        let nextBlueError = new Float32Array(width + 2);

        for (let y = 0; y < pixelCount / width; y++) {

            for (let x = 0; x < width; x++) {

                const pixel = y * width + x;
                const offset = pixel * 4;
                const errorOffset = x + 1;
                const red = Math.max(
                    0,
                    Math.min(255, rgba[offset] + currentRedError[errorOffset])
                );
                const green = Math.max(
                    0,
                    Math.min(255, rgba[offset + 1] + currentGreenError[errorOffset])
                );
                const blue = Math.max(
                    0,
                    Math.min(255, rgba[offset + 2] + currentBlueError[errorOffset])
                );
                const paletteIndex = colorMap[getColorBin(red, green, blue)];
                const paletteOffset = paletteIndex * 3;
                const redError = red - palette[paletteOffset];
                const greenError = green - palette[paletteOffset + 1];
                const blueError = blue - palette[paletteOffset + 2];

                indexedPixels[pixel] = paletteIndex;

                currentRedError[errorOffset + 1] += redError * 7 / 16;
                currentGreenError[errorOffset + 1] += greenError * 7 / 16;
                currentBlueError[errorOffset + 1] += blueError * 7 / 16;

                nextRedError[errorOffset - 1] += redError * 3 / 16;
                nextGreenError[errorOffset - 1] += greenError * 3 / 16;
                nextBlueError[errorOffset - 1] += blueError * 3 / 16;

                nextRedError[errorOffset] += redError * 5 / 16;
                nextGreenError[errorOffset] += greenError * 5 / 16;
                nextBlueError[errorOffset] += blueError * 5 / 16;

                nextRedError[errorOffset + 1] += redError / 16;
                nextGreenError[errorOffset + 1] += greenError / 16;
                nextBlueError[errorOffset + 1] += blueError / 16;

            }

            [currentRedError, nextRedError] =
                [nextRedError, currentRedError];
            [currentGreenError, nextGreenError] =
                [nextGreenError, currentGreenError];
            [currentBlueError, nextBlueError] =
                [nextBlueError, currentBlueError];

            nextRedError.fill(0);
            nextGreenError.fill(0);
            nextBlueError.fill(0);

        }

        return indexedPixels;

    }


    function compressLzw(pixels) {

        const minimumCodeSize = 8;
        const clearCode = 1 << minimumCodeSize;
        const endCode = clearCode + 1;
        const output = [];
        let bitBuffer = 0;
        let bitCount = 0;
        let codeSize = minimumCodeSize + 1;
        let nextCode = endCode + 1;
        let dictionary = new Map();

        const writeCode = code => {

            bitBuffer |= code << bitCount;
            bitCount += codeSize;

            while (bitCount >= 8) {

                output.push(bitBuffer & 255);
                bitBuffer >>>= 8;
                bitCount -= 8;

            }

        };

        writeCode(clearCode);

        if (!pixels.length) {

            writeCode(endCode);

            if (bitCount) {

                output.push(bitBuffer & 255);

            }

            return new Uint8Array(output);

        }

        let prefix = pixels[0];

        for (let index = 1; index < pixels.length; index++) {

            const symbol = pixels[index];
            const key = (prefix << 8) | symbol;
            const existingCode = dictionary.get(key);

            if (existingCode !== undefined) {

                prefix = existingCode;
                continue;

            }

            writeCode(prefix);

            if (nextCode < 4096) {

                dictionary.set(key, nextCode);
                nextCode++;

                if (nextCode > (1 << codeSize) && codeSize < 12) {

                    codeSize++;

                }

            } else {

                writeCode(clearCode);
                dictionary = new Map();
                codeSize = minimumCodeSize + 1;
                nextCode = endCode + 1;

            }

            prefix = symbol;

        }

        writeCode(prefix);
        writeCode(endCode);

        if (bitCount) {

            output.push(bitBuffer & 255);

        }

        return new Uint8Array(output);

    }


    function createHeader(width, height, palette) {

        const header = new Uint8Array(13);

        header.set([71, 73, 70, 56, 57, 97]);
        header[6] = width & 255;
        header[7] = (width >> 8) & 255;
        header[8] = height & 255;
        header[9] = (height >> 8) & 255;
        header[10] = 0xF7;

        return [
            header,
            palette,
            new Uint8Array([
                0x21, 0xFF, 0x0B,
                0x4E, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2E, 0x30,
                0x03, 0x01, 0x00, 0x00, 0x00
            ])
        ];

    }


    function createFrameParts(pixels, width, height, delay) {

        const compressed = compressLzw(pixels);
        const parts = [
            new Uint8Array([
                0x21, 0xF9, 0x04, 0x04,
                delay & 255,
                (delay >> 8) & 255,
                0x00, 0x00,
                0x2C, 0x00, 0x00, 0x00, 0x00,
                width & 255, (width >> 8) & 255,
                height & 255, (height >> 8) & 255,
                0x00, 0x08
            ])
        ];

        for (let offset = 0; offset < compressed.length; offset += 255) {

            const length = Math.min(255, compressed.length - offset);
            const block = new Uint8Array(length + 1);

            block[0] = length;
            block.set(
                compressed.subarray(offset, offset + length),
                1
            );

            parts.push(block);

        }

        parts.push(new Uint8Array([0x00]));

        return parts;

    }


    function encode(frames, width, height, delay, palette) {

        if (!frames.length || width < 1 || height < 1) {

            throw new Error("O GIF não contém quadros válidos.");

        }

        if (!palette || palette.length !== 256 * 3) {

            throw new Error("A paleta do GIF não é válida.");

        }

        const parts = createHeader(width, height, palette);

        frames.forEach(
            frame => {

                if (frame.length !== width * height) {

                    throw new Error("Um dos quadros possui dimensões inválidas.");

                }

                parts.push(
                    ...createFrameParts(
                        frame,
                        width,
                        height,
                        delay
                    )
                );

            }
        );

        parts.push(new Uint8Array([0x3B]));

        return new Blob(
            parts,
            { type: "image/gif" }
        );

    }


    window.GifEncoder = {
        addToHistogram,
        createColorMap,
        createHistogram,
        createPalette,
        encode,
        quantize
    };

})();
