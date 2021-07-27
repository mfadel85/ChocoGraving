'use strict';

import { operator } from '../data/staticData.js'



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
export function rotateRect(svgFile) {
    var result = svgFile;
    const tansformIndex = findStartEndIndices(svgFile, 'transform="');
    const transform = ' transform=" rotate(-90 280 200) translate(0.000000,390.000000) scale(0.100000,-0.100000) ';//-0.0215,-0.0215 those has to be dynamically
    var final5 = result.replace(result.substring(tansformIndex[0], tansformIndex[1]), transform);
    console.log(result);
    return final5;
}

export function minimizeSvgFileRect(svgFile, percentageX, percentageY, scaleX, scaleY, moldName) {
    //const ourFramePath = '<g stroke-linecap="round" fill-rule="evenodd" font-size="12px" stroke="#000" stroke-width="0.25mm" fill="none" style="fill:none;stroke:#000000;stroke-width:0.25mm" id="layer1" transform="matrix(2.8321,0,0,2.8321,2,-161)"><path d="m 233.83379,67.373184 c -2.53989,0.0018 -2.01422,0.247614 -2.01242,3.001398 0.002,2.761509 -2.23509,5.001401 -4.99667,5.003306 -2.76151,0.0018 -5.0014,-2.2352 -5.00331,-4.99678 -0.002,-2.438506 0.43819,-3.000199 -1.39322,-2.998999 l -29.58928,0.01979 c -1.57229,0.0011 -1.01899,0.713105 -1.01751,3.000798 0.002,2.76158 -2.23499,5.001401 -4.99661,5.003306 -2.76168,0.0018 -5.00157,-2.2352 -5.0033,-4.996709 -0.002,-2.569316 0.58282,-3.00041 -1.50619,-2.999105 l -29.08229,0.01951 c -2.01362,0.0014 -1.4133,0.467889 -1.4116,3.000904 0.002,2.761579 -2.2351,5.001507 -4.99661,5.003306 -2.76161,0.0018 -5.0015,-2.23513 -5.00341,-4.996709 -0.002,-2.664496 0.83831,-3.000516 -1.46477,-2.998894 l -29.06042,0.0193 c -2.04481,0.0014 -1.47641,0.452896 -1.47468,3.001081 0.002,2.761615 -2.23503,5.001507 -4.99671,5.003412 -2.76151,0.0018 -5.001402,-2.2352 -5.003201,-4.996815 -0.0018,-2.426476 0.550298,-3.000375 -1.258499,-2.99907 l -29.269619,0.01937 c -2.285682,0.0018 -1.473588,0.343923 -1.471789,3.00101 0.0018,2.761614 -2.235094,5.001506 -4.996709,5.003411 -2.76158,0.0018 -5.001471,-2.2352 -5.003376,-4.996815 -0.0018,-2.623678 0.825888,-3.00048 -1.382607,-2.998999 l -30.757812,0.0206 c -2.419703,0.0014 -1.361405,0.288889 -1.359676,3.000692 0.0019,2.761721 -2.235129,5.001613 -4.996603,5.003412 -4.260321,0.0028 -5.4871056,-0.635706 -5.4989942,1.399399 l 0.017568,26.354686 c 0.00113,1.74092 3.1126292,1.24742 5.5007232,1.2459 2.761579,-0.002 5.001507,2.23503 5.003376,4.99671 0.0018,2.76141 -2.235094,5.0014 -4.996568,5.00331 -2.509625,0.002 -5.5004051,-0.74369 -5.4992057,1.22319 l 0.019085,28.53069 c 0.00109,1.74092 3.1124877,1.24763 5.5006867,1.2459 2.761615,-0.002 5.001507,2.23509 5.003412,4.99671 0.0017,2.76151 -2.235094,5.00151 -4.996603,5.00341 -2.509591,0.002 -5.5005812,-0.74372 -5.4992054,1.22308 l 0.019015,28.53101 c 0.0012,1.74089 3.1124884,1.24739 5.5007934,1.24591 2.761509,-0.002 5.001401,2.23498 5.003306,4.9967 0.0018,2.76141 -2.235094,5.00141 -4.996497,5.0032 -2.509697,0.002 -5.5006174,-0.74362 -5.4992063,1.2233 0.00589,8.9566 0.011818,17.91321 0.017886,26.86988 0.014323,1.9957 1.2659083,0.90992 5.5004053,0.9071 2.761721,-0.002 5.001613,2.23502 5.003412,4.9966 0.0016,2.4421 -0.958603,3.0226 0.459987,2.9996 l 30.735199,-0.0205 c 2.399629,-0.002 2.306919,0.11 2.304908,-3.00168 -0.0018,-2.7614 2.2352,-5.00129 4.996604,-5.0032 2.761615,-0.002 5.001506,2.2351 5.003411,4.99668 0.0018,2.8334 0.417689,2.99229 1.100702,2.99931 l 29.636684,-0.0198 c 1.968395,-0.001 1.264215,-0.4905 1.262486,-3.0009 -0.0018,-2.76151 2.23513,-5.0013 4.996601,-5.0032 2.76172,-0.002 5.00151,2.23509 5.00331,4.9966 0.001,1.80898 -0.42859,3.00031 0.4978,2.99971 l 30.83239,-0.0206 c 0.9549,-7e-4 0.67102,-1.16702 0.66982,-3.00062 -0.002,-2.76147 2.2352,-5.0002 4.9966,-5.002 2.76158,-0.002 5.00151,2.23383 5.00338,4.99541 0.001,2.12181 -0.39578,3.0003 0.92802,2.99942 l 29.85449,-0.0199 c 1.9668,-0.001 1.21909,-0.49111 1.2175,-3.0008 -0.002,-2.76148 2.2351,-5.0014 4.99671,-5.0032 2.76148,-0.002 5.0014,2.23502 5.0032,4.9966 0.002,2.38831 -0.48919,3.0003 1.25169,2.99911 l 30.1975,-0.0202 c 1.38522,0.0433 0.55252,-0.49492 0.55079,-3.00041 -0.002,-2.76151 2.2352,-5.0014 4.99671,-5.0032 2.76161,-0.002 5.00151,2.23498 5.00331,4.99671 0.002,2.81177 -0.35631,2.95599 1.10179,2.99917 10.319,-0.007 20.63799,-0.0137 30.95699,-0.0206 2.47791,-0.002 1.44311,-0.2666 1.44142,-3.00098 -0.002,-2.76151 2.23509,-5.0014 4.9966,-5.0033 4.15798,-0.003 5.4876,0.83199 5.49921,-1.13482 -0.006,-8.88319 -0.0119,-17.76638 -0.0178,-26.6495 -10e-4,-1.96677 -2.99131,-1.21747 -5.5009,-1.21578 -2.7614,0.002 -5.00129,-2.2352 -5.0032,-4.99671 -0.002,-2.76161 2.23509,-5.0015 4.99671,-5.0033 2.38809,-0.001 5.50019,0.48761 5.49899,-1.25328 l -0.019,-28.5309 c -10e-4,-1.96681 -2.9912,-1.21751 -5.50079,-1.21582 -2.76151,0.002 -5.00141,-2.2352 -5.00331,-4.99671 -0.002,-2.76158 2.23509,-5.0015 4.99671,-5.00337 2.3882,-0.001 5.5003,0.48768 5.4991,-1.25321 l -0.0191,-28.5308 c -0.001,-1.9668 -2.99109,-1.2175 -5.50082,-1.21581 -2.76148,0.002 -5.0013,-2.2352 -5.00321,-4.99671 -0.002,-2.76158 2.23513,-5.00147 4.99661,-5.00327 2.3883,-0.002 5.5003,0.48757 5.4992,-1.25331 l -0.018,-26.839617 c -0.0141,-1.966771 -1.34249,-0.909779 -5.5004,-0.907203 -2.76158,0.0018 -5.00162,-2.234883 -5.00341,-4.996498 -0.002,-2.73438 1.03261,-3.000692 -1.4453,-2.998999 z" vector-effect="non-scaling-stroke" id="path5" /></g>';
    const ourFramePath = '<g><path fill-rule="evenodd" clip-rule="evenodd" fill="none" stroke="#030000" stroke-width="2.5087" stroke-linecap="round" stroke-miterlimit="10" d="M658.381,21.949c-7.193,0.005-5.705,0.659-5.699,7.983c0.006,7.347-6.33,13.305-14.152,13.31 c-7.82,0.006-14.164-5.945-14.17-13.292c-0.004-6.486,1.242-7.98-3.943-7.978l-83.801,0.053c-4.453,0.003-2.887,1.897-2.883,7.984 c0.006,7.345-6.33,13.304-14.15,13.309c-7.82,0.005-14.164-5.946-14.17-13.292c-0.006-6.834,1.65-7.981-4.266-7.979l-82.363,0.052 c-5.703,0.004-4.004,1.245-3.998,7.983c0.006,7.346-6.33,13.305-14.15,13.31c-7.822,0.005-14.166-5.945-14.17-13.292 c-0.006-7.088,2.374-7.981-4.149-7.978l-82.302,0.052c-5.791,0.003-4.181,1.204-4.176,7.983c0.006,7.346-6.33,13.306-14.151,13.31 c-7.821,0.005-14.165-5.945-14.17-13.292c-0.005-6.455,1.559-7.981-3.564-7.978l-82.894,0.052 c-6.474,0.005-4.174,0.915-4.169,7.983c0.005,7.346-6.33,13.304-14.151,13.31c-7.821,0.005-14.165-5.946-14.17-13.292 c-0.005-6.98,2.339-7.983-3.916-7.978l-87.109,0.054c-6.853,0.004-3.856,0.77-3.851,7.982c0.005,7.347-6.33,13.306-14.151,13.31 c-12.065,0.008-15.54-1.691-15.574,3.723l0.05,70.108c0.003,4.631,8.815,3.318,15.579,3.314c7.821-0.005,14.165,5.945,14.17,13.292 c0.005,7.346-6.33,13.305-14.15,13.31c-7.108,0.005-15.578-1.979-15.574,3.254l0.054,75.896c0.003,4.632,8.815,3.318,15.579,3.314 c7.821-0.006,14.165,5.945,14.17,13.293c0.004,7.346-6.33,13.304-14.151,13.309c-7.107,0.006-15.579-1.979-15.575,3.254 l0.054,75.897c0.003,4.633,8.814,3.318,15.579,3.315c7.821-0.005,14.165,5.944,14.17,13.291c0.005,7.346-6.33,13.305-14.151,13.311 c-7.107,0.006-15.578-1.979-15.574,3.254c0.017,23.826,0.034,47.652,0.051,71.479c0.041,5.309,3.585,2.421,15.578,2.412 c7.821-0.005,14.165,5.946,14.17,13.292c0.004,6.496-2.715,8.04,1.303,7.979l87.045-0.055c6.796-0.005,6.533,0.292,6.527-7.984 c-0.005-7.347,6.331-13.305,14.151-13.311c7.821-0.004,14.165,5.946,14.17,13.292c0.006,7.539,1.183,7.961,3.118,7.979 l83.934-0.053c5.575-0.003,3.58-1.305,3.575-7.983c-0.005-7.346,6.33-13.304,14.151-13.309c7.822-0.006,14.165,5.944,14.17,13.292 c0.003,4.812-1.214,7.981,1.41,7.979l87.32-0.055c2.705-0.002,1.901-3.104,1.897-7.982c-0.005-7.346,6.331-13.302,14.151-13.308 c7.821-0.004,14.165,5.943,14.171,13.29c0.002,5.645-1.121,7.981,2.629,7.979l84.549-0.053c5.572-0.002,3.453-1.307,3.449-7.982 c-0.006-7.347,6.33-13.304,14.15-13.31c7.82-0.005,14.164,5.945,14.17,13.292c0.006,6.353-1.385,7.981,3.545,7.978l85.521-0.053 c3.924,0.115,1.566-1.317,1.561-7.981c-0.006-7.347,6.332-13.304,14.152-13.31s14.164,5.944,14.168,13.292 c0.006,7.479-1.008,7.863,3.121,7.979c29.225-0.02,58.449-0.037,87.674-0.056c7.018-0.005,4.086-0.709,4.082-7.983 c-0.006-7.346,6.33-13.304,14.15-13.309c11.777-0.008,15.543,2.213,15.576-3.02c-0.018-23.631-0.035-47.261-0.051-70.893 c-0.004-5.231-8.473-3.237-15.58-3.233c-7.82,0.005-14.164-5.947-14.17-13.293c-0.006-7.347,6.33-13.305,14.152-13.31 c6.762-0.004,15.576,1.298,15.572-3.335l-0.053-75.896c-0.002-5.232-8.473-3.238-15.578-3.234 c-7.822,0.006-14.166-5.946-14.17-13.291c-0.006-7.348,6.33-13.306,14.15-13.311c6.764-0.003,15.576,1.298,15.574-3.334 l-0.055-75.897c-0.002-5.231-8.471-3.239-15.578-3.234c-7.822,0.005-14.164-5.946-14.17-13.292 c-0.006-7.347,6.33-13.304,14.15-13.31c6.764-0.005,15.578,1.297,15.574-3.334l-0.051-71.398c-0.039-5.232-3.801-2.42-15.578-2.413 c-7.82,0.004-14.164-5.946-14.17-13.292c-0.006-7.275,2.924-7.982-4.094-7.978L658.381,21.949z"/></g>';
    const fixedWidth = percentageX * scaleX * operator / 12.50; // assuming that there is no white space in the jpg image, if there is white space then it has to be handled differently
    const svgDims = getDimensionGeneral(svgFile);
    // multiplying by 0.9345 is a workaraound till the result comes from them.
    var scalingFactor = 0.93457 * fixedWidth / svgDims[0];// later we will see if 0.93457 needs to be removed
    var scalingFactorY = (scaleY / scaleX) * fixedWidth / svgDims[1] * percentageY;
    
    const viewboxIndex = findStartEndIndices(svgFile, 'viewBox="');
    const final2 = svgFile.replaceAll('fill="#000000"', ' fill="none" ').replaceAll('width="' + svgDims[2] + '"', 'width="800.000000pt"')
        .replaceAll('height="' + svgDims[3] + '"', 'height="535.000000pt"').replaceAll(svgFile.substring(viewboxIndex[0], viewboxIndex[1] + 1), 'viewBox="0 0 800.000000 500.000000"');// have to fix this but how
    const tansformIndex = findStartEndIndices(final2, 'transform="');
    const final3 = final2.replaceAll('stroke="none"', ' stroke="#76C2DA" stroke-width="0.1" ');
    /// original
    const repeatX = 3;
    const repeatY = 6;
    var shiftX = 150.9611671;// this will change according to the mold
    var shiftY = 55.17244096;// this will change according to the mold
    scalingFactor = scalingFactor*2.1;
    scalingFactorY /= 2.1;
    // if the mold is heart or oval or something else
    const transform = ' transform="rotate(-90 280 200) translate(' + shiftX.toString() + ',' + shiftY.toString() + ') scale(-' + scalingFactor + ',-' + scalingFactorY + ') ';//-0.0215,-0.0215 those has to be dynamically
    var final5 = final3.replace(final3.substring(tansformIndex[0], tansformIndex[1]), transform);
    const mainGStart = final5.indexOf('<g');
    // I can add date to here can I ? yes of course
    //const ourDate = '30/6/2021';
    //const date = this.generateDate(ourDate);
    const mainGEnd = final5.indexOf('</g>') + 5;
    const g = final5.substring(mainGStart, mainGEnd);
    
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 3; j++) {
            if (j == 0 && i == 0)
                continue;
            var xTransform = parseFloat(shiftX) + j * 147.333 * 0.93457;
            var yTransform = parseFloat(shiftY) + i * 119 ;
            const g1 = g.replace(shiftX.toString(), xTransform).replace(shiftY.toString(), yTransform);
            const insertionIndex = final5.indexOf('</g>') + 4;
            var final = final5.slice(0, insertionIndex) + g1 + final5.slice(insertionIndex);
            final5 = final;
        }

    }

    const insertionIndex = final.indexOf('</g>') + 4;
    var final5 = final.slice(0, insertionIndex) + ourFramePath + final.slice(insertionIndex);
    console.log('Final: ', final5);
    var svgElement = document.getElementById("svgFile");
    svgElement.setAttribute('href', 'data:text/plain;chartset=utf-8,' + encodeURIComponent(final5));

    svgElement.setAttribute('download', 'File.svg');
    return final5;
}


