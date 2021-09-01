import React from 'react';
import { Alert, Button, ButtonGroup, ButtonToolbar, Form, FormGroup, ProgressBar, Text,Row,Col,Container,Grid } from 'react-bootstrap';
import { connect } from 'react-redux';
import {  loadDocument,removeDocumentSelected, selectDocument, selectDocuments, setDocumentAttrs, transform2dSelectedDocuments } from '../actions/document';
import { addOperation, clearOperations,  setFormData, setDepth, setFont } from '../actions/operation';
import { GlobalStore } from '../index';
import { appendExt, captureConsole, openDataWindow, sendAsFile } from '../lib/helpers';
import { getSVGOpenClose,getSVGOpenCloseAPI,generateSVGGird,  getDimensionAPI, minimizeSvgFile, minimizeSvgFileRect, removeBlanks,  validateLayout, calcMargins, getDimensionStr, getDimension, getDimensionGeneral} from '../lib/general'
import Parser from '../lib/lw.svg-parser/parser';
import { ValidateSettings } from '../reducers/settings';
import { withDocumentCache } from './document-cache';
import Icon from './font-awesome';
import { GetBounds, withGetBounds } from './get-bounds.js';
import { imageTagPromise, promisedImage } from './image-filters';
import { alert, confirm, prompt } from './laserweb';
import Select from 'react-select';

import Eid from './eid';
import ILoveYOU from './iloveyou';
import Birthday from './birthday';
import GeneralGroup from './generalGroup';
import Decorated  from './decorated';
import MainTemplates from './mainTemplates';
import MainShapes from './mainShapes'
import ShapeGroups from './shapeGroups'
import axios from 'axios';
import { rectFrame, rectFrame6,framePath,  operator, shapeTemplats, allShapesSVG} from '../data/staticData.js'
const opentype = require('opentype.js');
export const DOCUMENT_FILETYPES = '.png,.jpg,.jpeg,.bmp,.gcode,.g,.svg,.dxf,.tap,.gc,.nc'

const initialState = {
    content: "",
    svg: "",
    font: 'Almarai-Bold.ttf',
    width: 0,
    lineHeight: 0,
    activeTemplateName: 'Square',
    activeTemplate: {
        "id": "SquareModel",
        "file": "../Square.svg",//this file will change depending on the template adding profiles
        "scale": 0.001,
        "moldShifts": [70, 65],
        filePcsCount:32,// the number of pcs in svg file according to template, square in square :32,circle in square:49
        fontSize: 40,
        pcsCount:6,
        layoutWidth:10000, 
        xCount:2, 
        yCount:3,
        marginBetweenPCs:[184,184],
        initialMargin:[181.7,335],//should change based on the size of the text and shape
        textScalingPercetage:[0.7,0.7],

        shapePosition:1,
        textPosition:1,
        shapeSVGName: allShapesSVG[0],
        decorationMargin: [
            // for the tempale 4 : it is 128.5*operator + initialMargin
            // is the initial y margin, x is not at the zero point
            '179,85',
            //'0,0',
            //485.5 is the standard margin which is compared to 
            '664,85',
            '179,570.5',
            '664,570.5',
            '179,1056',
            '664,1056'
        ],
        decorationDMargin: [
            '60,203',
            '545,203',
            '60,688',
            '545,688',
            '60,1173',
            '545,1173'
        ],
        shapePosition: 1,
        textPosition: 1,
        shapeScalingPercentage: [2,2],
        
    },
    marginX: 0,
    marginY: 0,
    scale: 0.012695775,
    fontSize: 25,
    fontchange: 0,
    textDocID: '',
    templateDocID: '',
    direction: 'LTR',
    stepOver: 100,
    svgOutpout: [],
    svgModels: [],
    layout: [],
    chocolateDepth: 30,
    textEnabled: true,
    generalAllEnable: false,
    moldShifts: [70, 65],
    extraShift: [1, 0, 0, 1, 0, 0],
    originalShift: [0, 0],
    svgDim: [],
    changesScaling: [1, 0, 0, 1, 0, 0],
    scalingCount: 0,
    step1: false,
    step2: true,
    step3: false,
    step4: false,
    step5: false,
    step6: false,
    loadImageEnabled:false,
    readyMade:false,
    readyMadeTemplate:'Eid',
    activeImageGroup:'Eid',
    activeGroupEid: false,
    activeGroupiloveyou:false,
    activeGroupGeneral:false,
    activeGroupBirthday:false,
    textMode:false,
    pcsCount: 6,
    boxDims:[],
    moldPlaceHolder: '\nname\nhere',
    paddingTop: '35px',
    forwardEnabled: false,
    errorMessage: 'Test',
    statusMsg: 'Progress',
    svgFile:'',
    fileLoaded:false,
    hideme:'',
    selectedFile: null,
    scalingOperatorX:25.2,//for circleModel
    scalingOperatorY:25.2,//for circle, when choosing shape this will change.
    templateName:'',
    textField:'', 
    shapeModelNo:0,
    shapeFile:'9877.svg',
    hasDecoration: false,
};
class Cam extends React.Component {

    constructor(props) {
        super(props);
        this.chocoalteDepthRef;
        this.state = initialState;
        let { settings, documents, operations } = this.props;
        this.handleChange = this.handleChange.bind(this);
        this.changeTextTemplateName = this.changeTextTemplateName.bind(this);
        this.handleFontChange = this.handleFontChange.bind(this);
        this.handleShapeChange = this.handleShapeChange.bind(this);
        this.handleSubmission = this.handleSubmission.bind(this);
        this.handleTemplateChange = this.handleTemplateChange.bind(this);
        this.generateGcode = this.generateGcode.bind(this);
        this.generateBox = this.generateBox.bind(this);
        this.handleShape = this.handleShape.bind(this);
        this.step1 = this.step1.bind(this);
        this.step2 = this.step2.bind(this);
        this.step3 = this.step3.bind(this);
        this.setPcsCount = this.setPcsCount.bind(this);
        this.checkRTL = this.checkRTL.bind(this);
        this.handleFontChange = this.handleFontChange.bind(this);
        this.convert = this.convert.bind(this);
        //onFileChange
        this.onFileChange = this.onFileChange.bind(this);
        this.onFileUpload = this.onFileUpload.bind(this);
        this.mainTemplate = this.mainTemplate.bind(this);
        this.selectModelNo = this.selectModelNo.bind(this);
        this.chooseShape = this.chooseShape.bind(this);
        this.generateBoxCalligraphy = this.generateBoxCalligraphy.bind(this);
        this.generateBoxAll = this.generateBoxAll.bind(this);
    }

