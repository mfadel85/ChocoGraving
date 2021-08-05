import React from 'react';
import { Alert, Button, ButtonGroup, ButtonToolbar, Form, FormGroup, ProgressBar, Text,Row,Col,Container,Grid } from 'react-bootstrap';
import { connect } from 'react-redux';
import {  loadDocument,removeDocumentSelected, selectDocument, selectDocuments, setDocumentAttrs, transform2dSelectedDocuments } from '../actions/document';
import { addOperation, clearOperations,  setFormData, setDepth, setFont } from '../actions/operation';
import { GlobalStore } from '../index';
import { appendExt, captureConsole, openDataWindow, sendAsFile } from '../lib/helpers';
import {    getDimensionAPI, minimizeSvgFile, minimizeSvgFileRect, removeBlanks,  validateLayout, calcMargins, getDimensionStr, getDimension, getDimensionGeneral} from '../lib/general'
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
        shapeMargins: [
            '100,100',
            '585.5,100',
            '100,585.5',
            '585.5,585.5',
            '100,1071',
            '585.5,1071',
        ],
        shapePosition:1,
        textPosition:1,
        shapeScalingPercentage:'0.7,0.7',
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
        shapeScalingPercentage: '2,2',
        
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
            var lineHeight = 1.3*font.unitsPerEm;
            fontSize = activeTemplate.fontSize;
            var scale = 1 / font.unitsPerEm * fontSize;
            const finalWidth = 20;
            console.log('width should be', finalWidth / scale);
            // let width to be constant value: 3000 should not change
            let layoutOptions = {
                "align": "center",
                lineHeight: lineHeight,
                width: activeTemplate.layoutWidth,//finalWidth / scale
                mode: 'nowrap'
            };
            try {
                layout = computeLayout(font,text,layoutOptions);
                console.log('Layout is:',layout);
                const max = layout.lines.reduce(
                    (prev, current) => (prev.width > current.width) ? prev : current
                );
                if (max.width != activeTemplate.layoutWidth){
                    fontSize = fontSize * activeTemplate.layoutWidth/max.width;
                    scale = 1 / font.unitsPerEm * fontSize;
                    //change font size
                    layoutOptions = {
                        "align": "center",
                        lineHeight: lineHeight,
                        width: activeTemplate.layoutWidth,//finalWidth / scale
                        mode: 'nowrap'
                    };
                    layout = computeLayout(font, text, layoutOptions);

                }
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
                models = makerjs.layout.cloneToGrid(models, activeTemplate.xCount, activeTemplate.yCount, [(activeTemplate.marginBetweenPCs[0] - mmDims[0]) * operator, (activeTemplate.marginBetweenPCs[1] - mmDims[1]) * operator]);
                
                

                const svgFile = makerjs.exporter.toSVG(models); 
                const svgDims = getDimensionStr(svgFile);
                console.log('mmDims are', svgDims);
                if(pcsCount != 6)
                    var svgFileModified = svgFile.replace(svgDims[0], '1122.5196').replace(svgDims[0], '1122.5196').replace(svgDims[1], '1587.401').replace(svgDims[1], '1587.401');// we have to change this
                else
                    var svgFileModified = svgFile.replace(svgDims[1], '1122.5196').replace(svgDims[1], '1122.5196').replace(svgDims[0], '1587.401').replace(svgDims[0], '1587.401');// we have to change this
                // the original value is this
                //var svgFileModified = svgFile.replace(svgDims[0], '843.3063').replace(svgDims[1], '1192.3787');// we have to change this
                var transformIndex = svgFileModified.indexOf('<g')+2;
                var mainMargin = operator * (activeTemplate.initialMargin[0] - mmDims[0])/2;
                var stringMarin = mainMargin.toString();
                var stringMarginY = activeTemplate.initialMargin[1];
                var finalist = svgFileModified.slice(0, transformIndex) + ' transform="translate(' + stringMarin + ',' + stringMarginY + ') scale(' + activeTemplate.textScalingPercetage+')" ' + svgFileModified.slice(transformIndex);
                var theFinal = finalist;
                var closeGIndex = finalist.indexOf('</svg>');
                let k = 0; 
                var contentModified;
                var decoration,decoroartionDown;
                fetch(that.state.shapeFile)
                    .then(resp => resp.text())
                    .then(content => {
                        // replace the first <G in content with what we want
                        for (let i = 0; i < activeTemplate.xCount; i++) {
                            for (let j = 0; j < activeTemplate.yCount; j++) {        
                                closeGIndex = theFinal.indexOf('</svg>');
                                if(that.state.hasDecoration)
                                {
                                    decoration = '<g transform="translate(' + activeTemplate.decorationMargin[k] + ') scale(' + activeTemplate.shapeScalingPercentage + ')"><path opacity="0.75" fill="url(#SVGID_1_)" d="M165,52.485c-0.139,0.002-0.27,0.016-0.411,0.016 c-0.539,0-1.052-0.025-1.567-0.052L165,50.472v-2.405l-3.156,3.161l-4.305-4.302l3.853-3.853H165V41.37h-3.608l-3.853-3.848 l4.305-4.309L165,36.378v-2.406l-6.134-6.133h-0.033L165,21.674v-2.406l-3.156,3.165l-4.305-4.307l3.853-3.85H165v-1.701 h-3.608l-3.853-3.854l4.305-4.301L165,7.582V5.176L159.828,0h-2.411l3.22,3.217l-4.3,4.299l-3.853-3.851V0h-1.698v3.666 l-3.855,3.851l-4.3-4.299L145.85,0h-2.406l-6.208,6.213L131.028,0h-2.411l3.223,3.217l-4.302,4.299l-3.853-3.851V0h-1.694 v3.469c0.218,0.178,0.404,0.368,0.616,0.554c-1.648-1.429-3.513-2.754-5.649-3.93L117.053,0h-10.321 c25.386,6.565,22.77,29.939,22.77,29.939h8.569c0,0,1.746,26.257,26.518,26.257c0.141,0,0.272-0.012,0.411-0.014V52.485z M159.842,42.222l-3.501,3.502l-3.505-3.502l3.502-3.499L159.842,42.222z M150.786,23.179v3.827h-4.779l-3.376-3.378 l4.3-4.302L150.786,23.179z M148.133,18.126l3.502-3.499l3.505,3.499l-3.505,3.502L148.133,18.126z M150.786,28.637v3.83 l-3.855,3.853l-4.3-4.299l3.376-3.384H150.786z M151.635,34.019l3.5,3.503l-3.5,3.499l-3.502-3.499L151.635,34.019z  M160.637,32.021l-4.3,4.299l-3.853-3.853v-3.83h4.777L160.637,32.021z M160.637,23.628l-3.377,3.378h-4.777v-3.827 l3.857-3.853L160.637,23.628z M159.842,13.423l-3.501,3.502l-3.505-3.502l3.502-3.505L159.842,13.423z M151.635,5.219 l3.5,3.502l-3.5,3.499l-3.502-3.499L151.635,5.219z M150.434,13.423l-3.503,3.502l-3.501-3.502l3.501-3.505L150.434,13.423z  M138.052,7.801l3.376-3.381l4.305,4.301l-3.854,3.854h-3.827V7.801z M138.052,14.276h3.825l3.856,3.85l-4.305,4.307 l-3.376-3.384V14.276z M133.043,4.42l3.38,3.381v4.774h-3.826l-3.854-3.854L133.043,4.42z M128.457,10.84l2.584,2.583 l-0.758,0.762C129.76,13.061,129.147,11.941,128.457,10.84z M132.801,22.19c-0.363-2.045-0.937-4.181-1.792-6.331l1.588-1.584 h3.826v4.773l-3.38,3.384L132.801,22.19z M141.76,29.688l-0.251-3.441c0,0-5.876,0-8.241,0 c-0.025-0.499-0.061-1.007-0.114-1.524l4.082-4.084l7.199,7.202h-0.027l-2.581,2.575 C141.782,30.028,141.762,29.773,141.76,29.688z M142.585,34.369l3.149,3.153l-1.549,1.547 C143.458,37.393,142.945,35.776,142.585,34.369z M144.953,40.701l1.977-1.977l3.503,3.499l-2.731,2.73 C146.595,43.587,145.686,42.141,144.953,40.701z M148.827,46.231l2.808-2.804l3.505,3.499l-2.451,2.444 C151.214,48.458,149.93,47.392,148.827,46.231z M160.38,52.165l-0.006-0.002c-2.322-0.371-4.359-1.041-6.142-1.931 l2.108-2.101l4.033,4.032c0.017,0.002,0.032,0.008,0.049,0.011C160.41,52.171,160.391,52.171,160.38,52.165z"/><linearGradient id="SVGID_2_" gradientUnits="userSpaceOnUse" x1="315.2232" y1="-6.5167" x2="128.7738" y2="162.3331" gradientTransform="matrix(-1 0 0 -1 293.373 176.5627)"><stop  offset="0" style="stop-color:#FFFFFF"/><stop  offset="1" style="stop-color:#696969"/></linearGradient></g>';
                                    decoroartionDown = '<g transform="translate(' + activeTemplate.decorationDMargin[k] + ') scale(' + activeTemplate.shapeScalingPercentage + ')"><path opacity="0.75" fill="url(#SVGID_2_)" d="M0,112.514c0.139-0.003,0.27-0.016,0.411-0.016 c0.539,0,1.052,0.024,1.567,0.052L0,114.527v2.406l3.156-3.161l4.305,4.302l-3.853,3.854H0v1.702h3.608l3.853,3.848 l-4.305,4.309L0,128.621v2.406l6.134,6.133h0.033L0,143.326v2.406l3.156-3.165l4.305,4.305l-3.853,3.851H0v1.702h3.608 l3.853,3.853l-4.305,4.301L0,157.417v2.406l5.172,5.176h2.411l-3.22-3.216l4.3-4.299l3.853,3.849v3.666h1.698v-3.666 l3.855-3.849l4.3,4.299l-3.219,3.216h2.406l6.208-6.213l6.208,6.213h2.411l-3.223-3.216l4.302-4.299l3.853,3.849V165h1.694 v-3.471c-0.218-0.177-0.404-0.367-0.616-0.554c1.648,1.429,3.513,2.755,5.649,3.93L47.947,165h10.321 c-25.386-6.566-22.77-29.94-22.77-29.94h-8.569c0,0-1.746-26.257-26.518-26.257c-0.141,0-0.272,0.011-0.411,0.013V112.514z M5.158,122.777l3.501-3.501l3.505,3.501l-3.502,3.498L5.158,122.777z M14.214,141.819v-3.827h4.779l3.376,3.379l-4.3,4.302 L14.214,141.819z M16.867,146.873l-3.502,3.5l-3.505-3.5l3.505-3.501L16.867,146.873z M14.214,136.362v-3.83l3.855-3.853 l4.3,4.299l-3.376,3.384H14.214z M13.365,130.98l-3.5-3.503l3.5-3.5l3.502,3.5L13.365,130.98z M4.363,132.978l4.3-4.299 l3.853,3.853v3.83H7.739L4.363,132.978z M4.363,141.371l3.377-3.379h4.777v3.827l-3.857,3.854L4.363,141.371z M5.158,151.576 l3.501-3.501l3.505,3.501l-3.502,3.505L5.158,151.576z M13.365,159.781l-3.5-3.503l3.5-3.498l3.502,3.498L13.365,159.781z  M14.566,151.576l3.503-3.501l3.501,3.501l-3.501,3.505L14.566,151.576z M26.948,157.198l-3.376,3.381l-4.305-4.301 l3.854-3.853h3.827V157.198z M26.948,150.724h-3.825l-3.856-3.851l4.305-4.305l3.376,3.384V150.724z M31.957,160.578 l-3.38-3.381v-4.773h3.826l3.853,3.853L31.957,160.578z M36.543,154.159l-2.584-2.583l0.758-0.762 C35.24,151.939,35.853,153.058,36.543,154.159z M32.199,142.809c0.363,2.045,0.937,4.181,1.792,6.331l-1.588,1.584h-3.826 v-4.773l3.38-3.384L32.199,142.809z M23.24,135.311l0.251,3.442c0,0,5.876,0,8.241,0c0.025,0.5,0.061,1.007,0.114,1.524 l-4.082,4.083l-7.199-7.201h0.027l2.581-2.575C23.218,134.971,23.238,135.226,23.24,135.311z M22.415,130.63l-3.149-3.153 l1.549-1.547C21.542,127.606,22.055,129.224,22.415,130.63z M20.047,124.298l-1.977,1.977l-3.503-3.498l2.731-2.73 C18.405,121.412,19.314,122.857,20.047,124.298z M16.173,118.768l-2.808,2.805l-3.505-3.5l2.451-2.444 C13.786,116.541,15.07,117.606,16.173,118.768z M4.62,112.833l0.006,0.003c2.322,0.371,4.359,1.041,6.142,1.93l-2.108,2.101 l-4.033-4.032c-0.017-0.003-0.032-0.008-0.049-0.011C4.59,112.828,4.609,112.828,4.62,112.833z"/></g>';
                                }
                                else {
                                    decoration = '';
                                    decoroartionDown = '';
                                }
                                contentModified = content.replace('<g id="bostani">', '<g id="bostani" transform="translate(' + activeTemplate.shapeMargins[k] + ') scale('+activeTemplate.shapeScalingPercentage+')">');// we have to change this
                                theFinal = theFinal.slice(0, closeGIndex) + contentModified + decoration + decoroartionDown + theFinal.slice(closeGIndex);
                                k++;
                            }
                        }
                        closeGIndex = theFinal.indexOf('</svg>');
                        if (pcsCount != 6)
                        theFinal = theFinal.slice(0, closeGIndex) + rectFrame + theFinal.slice(closeGIndex);
                        else 
                            theFinal = theFinal.slice(0, closeGIndex) + rectFrame6 + theFinal.slice(closeGIndex);
                        /*const transform = ' transform="rotate(-90 280 200) translate(0,0) scale(-1,-1 ) ';//-0.0215,-0.0215 those has to be dynamically
                        const tansformIndex = that.findStartEndIndices(theFinal, 'transform="');
                        var final5 = theFinal.replace(theFinal.substring(tansformIndex[0], tansformIndex[1]), transform);*/
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
        this.setState({ shapeFile: allShapesSVG[shapeNo][0], hasDecoration: allShapesSVG[shapeNo][1]});
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
                this.setState(
                    {
                        pcsCount: count,
                        activeTemplate: {
                            fontSize: 40,
                            pcsCount: 20,
                            layoutWidth: 6000,
                            xCount: 4,
                            yCount: 5,
                            marginBetweenPCs: [178, 190],
                            initialMargin: [122, 260],//should change based on the size of the text and shape
                            textScalingPercetage: [0.4, 0.4],
                            shapeMargins: [  
                                '50,95',
                                '318,95',
                                '586,95',
                                '854,95',
                                '50,382.2',
                                '318,382.2',
                                '586,382.2',
                                '854,382.2',
                                '50,669.4',
                                '318,669.4',
                                '586,669.4',
                                '854,669.4',
                                '50,956.6',
                                '318,956.6',
                                '586,956.6',
                                '854,956.6',
                                '50,1243.8',
                                '318,1243.8',
                                '586,1243.8',
                                '854,1243.8'
                            ],
                            decorationMargin: [
                                '265,135',
                                '265,135',
                                '265,135',
                                '265,135',
                                '265,135',
                                '265,135',
                                '265,135',
                                '265,135',
                                '265,135',
                                '265,135',
                                '265,135',
                                '265,135',
                                '265,135',
                                '265,135',
                                '265,135',
                                '265,135',
                                '265,135',
                                '265,135',
                                '265,135',
                                '265,811.5'
                            ],
                            decorationDMargin: [
                                '148,135',
                                '148,811.5'
                            ],
                            shapePosition: 1,
                            textPosition: 1,
                            shapeScalingPercentage: '1.3,1.3',
                        },
                        step1: false, step2: false, step3: true
                    }
                );
            break;
            case 2://we have to
                this.setState({ boxDims: shapeTemplats[1] });
            break;
            case 3://we have to
                this.setState({ boxDims: shapeTemplats[2] });
            break;
            case 4://we have to
                this.setState({ 
                    step1: false, step2: false, step3: true });
            break;
            case 6,8,12,16://we have to
                // I have to change the frame!!!
                this.setState(
                    {
                        pcsCount: count,
                        activeTemplate: {
                            fontSize: 40,
                            pcsCount: 6,
                            layoutWidth: 6000,
                            xCount: 2,
                            yCount: 2,                            
                            marginBetweenPCs: [123.7, 91],
                            initialMargin: [202, 400],//should change based on the size of the text and shape
                            textScalingPercetage: [1.5, 1.5],
                            shapeMargins: [
                                '198,30',
                                '888,30',
                                '198,550',
                                '888,550',
                            ],
                            decorationMargin: [
                                '265,135',
                                '265,811.5'
                            ],
                            decorationDMargin: [
                                '148,135',
                                '148,811.5'
                            ],
                            shapePosition: 1,
                            textPosition: 1,
                            shapeScalingPercentage: '3,3',
                        },
                        step1: false, step2: false, step3: true
                    }
                );
            break;
            case 24://we have to
                this.setState(
                    {
                        pcsCount: count,
                        activeTemplate: {
                            fontSize: 40,
                            pcsCount: 2,
                            layoutWidth: 6000,
                            xCount: 1,
                            yCount: 2,
                            marginBetweenPCs: [118, 118],
                            initialMargin: [260, 600],//should change based on the size of the text and shape
                            textScalingPercetage: [1.5, 1.5],
                            shapeMargins: [
                                '190,135',
                                '190,820'
                            ],
                            decorationMargin:[
                                '265,135',
                                '265,811.5'
                            ],
                            decorationDMargin: [
                                '148,135',
                                '148,811.5'
                            ],
                            shapePosition: 1,
                            textPosition: 1,
                            shapeScalingPercentage: '4.3,3.9',
                        },
                        step1: false, step2: false, step3: true
                    }
                );
            break;
            case 32://we have to
                this.setState(
                    {
                        pcsCount: count,
                        activeTemplate: {
                            fontSize: 50,
                            pcsCount: 1,
                            layoutWidth: 8000,
                            xCount: 1,
                            yCount: 1,
                            marginBetweenPCs: [300, 300],
                            initialMargin: [276, 920],//should change based on the size of the text and shape
                            textScalingPercetage: [1.2, 1.2],
                            shapeMargins: [
                                '175,335'
                            ],
                            decorationMargin: [
                                '265,135',
                                '265,811.5'
                            ],
                            decorationDMargin: [
                                '148,135',
                                '148,811.5'
                            ],
                            shapePosition: 1,
                            textPosition: 1,
                            shapeScalingPercentage: '4.8,4.8',
                        },
                        step1: false, step2: false, step3: true
                    }
                );            break;
            case 50://we have to
                this.setState({ boxDims: shapeTemplats[10] });
            break;
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
                this.setState({ loadImageEnabled: false, readyMade: true, textMode: false, templateName:'readymade' });
                $("#eeveelutions").attr("src", "");
            break;
            case 'photo':
                this.setState({ loadImageEnabled: true, readyMade: false, textMode: false, templateName: 'photo' });
            break;
            case 'text':
                this.setState({ loadImageEnabled: false, textMode: true, readyMade: false, templateName: 'text' });
                $("#eeveelutions").attr("src", "");
            break;
            case 'logo':
                this.setState({ loadImageEnabled: true, readyMade: false, textMode: false, templateName: 'logo' });
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
                                            <a href="" id="boxTemplate">OurFile</a>
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
                </div>
                )}
            </div>
            );
    }
};
Cam = connect()(Cam);
Cam = withDocumentCache(withGetBounds(Cam));
export default Cam;

