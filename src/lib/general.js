'use strict';


export function  getG(content){
    const startIndex = content.indexOf('<g');
    const endIndex = content.indexOf('/g>');
    const G = content.substring(startIndex, endIndex + 3);
    return G;
}

export function getGPosition(string, subString, index) {
    return string.split(subString, index).join(subString).length;
}

export function findStartEndIndices(string, substring){
    const startIndex = string.indexOf(substring);
    const endIndex = string.indexOf('"', startIndex + 11);
    return [startIndex, endIndex]

}

export function getPosition(string, subString, index) {
    return string.split(subString, index).join(subString).length;
}

export function getDimensionAPI(svg) {
    let widthStart = getPosition(svg, '"', 13);
    let widthFin = getPosition(svg, '"', 14);
    let width = svg.slice(widthStart + 1, widthFin)
    let heightStart = getPosition(svg, '"', 15);
    let heightEnd = getPosition(svg, '"', 16);
    let height = svg.slice(heightStart + 1, heightEnd)
    console.log('width : ', width, 'height:', height);
    return [parseFloat(width), parseFloat(height)];
}

export function getDimension(svgObject) {
    let widthStart = getPosition(svgObject, '"', 1);
    let widthFin = getPosition(svgObject, '"', 2);
    let width = svgObject.slice(widthStart + 1, widthFin)
    let heightStart = getPosition(svgObject, '"', 3);
    let heightEnd = getPosition(svgObject, '"', 4);
    let height = svgObject.slice(heightStart + 1, heightEnd)
    console.log('width : ', width, 'height:', height);
    return [parseFloat(width), parseFloat(height)];
}

export function getDimensionGeneral(svgObject){
    const widthStart = svgObject.indexOf('width="') + 6;
    const widthFin = svgObject.indexOf('"', widthStart + 1);
    const width = svgObject.slice(widthStart + 1, widthFin);

    const heightIndex = svgObject.indexOf('height="') + 7;
    const heightFin = svgObject.indexOf('"', heightIndex + 1);
    const height = svgObject.slice(heightIndex + 1, heightFin);
    return [parseFloat(width), parseFloat(height), width, height];
}

export function getDimensionStr(svgObject) {
    let widthStart = getPosition(svgObject, '"', 1);
    let widthFin = getPosition(svgObject, '"', 2);
    let width = svgObject.slice(widthStart + 1, widthFin)
    let heightStart = getPosition(svgObject, '"', 3);
    let heightEnd = getPosition(svgObject, '"', 4);
    let height = svgObject.slice(heightStart + 1, heightEnd)
    console.log('width : ', width, 'height:', height);
    return [width, height];
}

export function calcMargins(svgOutput) {

    let dims = getDimension(this.state.svgOutpout);
    let mmDims = dims.map(n => n / operator);
    let margins = [(42 - mmDims[0]) / 2, (41 - mmDims[1]) / 2];
    return margins;
}

export function validateLayout(layout, text, maxLines) { //// add another condition which is if the number of lines is bigger than the number of words
    return layout.lines.length > maxLines ? false : true;
}

export function isWrappedWord(layout, text) {
    let result = true;
    var words = text.split(" ");
    words.forEach((word) => {
        layout.lines.forEach((line, j) => {
            console.log('end', layout.lines[j].end, 'start', layout.lines[j].start, 'word length:', word.length);
            if (layout.lines[j].end - layout.lines[j].start < word.length) {
                result = false;
            }
        })
    })
    return true;
}

export function removeBlanks(canvas, imgWidth, imgHeight) {
    const context = canvas.getContext("2d");

    var imageData = context.getImageData(0, 0, imgWidth, imgHeight),
        data = imageData.data,
        getRBG = function (x, y) {
            var offset = imgWidth * y + x;
            return {
                red: data[offset * 4],
                green: data[offset * 4 + 1],
                blue: data[offset * 4 + 2],
                opacity: data[offset * 4 + 3]
            };
        },
        isWhite = function (rgb) {
            // many images contain noise, as the white is not a pure #fff white
            return rgb.red > 210 && rgb.green > 210 && rgb.blue > 210;
        },
        scanY = function (fromTop) {
            var offset = fromTop ? 1 : -1;

            // loop through each row
            for (var y = fromTop ? 0 : imgHeight - 1; fromTop ? (y < imgHeight) : (y > -1); y += offset) {

                // loop through each column
                for (var x = 0; x < imgWidth; x++) {
                    var rgb = getRBG(x, y);
                    if (!isWhite(rgb)) {
                        return y;
                    }
                }
            }
            return null; // all image is white
        },
        scanX = function (fromLeft) {
            var offset = fromLeft ? 1 : -1;

            // loop through each column
            for (var x = fromLeft ? 0 : imgWidth - 1; fromLeft ? (x < imgWidth) : (x > -1); x += offset) {

                // loop through each row
                for (var y = 0; y < imgHeight; y++) {
                    var rgb = getRBG(x, y);
                    if (!isWhite(rgb)) {
                        return x;
                    }
                }
            }
            return null; // all image is white
        };
    var inMemCanvas = document.createElement('canvas');
    var inMemCtx = inMemCanvas.getContext('2d');
    var cropTop = scanY(true),
        cropBottom = scanY(false),
        cropLeft = scanX(true),
        cropRight = scanX(false),
        cropWidth = cropRight - cropLeft,
        cropHeight = cropBottom - cropTop;

    //var $croppedCanvas = $("<canvas>").attr({ width: cropWidth, height: cropHeight });
    inMemCanvas.width = cropWidth;
    inMemCanvas.height = cropHeight;
    inMemCtx.drawImage(canvas,
        cropLeft, cropTop, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight);
    canvas.width = cropWidth;
    canvas.height = cropHeight;

    // finally crop the guy
    context.drawImage(inMemCanvas, 0, 0);
    return [cropLeft, cropTop, cropRight, cropBottom, cropWidth, cropHeight];
};