    componentWillMount() {}
    componentWillMount() {}
    generateGcode(run) {
        this.QE = window.generateGcode(run);
    }

    changeTextTemplateName(e) {
        if (e.target.value == '') {
            this.setState({ forwardEnabled: false });
        }
        else {
            this.setState({ forwardEnabled: true });
        }
        this.setState({ templateName: e.target.value, textEnabled: true });
    }
    handleChange(e) {
        if(e.target.value == ''){
            this.setState({forwardEnabled:false});
        }
        else {
            this.setState({forwardEnabled:true});
        }
        var lines = e.target.value.split("\n");
        lines.forEach((line, i) => {
            var words = line.split(" ");
            words.forEach(word => {
                if (word.length > 13) {
                    alert('Very long name please use a shorter name, less than 13 char');
                    return;
                }
                if (words.length > this.state.activeTemplate.maxWordsEn) {
                    alert(' Only max ' + this.state.activeTemplate.maxWordsEn + ' words is allowed.');
                    return;
                }
            });
        });
        this.props.dispatch(setFormData(e.target.value));
        this.setState({ content: e.target.value,textEnabled:true });
    }
    handleFontChange(selectedOption) {
        switch (selectedOption.value) {

            case 'Almarai-Bold.ttf':
                this.setState({ font: 'Almarai-Bold.ttf', fontSize: 23 ,stepOver:100});
                break;
            case 'ITCKRIST.TTF':
                this.setState({ font: 'ITCKRIST.TTF', fontSize: 20, stepOver: 100});
                break;
            case 'Bevan.ttf':
                this.setState({ font: 'Bevan.ttf', fontSize: 16 ,stepOver:100});
                break;
            default:
                this.setState({ font: 'Almarai-Bold.ttf', fontSize: 23, stepOver: 100});
                break;
        }
        this.props.dispatch(setFont(selectedOption.value));
        this.setState({ font: selectedOption.value });
    }
    handleShapeChange(selectedOption){
        this.setState({ readyMadeTemplate: selectedOption.value });
        switch (selectedOption.value) {
            case 'eid':
                this.setState({ activeGroupEid: true,activeGroupBirthday:false,activeGroupGeneral: false,activeGroupiloveyou:false});
            break;
            case 'iloveyou':
                this.setState({ activeGroupEid: false, activeGroupBirthday: false, activeGroupGeneral: false, activeGroupiloveyou: true });
            break;
            case 'general':
                this.setState({ activeGroupEid: false, activeGroupBirthday: false, activeGroupGeneral: true, activeGroupiloveyou: false });
            break;
            case 'birthday':
                this.setState({ activeGroupEid: false, activeGroupBirthday: true, activeGroupGeneral: false, activeGroupiloveyou: false });
                break;
            default:
            break;
        }
    }

    handleTemplateChange(e, templateName = null) {
        let { value } = e.target;

        if (templateName)
            value = templateName;
        this.setState({
            activeTemplateName: value
        });    
    };

    checkRTL(s) {
        var ltrChars = 'A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF' + '\u2C00-\uFB1C\uFDFE-\uFE6F\uFEFD-\uFFFF',
            rtlChars = '\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC',
            rtlDirCheck = new RegExp('^[^' + ltrChars + ']*[' + rtlChars + ']');
        if (rtlDirCheck.test(s.target.value)) 
            this.setState({ direction: 'RTL', textEnabled: true, font:'Almarai-Bold.ttf' });
        else
            this.setState({ direction: 'LTR',textEnabled:true });
        return rtlDirCheck.test(s.target.value);
    };


    shouldComponentUpdate(nextProps, nextState) {
        return (
            nextState.font !== this.state.font || /*nextState.fontSize !== this.state.fontSize || */
            nextProps.documents !== this.props.documents ||
            nextState.step1 !== this.state.step1 ||
            nextState.step2 !== this.state.step2 ||
            nextState.step3 !== this.state.step3 || 
            nextState.step4 !== this.state.step4 ||
            nextState.step5 !== this.state.step5 ||
            nextState.step6 !== this.state.step6 ||
            nextState.textMode !== this.state.textMode ||
            nextState.activeGroupEid !== this.state.activeGroupEid ||
            nextState.activeGroupGeneral !== this.state.activeGroupGeneral ||
            nextState.activeGroupiloveyou !== this.state.activeGroupiloveyou ||
            nextState.activeGroupBirthday !== this.state.activeGroupBirthday ||
            nextState.readyMade !== this.state.readyMade ||
            nextState.activeImageGroup !== this.state.activeImageGroup ||
            nextState.readyMadeTemplate !== this.state.readyMadeTemplate ||
            nextState.loadImageEnabled !== this.state.loadImageEnabled ||
            nextState.pcsCount !== this.state.pcsCount ||
            nextState.content !== this.state.content  ||
            nextState.statusMsg !== this.state.statusMsg ||
            nextState.fileLoaded !== this.state.fileLoaded
        );
    }
 
    init() {
        console.log('clean everything before you start again: delete documents,clean gcode');
        if (this.state.templateDocID != '')
            this.props.dispatch(selectDocument(this.state.templateDocID));
        if (this.state.textDocID != '')
            this.props.dispatch(selectDocument(this.state.textDocID));
        this.props.dispatch(selectDocuments(true));
        this.props.dispatch(removeDocumentSelected());
        this.props.dispatch(clearOperations());
    }