export function minimizeSvgFile(svgFile, percentageX, percentageY,scaleX,scaleY,moldName) {
    // now how scalingFactor,scalingFactorY should be used
    // we have to handle the margin for the oval mold,rectangle mold
    const ourFramePath = '<g stroke-linecap="round" fill-rule="evenodd" font-size="12px" stroke="#000" stroke-width="0.25mm" fill="none" style="fill:none;stroke:#000000;stroke-width:0.25mm" id="layer1" transform="matrix(2.8321,0,0,2.8321,2,-161)"><path d="m 233.83379,67.373184 c -2.53989,0.0018 -2.01422,0.247614 -2.01242,3.001398 0.002,2.761509 -2.23509,5.001401 -4.99667,5.003306 -2.76151,0.0018 -5.0014,-2.2352 -5.00331,-4.99678 -0.002,-2.438506 0.43819,-3.000199 -1.39322,-2.998999 l -29.58928,0.01979 c -1.57229,0.0011 -1.01899,0.713105 -1.01751,3.000798 0.002,2.76158 -2.23499,5.001401 -4.99661,5.003306 -2.76168,0.0018 -5.00157,-2.2352 -5.0033,-4.996709 -0.002,-2.569316 0.58282,-3.00041 -1.50619,-2.999105 l -29.08229,0.01951 c -2.01362,0.0014 -1.4133,0.467889 -1.4116,3.000904 0.002,2.761579 -2.2351,5.001507 -4.99661,5.003306 -2.76161,0.0018 -5.0015,-2.23513 -5.00341,-4.996709 -0.002,-2.664496 0.83831,-3.000516 -1.46477,-2.998894 l -29.06042,0.0193 c -2.04481,0.0014 -1.47641,0.452896 -1.47468,3.001081 0.002,2.761615 -2.23503,5.001507 -4.99671,5.003412 -2.76151,0.0018 -5.001402,-2.2352 -5.003201,-4.996815 -0.0018,-2.426476 0.550298,-3.000375 -1.258499,-2.99907 l -29.269619,0.01937 c -2.285682,0.0018 -1.473588,0.343923 -1.471789,3.00101 0.0018,2.761614 -2.235094,5.001506 -4.996709,5.003411 -2.76158,0.0018 -5.001471,-2.2352 -5.003376,-4.996815 -0.0018,-2.623678 0.825888,-3.00048 -1.382607,-2.998999 l -30.757812,0.0206 c -2.419703,0.0014 -1.361405,0.288889 -1.359676,3.000692 0.0019,2.761721 -2.235129,5.001613 -4.996603,5.003412 -4.260321,0.0028 -5.4871056,-0.635706 -5.4989942,1.399399 l 0.017568,26.354686 c 0.00113,1.74092 3.1126292,1.24742 5.5007232,1.2459 2.761579,-0.002 5.001507,2.23503 5.003376,4.99671 0.0018,2.76141 -2.235094,5.0014 -4.996568,5.00331 -2.509625,0.002 -5.5004051,-0.74369 -5.4992057,1.22319 l 0.019085,28.53069 c 0.00109,1.74092 3.1124877,1.24763 5.5006867,1.2459 2.761615,-0.002 5.001507,2.23509 5.003412,4.99671 0.0017,2.76151 -2.235094,5.00151 -4.996603,5.00341 -2.509591,0.002 -5.5005812,-0.74372 -5.4992054,1.22308 l 0.019015,28.53101 c 0.0012,1.74089 3.1124884,1.24739 5.5007934,1.24591 2.761509,-0.002 5.001401,2.23498 5.003306,4.9967 0.0018,2.76141 -2.235094,5.00141 -4.996497,5.0032 -2.509697,0.002 -5.5006174,-0.74362 -5.4992063,1.2233 0.00589,8.9566 0.011818,17.91321 0.017886,26.86988 0.014323,1.9957 1.2659083,0.90992 5.5004053,0.9071 2.761721,-0.002 5.001613,2.23502 5.003412,4.9966 0.0016,2.4421 -0.958603,3.0226 0.459987,2.9996 l 30.735199,-0.0205 c 2.399629,-0.002 2.306919,0.11 2.304908,-3.00168 -0.0018,-2.7614 2.2352,-5.00129 4.996604,-5.0032 2.761615,-0.002 5.001506,2.2351 5.003411,4.99668 0.0018,2.8334 0.417689,2.99229 1.100702,2.99931 l 29.636684,-0.0198 c 1.968395,-0.001 1.264215,-0.4905 1.262486,-3.0009 -0.0018,-2.76151 2.23513,-5.0013 4.996601,-5.0032 2.76172,-0.002 5.00151,2.23509 5.00331,4.9966 0.001,1.80898 -0.42859,3.00031 0.4978,2.99971 l 30.83239,-0.0206 c 0.9549,-7e-4 0.67102,-1.16702 0.66982,-3.00062 -0.002,-2.76147 2.2352,-5.0002 4.9966,-5.002 2.76158,-0.002 5.00151,2.23383 5.00338,4.99541 0.001,2.12181 -0.39578,3.0003 0.92802,2.99942 l 29.85449,-0.0199 c 1.9668,-0.001 1.21909,-0.49111 1.2175,-3.0008 -0.002,-2.76148 2.2351,-5.0014 4.99671,-5.0032 2.76148,-0.002 5.0014,2.23502 5.0032,4.9966 0.002,2.38831 -0.48919,3.0003 1.25169,2.99911 l 30.1975,-0.0202 c 1.38522,0.0433 0.55252,-0.49492 0.55079,-3.00041 -0.002,-2.76151 2.2352,-5.0014 4.99671,-5.0032 2.76161,-0.002 5.00151,2.23498 5.00331,4.99671 0.002,2.81177 -0.35631,2.95599 1.10179,2.99917 10.319,-0.007 20.63799,-0.0137 30.95699,-0.0206 2.47791,-0.002 1.44311,-0.2666 1.44142,-3.00098 -0.002,-2.76151 2.23509,-5.0014 4.9966,-5.0033 4.15798,-0.003 5.4876,0.83199 5.49921,-1.13482 -0.006,-8.88319 -0.0119,-17.76638 -0.0178,-26.6495 -10e-4,-1.96677 -2.99131,-1.21747 -5.5009,-1.21578 -2.7614,0.002 -5.00129,-2.2352 -5.0032,-4.99671 -0.002,-2.76161 2.23509,-5.0015 4.99671,-5.0033 2.38809,-0.001 5.50019,0.48761 5.49899,-1.25328 l -0.019,-28.5309 c -10e-4,-1.96681 -2.9912,-1.21751 -5.50079,-1.21582 -2.76151,0.002 -5.00141,-2.2352 -5.00331,-4.99671 -0.002,-2.76158 2.23509,-5.0015 4.99671,-5.00337 2.3882,-0.001 5.5003,0.48768 5.4991,-1.25321 l -0.0191,-28.5308 c -0.001,-1.9668 -2.99109,-1.2175 -5.50082,-1.21581 -2.76148,0.002 -5.0013,-2.2352 -5.00321,-4.99671 -0.002,-2.76158 2.23513,-5.00147 4.99661,-5.00327 2.3883,-0.002 5.5003,0.48757 5.4992,-1.25331 l -0.018,-26.839617 c -0.0141,-1.966771 -1.34249,-0.909779 -5.5004,-0.907203 -2.76158,0.0018 -5.00162,-2.234883 -5.00341,-4.996498 -0.002,-2.73438 1.03261,-3.000692 -1.4453,-2.998999 z" vector-effect="non-scaling-stroke" id="path5" /></g>';
    const fixedWidth = percentageX * scaleX * operator / 12.50; // assuming that there is no white space in the jpg image, if there is white space then it has to be handled differently
    //const scalingStr = 
    const svgDims = getDimensionGeneral(svgFile);
    const scalingFactor = fixedWidth / svgDims[0];
    //this should be multipied by some factor 
    const scalingFactorY = (scaleY/scaleX)*fixedWidth / svgDims[1] * percentageY;

    console.log('svgFile:', svgFile);
    const viewboxIndex = findStartEndIndices(svgFile, 'viewBox="');
    const final2 = svgFile.replaceAll('fill="#000000"', ' fill="none" ').replaceAll('width="' + svgDims[2] + '"', 'width="800.000000pt"')
        .replaceAll('height="' + svgDims[3] + '"', 'height="535.000000pt"').replaceAll(svgFile.substring(viewboxIndex[0], viewboxIndex[1] + 1), 'viewBox="0 0 800.000000 500.000000"');// have to fix this but how
    const tansformIndex = findStartEndIndices(final2, 'transform="');
    const final3 = final2.replaceAll('stroke="none"', ' stroke="#76C2DA" stroke-width="0.1" ');
    /// original
    var shiftX = 147.9611671;// this will change according to the mold
    var shiftY = 130.17244096;// this will change according to the mold
    // if the mold is heart or oval or something else
    if(moldName == "Oval" ){
        shiftX = 156;        
        shiftY = 121;
    }
    else if(moldName == "Heart"){
        shiftX = 151;
        shiftY = 119;
    }
    const transform = ' transform="translate(' + shiftX.toString() + ',' + shiftY.toString() +') scale(-' + scalingFactor + ',-' + scalingFactorY + ') ';//-0.0215,-0.0215 those has to be dynamically
    var final5 = final3.replace(final3.substring(tansformIndex[0], tansformIndex[1]), transform);
    const mainGStart = final5.indexOf('<g');
    // I can add date to here can I ? yes of course
    //const ourDate = '30/6/2021';
    //const date = this.generateDate(ourDate);
    const mainGEnd = final5.indexOf('</g>') + 5;
    const g = final5.substring(mainGStart, mainGEnd);
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 6; j++) {
            if (j == 0 && i == 0)
                continue;
            var xTransform = parseFloat(shiftX) + j * 119;
            var yTransform = parseFloat(shiftY) + i * 116.5;
            const g1 = g.replace(shiftX.toString(), xTransform).replace(shiftY.toString(), yTransform);
            const insertionIndex = final5.indexOf('</g>') + 4;
            var final = final5.slice(0, insertionIndex) + g1 + final5.slice(insertionIndex);
            final5 = final;
        }

    }

    const insertionIndex = final.indexOf('</g>') + 4;
    var final5 = final.slice(0, insertionIndex) + ourFramePath + final.slice(insertionIndex);
    console.log('Final: ', final5);
    var svgElement = document.getElementById("svgFile");
    svgElement.setAttribute('href', 'data:text/plain;chartset=utf-8,' + encodeURIComponent(final5));

    svgElement.setAttribute('download', 'File.svg');
    return final5;
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

    context.drawImage(inMemCanvas, 0, 0);
    return [cropLeft, cropTop, cropRight, cropBottom, cropWidth, cropHeight];
};

export function detectX() {
    var canvas = document.getElementById("canvas");
    var ctx = canvas.getContext("2d");
    const img = document.getElementById("testXPos");//eeveelutions  //eeveelutions
    ctx.drawImage(img, 0, 0);
    var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var locations = []; //
    for (var i = 0; i < imgData.data.length; i += 4) {
        if (imgData.data[i] > 220 && imgData.data[i + 1] < 230) {
            locations.push(i / 4);
            imgData.data[i] = 255;
            imgData.data[i + 1] = 255;
            imgData.data[i + 2] = 255;
            imgData.data[i + 3] = 255;
        }
    }
    console.log('the locations are ', locations);
    ctx.putImageData(imgData, 0, 0);
}