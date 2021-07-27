export function minimizeSvgFile(svgFile, percentageX, percentageY,scaleX,scaleY,shape) {
    const ourFramePath = '<g stroke-linecap="round" fill-rule="evenodd" font-size="12px" stroke="#000" stroke-width="0.25mm" fill="none" style="fill:none;stroke:#000000;stroke-width:0.25mm" id="layer1" transform="matrix(2.8321,0,0,2.8321,2,-161)"><path d="m 233.83379,67.373184 c -2.53989,0.0018 -2.01422,0.247614 -2.01242,3.001398 0.002,2.761509 -2.23509,5.001401 -4.99667,5.003306 -2.76151,0.0018 -5.0014,-2.2352 -5.00331,-4.99678 -0.002,-2.438506 0.43819,-3.000199 -1.39322,-2.998999 l -29.58928,0.01979 c -1.57229,0.0011 -1.01899,0.713105 -1.01751,3.000798 0.002,2.76158 -2.23499,5.001401 -4.99661,5.003306 -2.76168,0.0018 -5.00157,-2.2352 -5.0033,-4.996709 -0.002,-2.569316 0.58282,-3.00041 -1.50619,-2.999105 l -29.08229,0.01951 c -2.01362,0.0014 -1.4133,0.467889 -1.4116,3.000904 0.002,2.761579 -2.2351,5.001507 -4.99661,5.003306 -2.76161,0.0018 -5.0015,-2.23513 -5.00341,-4.996709 -0.002,-2.664496 0.83831,-3.000516 -1.46477,-2.998894 l -29.06042,0.0193 c -2.04481,0.0014 -1.47641,0.452896 -1.47468,3.001081 0.002,2.761615 -2.23503,5.001507 -4.99671,5.003412 -2.76151,0.0018 -5.001402,-2.2352 -5.003201,-4.996815 -0.0018,-2.426476 0.550298,-3.000375 -1.258499,-2.99907 l -29.269619,0.01937 c -2.285682,0.0018 -1.473588,0.343923 -1.471789,3.00101 0.0018,2.761614 -2.235094,5.001506 -4.996709,5.003411 -2.76158,0.0018 -5.001471,-2.2352 -5.003376,-4.996815 -0.0018,-2.623678 0.825888,-3.00048 -1.382607,-2.998999 l -30.757812,0.0206 c -2.419703,0.0014 -1.361405,0.288889 -1.359676,3.000692 0.0019,2.761721 -2.235129,5.001613 -4.996603,5.003412 -4.260321,0.0028 -5.4871056,-0.635706 -5.4989942,1.399399 l 0.017568,26.354686 c 0.00113,1.74092 3.1126292,1.24742 5.5007232,1.2459 2.761579,-0.002 5.001507,2.23503 5.003376,4.99671 0.0018,2.76141 -2.235094,5.0014 -4.996568,5.00331 -2.509625,0.002 -5.5004051,-0.74369 -5.4992057,1.22319 l 0.019085,28.53069 c 0.00109,1.74092 3.1124877,1.24763 5.5006867,1.2459 2.761615,-0.002 5.001507,2.23509 5.003412,4.99671 0.0017,2.76151 -2.235094,5.00151 -4.996603,5.00341 -2.509591,0.002 -5.5005812,-0.74372 -5.4992054,1.22308 l 0.019015,28.53101 c 0.0012,1.74089 3.1124884,1.24739 5.5007934,1.24591 2.761509,-0.002 5.001401,2.23498 5.003306,4.9967 0.0018,2.76141 -2.235094,5.00141 -4.996497,5.0032 -2.509697,0.002 -5.5006174,-0.74362 -5.4992063,1.2233 0.00589,8.9566 0.011818,17.91321 0.017886,26.86988 0.014323,1.9957 1.2659083,0.90992 5.5004053,0.9071 2.761721,-0.002 5.001613,2.23502 5.003412,4.9966 0.0016,2.4421 -0.958603,3.0226 0.459987,2.9996 l 30.735199,-0.0205 c 2.399629,-0.002 2.306919,0.11 2.304908,-3.00168 -0.0018,-2.7614 2.2352,-5.00129 4.996604,-5.0032 2.761615,-0.002 5.001506,2.2351 5.003411,4.99668 0.0018,2.8334 0.417689,2.99229 1.100702,2.99931 l 29.636684,-0.0198 c 1.968395,-0.001 1.264215,-0.4905 1.262486,-3.0009 -0.0018,-2.76151 2.23513,-5.0013 4.996601,-5.0032 2.76172,-0.002 5.00151,2.23509 5.00331,4.9966 0.001,1.80898 -0.42859,3.00031 0.4978,2.99971 l 30.83239,-0.0206 c 0.9549,-7e-4 0.67102,-1.16702 0.66982,-3.00062 -0.002,-2.76147 2.2352,-5.0002 4.9966,-5.002 2.76158,-0.002 5.00151,2.23383 5.00338,4.99541 0.001,2.12181 -0.39578,3.0003 0.92802,2.99942 l 29.85449,-0.0199 c 1.9668,-0.001 1.21909,-0.49111 1.2175,-3.0008 -0.002,-2.76148 2.2351,-5.0014 4.99671,-5.0032 2.76148,-0.002 5.0014,2.23502 5.0032,4.9966 0.002,2.38831 -0.48919,3.0003 1.25169,2.99911 l 30.1975,-0.0202 c 1.38522,0.0433 0.55252,-0.49492 0.55079,-3.00041 -0.002,-2.76151 2.2352,-5.0014 4.99671,-5.0032 2.76161,-0.002 5.00151,2.23498 5.00331,4.99671 0.002,2.81177 -0.35631,2.95599 1.10179,2.99917 10.319,-0.007 20.63799,-0.0137 30.95699,-0.0206 2.47791,-0.002 1.44311,-0.2666 1.44142,-3.00098 -0.002,-2.76151 2.23509,-5.0014 4.9966,-5.0033 4.15798,-0.003 5.4876,0.83199 5.49921,-1.13482 -0.006,-8.88319 -0.0119,-17.76638 -0.0178,-26.6495 -10e-4,-1.96677 -2.99131,-1.21747 -5.5009,-1.21578 -2.7614,0.002 -5.00129,-2.2352 -5.0032,-4.99671 -0.002,-2.76161 2.23509,-5.0015 4.99671,-5.0033 2.38809,-0.001 5.50019,0.48761 5.49899,-1.25328 l -0.019,-28.5309 c -10e-4,-1.96681 -2.9912,-1.21751 -5.50079,-1.21582 -2.76151,0.002 -5.00141,-2.2352 -5.00331,-4.99671 -0.002,-2.76158 2.23509,-5.0015 4.99671,-5.00337 2.3882,-0.001 5.5003,0.48768 5.4991,-1.25321 l -0.0191,-28.5308 c -0.001,-1.9668 -2.99109,-1.2175 -5.50082,-1.21581 -2.76148,0.002 -5.0013,-2.2352 -5.00321,-4.99671 -0.002,-2.76158 2.23513,-5.00147 4.99661,-5.00327 2.3883,-0.002 5.5003,0.48757 5.4992,-1.25331 l -0.018,-26.839617 c -0.0141,-1.966771 -1.34249,-0.909779 -5.5004,-0.907203 -2.76158,0.0018 -5.00162,-2.234883 -5.00341,-4.996498 -0.002,-2.73438 1.03261,-3.000692 -1.4453,-2.998999 z" vector-effect="non-scaling-stroke" id="path5" /></g>';
    ///30.361 should be variable depending on the shape
    var scalingOperatorX = scaleX;
    var scalingOperatorY = scaleY;
    const fixedWidth = percentageX * scalingOperatorX * operator / 12.50; // assuming that there is no white space in the jpg image, if there is white space then it has to be handled differently
    const svgDims = getDimensionGeneral(svgFile);
    const scalingFactor = fixedWidth / svgDims[0];
    ///26.215/30.361 should be variable depending on the shape

    // this has to be fixed I don't know how
    const scalingFactorY = (scalingOperatorY / scalingOperatorX)*fixedWidth / svgDims[1] * percentageY;

    console.log('svgFile:', svgFile);
    const viewboxIndex = findStartEndIndices(svgFile, 'viewBox="');

    const final2 = svgFile.replaceAll('fill="#000000"', ' fill="none" ').replaceAll('width="' + svgDims[2] + '"', 'width="800.000000pt"')
        .replaceAll('height="' + svgDims[3] + '"', 'height="535.000000pt"').replaceAll(svgFile.substring(viewboxIndex[0], viewboxIndex[1] + 1), 'viewBox="0 0 800.000000 500.000000"');// have to fix this but how
    const tansformIndex = findStartEndIndices(final2, 'transform="');
    const final3 = final2.replaceAll('stroke="none"', ' stroke="#76C2DA" stroke-width="0.1" ');
    /// original
    // transformOval

    var marginX = 147.9611671;
    var marginY = 130.17244096;
    if (shape == 'Oval'){
        marginX = 157;
        marginY = 120;
    }
    const transform = ' transform="translate(' + marginX +','+marginY+') scale(-' + scalingFactor + ',-' + scalingFactorY + ') ';//-0.0215,-0.0215 those has to be dynamically
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
            var xTransform = parseFloat(marginX) + j * 119;
            var yTransform = parseFloat(marginY) + i * 116.2;
            const g1 = g.replace(marginX.toString(), xTransform).replace(marginY.toString(), yTransform);
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