    findStartEndIndices(string, substring) {
        const startIndex = string.indexOf(substring);
        const endIndex = string.indexOf('"', startIndex + 11);
        return [startIndex, endIndex]

    }
    generateBoxAll(){
        this.setPcsCount('mm', 4, this.generateBoxCalligraphy("boxTemplate4"));
        this.setPcsCount('mm', 6, this.generateBoxCalligraphy("boxTemplate6"));
        this.setPcsCount('mm', 24, this.generateBoxCalligraphy("boxTemplate24"));
        this.setPcsCount('mm', 32, this.generateBoxCalligraphy("boxTemplate32"));
    }
    generateBoxCalligraphy(elementId){
        this.init();
        var payload = this.prepareImage();// the result is a white and black image.
        const img = document.getElementById("eeveelutions");//eeveelutions  //eeveelutions
        var canvas = document.getElementById("canvas");
        var ctx = canvas.getContext("2d");
        var updatedImageData = '';
        var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const that = this;
        var svgContent;
        axios.post('http://localhost:8090/http://localhost:4000', { data: payload })
            .then((response) => {
                updatedImageData = response;
                console.log('resop', response);
                var i = new Image();

                i.onload = function () {
                    img.width = i.width;
                    img.height = i.height;
                    img.src = response.data;
                    const image = document.getElementById("eeveelutions");
                    ctx = canvas.getContext("2d");
                    img.crossOrigin = "anonymous";
                    var canvasMod = document.getElementById('canvasMod');
                    var inMemCtx = canvasMod.getContext('2d');
                    canvasMod.width = img.width;
                    canvasMod.height = img.height;
                    canvasMod.width = img.width;
                    canvasMod.height = img.height;
                    inMemCtx.drawImage(img,
                        0, 0, img.width, img.height,
                        0, 0, img.width, img.height);
                    canvas.width = img.width;
                    canvas.height = img.height;
                    var start = window.performance.now();

                    ctx.drawImage(canvasMod, 0, 0);
                    const croppedDimensions = removeBlanks(canvas, canvas.width, canvas.height);
                    var end = window.performance.now();
                    console.log(`Execution time1: ${end - start} ms`);
                    imgData = ctx.getImageData(0, 0, croppedDimensions[4], croppedDimensions[5]);
                    var pngImage = canvas.toDataURL("image/png");
                    const payload = { data: pngImage };
                    const options = {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(payload),
                        cors: true, // allow cross-origin HTTP request
                        credentials: 'same-origin' // This is similar to XHR’s withCredentials flag
                    };
                    //fetch('http://localhost:8090/http://localhost/ChocoGraveProject/LaserWeb4/dist/convertio/script.php', options).then(response => response.json())
                    fetch('convertio/111111.svg').then(resp => resp.text())
                        .then((response) => {
                            const image = response;
                            const dims = getDimensionGeneral(response);
                            that.setState({ dims: dims }, () => {
                            });
                            svgContent = response;
                            that.setState({ fileLoaded: true, generatedFile: image, hideme: 'hideMe' });
                        }).then(() => {
                            const scale = 25 / that.state.dims[0];
                            var final = generateSVGGird(svgContent,that.state,elementId)
                            console.log('svg is like this:',svgContent); /// bunu de handle
                            var updatedContent;
                        });

                };
                i.src = response.data;

            });
    }

    generateBox(){
        var text = this.state.templateName;
        if ( text == '' || text == undefined ) {
            alert('no text???');
            return;
        }
        var models = {};

        const that = this;
        const computeLayout = require('opentype-layout');
        let font = this.state.font;
        var fontSize;
        this.init();
        var downloaable = false;
        const makerjs = require('makerjs');
        var layout;
        opentype.load(font, function (err, font) {
            var activeTemplate = that.state.activeTemplate;
            var lineHeight = activeTemplate.lineHeight;
            fontSize = activeTemplate.fontSize;
            var scale = 1 / font.unitsPerEm * fontSize;
            const finalWidth = 20;
            console.log('width should be', finalWidth / scale);
            console.log('lineHeight', lineHeight);
            const lineCount =1;
            // let width to be constant value: 3000 should not change
            let layoutOptions = {
                "align": "center",
                lineHeight: that.state.specialMargin[5]/lineCount,
                width: that.state.specialMargin[4],//finalWidth / scale
                mode: 'nowrap'
            };
            try 
            {
                layout = computeLayout(font,text,layoutOptions);
                console.log('Layout is:',layout);
                const max = layout.lines.reduce(
                    (prev, current) => (prev.width > current.width) ? prev : current
                );
                if (max.width != that.state.specialMargin[4]){
                    fontSize = fontSize * that.state.specialMargin[4]/max.width;
                    scale = 1 / font.unitsPerEm * fontSize;
                    //change font size
                    layoutOptions = {
                        "align": "center",
                        lineHeight: that.state.specialMargin[5]/lineCount,
                        width: that.state.specialMargin[4],//fin
                        mode: 'nowrap'
                    };
                    layout = computeLayout(font, text, layoutOptions);
                }
                //            'two': [70, 60, 45, 14, 4275, 1176, 183.74, 110, 20, 1, 10],

                that.setState({layout:layout});
                layout.glyphs.forEach((glyph, i) => {
                    var character = makerjs.models.Text.glyphToModel(glyph.data, fontSize);
                    character.origin = makerjs.point.scale(glyph.position, scale);
                    makerjs.model.addModel(models, character, i);
                });
                let mmDims = getDimension(makerjs.exporter.toSVG(models)).map(n => n / operator);
                var pcsCount = activeTemplate.pcsCount;
                console.log(models);
                console.log('Standard Margin is: ',(activeTemplate.marginBetweenPCs[0] - mmDims[0])* operator)
                models = makerjs.layout.cloneToGrid(
                    models,
                    activeTemplate.xCount,
                    activeTemplate.yCount,
                    [
                        (that.state.specialMargin[6] /*- mmDims[0]*/) * operator,
                        (that.state.specialMargin[7] /*- mmDims[1]*/) * operator
                    ]
                );
                
                const svgFile = makerjs.exporter.toSVG(models); 
                const svgDims = getDimensionStr(svgFile);
                const maxDim = Math.max(...svgDims);
                const minDim = Math.min(...svgDims);
                console.log('mmDims are', svgDims);
                if ([2, 3, 6, 8, 16].indexOf(pcsCount) === -1)
                    var svgFileModified = svgFile.replace(svgDims[0], '1122.5196')
                        .replace(svgDims[0], '1122.5196')
                        .replace(svgDims[1], '1587.401')
                        .replace(svgDims[1], '1587.401')
                        .replace('xmlns="http://www.w3.org/2000/svg"', ' xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ');// we have to change this
                else if (pcsCount === 50)
                    svgFileModified = svgObject.replace(svgDims[0], '1208.37').replace(svgDims[0], '1208.37').replace(svgDims[1], '1587.401').replace(svgDims[1], '1587.401')
                        .replace('xmlns="http://www.w3.org/2000/svg"', ' xmlns="http://www.w3.org/2000/svg"  xmlns:xlink="http://www.w3.org/1999/xlink" ');// we have to change this
                else
                    var svgFileModified = svgFile.replace(svgDims[0], '1122.5196')
                        .replace(svgDims[0], '1122.5196')
                        .replace(svgDims[1], '1587.401')
                        .replace(svgDims[1], '1587.401')
                        .replace('xmlns="http://www.w3.org/2000/svg"', ' xmlns="http://www.w3.org/2000/svg"  xmlns:xlink="http://www.w3.org/1999/xlink" ');// we have to change this
                // the original value is this
                //var svgFileModified = svgFile.replace(svgDims[0], '843.3063').replace(svgDims[1], '1192.3787');// we have to change this
                var transformIndex = svgFileModified.indexOf('<g')+2;

                var mainMargin = that.state.specialMargin[8]* operator;
                var stringMarginX = mainMargin.toString();
                var stringMarginY = (that.state.specialMargin[10] * operator).toString();
                var margins;
                if (pcsCount == 50) {
                    stringMarginX = "18";
                    stringMarginY = "210";
                    margins = "18,210";

                }
                else 
                    margins = stringMarginX+', '+stringMarginY;
                var finalist = svgFileModified.slice(0, transformIndex) + ' transform="translate(' + margins + ') scale(' + activeTemplate.textScalingPercetage+')" ' + svgFileModified.slice(transformIndex);
                var theFinal = finalist;
                var closeGIndex = finalist.indexOf('</svg>');
                let k = 0; 
                var contentModified;
                var decoration,decoroartionDown;
                var shapeFile = that.state.shapeFile;
                if ([2, 3,6, 24].indexOf(pcsCount) !== -1 && that.state.hasDecoration)
                    shapeFile = that.state.extension + that.state.shapeFile;
                fetch(shapeFile)
                    .then(resp => resp.text())
                    .then(content => {
                        // replace the first <G in content with what we want
                        for (let i = 0; i < activeTemplate.xCount; i++) {
                            for (let j = 0; j < activeTemplate.yCount; j++) { 
                                var scalingStatement = (activeTemplate.shapeScalingPercentage[0] * that.state.specialMargin[9]).toString() + ',' + (activeTemplate.shapeScalingPercentage[1] * that.state.specialMargin[9]).toString();
                                closeGIndex = theFinal.indexOf('</svg>');
                                var marginX = activeTemplate.shapeMarginsBase[0] + i * activeTemplate.shapeMarginsBase[2];
                                var marginY = activeTemplate.shapeMarginsBase[1] + j * activeTemplate.shapeMarginsBase[3];
                                var margins = marginX.toString() + ',' + marginY.toString();
                                //contentModified = content.replace('<g id="bostani">', '<g id="bostani" transform="translate(' + activeTemplate.shapeMargins[k] + ') scale('+activeTemplate.shapeScalingPercentage+')">');// we have to change this
                                contentModified = content.replace('<g id="bostani">', '<g id="bostani" transform="translate(' + margins + ') scale(' + scalingStatement + ')">');// we have to change this
                                theFinal = theFinal.slice(0, closeGIndex) + contentModified +  theFinal.slice(closeGIndex);
                                k++;
                            }
                        }
                        closeGIndex = theFinal.indexOf('</svg>');
                        /*
                        if pcsCount: 2,3,8,6,12,16 then we will add the
                        //<g transform="rotate(-90 280 200) translate(712.18,1274.969) scale(-1,-1 )">
                        after the SVG tag, and 
                        //</g> before the close </svg> tag
                        */
                        if ([2, 3, 6, 8, 16].indexOf(pcsCount) === -1)
                        theFinal = theFinal.slice(0, closeGIndex) + rectFrame + theFinal.slice(closeGIndex);
                        else 
                            theFinal = theFinal.slice(0, closeGIndex) + rectFrame6 + theFinal.slice(closeGIndex);
                        if([2,3,6,8,16].indexOf(pcsCount) !== -1){
                            //const rotateStatement = '<g transform="rotate(-90 280 200) translate(712.18,1274.969) scale(-1,-1 )">';
                            //const rotateStatement = '<g transform="rotate(-90 280 200) translate(479.8,1042.549) scale(-1,-1 )">';                
                            const rotateStatement = '<g transform="rotate(-90 280 200)  translate(479.3,1041.949) scale(-1,-1 )">';

                            const svgIndices = getSVGOpenCloseAPI(theFinal);
                            var anotherStep = theFinal.slice(0, svgIndices[0]-1) + rotateStatement + theFinal.slice(svgIndices[0]-1);
                            theFinal = anotherStep.slice(0, svgIndices[1] + rotateStatement.length) + '</g>' + anotherStep.slice(svgIndices[1] + rotateStatement.length);
                        }
                        
                        var svgElement = document.getElementById("boxTemplate");
                        svgElement.setAttribute('href', 'data:text/plain;chartset=utf-8,' + encodeURIComponent(theFinal));
                        svgElement.setAttribute('download', 'File.svg');
                    });
            }
            catch(ex){
                console.log(ex);
            }

        });
    }

    handleSubmission(e) {
        e.preventDefault();
        var text = e.target.content.value;
        this.setState({
            content: text
        });
    }

    step1(){
        this.setState({step1: true, step2: false,step3:false});
    }

    step2(){
        this.setState({ step1: false, step2: true, step3: false });
    }

    step3(){
        this.setState({ step1: false, step2: false,step3:true });
    }

    

    chooseShape(shapeNo){
        switch(this.state.pcsCount){
            case 1:
                this.setState({
                    specialMargin: allShapesSVG[shapeNo][4].one
                });
                break;
            case 2:
                this.setState({
                    specialMargin: allShapesSVG[shapeNo][4].two
                });
                break;
            case 3:
                this.setState({
                    specialMargin: allShapesSVG[shapeNo][4].three
                });
                break;
            case 4:
                this.setState({
                    specialMargin: allShapesSVG[shapeNo][4].four
                });
                break;
            case 6:case 8: case 12: case 16:
                this.setState({
                    specialMargin: allShapesSVG[shapeNo][4].six
                });
                break;
            case 24:
                this.setState({
                    specialMargin: allShapesSVG[shapeNo][4].twentyfour
                });
                break;
            case 32:
                this.setState({
                    specialMargin: allShapesSVG[shapeNo][4].thirtytwo
                });
                break;
            case 50:
                this.setState({
                    specialMargin: allShapesSVG[shapeNo][4].fifty
                });
                break;
            default:
                this.setState({
                    specialMargin: [0,0]
                });
                break;
        }
        
        this.setState({ 
            shapeFile: allShapesSVG[shapeNo][0],
            hasDecoration: allShapesSVG[shapeNo][1], 
            svgShapeExtraScaling:allShapesSVG[shapeNo][3], 
            extraMargin:allShapesSVG[shapeNo][4]
            });
    }
    handleShape(shape){
        var chocoTemplates = require("../data/chocolateTemplates.json");
        var activeTemplate;
        switch(shape){
            case 'decorated':// square in square
                activeTemplate = chocoTemplates.templates[2];
                this.setState({ 
                    mold: 'mold1.png',
                    moldWidth: '231px',moldHeight: '232px',
                    moldName:'Square',                    
                    moldPlaceHolder: 'name\nhere',
                    paddingTop: '65px',
                    scalingOperatorX: 25.2,
                    scalingOperatorY:25.2//should we reduce this by 2 mm in all the shapes?? I think so
                 });
            break;

            default:
                activeTemplate = chocoTemplates.templates[0];
            break;
        }
        this.setState({ step1: false, step2: true, activeTemplate: activeTemplate});
    }
    setPcsCount(name,count){
        switch(count){
            case 1://we have to set some settings
                var boxDims = [66, 66];
                var svgDim = 165 / operator;//165px in the svg file imported
                var marginX = (boxDims[0] - 1.52 * svgDim) * operator / 2 + 9.148 * operator;
                var marginY = (boxDims[1] - 1.52 * svgDim) * operator / 2 + 25 * operator;
                marginX = 33.3;
                marginY = 93.5;
                this.setState(
                    {
                        pcsCount: count,
                        activeTemplate: {
                            fontSize: 40,
                            pcsCount: 20,
                            layoutWidth: 3000,
                            lineHeight:866.66,
                            xCount: 4,
                            yCount: 5,
                            marginBetweenPCs: [192, 205.51],
                            initialMargin: [0, 0],//should change based on the size of the text and shape
                            textScalingPercetage: [0.37, 0.37],
                            shapeMarginsBase:[
                                //50,115,268,287
                                marginX, marginY, 71*operator, 76*operator,
                            ],
                            calligraphyMargins:[
                                85,220
                            ],             
                            shapePosition: 1,
                            textPosition: 1,
                            shapeScalingPercentage: [53.84, 53.84],
                        },
                        step1: false, step2: false, step3: true
                    }
                );
            break;
            case 2://we have to
                boxDims = [119,66.5];
                svgDim = 165/operator;//165px in the svg file imported
                marginX = (boxDims[0] - 1.54 * svgDim) * operator / 2 + 21.5*operator;
                marginY = (boxDims[1] - 1.54 * svgDim) * operator / 2 + 7.5*operator;
                marginX = 78.70;
                marginY = 28.7;
                this.setState(
                    {
                        
                        extension:'Sec',
                        pcsCount: count,
                        activeTemplate: {
                            fontSize: 36,
                            pcsCount: 2,
                            layoutWidth: 3354,
                            lineHeight: 866.66,
                            xCount: 3,
                            yCount: 4,
                            marginBetweenPCs: [215, 215*(boxDims[1]/boxDims[0])],
                            textScalingPercetage: [0.6, 0.6],
                            shapeMarginsBase: [
                                marginX, marginY, 129 * operator, 71.5 * operator,
                            ],

                            calligraphyMargins: [
                                173, 140
                            ],
                            initialMargin: [marginX + 48 * 1.3, marginY + 1.3 * 43.565153 / 2 + 137],//should change based on the size of the text and shape

                            shapePosition: 1,
                            textPosition: 1,
                            shapeScalingPercentage: [96.038, 96.038],
                        },
                        step1: false, step2: false, step3: true
                    }
                );
            break;
            case 3:
                
                boxDims = [173, 73];
                svgDim = 165 / operator;//165px in the svg file imported
                var marginX = (boxDims[0] - 1.68 * svgDim) * operator / 2 + 32 * operator;
                var marginY = (boxDims[1] - 1.68 * svgDim) * operator / 2 + 33.75 * operator;
                marginX = 118.2;
                marginY = 126;
                this.setState(
                    {
                        extension: 'Thr',
                        pcsCount: count,
                        activeTemplate: {
                            fontSize: 40,
                            pcsCount: 3,
                            layoutWidth: 3354,
                            lineHeight: 866.66,
                            xCount: 2,
                            yCount: 3,
                            marginBetweenPCs: [303.5, 128.0664],
                            textScalingPercetage: [0.57, 0.57],
                            shapeMarginsBase: [
                                marginX, marginY, 183 * operator, 78 * operator,
                            ],
                            initialMargin: [marginX + 48 * 1.3, marginY + 1.3 * 43.565153 / 2 + 137],//should change based on the size of the text and shape
                            calligraphyMargins: [
                                250, 150
                            ],
                            shapePosition: 1,
                            textPosition: 1,
                            shapeScalingPercentage: [103.32 * 0.935, 103.32 * 0.9305 ]
                        },
                        step1: false, step2: false, step3: true
                    
                    });
                break;
            case 4://we have to
                boxDims = [118.5, 118.5];
                svgDim = 165 / operator;//165px in the svg file imported
                var marginX = (boxDims[0] - 2.7143 * svgDim) * operator / 2 + 24.4 * operator;
                marginX = 59.227730318714;
                var marginY = (boxDims[1] - 2.7143 * svgDim) * operator / 2 + 17 * operator;
                marginY = 84.259226381375;
                this.setState(
                    {
                        pcsCount: count,
                        activeTemplate: {
                            fontSize: 32,
                            pcsCount: 4,
                            layoutWidth: 3354,
                            lineHeight: 866.66,
                            xCount: 2,
                            yCount: 3,
                            marginBetweenPCs: [183.7397, 183.7397],
                            initialMargin: [202, 435],//should change based on the size of the text and shape
                            textScalingPercetage: [0.7, 0.7],
                            calligraphyScalingPercetage: [0.02, -0.02],
                            shapeMarginsBase: [
                                marginX, marginY, 128.5 * operator, 128.5 * operator,
                            ],
                            calligraphyFactor: 18,
                            calligraphyMargins: [
                                130, 400
                            ],
                            shapePosition: 1,
                            textPosition: 1,
                            shapeScalingPercentage: [2, 2],
                            shapeSVGName: allShapesSVG[0],
                            shapePosition: 1,
                            textPosition: 1,
                            //shapeScalingPercentage: [2.7143 * 0.85213986, 2.7143 * 0.85213986],
                            shapeScalingPercentage: [96.40632
                                , 96.40632
                            ],
                            
                        },
                        step1: false, step2: false, step3: true
                    }
                );
                break;
            case 6: case 8: case 12: case 16:
                boxDims = [172, 127];
                svgDim = 165 / operator;//165px in the svg file imported
                var marginX = (boxDims[0] - 2.909 * svgDim) * operator / 2 + 30.75 * operator;
                var marginY = (boxDims[1] - 2.909 * svgDim) * operator / 2 + 16.75 * operator;
                marginX = 114.4;
                marginY = 62.4;
                this.setState(
                    {
                        extension: 'Six',
                        pcsCount: count,
                        activeTemplate: {
                            fontSize: 35,
                            pcsCount: 6,
                            layoutWidth: 3354,
                            lineHeight: 866.66,
                            xCount: 2,
                            yCount: 2,                            
                            marginBetweenPCs: [200, 152],
                            initialMargin: [(marginX + 165 * 2.909 * 0.35) , (marginY + 165 * 2.909 * 0.80) ],//should change based on the size of the text and shape

                            //initialMargin: [240, 400],//should change based on the size of the text and shape
                            textScalingPercetage: [0.9, 0.9],
                            shapeMarginsBase: [
                                marginX, marginY, 182 * operator, 137 * operator,
                            ],
                            calligraphyFactor: 20,

                            calligraphyMargins: [
                                155, 430
                            ],

                            shapePosition: 1,
                            textPosition: 1,
                            shapeScalingPercentage: [96, 96],// to be multiplied by 0.85213986
                        },
                        step1: false, step2: false, step3: true
                    }
                );
            break;
            case 24://we have to
                var marginX = (219 - 3.9* 43.565153) * operator / 2 + 39*operator ;
                marginX = 147;
                var marginY = (169 - 3.9 * 43.565153) * operator / 2 + 36*operator ;
                marginY = 134.81;
                this.setState(
                    {
                        extension: 'Twi',
                        pcsCount: count,
                        activeTemplate: {
                            fontSize: 40,
                            pcsCount: 24,
                            layoutWidth: 3354,
                            lineHeight: 866.66,
                            xCount: 1,
                            yCount: 2,
                            marginBetweenPCs: [148, 148],
                            initialMargin: [111*operator, 171*operator],//should change based on the size of the text and shape
                            textScalingPercetage: [1.2, 1.2],
                            shapeMarginsBase: [
                                marginX, marginY, 0, operator*179
                            ],
                            calligraphyFactor: 25,

                            calligraphyMargins: [
                                200-6.6*operator, 580-16*operator
                            ],
                            shapePosition: 1,
                            textPosition: 1,
                            shapeScalingPercentage: [96.55, 96.6],
                        },
                        step1: false, step2: false, step3: true
                    }
                );
            break;
            case 32://we have to
                var marginX = (236.5 - 5.477 * 43.565153) * operator / 2 + 30 * operator;
                marginX = 112;
                var marginY = (236.5 - 5.477 * 43.565153) * operator / 2 + 91.5 * operator;
                marginY = 346.5;
                this.setState(
                    {
                        pcsCount: count,
                        activeTemplate: {
                            fontSize: 45,
                            pcsCount: 1,
                            layoutWidth: 3354,
                            lineHeight: 866.66,
                            xCount: 1,
                            yCount: 1,
                            marginBetweenPCs: [300, 300],
                            initialMargin: [390, 1050],//should change based on the size of the text and shape
                            textScalingPercetage: [0.95, 0.95],
                            shapeMarginsBase: [
                                marginX, marginY, 0, 0
                            ],
                            calligraphyMargins: [
                                255.3, 705
                            ],
                            calligraphyFactor: 33.5,
                            shapePosition: 1,
                            textPosition: 1,
                            shapeScalingPercentage: [192.42, 192.42],
                        },
                        step1: false, step2: false, step3: true
                    }
                );            
                break;
            case 50://we have to
                var marginX = (236.5 - 5.477 * 43.565153) * operator / 2 + 30 * operator;
                marginX = 112;
                var marginY = (236.5 - 5.477 * 43.565153) * operator / 2 + 91.5 * operator;
                marginY = 346.5;
                this.setState(
                    {
                        pcsCount: count,
                        activeTemplate: {
                            fontSize: 45,
                            pcsCount: 50,
                            layoutWidth: 3354,
                            lineHeight: 866.66,
                            xCount: 1,
                            yCount: 1,
                            marginBetweenPCs: [300, 300],
                            initialMargin: [390, 1050],//should change based on the size of the text and shape
                            textScalingPercetage: [0.95, 0.95],
                            shapeMarginsBase: [
                                marginX, marginY, 0, 0
                            ],
                            calligraphyMargins: [
                                255.3, 705
                            ],
                            calligraphyFactor: 33.5,
                            shapePosition: 1,
                            textPosition: 1,
                            shapeScalingPercentage: [192.42, 192.42],
                        },
                        step1: false, step2: false, step3: true
                    }
                );
                break;            break;
            default:
            break;
        }   
    }

    selectModelNo(model){
        this.setState({
            shapeModelNo:model
        });
        const modifiers = {};
        const release = captureConsole();
        const parser = new Parser({});
        let file = {
            name: "template.svg",
            type: "image/svg+xml"
        };
        const that = this;
        fetch(allSvgFileNames[model])
            .then(resp => resp.text())
            .then(content => {
                parser.parse(content).then((tags) => {
                   
                    imageTagPromise(tags).then((tags) => {
                        that.props.dispatch(loadDocument(file, { parser, tags }, modifiers));
                    }).then(() => {
                        that.props.dispatch(selectDocument(that.props.documents[3].id));
                        that.props.dispatch(transform2dSelectedDocuments([1, 0, 0, 1, 77, 77]));
                        that.props.dispatch(selectDocuments(false));
                        //that.props.dispatch(selectDocument(that.props.documents[0].id));
                    })
                });
            });
    }

    mainTemplate(template){
        switch (template){
            case 'readymade':
                this.setState({ loadImageEnabled: false, readyMade: true, textMode: false });
                $("#eeveelutions").attr("src", "");
            break;
            case 'photo':
                this.setState({ loadImageEnabled: true, readyMade: false, textMode: false });
            break;
            case 'text':
                this.setState({ loadImageEnabled: false, textMode: true, readyMade: false });
                $("#eeveelutions").attr("src", "");
            break;
            case 'logo':
                this.setState({ loadImageEnabled: true, readyMade: false, textMode: false });
            break;
            default:
            break;
        }
        // if readymade : enable choose theme: inside this theme load stuff, text, ribbon
        // if name:       enable choose shape, text,ribbon,
        // if photo:      enable load photo, ribbon, text
        // if logo:       enable load logo, ribbon
    }

    prepareImage(){
        const img = document.getElementById("eeveelutions");//eeveelutions  //eeveelutions

        var canvas = document.getElementById("canvas");
        var ctx = canvas.getContext("2d");
        img.crossOrigin = "anonymous";

        ctx.drawImage(img, 0, 0);

        var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const origData = imgData;
        // First Stage: white and black
        var start = window.performance.now();
        const threshold = 377;
        for (var i = 0; i < imgData.data.length; i += 4) {
            var count = imgData.data[i] + imgData.data[i + 1] + imgData.data[i + 2];
            var colour = 0;
            if (count > threshold) // we can play on this number
                colour = 255;
            imgData.data[i] = colour;
            imgData.data[i + 1] = colour;
            imgData.data[i + 2] = colour;
            imgData.data[i + 3] = 255;
        }
        var end = window.performance.now();
        console.log(`Execution time: ${end - start} ms`);
        // End of first stage
        ctx.putImageData(imgData, 0, 0);
        var pngImage = canvas.toDataURL("image/png");
        var updatedImageData = '';
        const payload = { data: pngImage };
        return payload;
    }
    convert(){
        var payload = this.prepareImage();// the result is a white and black image.
        const img = document.getElementById("eeveelutions");//eeveelutions  //eeveelutions
        var canvas = document.getElementById("canvas");
        var ctx = canvas.getContext("2d");
        var updatedImageData = '';
        var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const that = this;
        axios.post('http://localhost:8090/http://localhost:4000', { data: payload })
        //axios.post('http://localhost:4001', { data: payload })
        //axios.post('https://sawtru.com.tr/testme', { data: payload })
        .then((response) => {
            updatedImageData = response;
            console.log('resop',response);
            var i = new Image();

            i.onload = function () {
                img.width = i.width;
                img.height = i.height;
                img.src = response.data;

                const image = document.getElementById("eeveelutions");
                ctx = canvas.getContext("2d");
                img.crossOrigin = "anonymous";
                var canvasMod = document.getElementById('canvasMod');
                var inMemCtx = canvasMod.getContext('2d');
                canvasMod.width = img.width;
                canvasMod.height = img.height;
                canvasMod.width = img.width;
                canvasMod.height = img.height;
                inMemCtx.drawImage(img,
                    0, 0, img.width, img.height,
                    0, 0, img.width, img.height);
                canvas.width = img.width;
                canvas.height = img.height;
                var start = window.performance.now();

                ctx.drawImage(canvasMod, 0, 0);
                const croppedDimensions = removeBlanks(canvas, canvas.width, canvas.height);
                var end = window.performance.now();
                console.log(`Execution time1: ${end - start} ms`);
                
                imgData = ctx.getImageData(0, 0, croppedDimensions[4], croppedDimensions[5]);
                var pngImage = canvas.toDataURL("image/png");
                const payload = { data: pngImage };
                const options = {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                    cors: true, // allow cross-origin HTTP request
                    credentials: 'same-origin' // This is similar to XHR’s withCredentials flag
                };

                fetch('http://localhost:8090/http://localhost/ChocoGraveProject/LaserWeb4/dist/convertio/script.php', options).then(response => response.json())
                //fetch('testing2.svg').then(resp => resp.text())
                    .then((response) => {
                        const image = response;
                        const dims = getDimensionGeneral(response);
                        that.setState({ dims: dims }, () => {
                        });
                        svgContent = response;
                        that.setState({ fileLoaded: true, generatedFile: image, hideme: 'hideMe' });
                    }).then(() => {
                        // for the heart change percentageX,percentageY
                        const scale = 25 / that.state.dims[0];
                        console.log(svgContent); /// bunu de handle
                        var updatedContent;
                    if (that.state.moldName != 'Rectangle')
                        updatedContent = minimizeSvgFile(
                            svgContent,
                            canvas.width / croppedDimensions[4],
                            croppedDimensions[5] / canvas.height,
                            that.state.scalingOperatorX,
                            that.state.scalingOperatorY,
                            that.state.moldName);
                    else
                        updatedContent = minimizeSvgFileRect(
                            svgContent,
                            canvas.width / croppedDimensions[4],
                            croppedDimensions[5] / canvas.height,
                            that.state.scalingOperatorX,
                            that.state.scalingOperatorY,
                            that.state.moldName);
                        const payload = { data: updatedContent };
                        const aIOptions = {
                            method: 'POST',
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(payload),
                            cors: true, // allow cross-origin HTTP request
                            credentials: 'same-origin' // This is similar to XHR’s withCredentials flag
                        };
                        alert('File is ready');
                        const svgFile = document.getElementById("svgFile");
                        svgFile.click();
                        /*fetch('http://localhost:8090/http://localhost/ChocoGraveProject/LaserWeb4/dist/convertio/toAi.php', aIOptions)
                        .then(response => response.json())
                            .then((response) => {
                                console.log(response);
                                alert('File is ready');
                            })*/
                    });
            };
            i.src = response.data;
        })
        .catch(err => {
            alert('error happened: '+ err)
            console.error(err);
        });
        var svgContent;
    }

    // On file select (from the pop up)
    onFileChange(event){
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        var reader = new FileReader();
        const that = this;
        reader.onload = function(e){
            var img = new Image();
            img.onload = function(){
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, img.width, img.height);
            }
            img.src = e.target.result;
            
            const ourImage = document.getElementById('eeveelutions');
            /*if (that.state.moldName == 'Rectangle')
                $('#eeveelutions').css('transform', 'rotate(-' + 90 + 'deg)');*/
            ourImage.src=img.src;

        }
        reader.readAsDataURL(event.target.files[0]);
        // Update the state
        this.setState({ selectedFile: event.target.files[0] });
    };

    // On file upload (click the upload button)
    onFileUpload (){
        const formData = new FormData();
        formData.append(
            "myFile",
            this.state.selectedFile,
            this.state.selectedFile.name
        );
        console.log(this.state.selectedFile);
        //axios.post("api/uploadfile", formData);
    };



    render() {
        /*
        list of changes to be made to this code
         */
        let globalState = GlobalStore().getState();
        const { selectedOption } = this.state;
        console.log('cam.js this.props: ',this.props);
        let { settings, documents, operations, currentOperation, toggleDocumentExpanded, loadDocument, bounds } = this.props;

        const imageGroups = [
            { value: 'eid', label: 'Eid' },
            { value: 'iloveyou', label: 'I love you' },
            { value: 'general', label: 'General' },
            { value: 'birthday', label: 'Birthday' },

        ];

        return (
            <div id="Main" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column',width: '1000px' }} >
                { this.state.step1 && (
                <MainShapes handleShape={this.handleShape} />
                )}
                {this.state.step2 && (
                    <Decorated setPcsCount={this.setPcsCount} step1 = {this.step1} step3={this.step3} ></Decorated>
                    )}
                {this.state.step3 && (
                <div id="main2" className="panel panel-danger  well-sm" style={{ padding: '0', marginBottom: 7, color: 'white' }}  >
                    <div className="well-sm" style={{ padding: '15px', backgroundColor: "#332C26", color: "white" }}>
                        <span style={{ fontSize: '16px' }}>SELECT Box Type</span><br />
                        <span style={{ fontSize: '12px' }}>Choose a shape of your choice to start customizing.</span>
                    </div>
                    <Form onSubmit={this.handleSubmission} >
                        <MainTemplates mainTemplate={this.mainTemplate}></MainTemplates>
                        {this.state.loadImageEnabled && (
                            <div></div>
                        )}
                        {this.state.readyMade && (
                            <div style={{ backgroundColor: '#443B34' }}>
                                <Row style={{ marginLeft: '10px', fontSize: "11px", textAlign: 'center' }}>
                                    <Col>
                                        {/**/}
                                        <Select className="success" value={this.state.readyMadeTemplate} defaultValue={this.state.readyMadeTemplate} 
                                            placeholder='Choose a Group' onChange={this.handleShapeChange} options={imageGroups} >
                                        </Select>
                                    </Col>
                                </Row>
                                {this.state.activeGroupEid && (
                                        <Eid chooseShape={this.chooseShape} ></Eid>
                                )}
                                {this.state.activeGroupiloveyou && (
                                        <ILoveYOU chooseShape={this.chooseShape} ></ILoveYOU>
                                )}
                                {this.state.activeGroupGeneral && (
                                        <GeneralGroup chooseShape={ this.chooseShape } > </GeneralGroup>
                                )}
                                {this.state.activeGroupBirthday && (
                                        <Birthday chooseShape={this.chooseShape} ></Birthday>
                                )}
                            </div>
                        )}
                        {this.state.textMode && (
                            <ShapeGroups selectModelNo={this.selectModelNo} />
                        )}
                        <Row style={{ marginLeft: '10px', fontSize: "11px", textAlign: 'center' }}>
                            <div style={{ backgroundColor: '#443B34' }}>
                                <Row style={{ marginLeft: '10px', fontSize: "11px", textAlign: 'center' }}>
                                    <div className="well-sm" style={{ padding: '15px', backgroundColor: "#332C26", color: "white" }}>
                                        <span style={{ fontSize: '16px' }}> Upload your Photo Here</span>
                                    </div>
                                    <input type="file" style={{ display: 'inline-block' }} onChange={this.onFileChange} />
                                    <button onClick={this.onFileUpload} style={{ display: 'inline-block' }} >Upload!</button>
                                </Row>
                                <Row style={{ marginLeft: '10px', fontSize: "16px", textAlign: 'center' }}>
                                    <Col>
                                        <span style={{ fontSize: '16px' }}>Your Name</span>
                                    </Col>
                                    <Col>
                                        <label style={{ marginLeft: '10px', fontSize: "16px", textAlign: 'center' }}>Text Field: &nbsp;&nbsp;&nbsp;</label>
                                            <textarea style={{ backgroundColor: '#443B34' }} type="text" placeholder="your name here" name="content" id="content"
                                            ref={(input) => { this.nameInput = input; }} maxLength="23"
                                            onChange={this.changeTextTemplateName} defaultValue={this.state.templateName} >
                                            </textarea>
                                            <Button bsSize="lg" bsStyle="warning" onClick={this.generateBox}> <Icon name="play" />Generate</Button>
                                            <Button bsSize="lg" bsStyle="warning" onClick={()=>{this.generateBoxCalligraphy("boxTemplate")}}> <Icon name="play" />GenerateR</Button>
                                            <Button bsSize="lg" bsStyle="warning" onClick={this.generateBoxAll}> <Icon name="play" />Generate All</Button>

                                            <a href="" id="boxTemplate">OurFile1</a>
                                            <span className="hideMe">
                                                <a href="" id="boxTemplate4">OurFile4</a>
                                                <a href="" id="boxTemplate6">OurFile6</a>
                                                <a href="" id="boxTemplate24">OurFile24</a>
                                                <a href="" id="boxTemplate32">OurFile32</a>
                                            </span>
                                        <br></br><br></br>
                                    </Col>
                                </Row>
                            </div>                                
                        </Row>
                        
                        <div style={{ margin: '20px' }}>
                            <Button bsSize="lg" bsStyle="warning" onClick={this.step2}> <Icon name="angle-left" /></Button>
                            <Button bsSize="lg" style={{ float: 'right', marginLeft: '8px' }} onClick={this.step4} bsStyle="warning"> <Icon name="angle-right" /></Button>
                        </div>
                    </Form>
                        <div className="">
                            <div className={this.state.hideme} dangerouslySetInnerHTML={{ __html: this.state.generatedFile }} />
                            <img src="" id="eeveelutions" width="30%" />
                            <img src="" className="" id="testXPos" />
                            <canvas id="canvas" height="398" width="500" />
                            <canvas id="canvasMod" />
                            <canvas id="canvasMod2" />
                        </div>
                </div>
                
                )}
            </div>
            );
    }
};
Cam = connect()(Cam);
Cam = withDocumentCache(withGetBounds(Cam));
export default Cam;

