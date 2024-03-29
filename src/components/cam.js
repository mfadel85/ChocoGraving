// Copyright 2016 Todd Fleming
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import React from 'react';
import { Alert, Button, ButtonGroup, ButtonToolbar, Form, FormGroup, ProgressBar, Text,Row,Col,Container,Grid } from 'react-bootstrap';
import { connect } from 'react-redux';
import { cloneDocumentSelected,  colorDocumentSelected, loadDocument, setOperatonRotating, removeDocumentSelected, selectDocument, selectDocuments, setDocumentAttrs, transform2dSelectedDocuments, transform2dSelectedDocumentsMoving, transform2dSelectedDocumentsScaling, toggleSelectDocument } from '../actions/document';
import { generatingGcode, setGcode,saveModels } from '../actions/gcode';
import { resetWorkspace } from '../actions/laserweb';
import { addOperation, clearOperations, setOperationAttrs,  setFormData, setDepth, setFont, operationAddDocuments } from '../actions/operation';
import { GlobalStore } from '../index';
import { getGcode } from '../lib/cam-gcode';
import { appendExt, captureConsole, openDataWindow, sendAsFile } from '../lib/helpers';
import { getG, getGPosition, findStartEndIndices, getDimensionAPI, rotateRect, minimizeSvgFile, minimizeSvgFileRect, removeBlanks, detectX, getPosition, validateLayout, calcMargins, getDimensionStr, getDimension, getDimensionGeneral} from '../lib/general'
import Parser from '../lib/lw.svg-parser/parser';
import { ValidateSettings } from '../reducers/settings';
import { runJob} from './com.js';
import CommandHistory from './command-history';
import { Documents } from './document';
import { withDocumentCache } from './document-cache';
import Icon from './font-awesome';
import { ColorPicker, FileField, Info, SearchButton } from './forms';
import { GetBounds, withGetBounds } from './get-bounds.js';
import { imageTagPromise, promisedImage } from './image-filters';
import { alert, confirm, prompt } from './laserweb';
import { Error, Operations } from './operation';
import { OperationDiagram } from './operation-diagram';
import { ApplicationSnapshotToolbar } from './settings';
import Splitter from './splitter';
import Select from 'react-select';
import Com from './com.js'
import axios from 'axios';
import { framePath, operator} from '../data/staticData.js'
import { image } from '../draw-commands/image';
const opentype = require('opentype.js');
var playing = false;
var paused = false;

export const DOCUMENT_FILETYPES = '.png,.jpg,.jpeg,.bmp,.gcode,.g,.svg,.dxf,.tap,.gc,.nc'
function NoDocumentsError(props) {
    let { settings, documents, operations, camBounds } = props;
    if (documents.length === 0 && (operations.length === 0 || !settings.toolCreateEmptyOps))
        return <GetBounds Type="span"><Error operationsBounds={camBounds} message='Click here to begin' /></GetBounds>;
    else
        return <span />;
}

function GcodeProgress({ gcoding, onStop }) {
    return <div style={{ display: "flex", flexDirection: "row" }}><ProgressBar now={gcoding.percent} active={gcoding.enable} label={`${gcoding.percent}%`} style={{ flexGrow: 1, marginBottom: "0px" }} /><Button onClick={onStop} bsSize="xs" bsStyle="danger"><Icon name="hand-paper-o" /></Button></div>
}

GcodeProgress = connect((state) => { return { gcoding: state.gcode.gcoding } })(GcodeProgress)

export class CAMValidator extends React.Component {
    render() {
        let { noneOnSuccess, documents, className, style } = this.props;
        let errors = (!documents) ? "Add files to begin" : undefined
        if (noneOnSuccess && !errors) return null;
        return <span className={className} title={errors ? errors : "Good to go!"} style={style}><Icon name={errors ? 'warning' : 'check'} /></span>
    }
}

CAMValidator = connect((state) => { return { documents: state.documents.length } })(CAMValidator)

let __interval;
const initialState = {
    filter: null,
    content: "",
    svg: "",
    font: 'Almarai-Bold.ttf',
    width: 0,
    lineHeight: 0,
    activeTemplateName: 'Square',
    activeTemplate: {
        "id": "SquareModel",
        "maxHeight": 32,
        "maxWidth": 25,
        chocolateWidth: 44,
        chocolateHeight: 44,
        marginChocolate: [50, 50],
        "maxLines": 3,
        "maxWordsAr": 4,
        "maxWordsEn": 3,
        "shiftX": 10,
        "shiftY": 10,
        "file": "../Square.svg",//this file will change depending on the template adding profiles
        "scale": 0.001,
        fontSize: 24,
        "moldShifts": [70, 65],
        filePcsCount:32// the number of pcs in svg file according to template, square in square :32,circle in square:49
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
    stdMargin: 50,
    svgDim: [],
    changesXY: [1, 0, 0, 1, 0, 0],
    changesScaling: [1, 0, 0, 1, 0, 0],
    scalingCount: 0,
    step1: true,
    step2: false,
    step3: false,
    step4: false,
    pcsCount: 6,
    mold: 'mold1.png',
    moldWidth: '231px',
    moldHeight: '232px',
    moldName: 'Square',
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

    /*


    */
};
class Cam extends React.Component {

    constructor(props) {
        super(props);
        this.chocoalteDepthRef;
    
        this.state = initialState;
        let { settings, documents, operations } = this.props;

        this.handleDepthChange = this.handleDepthChange.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleFontChange = this.handleFontChange.bind(this);
        this.handleSubmission = this.handleSubmission.bind(this);
        this.handleTemplateChange = this.handleTemplateChange.bind(this);
        this.generateGcode = this.generateGcode.bind(this);
        this.docuementAdded = this.docuementAdded.bind(this);
        this.textWrapping = this.textWrapping.bind(this);
        this.generateAll = this.generateAll.bind(this);
        this.runJob = this.runJob.bind(this);
        this.moveDown = this.moveDown.bind(this);
        this.moveUp = this.moveUp.bind(this);
        this.moveLeft = this.moveLeft.bind(this);
        this.moveRight = this.moveRight.bind(this);
        this.scale = this.scale.bind(this);
        this.wheel = this.wheel.bind(this);
        this.handleShape = this.handleShape.bind(this);
        this.step1 = this.step1.bind(this);
        this.step2 = this.step2.bind(this);
        this.step3 = this.step3.bind(this);
        this.setPcsCount = this.setPcsCount.bind(this);
        this.rotate = this.rotate.bind(this);

        this.changeFont = this.changeFont.bind(this);
        this.updateFontChangeAmount = this.updateFontChangeAmount.bind(this);
        this.checkRTL = this.checkRTL.bind(this);
        this.handleFontChange = this.handleFontChange.bind(this);
        this.downloadFile = this.downloadFile.bind(this);
        this.automatedProcess = this.automatedProcess.bind(this);
        this.convert = this.convert.bind(this);
        //onFileChange
        this.onFileChange = this.onFileChange.bind(this);
        this.onFileUpload = this.onFileUpload.bind(this);
        this.generateDate = this.generateDate.bind(this);
        this.newProcess   = this.newProcess.bind(this);
        this.combine = this.combine.bind(this);
        this.flip = this.flip.bind(this);

    }


    componentWillMount() {
        //this.handleConnectServer();

        let that = this
        console.log('this', this);
        window.generateGcode = (run) => {
            let { settings, documents, operations } = that.props;
            let percent = 0;
            __interval = setInterval(() => {
                that.props.dispatch(generatingGcode(true, isNaN(percent) ? 0 : Number(percent)));
            }, 100)
            settings.stepOver = that.state.stepOver;
            console.log("settings are: ", settings,'documents',documents);
            let QE = getGcode(settings, documents, operations, that.props.documentCacheHolder,
                (msg, level) => { CommandHistory.write(msg, level); },
                (gcode) => {
                    clearInterval(__interval)
                    that.props.dispatch(setGcode(gcode));
                    console.log('gcode is ready');
                    that.props.dispatch(generatingGcode(false))
                    run();
                },
                (threads) => {
                    percent = ((Array.isArray(threads)) ? (threads.reduce((a, b) => a + b, 0) / threads.length) : threads).toFixed(2);
                }
            );
            return QE;
        }

        document.addEventListener("keydown", this.handleKeyDown);
        document.addEventListener("wheel", this.wheel);

        this.generateGcode.bind(this);
        //this.handleConnectServer.bind(this);
        //this.handleConnectServer();
        this.stopGcode.bind(this);
    }
    componentWillMount() {
        if(this.state.fileLoaded == true){
            console.log('testory file loaded!!');

        }
    }
    generateGcode(run) {
        console.log("game started now!");
        this.QE = window.generateGcode(run);
    }

    handleDepthChange(e) {
        this.props.dispatch(setDepth(e.target.value));
        this.setState({ chocolateDepth: e.target.value });
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
    };
    wheel(e) {
        // if there is no document ignore this event or if it has been sent to the machine,
        console.log('e is ', e);
        //e.preventDefault();
        this.scale(Math.exp(e.deltaY / 20000));
        //this.zoom(e.pageX, e.pageY, Math.exp(e.deltaY / 2000));
    }
    handleKeyDown(e) {
        
        if(e.keyCode == 40 || e.keyCode == 37 || e.keyCode == 38 || e.keyCode == 39){
            switch(e.keyCode){
                case 40:this.moveDown();break;
                case 38:this.moveUp();break;
                case 37:this.moveLeft();break;
                case 39: this.moveRight();break;
            }
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
    stopGcode() {
        if (this.QE) { this.QE.end(); }
    }
    docuementAdded() {
        console.log('Document Added');
    }
    shouldComponentUpdate(nextProps, nextState) {
        return (
            nextState.font !== this.state.font || /*nextState.fontSize !== this.state.fontSize || */
            nextProps.documents !== this.props.documents ||
            nextProps.operations !== this.props.operations ||
            nextProps.currentOperation !== this.props.currentOperation ||
            nextProps.bounds !== this.props.bounds ||
            nextProps.gcode !== this.props.gcode ||    // Needed for saveGcode() to work
            nextProps.gcoding.percent !== this.props.gcoding.percent ||
            nextProps.gcoding.enable !== this.props.gcoding.enable ||
            nextState.filter !== this.state.filter || 
            nextState.step1 !== this.state.step1 ||
            nextState.step2 !== this.state.step2 ||
            nextState.step3 !== this.state.step3 || 
            nextState.pcsCount !== this.state.pcsCount ||
            nextState.content !== this.state.content  ||
            nextState.statusMsg !== this.state.statusMsg ||
            nextState.fileLoaded !== this.state.fileLoaded
        );
    }

    runJob() {
        let globalState = GlobalStore().getState();
        console.log('globalState', globalState);
        // check if machine is connected first
        if (!playing && !paused ) {
            let cmd = this.props.gcode;
            console.log('runJob(' + cmd.length + ')');
            runJob(cmd);
            this.step1();
        }
        else {
            console.log("didn't work", 'Playing', playing, 'Paused', paused);
        }
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
        this.setState({ 
            changesXY:[1,0,0,1,0,0],
            changesScaling:[1,0,0,1,0,0],
            dims:[0,0]
        });
    }

    changeFont(amount) {
        console.log('amount', amount);
        if (amount > 0)
            console.log('Bigger Font');
        else
            console.log('Smaller Font');
        this.updateFontChangeAmount(amount);
        console.log('chnage Font');

        this.textWrapping();
    }

    updateFontChangeAmount(amount) {
        let fontSize = this.state.fontSize;
        this.setState({ fontSize: fontSize + amount });
    }

    async generateAll(){ 

        this.props.documents.forEach((element,index) => {
            if(index >this.state.activeTemplate.filePcsCount){
                this.props.dispatch(selectDocument(this.props.documents[index].id));
                this.props.dispatch(removeDocumentSelected(this.props.documents[index].id));
            }
        });
        /// remove all documents
        this.setState({ textEnabled:false});
        console.log('ttt',this.state);
        let margins = calcMargins(this.state.svgOutpout);
        console.log('calc margins', margins);
        let that = this;
        let runJob = function () {
            that.generateGcode(function () {
            });
        };
        for(let i=1;i<this.state.pcsCount;i++){
            let index = i+1;
            if( index < 5 )
                await this.parseSVG(this.state.svgOutpout, this, [this.state.moldShifts, margins], 'file'+index+'.svg', i);
            else 
                await this.parseSVG(this.state.svgOutpout, this, [this.state.moldShifts, margins], 'file' + index + '.svg', i, runJob);
        }
        await this.props.dispatch(selectDocument(this.props.documents[0].id));
    }

    textWrapping(downloadMe,final) {
        const downloaable = final;
        //final= true;
        this.props.documents.forEach((element, index) => {
            if (index > 0) {
                this.props.dispatch(selectDocument(this.props.documents[index].id));
                this.props.dispatch(removeDocumentSelected(this.props.documents[index].id));
            }
        });
        let text = GlobalStore().getState().gcode.text.data;
        let globalState = GlobalStore().getState();
        console.log('globalState', globalState);
        if (text == '' || text == undefined) {
            alert('no text???');
            return;
        } 
        console.log('Text Wrapping started directoin', this.state.direction, 'fontsize', this.state.fontSize);
        var that = this;
        const computeLayout = require('opentype-layout');
        let font = this.state.font;

        console.log('this.state.font', font);
        var lines = text.split("\n");
        let models = {};
        let fontSize;
        this.init();
        const makerjs = require('makerjs');
        let layout;
        opentype.load(font, function (err, font) {//for arabic fonst we will see

            let activeTemplate = that.state.activeTemplate;
            console.log(font);
            let lineHeight = 1.3 * font.unitsPerEm;

            fontSize = that.state.fontSize;
            let scale = 1 / font.unitsPerEm * that.state.fontSize; //1 / font.unitsPerEm * fontSize0
            const finalWidth = 110;// should be maxMM * 301 (which is point in mm) 5000

            let layoutOptions = {
                "align": "center",
                lineHeight: lineHeight,
                width: finalWidth / scale,
                mode: 'nowrap'
            };

            if (that.state.direction == 'RTL') {
                layout = computeLayout(font, text, layoutOptions);

                console.log('started RTL');
                let wordModel = '';

                let wordWidths = [];// line widths
                let wordHeigths = [];
                let svgWords = [];

                let shiftX = 0;
                let shiftY = 0;
                let shifts = [shiftX, shiftY];
                models = {};
                console.log('lines are : ', layout.lines);
                lines.forEach((line, i) => {
                    wordModel = new makerjs.models.Text(font, line, fontSize);
                    makerjs.model.addModel(models, wordModel);
                    svgWords[i] = makerjs.exporter.toSVG(models/*,{origin:[-70.95,0]}*/);
                    models = {};
                    let parts = svgWords[i].split("\"");
                    wordWidths[i] = parseFloat(parts[1]);
                    wordHeigths[i] = parseFloat(parts[3]);
                });
                let maxWHeight = Math.max(...wordHeigths);
                console.log('widths', wordWidths, 'heights', wordHeigths);//  

                models = {};
                lines.forEach((line, i) => {
                    wordModel = new makerjs.models.Text(font, line, fontSize, true);
                    shiftY = shiftY + maxWHeight + 3;
                    shiftX = that.state.activeTemplate.shiftX * 9 - (wordWidths[i] / (2 * operator));/// what is this equation?

                    let shiftingFactor = 0;
                    if (i > 0) {
                        shiftingFactor = wordWidths[0] / 2.8 - wordWidths[i] / 2.8;
                    }
                    for (let index = 0; index < Object.keys(wordModel.models).length; index++) {
                        shifts = [wordModel.models[index].origin[0] + shiftX + shiftingFactor, wordModel.models[index].origin[1] - shiftY];
                        wordModel.models[index].origin = [shifts[0], shifts[1]];
                    }
                    makerjs.model.addModel(models, wordModel);
                });
            }
            else {// LTR
                try {
                    layout = computeLayout(font, text, layoutOptions);
                }
                catch (ex) {
                    console.log(ex);
                }
                let result = validateLayout(layout, text, that.state.activeTemplate.maxLines);
                while (!result) {
                    that.setState({
                        activeTemplate: activeTemplate
                    });

                    fontSize = that.state.fontSize * 0.8; /// we should change font size
                    activeTemplate.fontSize = fontSize;
                    that.setState({ activeTemplate: activeTemplate });
                    let scale = 1 / font.unitsPerEm * fontSize; //1 / font.unitsPerEm * fontSize0
                    let finalWidth = 120;// should be maxMM * 301 (which is point in mm) 5000


                    let layoutOptions = {
                        "align": "center",
                        lineHeight: lineHeight,
                        width: finalWidth / scale
                    };
                    layoutOptions = { // depends on the situation we change the layout option
                        "align": "center",
                        lineHeight: lineHeight,
                        width: finalWidth / scale
                    }
                    layout = computeLayout(font, text, layoutOptions);
                    if (layout.lines.length > 1)
                        activeTemplate.shiftY -= 2;
                    activeTemplate.shiftX -= 3;
                    console.log('new layout is ', layout);
                    result = validateLayout(layout, text, that.state.activeTemplate.maxLines);
                }

                that.setState({ layout: layout })
                layout.glyphs.forEach((glyph, i) => {
                    let character = makerjs.models.Text.glyphToModel(glyph.data, fontSize);
                    character.origin = makerjs.point.scale(glyph.position, scale);
                    var newChar;
                    if (downloaable)// only for final if(final) which is a parameter for the function
                    {
                        newChar = makerjs.model.mirror(character, true, false);
                    }
                    else {
                        newChar = character;
                        makerjs.model.addModel(models, newChar, i);

                    }
                    if (downloaable){
                        makerjs.model.addModel(models, newChar, i);
                        that.loadSVGChocoTemplate([[0, 0], [0, 0],[-3, -3]], 0);
                    }
                });
                // next steps: enable upload file to the server, read that file, make it white and black, save it as jpg and upload it
                // to the php page, in the php page call the convertio api, download the results in the dist folder
                // you will have the svg file in the dist folder and then read it, make the other operations on it.
                let mmDims = getDimension(makerjs.exporter.toSVG(models)).map(n => n / operator);

                if (downloaable){
                    models = makerjs.layout.cloneToGrid(models, 6, 4, [(42- mmDims[0]) * operator, (41 - mmDims[1]) * operator]);
                    /*const path = "M 233.83379,67.373184 c -2.53989,0.0018 -2.01422,0.247614 -2.01242,3.001398 0.002,2.761509 -2.23509,5.001401 -4.99667,5.003306 -2.76151,0.0018 -5.0014,-2.2352 -5.00331,-4.99678 -0.002,-2.438506 0.43819,-3.000199 -1.39322,-2.998999 l -29.58928,0.01979 c -1.57229,0.0011 -1.01899,0.713105 -1.01751,3.000798 0.002,2.76158 -2.23499,5.001401 -4.99661,5.003306 -2.76168,0.0018 -5.00157,-2.2352 -5.0033,-4.996709 -0.002,-2.569316 0.58282,-3.00041 -1.50619,-2.999105 l -29.08229,0.01951 c -2.01362,0.0014 -1.4133,0.467889 -1.4116,3.000904 0.002,2.761579 -2.2351,5.001507 -4.99661,5.003306 -2.76161,0.0018 -5.0015,-2.23513 -5.00341,-4.996709 -0.002,-2.664496 0.83831,-3.000516 -1.46477,-2.998894 l -29.06042,0.0193 c -2.04481,0.0014 -1.47641,0.452896 -1.47468,3.001081 0.002,2.761615 -2.23503,5.001507 -4.99671,5.003412 -2.76151,0.0018 -5.001402,-2.2352 -5.003201,-4.996815 -0.0018,-2.426476 0.550298,-3.000375 -1.258499,-2.99907 l -29.269619,0.01937 c -2.285682,0.0018 -1.473588,0.343923 -1.471789,3.00101 0.0018,2.761614 -2.235094,5.001506 -4.996709,5.003411 -2.76158,0.0018 -5.001471,-2.2352 -5.003376,-4.996815 -0.0018,-2.623678 0.825888,-3.00048 -1.382607,-2.998999 l -30.757812,0.0206 c -2.419703,0.0014 -1.361405,0.288889 -1.359676,3.000692 0.0019,2.761721 -2.235129,5.001613 -4.996603,5.003412 -4.260321,0.0028 -5.4871056,-0.635706 -5.4989942,1.399399 l 0.017568,26.354686 c 0.00113,1.74092 3.1126292,1.24742 5.5007232,1.2459 2.761579,-0.002 5.001507,2.23503 5.003376,4.99671 0.0018,2.76141 -2.235094,5.0014 -4.996568,5.00331 -2.509625,0.002 -5.5004051,-0.74369 -5.4992057,1.22319 l 0.019085,28.53069 c 0.00109,1.74092 3.1124877,1.24763 5.5006867,1.2459 2.761615,-0.002 5.001507,2.23509 5.003412,4.99671 0.0017,2.76151 -2.235094,5.00151 -4.996603,5.00341 -2.509591,0.002 -5.5005812,-0.74372 -5.4992054,1.22308 l 0.019015,28.53101 c 0.0012,1.74089 3.1124884,1.24739 5.5007934,1.24591 2.761509,-0.002 5.001401,2.23498 5.003306,4.9967 0.0018,2.76141 -2.235094,5.00141 -4.996497,5.0032 -2.509697,0.002 -5.5006174,-0.74362 -5.4992063,1.2233 0.00589,8.9566 0.011818,17.91321 0.017886,26.86988 0.014323,1.9957 1.2659083,0.90992 5.5004053,0.9071 2.761721,-0.002 5.001613,2.23502 5.003412,4.9966 0.0016,2.4421 -0.958603,3.0226 0.459987,2.9996 l 30.735199,-0.0205 c 2.399629,-0.002 2.306919,0.11 2.304908,-3.00168 -0.0018,-2.7614 2.2352,-5.00129 4.996604,-5.0032 2.761615,-0.002 5.001506,2.2351 5.003411,4.99668 0.0018,2.8334 0.417689,2.99229 1.100702,2.99931 l 29.636684,-0.0198 c 1.968395,-0.001 1.264215,-0.4905 1.262486,-3.0009 -0.0018,-2.76151 2.23513,-5.0013 4.996601,-5.0032 2.76172,-0.002 5.00151,2.23509 5.00331,4.9966 0.001,1.80898 -0.42859,3.00031 0.4978,2.99971 l 30.83239,-0.0206 c 0.9549,-7e-4 0.67102,-1.16702 0.66982,-3.00062 -0.002,-2.76147 2.2352,-5.0002 4.9966,-5.002 2.76158,-0.002 5.00151,2.23383 5.00338,4.99541 0.001,2.12181 -0.39578,3.0003 0.92802,2.99942 l 29.85449,-0.0199 c 1.9668,-0.001 1.21909,-0.49111 1.2175,-3.0008 -0.002,-2.76148 2.2351,-5.0014 4.99671,-5.0032 2.76148,-0.002 5.0014,2.23502 5.0032,4.9966 0.002,2.38831 -0.48919,3.0003 1.25169,2.99911 l 30.1975,-0.0202 c 1.38522,0.0433 0.55252,-0.49492 0.55079,-3.00041 -0.002,-2.76151 2.2352,-5.0014 4.99671,-5.0032 2.76161,-0.002 5.00151,2.23498 5.00331,4.99671 0.002,2.81177 -0.35631,2.95599 1.10179,2.99917 10.319,-0.007 20.63799,-0.0137 30.95699,-0.0206 2.47791,-0.002 1.44311,-0.2666 1.44142,-3.00098 -0.002,-2.76151 2.23509,-5.0014 4.9966,-5.0033 4.15798,-0.003 5.4876,0.83199 5.49921,-1.13482 -0.006,-8.88319 -0.0119,-17.76638 -0.0178,-26.6495 -10e-4,-1.96677 -2.99131,-1.21747 -5.5009,-1.21578 -2.7614,0.002 -5.00129,-2.2352 -5.0032,-4.99671 -0.002,-2.76161 2.23509,-5.0015 4.99671,-5.0033 2.38809,-0.001 5.50019,0.48761 5.49899,-1.25328 l -0.019,-28.5309 c -10e-4,-1.96681 -2.9912,-1.21751 -5.50079,-1.21582 -2.76151,0.002 -5.00141,-2.2352 -5.00331,-4.99671 -0.002,-2.76158 2.23509,-5.0015 4.99671,-5.00337 2.3882,-0.001 5.5003,0.48768 5.4991,-1.25321 l -0.0191,-28.5308 c -0.001,-1.9668 -2.99109,-1.2175 -5.50082,-1.21581 -2.76148,0.002 -5.0013,-2.2352 -5.00321,-4.99671 -0.002,-2.76158 2.23513,-5.00147 4.99661,-5.00327 2.3883,-0.002 5.5003,0.48757 5.4992,-1.25331 l -0.018,-26.839617 c -0.0141,-1.966771 -1.34249,-0.909779 -5.5004,-0.907203 -2.76158,0.0018 -5.00162,-2.234883 -5.00341,-4.996498 -0.002,-2.73438 1.03261,-3.000692 -1.4453,-2.998999 z";
                    const outsideModel = makerjs.importer.fromSVGPathData(path);
                    const outsideModelScaled = makerjs.model.scale(outsideModel,operator);
                    makerjs.model.addModel(models, outsideModelScaled);*/
                    
                }



            }
            that.props.dispatch(saveModels(models));

            const moldShifts = that.state.moldShifts;//[105,96];//[70, 65];
            try {
                let stdMargin = that.state.activeTemplate.marginChocolate[0]; // margin between two pieces of the mo
                //var oval = new makerjs.models.Oval(20, 150);
                fetch('3333.svg')
                    .then(resp => resp.text())
                    .then(content => {
                        console.log(content);
                    });
                //makerjs.model.addModel(models, oval);

                let output = makerjs.exporter.toSVG(models );
            
                let dims = getDimension(output);
               
                let mmDims = dims.map(n => n / operator);
               
                /*if (mmDims[0] > that.state.activeTemplate.maxWidth || mmDims[1] > that.state.activeTemplate.maxHeight) {
                    alert("Please divide to two lines,the size of the words shouldn't be more than 28mm!!!")
                    return;
                }*/
                that.setState({
                    svgOutpout: output,
                    svgModels: models,
                    layout: layout,
                    dims: mmDims
                });
                const max = layout.lines.reduce(
                    (prev, current) => (prev.width > current.width) ? prev : current
                );

                let extraMargin = [(44 - mmDims[0]) / 2, (44 - mmDims[1]) / 2];
                const letterCount = max.end - max.start;
                const letterWidth = mmDims[0] / letterCount;
                let generalState = GlobalStore().getState();

                console.log(
                    'general state', generalState,
                     "Letters:  ", dims, max, mmDims, 'letter count:',
                 letterCount, 'letter width', letterWidth, layout);
                //this.resolve(); resolve this means deepwork
                let promise = new Promise( (resolve,reject) =>  { /// understand promises well with examples, async javascripting
                    that.parseSVG(output, that, [moldShifts, extraMargin, stdMargin], 'file1.svg', 0);
                });
                that.loadSVGChocoTemplate([moldShifts, extraMargin, stdMargin], 0);

                promise.then(
                    ()=> console.log('test'),
                    () => console.log('faiLUre')
                );

                that.setState({generalAllEnable:true/*,svgFile:'test.svg'*/});
                //let output = makerjs.exporter.toSVG(models, { /*origin: [thirdMargin, -230],*/ accuracy: 0.001 });

                var svgElement = document.getElementById("svgFile");
                const insertionIndex = output.indexOf('</g>')+4;
                var final = output.slice(0, insertionIndex) + framePath + output.slice(insertionIndex);
                const svgDims = getDimensionStr(final);
                

                const final1 = final.replace(svgDims[0], '1009.2939');
                const final2 = final1.replace(svgDims[0], '1009.2939');

                const final3 = final2.replace(svgDims[1], '635.183');
                const final4 = final3.replace(svgDims[1], '635.183');
                const secondInsertion = final4.indexOf('<g') + 2;
                var finalist = final4.slice(0, secondInsertion) + ' transform="translate(56.2611671,63.47244096)" ' + final4.slice(secondInsertion);


                //final.replace(/dims[1]/g, '1009.2939');
                //const final = output.splice(insertionIndex, 0, framePath);var svgElement = document.getElementById("svgFile");
                svgElement.setAttribute('href', 'data:text/plain;chartset=utf-8,' + encodeURIComponent(finalist));

                svgElement.setAttribute('download','File.svg');
                /*if (downloaable)
                    svgElement.click();*/
               
                downloadMe();
            }
            catch (Exception) {
                console.log(Exception);
            }
        })
    }

    moveUp(){
        //check limits: get current up limit
        let changes = this.state.changesXY;
        changes[5] += 0.3;
        this.setState({ changesXY: changes});
        this.props.dispatch(selectDocument(this.props.documents[0].id));
        this.props.dispatch(transform2dSelectedDocuments([1, 0, 0, 1,0,0.3]));
    }

    moveDown() {
        //check limits: get current down limit

        let changes = this.state.changesXY;
        changes[5] -= 0.3;
        this.setState({ changesXY: changes });
        this.props.dispatch(selectDocument(this.props.documents[0].id));
        this.props.dispatch(transform2dSelectedDocuments([1, 0, 0, 1, 0, -0.3]));
    }
  
    moveLeft() {
        let changes = this.state.changesXY;
        changes[4] -= 0.3;
        this.setState({ changesXY: changes });
        this.props.dispatch(selectDocument(this.props.documents[0].id));
        this.props.dispatch(transform2dSelectedDocuments([1, 0, 0, 1, -0.3, 0]));
    }

    moveRight() {
        let changes = this.state.changesXY;
        changes[4] += 0.3;
        this.setState({ changesXY: changes });
        this.props.dispatch(selectDocument(this.props.documents[0].id));
        this.props.dispatch(transform2dSelectedDocuments([1, 0, 0, 1, 0.3, 0]));
    }
    rotate(){
        //
        var rotateArray = [0.9986295347545738, -0.05233595624294383,0.05233595624294383,0.9986295347545738,-4.43159518811045,4.9364512620398955]
        this.props.dispatch(selectDocument(this.props.documents[0].id));
        this.props.dispatch(transform2dSelectedDocuments(rotateArray));
    }
    rotateClockwise(id){
        var rotateArray = [0.9986295347545738,
            0.05233595624294383,
            -0.05233595624294383,
            0.9986295347545738,
            4.684298907150151,
            -4.699918052283735];
        this.props.dispatch(selectDocument(this.props.documents[id+1].id));
        this.props.dispatch(transform2dSelectedDocuments(rotateArray));

    }
    flip(){
        const s = -1;
        const dim = this.state.dims;
        if ((dim[0] * s > this.state.activeTemplate.maxWidth || dim[1] * s > this.state.activeTemplate.maxHeight) && s > 1) {
            //alert('You reached the maximum size');
            return;
        }

        let scalingCount = this.state.scalingCount;

        this.setState({ scalingCount: scalingCount });
        let x = this.state.moldShifts[0] + (44 - this.state.dims[0]) / 2;
        let y = this.state.moldShifts[1] + (44 - this.state.dims[1]) / 2;
        let cx = (2 * x + this.state.dims[0]) / 2;
        let cy = (2 * y + this.state.dims[1]) / 2;
        let changes = this.state.changesScaling;
        changes[0] *= s;
        changes[4] += cx - s * cx;
        if (this.props.documents.length > 0) {
            this.setState({ changesScaling: changes, dims: [dim[0] * s, dim[1] * s] });
            let shiftingChanges = this.state.changesXY;
            //shiftingChanges[4] += changes[4];
            //shiftingChanges[5] += changes[5];

            this.setState({ changesXY: shiftingChanges });
            this.props.dispatch(selectDocument(this.props.documents[0].id));
            this.props.dispatch(transform2dSelectedDocuments([s, 0, 0, 1, cx - s * cx, cy]));
        }
    }
    scale(s){
        const dim = this.state.dims;
        if ((dim[0] * s > this.state.activeTemplate.maxWidth || dim[1] * s > this.state.activeTemplate.maxHeight) && s >1 )
        {
            //alert('You reached the maximum size');
            return;
        }
            
        let scalingCount = this.state.scalingCount;
        
        this.setState({scalingCount:scalingCount});
        let x = this.state.moldShifts[0] + (44 - this.state.dims[0]) / 2;
        let y = this.state.moldShifts[1] + (44 - this.state.dims[1]) / 2 ;
        let cx = (2 * x + this.state.dims[0])  / 2;
        let cy = (2 * y + this.state.dims[1])  / 2;
        let changes = this.state.changesScaling;
        changes[0] *= s;
        changes[3] *= s;
        changes[4] += cx - s * cx;
        changes[5] += cy - s * cy;
        if (this.props.documents.length > 0){
            this.setState({ changesScaling: changes, dims: [dim[0] * s, dim[1] * s] });
            let shiftingChanges = this.state.changesXY;

            this.setState({ changesXY: shiftingChanges });
            this.props.dispatch(selectDocument(this.props.documents[0].id));
            this.props.dispatch(transform2dSelectedDocuments([s, 0, 0, s, cx - s * cx, cy - s * cy]));
        }

        // or transform2dSelectedDocumentsMoving
    }

    scaleSec(s,n) {
        let scalingCount = this.state.scalingCount;
        let index = n == 0 ? 0 : n * 3 + this.state.activeTemplate.filePcsCount-2;
        var stdMarginY = 0;
        if (n > 2)
            stdMarginY = 1;
        let margins = [(n % 3) * this.state.stdMargin, stdMarginY * this.state.stdMargin];

        this.setState({ scalingCount: scalingCount });
        let x = this.state.moldShifts[0] + (44 - this.state.dims[0]) / 2 + margins[0];
        let y = this.state.moldShifts[1] + (44 - this.state.dims[1]) / 2 + margins[1];
        let cx = (2 * x + this.state.dims[0]) / 2;
        let cy = (2 * y + this.state.dims[1]) / 2;

        this.props.dispatch(selectDocument(this.props.documents[index].id));
        this.props.dispatch(transform2dSelectedDocuments([s, 0, 0, s, cx - s * cx, cy - s * cy]));
    }
    loadSVGChocoTemplate(margin,n){
        const modifiers = {};
        const release = captureConsole();
        const parser = new Parser({});
        let file = {
            name: "template.svg",
            type: "image/svg+xml"
        };

        var stdMarginY = 0;
        if (n > 2)
            stdMarginY = 1;
        this.props.dispatch(transform2dSelectedDocuments([1, 0, 0, 1, margin[0][0] + margin[1][0] + (n % 3) * margin[2], margin[0][1] + margin[1][1] + stdMarginY * margin[2]]));
        let that  = this;
        fetch('3333.svg')
            .then(resp => resp.text())
            .then(content => {
                parser.parse(content).then((tags) => {
                    let captures = release(true);
                    let warns = captures.filter(i => i.method == 'warn')
                    let errors = captures.filter(i => i.method == 'errors')
                    if (warns.length)
                        CommandHistory.dir("The file has minor issues. Please check document is correctly loaded!", warns, 2);
                    if (errors.length)
                        CommandHistory.dir("The file has serious issues. If you think is not your fault, report to LW dev team attaching the file.", errors, 3);
                    imageTagPromise(tags).then((tags) => {
                        that.props.dispatch(loadDocument(file, { parser, tags }, modifiers));
                    }).then(() => {
                        that.props.dispatch(selectDocument(that.props.documents[3].id));
                        that.props.dispatch(transform2dSelectedDocuments([1, 0, 0, 1, margin[0][0] + (n % 3) * margin[2], margin[0][1] + stdMarginY * margin[2]]));
                        that.props.dispatch(selectDocuments(false));
                        that.props.dispatch(selectDocument(that.props.documents[0].id));
                    })
                });
            });


    }
    parseSVG(svg,that,margin,fileName,n,runJob){
        let activeTemplate = that.state.activeTemplate;
        const release = captureConsole();
        const parser = new Parser({});
        parser.parse(svg).then((tags) => {
            let captures = release(true);
            let warns = captures.filter(i => i.method == 'warn')
            let errors = captures.filter(i => i.method == 'errors')

            if (warns.length)
                CommandHistory.dir("The file has minor issues. Please check document is correctly loaded!", warns, 2);

            if (errors.length)
                CommandHistory.dir("The file has serious issues. If you think is not your fault, report to LW dev team attaching the file.", errors, 3);

            let file = {
                name: fileName,
                type: "image/svg+xml"
            };

            const modifiers = {};

            imageTagPromise(tags).then((tags) => {
                that.props.dispatch(loadDocument(file, { parser, tags }, modifiers));
            }).then(() => {
                file = {
                    name: "template.svg",
                    type: "image/svg+xml"
                };
                
                let index = n == 0 ? 0 : n * 3 + that.state.activeTemplate.filePcsCount-2;
                let doc1 = that.props.documents.map(() => that.props.documents[index].id).slice(0, 1);

                that.props.dispatch(selectDocuments(false));
                that.props.dispatch(selectDocument(doc1[0]));
                //that.parseSVG(output, that, [moldShifts, extraMargin, stdMargin], 'file6.svg', 0);
                var stdMarginY = 0;
                if (n > 2)
                    stdMarginY = 1;
                let margins = [margin[0][0] + margin[1][0] + (n % 3) * that.state.stdMargin, margin[0][1] + margin[1][1] + stdMarginY * that.state.stdMargin];
                console.log('marGins are ', margins);
                that.props.dispatch(transform2dSelectedDocuments([1, 0, 0, 1, margins[0], margins[1]]));
                that.props.dispatch(transform2dSelectedDocuments(that.state.changesXY));
                //let moves = array();
                /**/

                let scaling = that.state.changesScaling;
                //scaling[4] *= that.state.scalingCount * scaling[0];
                //scaling[5] *= that.state.scalingCount * scaling[0];
                that.scaleSec(that.state.changesScaling[0], n);
                //that.props.dispatch(transform2dSelectedDocuments(scaling));
                
                if (n == 1) { ///  
                    let newExtraShift = that.state.extraShift;
                    newExtraShift[4] = that.props.documents[0].changes[4] - that.state.originalShift[0] - that.state.changesXY[4]/* - margins[0]*/;
                    newExtraShift[5] = that.props.documents[0].changes[5] - that.state.originalShift[1] - that.state.changesXY[5]/* - margins[1]*/;
                    that.setState({ extraShift: newExtraShift},() =>{
                        that.props.dispatch(transform2dSelectedDocuments(newExtraShift));
                    });
                }
                if(n > 1){
                    that.props.dispatch(transform2dSelectedDocuments(that.state.extraShift));
                }

                fetch(activeTemplate.file)
                    .then(resp => resp.text())
                    .then(content => {
                        parser.parse(content).then((tags) => {
                            
                            let captures = release(true);
                            let warns = captures.filter(i => i.method == 'warn')
                            let errors = captures.filter(i => i.method == 'errors')

                            if (warns.length)
                                CommandHistory.dir("The file has minor issues. Please check document is correctly loaded!", warns, 2);
                            if (errors.length)
                                CommandHistory.dir("The file has serious issues. If you think is not your fault, report to LW dev team attaching the file.", errors, 3);
                            imageTagPromise(tags).then((tags) => { 
                                //that.props.dispatch(loadDocument(file, { parser, tags }, modifiers));
                            }).then(() => {
                                if (n == 0) {
                                    that.setState({ originalShift: [that.props.documents[0].changes[4], that.props.documents[0].changes[5]] })
                                }
                                if (n > 4) {
                                    // change indexes here
                                    that.props.dispatch(addOperation({
                                        documents: [
                                            that.props.documents[0].id,
                                            that.props.documents[that.state.activeTemplate.filePcsCount + 1].id,
                                            that.props.documents[that.state.activeTemplate.filePcsCount + 4].id,
                                        ] }));
                                    that.props.dispatch(addOperation({
                                        documents: [
                                            that.props.documents[that.state.activeTemplate.filePcsCount + 7].id,
                                            that.props.documents[that.state.activeTemplate.filePcsCount + 10].id,
                                            that.props.documents[that.state.activeTemplate.filePcsCount + 13].id
                                        ] }));
                                    /*that.props.dispatch(addOperation({
                                        documents: [
                                            
                                            
                                        ] }));*/
                                    that.props.dispatch(selectDocument(that.props.documents[0].id));
                                    runJob();
                                    
                                }
                            })
                        });
                    });
            })
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
    automatedProcess(){
        this.textWrapping(this.downloadFile,false);
    }
    downloadFile(){
        //scaling according to dims
        const scale = 26.4 / this.state.dims[0];//or 28 instead of 32 we will see
        var downloadMe = () => {
            var svgElement = document.getElementById("svgFile");
            svgElement.setAttribute('download', 'File.svg');
            svgElement.click();
        }

        this.setState({ fontSize: this.state.fontSize * scale }, () => {
            this.textWrapping(downloadMe, true);
        });        
    }

    handleShape(shape){
        var chocoTemplates = require("../data/chocolateTemplates.json");
        let activeTemplate = chocoTemplates.templates[2];
        switch(shape){
            case 'SinS':// square in square
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
            case 'CinS':
                activeTemplate = chocoTemplates.templates[4];
                this.setState({ 
                    mold: 'mold2.png',
                    moldWidth: '231px', moldHeight: '232px',
                    moldName: 'Circle in Square',
                    moldPlaceHolder: 'name\nhere',
                    paddingTop: '65px'
                });
            break;
            case 'HinS':
                activeTemplate = chocoTemplates.templates[5];
                this.setState({ 
                    mold: 'mold7.png',
                    moldWidth: '231px', moldHeight: '232px',
                    moldName: 'Heart in Square',
                    moldPlaceHolder: 'name\nhere',
                    paddingTop: '75px'
                });
            break;
            case 'Circle':
                activeTemplate = chocoTemplates.templates[3];
                this.setState({ 
                    mold: 'mold3.png', 
                    moldWidth: '260px', 
                    moldHeight: '234px',
                    moldName: 'Circle',
                    moldPlaceHolder: 'name\nhere',
                    paddingTop: '60px',
                    scalingOperatorX:25.1,
                    scalingOperatorY: 25.1
                });
            break;
            case 'Oval':
                activeTemplate = chocoTemplates.templates[0];
                this.setState({ mold: 'mold9.png', moldWidth: '263px', moldHeight: '210px',
                    moldName: 'Oval',
                    moldPlaceHolder: 'name here',
                    paddingTop: '65px',
                    scalingOperatorX: 30.35,
                    scalingOperatorY: 19.8
                });
            break;
            case 'BabyS':
                activeTemplate = chocoTemplates.templates[6];
                this.setState({ mold: 'mold5.png', moldWidth: '232px', moldHeight: '245px', 
                    moldName: 'Baby Shirt',
                    moldPlaceHolder: 'name\nhere',
                    paddingTop: '65px'
                });
            break;
            case 'BabySt':
                activeTemplate = chocoTemplates.templates[7];
                this.setState({ mold: 'mold6.png', moldWidth: '263px', moldHeight: '245px', 
                moldName: 'Stroller',
                moldPlaceHolder: 'name here',
                paddingTop:'110px'
            });
            //571420-eurO
            break;
            case 'Heart':
                activeTemplate = chocoTemplates.templates[8];
                this.setState({ mold: 'mold8.png', moldWidth: '231px', moldHeight: '232px', 
                moldName: 'Heart',
                moldPlaceHolder: 'name here',
                paddingTop:'53px' ,
                scalingOperatorX: 28,
                scalingOperatorY: 24
            });
            break;
            case 'Rect':
                activeTemplate = chocoTemplates.templates[1];
                this.setState({ 
                    mold: 'mold4.png', moldWidth: '264', moldHeight: '210px', 
                    moldName: 'Rectangle',
                    moldPlaceHolder: 'name here',
                    paddingTop: '63px',
                    scalingOperatorX: 17.061,
                    scalingOperatorY: 35.715
             });
                break;
            default:
                activeTemplate = chocoTemplates.templates[0];
            break;
        }
        this.setState({ step1: false, step2: true, activeTemplate: activeTemplate});
    }
    setPcsCount(count){
        this.setState({pcsCount:count});
    }

    rotateNinety(){
        /*gm("mold4.png")
            .rotate('white', -90)
            .write('rotated-file.png', function (err) {
                if (!err) console.log('done');
            });*/
        /*fetch('111111.svg')
            .then(resp => resp.text())
            .then(content => {
                const result = rotateRect(content);
                const updatedContent = minimizeSvgFileRect(
                    svgContent,
                    canvas.width / croppedDimensions[4],
                    croppedDimensions[5] / canvas.height,
                    this.state.scalingOperatorX,
                    this.state.scalingOperatorY,
                    this.state.moldName);
                console.log(result);

            });*/
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

        for (var i = 0; i < imgData.data.length; i += 4) {
            var count = imgData.data[i] + imgData.data[i + 1] + imgData.data[i + 2];
            var colour = 0;
            if (count > 383)
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

                    // From Scratch, algorithms, tests, interviews code, challenge your thinking,
                    // @hometimeutilize, thnkfurcreroltmnotthnkofthemupcvrerdwrkdesc wrkonprjblg
                    //temporary I will change this to  
                    fetch('111111.svg').then(resp => resp.text())
                    //fetch('http://localhost:8090/http://localhost/ChocoGraveProject/LaserWeb4/dist/convertio/script.php', options).then(response => response.json())
                        .then((response) => {
                            const moldShifts = that.state.moldShifts;//[105,96];//[70, 65];             
                            const stdMargin = that.state.activeTemplate.marginChocolate[0]; // margin between two pieces of the mo
                            const extraMargin = [0, 0];
                            const image = response;
                            const dims = getDimensionAPI(response);
                            //now let's repeat it 

                            that.setState({ dims: dims }, () => {
                                //that.parseSVG(response, that, [moldShifts, extraMargin, stdMargin], 'file1.svg', 0);
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

                            /*fetch('http://localhost:8090/http://localhost/ChocoGraveProject/LaserWeb4/dist/convertio/toAi.php', aIOptions)
                            .then(response => response.json())
                                .then((response) => {
                                    console.log(response);
                                    alert('File is ready');
                                })*/
                            //that.scale(scale * operator);
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

    newProcess(){
        const modifiers = {};
        const release = captureConsole();
        const parser = new Parser({});
        let file = {
            name: "template.svg",
            type: "image/svg+xml"
        };

        var stdMarginY = 0;
        var stdMarginY = 1;
        const ourDate = this.generateDate('30/6/2021');
        const that = this;
        fetch('hat.svg')
            .then(resp => resp.text())
            .then(content => {
                const dims = getDimensionAPI(content);
                parser.parse(content).then((tags)=>{
                    let captures = release(true);
                    let warns = captures.filter(i => i.method == 'warn')
                    let errors = captures.filter(i => i.method == 'errors')
                    if (warns.length)
                        CommandHistory.dir("The file has minor issues. Please check document is correctly loaded!", warns, 2);
                    if (errors.length)
                        CommandHistory.dir("The file has serious issues. If you think is not your fault, report to LW dev team attaching the file.", errors, 3);
                    imageTagPromise(tags).then((tags) => {
                        that.props.dispatch(loadDocument(file, { parser, tags }, modifiers));
                    }).then(() => {
                        that.props.dispatch(selectDocument(that.props.documents[3].id));
                        that.props.dispatch(selectDocuments(false));
                        that.props.dispatch(selectDocument(that.props.documents[0].id));
                        that.setState({ dims: dims }, () => {
                            that.scale(0.35);
                        });
                })
            });
        });
        fetch('readSampleProcessed.svg')
            .then(resp => resp.text())
            .then(content => {
                parser.parse(content).then((tags) => {
                    let captures = release(true);
                    let warns = captures.filter(i => i.method == 'warn')
                    let errors = captures.filter(i => i.method == 'errors')
                    if (warns.length)
                        CommandHistory.dir("The file has minor issues. Please check document is correctly loaded!", warns, 2);
                    if (errors.length)
                        CommandHistory.dir("The file has serious issues. If you think is not your fault, report to LW dev team attaching the file.", errors, 3);
                    imageTagPromise(tags).then((tags) => {
                        that.props.dispatch(loadDocument(file, { parser, tags }, modifiers));
                    }).then(() => {
                        that.props.dispatch(selectDocument(that.props.documents[3].id));
                        that.props.dispatch(selectDocuments(false));
                        that.props.dispatch(selectDocument(that.props.documents[0].id));
                    })
                });
            });    
    }

    combine() {
        const that = this;
        fetch('bride.svg')
            .then(resp => resp.text())
            .then(content => {
                const dims = getDimensionAPI(content);
                that.setState({dims:dims});
                fetch('sampleextrea.svg').then(resp => resp.text())
                    .then(exampleContent => {
                        var combinedShape = that.combineShapeCalligraphy(content,exampleContent);
                    });
            });
    }



    async combineShapeCalligraphy(shape,calligraphy){
        const shapeDimensions = getDimensionAPI(shape);
        const sampleDimension = getDimensionAPI(calligraphy);
        var g = getG(shape);// get G from a file that contains only one G, or get the first g of a file.
        // now to modify this G: modify translate, and modify scale to
        // starts with translate,  
        var tranformIndex = g.indexOf('transform');
        var tranformStatement = 'transform="translate(470.000000,420.000000) scale(-0.1000,-0.10000)"';
        const closingPosition = getGPosition(g,'"',2)+1;
        var replacedString = g.substring(tranformIndex, closingPosition);
        const insertionIndex = calligraphy.indexOf('</g>') + 4;
        const print = (results) =>{
            console.log(results,'results')
        }
        const svgDate = await this.generateDate('30/6/2021',print); //later we think about the svgDate

        g = g.replace(replacedString, tranformStatement);
        calligraphy = calligraphy.slice(0, insertionIndex) + g + calligraphy.slice(insertionIndex);
        const viewboxIndex = findStartEndIndices(calligraphy, 'viewBox="');
        const final2 = calligraphy.replaceAll('width="' + sampleDimension[2] + '"', 'width="'+shapeDimensions[2]+'"')
            .replaceAll('height="' + sampleDimension[3] + '"', 'height=="' + shapeDimensions[3] + '"')
            .replaceAll(calligraphy.substring(viewboxIndex[0], viewboxIndex[1] + 1), 'viewBox="0 0' + ' ' + shapeDimensions[0] + ' ' + shapeDimensions[1]+ '"');
        // we need to change the height and viewbox to another values after adding the date
        return final2;
    }


    generateDate(ourdate,print){
        //test this code why it is not working??????
        // we define the font and the font size so that it won't take more than the limit
        const computeLayout = require('opentype-layout');
        const font = this.state.font;
        const makerjs = require('makerjs');
        var layout;
        var svgDate;
        var svgDateDims; // dimensions
        ourdate = '30/6/2021';
        var that = this;
        opentype.load(font,function (err, font){
            const lineHeight = 1.3 * font.unitsPerEm;
            var fontSize = that.state.fontSize;// depending on the max width that will be set
            let scale = 1 / font.unitsPerEm * fontSize; //1 / font.unitsPerEm * fontSize0
            const finalWidth = 110;
            let layoutOptions = {
                "align": "center",
                lineHeight: lineHeight,
                width: finalWidth / scale,
                mode: 'nowrap'
            };
            try {
                var models = [];
                layout = computeLayout(font, ourdate, layoutOptions);
                layout.glyphs.forEach((glyph, i)=>{
                    var character = makerjs.models.Text.glyphToModel(glyph.data, fontSize);
                    character.origin = makerjs.point.scale(glyph.position, scale);
                    makerjs.model.addModel(models, character, i); // we will check the mirror thing later

                });
                svgDate = makerjs.exporter.toSVG(models);
                svgDateDims = getDimension(svgDate).map(n => n / operator);
                that.props.dispatch(saveModels(models)); // should we save the models now or later?
                // how to add this svg file to the workspace
                print(svgDate);
                return [models, svgDate, svgDateDims];// change these parmeters

            }
            catch(ex){
                console.log('Exception',ex);
            }

        })
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
        let validator = ValidateSettings(false)
        let valid = validator.passes();
        let someSelected = documents.some((i) => (i.selected));

        const Fonts = [
            { value: 'Almarai-Bold.ttf', label: 'Arslan' },
            { value: 'ITCKRIST.TTF', label: 'ITCKRIST' },
            { value: 'Bevan.ttf', label: 'Bevan' },
        ];
        return (
            
            <div id="Main" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column',width: '800px' }} >

                { this.state.step1 && (<div id="main2" className="panel panel-danger  well-sm" style={{ padding:'0',marginBottom: 7,color:'white' }}  >
                    <div className="well-sm" style={{ padding:'15px',backgroundColor: "#332C26", color:"white" }}>
                        <span style={{fontSize:'16px'}}>SELECT SHAPE</span><br/>
                        <span style={{fontSize:'12px'}}>Choose a shape of your choice to start customizing.</span>
                    </div>
                    <Form onSubmit={this.handleSubmission} >
                    <div style={{ backgroundColor: '#443B34'}}>
                        <div style={{ fontSize: '16px', textAlign: 'center'}}> Small Shapes</div>
                        
                            <Row style={{ marginLeft: '10px', fontSize: "11px", textAlign: 'center'}}>
                                <Col>
                                    <div style={{ width: '85px', display:'inline-block',margin:'10px',paddingBottom:'5px'}}>
                                        <img className="shape" src="shape1.png" style={{ paddingBottom: '5px' }} onClick={() => this.handleShape('SinS') } ></img>
                                            <span >Square in Square</span>
                                        </div>
                                    <div style={{ width: '85px', display: 'inline-block', margin: '10px' }}>
                                        <img src="shape2.png" style={{ paddingBottom: '5px' }} onClick={() => this.handleShape('CinS')}></img>
                                            <br />
                                            <span >Circle in Square</span>
                                    </div>
                                    <div style={{ width: '85px', display: 'inline-block', margin: '10px' }}>
                                        <img src="shape3.png" style={{ paddingBottom: '5px' }} onClick={() => this.handleShape('HinS')} ></img>
                                            <br />
                                            <span >Heart in Square</span>
                                    </div>
                                <div style={{ width: '85px', display: 'inline-block', margin: '10px', textAlign: 'center' }}>
                                        <img src="shape5.png" style={{ paddingBottom: '5px' }} onClick={() => this.handleShape('Circle')} ></img>
                                            <br />
                                    <span >Circle</span>
                                    </div>
                                </Col>
                            <Col>
                                <div style={{ width: '85px', display: 'inline-block', margin: '10px', textAlign: 'center' }}>
                                        <img src="shape6.png" style={{ paddingBottom: '5px' }} onClick={() => this.handleShape('BabyS')}  ></img>
                                    <span >Baby Shirt</span>
                                </div>
                                <div style={{ width: '85px', display: 'inline-block', margin: '10px', textAlign: 'center' }}>
                                        <img src="shape7.png" style={{ paddingBottom: '5px' }} onClick={() => this.handleShape('BabySt')} ></img>
                                    <br />
                                    <span >Stroller</span>
                                </div>
                                <div style={{ width: '85px', display: 'inline-block', margin: '10px' }}>
                                        <img src="shape8.png" style={{ paddingBottom: '5px' }} onClick={() => this.handleShape('Heart')} ></img>
                                    <br />
                                    <span >Heart</span>
                                </div>
                                <div style={{ width: '85px', display: 'inline-block', margin: '10px' }}>
                                        <img src="shape9.png" style={{ paddingBottom: '5px' }} onClick={() => this.handleShape('Oval')}></img>
                                    <br />
                                    <span >Oval</span>
                                </div>
                            </Col>
                            <Col>
                                <div style={{ width: '85px', display: 'inline-block', margin: '10px' }}>
                                        <img src="shape4.png" style={{ paddingBottom: '5px' }} onClick={() => this.handleShape('Rect')}></img>
                                    <span style={{ fontSize: "10px" }}>Rectangle</span>
                                </div>
                            </Col>
                            </Row>
                            <Row className='hideMe' style={{ backgroundColor: "#332C26",  fontSize: "11px", textAlign: 'center' }}>
                                <div style={{ fontSize: '16px', textAlign: 'center' }}> Big Bars</div>
                                <Col>
                                    <div style={{ width: '225px', display: 'inline-block', margin: '10px' }}>
                                        <img src="shape10.png" onClick={() => this.handleShape('Rect')} style={{ paddingBottom: '5px' }}></img>
                                        <span style={{ fontSize: "10px" }}>Rectangle</span>
                                    </div>
                                </Col>
                            </Row>
                            
                        </div>
                       
                </Form>
                </div>)}
                {this.state.step2 && (
                    <Row style={{ fontSize: "11px" }}>
                        <div className="well-sm" style={{ padding: '15px', backgroundColor: "#332C26", color: "#E0E1DC", marginLeft: '30px' }}>
                            <span style={{ fontSize: '18px' }}>CREATE CONTENT</span><br />
                            <span style={{ fontSize: '12px' }}>Place a content of your choice on the piece.</span>
                        </div>
                        <div style={{ padding: '10px', backgroundColor: '#443B36', color: "#706762" }}>
                            <div style={{textAlign:'center',fontSize:'15px',marginBottom:'10px'}}>
                                {this.state.moldName}
                            </div>
                            <div 
                                style={{ marginLeft: '20px', marginRight: '20px',
                                backgroundColor: "#28211B", color: "black",
                                height: '340px', borderStyle: 'solid', borderColor: '#45413F',borderWidth:'2px' }}>
                                <div style={{ display: 'inline-block', width: '15%', height: '340px', borderRightStyle: 'solid', borderRightColor: '#45413F', borderWidth: '2px'}}>
                                    <Grid>
                                        <Row className="show-grid" >
                                            <Col xs={1} md={1} lg={1} style={{ padding: '10px', fontSize: '13px',margin:'10px' }}>
                                                <div className='icons' onClick={() => { }}><img src='icon1.png'></img></div>
                                                <div className='icons' onClick={() => {
                                                    this.nameInput.focus();

                                                    }}><img src='icon2.png'></img></div>
                                                <div className='icons' onClick={() => { }}><img src='icon3.png'></img></div>
                                                <div className='icons' onClick={() => this.rotate()}><img src='icon4.png'></img></div>
                                                <div className='icons ' onClick={() => this.rotateClockwise()}><img className='reverse' src='icon4.png'></img></div>

                                                <div className='icons' onClick={() => { }}><img src='icon5.png'></img></div>


                                            </Col>

                                        </Row>
                                    </Grid>
                                </div>
                                <div style={{ display: 'inline-block', width: '85%', height: '340px'}}>
                                    <textarea className='textChoco' 
                                    style={{ 
                                        backgroundImage:"URL('http://localhost:8080/"+this.state.mold+"')",
                                        width:this.state.moldWidth,
                                        height:this.state.moldHeight,
                                        paddingTop:this.state.paddingTop
                                    }} 
                                        placeholder={this.state.moldPlaceHolder} autoFocus name="content" id="content" ref={(input) => {
                                            this.nameInput = input; }} maxLength="23"
                                        onKeyDown={this.handleKeyDown} onChange={this.handleChange} onKeyPress={this.checkRTL} defaultValue={globalState.gcode.text.data}  ></textarea>
                                    </div>
                                </div>
                                <div style={{margin:'20px'}}>
                                    <Button bsSize="lg" bsStyle="warning" onClick={this.step1}> <Icon name="angle-left" /></Button>
                                    <Button bsSize="lg" bsStyle="warning" style={{ marginLeft: '8px'}}> <Icon name="plus" /></Button>
                                    <Button bsSize="lg" style={{ float: 'right', marginLeft: '8px' }} disabled={!this.state.content} onClick={this.step3}  bsStyle="warning"> <Icon name="angle-right" /></Button>
                                <Button bsSize="lg" style={{ float: 'right', marginLeft: '8px' }} disabled={!this.state.content} onClick={this.automatedProcess} bsStyle="warning">Download</Button>

                                    <Button style={{ float: 'right', marginLeft: '8px' }} bsSize="lg" onClick={this.textWrapping} bsStyle="warning"> Generate</Button>
                                </div>
                        </div>
                    </Row>
                )}
                {this.state.step3 && (
                    <Row style={{ fontSize: "11px" }}>
                        <div className="well-sm" style={{ padding: '15px', backgroundColor: "#332C26", color: "#E0E1DC", marginLeft: '30px' }}>
                            <span style={{ fontSize: '18px' }}>MOLD ARRANGEMENT</span><br />
                            <span style={{ fontSize: '12px' }}>Choose the mold size to arrange content accordingly.</span>
                        </div>
                        <div style={{ padding: '10px', marginTop: "25px", backgroundColor: '#443B36', color: "#635A56" }}>
                            <div style={{ marginLeft: '20px', marginRight: '20px', backgroundColor: "#28201B", color: "#B2B0AD", height: '340', borderStyle: 'solid', borderColor: '#45413F', borderWidth: '2px' }}>
                                <div style={{ display: 'inline-block', width: '15%', height: '340px' }}>
                                    <Grid>
                                        <Row className="show-grid" >
                                            <Col xs={1} md={1} lg={1} style={{padding:'10px',fontSize:'13px'}}>
                                                <div className={`pcsCount ${this.state.pcsCount == 1 ? "activeCount" : ""}`} onClick={() => this.setPcsCount(1)}>1 Pc</div>
                                                <div className={`pcsCount ${this.state.pcsCount == 2 ? "activeCount" : ""}`} onClick={() => this.setPcsCount(2)}>2 PC</div>
                                                <div className={`pcsCount ${this.state.pcsCount == 3 ? "activeCount" : ""}`} onClick={() => this.setPcsCount(3)}>3 PC</div>
                                                <div className={`pcsCount ${this.state.pcsCount == 4 ? "activeCount" : ""}`} onClick={() => this.setPcsCount(4)}>4 PC</div>
                                                <div className={`pcsCount ${this.state.pcsCount == 6 ? "activeCount" : ""}`} onClick={() => this.setPcsCount(6)}>6 PC</div>
                                                <div className={`pcsCount ${this.state.pcsCount == 12 ? "activeCount" : ""}`} onClick={() => this.setPcsCount(12)}>12 PC</div>
                                                <div className={`pcsCount ${this.state.pcsCount == 24 ? "activeCount" : ""}`} onClick={() => this.setPcsCount(24)}>24 PC</div>
                                                <div className={`pcsCount ${this.state.pcsCount == 32 ? "activeCount" : ""}`} onClick={() => this.setPcsCount(32)}>32 PC</div>
                                                <div className={`pcsCount ${this.state.pcsCount == 50 ? "activeCount" : ""}`} onClick={() => this.setPcsCount(50)}>50 PC</div>
                                            </Col>

                                        </Row>
                                    </Grid>
                                </div>
                                <div style={{ display: 'inline-block', width: '85%', height: '340', backgroundColor: "#514641", borderLeftStyle: 'solid', borderLeftColor: '#453B36', borderWidth: '10px' }}>
                                    <div style={{ width: '100%', height: '100%', backgroundImage:` URL('http://localhost:8080/moldpcs.png')`,backgroundPosition:'center',backgroundRepeat:'no-repeat'}}></div>

                                </div>
                            </div>
                            <div style={{ margin: '20px' }}>
                                <Button bsSize="lg" bsStyle="warning" onClick={this.step2}> <Icon name="angle-left" /></Button>
                                <Button bsSize="lg" bsStyle="warning" style={{ marginLeft: '8px' }} > <Icon name="plus" /></Button>
                                <Button type='button' bsSize="lg" id="playBtn" style={{ float: 'right' }}  onClick={this.generateAll} title={this.state.warnings} >
                                    <Icon name="play" />
                                </Button>

                            </div>
                        </div>
                    </Row>
                )}
                <div className="panel panel-danger hideMe" style={{ marginBottom: 0 }}>
                    <div className="panel-heading" style={{ padding: 2 }}>
                        <table style={{ width: 100 + '%' }}>
                            <tbody>
                                <tr>
                                    <td>
                                        <label>Workspace</label>
                                    </td>
                                    <td>
                                        <ApplicationSnapshotToolbar loadButton saveButton stateKeys={['documents', 'operations', 'currentOperation', 'settings.toolFeedUnits']} saveName="Laserweb-Workspace.json" label="Workspace" className="well well-sm">
                                            <Button bsSize="xsmall" bsStyle="warning" onClick={e => this.props.resetWorkspace(e)}>Reset <Icon name="trash" /></Button>
                                        </ApplicationSnapshotToolbar>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                {this.state.step4 && (<div>
                    
                    Font:
                        <FormGroup style={{ margin: '10px' }}>
                       
                        <div>
                            <div className="form-check" >
                                <label htmlFor="Oval">
                                    <input type="radio" name="template" value="Oval"
                                        onChange={this.handleTemplateChange}
                                        className="form-check-input" />
                            Oval </label>
                                <img src="oval.jpg" height="40" width="80" />
                            </div>
                            <div className="form-check">
                                <label htmlFor="Rectangle">
                                    <input type="radio" name="template" value="Rectangle"
                                        onChange={this.handleTemplateChange}
                                        className="form-check-input"
                                    />
                                Rectangle
                                </label>
                                <img src="rectangle.jpg" height="40" width="80" />
                            </div>
                            <div className="form-check">
                                <label htmlFor="Square">
                                    <input type="radio" name="template" value="Square" onChange={this.handleTemplateChange}
                                        className="form-check-input" />
                                Square
                                 </label>
                                <img src="rectangle.jpg" height="50" width="50" />
                            </div>
                        </div>

                        <div >
                            
                        </div>
                        <div>
                            <Button name="textWrapping" disabled={!this.state.textEnabled} onClick={this.textWrapping} bsStyle="danger" >One Piece</Button> &nbsp;
                            <Button name="generateAll" className='hideMe'  disabled={!this.state.generalAllEnable} onClick={this.generateAll} bsStyle="danger" >Confirm</Button>
                            &nbsp;&nbsp;
                            
                            <div  >
                                <br />
                                <Button title="Bigger" name="fontplus" onClick={() => { this.scale(1.02) }} bsSize="large" bsStyle="primary" className={"fa fa-plus-circle"}></Button>
                                <Button title="up" name="fontminus" onClick={() => { this.moveUp(-0.5) }} bsSize="large" bsStyle="primary" className={"fa fa-arrow-up"} ></Button>
                                <Button title="smaller" name="fontminus" onClick={() => { this.scale(0.98) }} bsSize="large" bsStyle="primary" className={"fa fa-minus-circle"} ></Button>
                                <br />
                                <Button title="to the left" name="fontminus" onClick={() => { this.moveLeft(-0.5) }} bsSize="large" bsStyle="primary" className={"fa fa-arrow-left"} ></Button>
                                <Button title="down" name="fontminus" onClick={() => { this.moveDown(-0.5) }} bsSize="large" bsStyle="primary" className={"fa fa-arrow-down"} ></Button>
                                <Button title="to the right" name="fontminus" onClick={() => { this.moveRight(-0.5) }} bsSize="large" bsStyle="primary" className={"fa fa-arrow-right"} ></Button>
                            </div>


                        </div>
                    </FormGroup>
                </div>)}
                <div className="success hideMe" >Choose Font:</div>
                <Select className="success hideMe" value={globalState.gcode.chocolateFont.data} placeholder='Choose Font'
                    onChange={this.handleFontChange} defaultValue={globalState.gcode.chocolateFont.data} options={Fonts} >
                    <option value="GreatVibes">Great Vibes</option>
                    <option value="Arslan">ArslanFont</option>
                    <option value="chocolatePristina">Pristina</option>
                    <option value="ITCKRIST">ITCKRIST</option>
                    <option value="TrajanPro-Bold">TrajanPro-B</option>
                    <option value="Bevan">Eevan</option>
                </Select>
                <a href={this.state.svgFile} id="svgFile">File</a>
                <Alert bsStyle="success" className="hideMe" style={{ padding: "4px", marginBottom: 7, display: "block", backgroundColor: '#A4644C',color:'white' }}>
                    <table style={{ width: 100 + '%' }}>
                        <tbody>
                            <tr className="hideMe">
                                <th >Progress</th>
                                <td style={{ width: "80%", textAlign: "right" }}>{!this.props.gcoding.enable ? (
                                    <ButtonToolbar style={{ float: "right" }}>
                                        <button  title="Generate G-Code from Operations below" 
                                        className={"btn btn-xs btn-attention hideMe " + (this.props.dirty ? 'btn-warning' : 'btn-primary')} 
                                        disabled={!valid || this.props.gcoding.enable} 
                                        onClick={(e) => this.generateGcode(e)}><i className="fa fa-fw fa-industry" />
                                        &nbsp;Generate
                                        </button>
                                        <ButtonGroup>
                                            <button  title="View generated G-Code. Please disable popup blockers" className="btn btn-info btn-xs hideMe" disabled={!valid || this.props.gcoding.enable} onClick={this.props.viewGcode}><i className="fa fa-eye" /></button>
                                            <button style={{ display: 'none' }} title="Export G-code to File" className="btn btn-success btn-xs" disabled={!valid || this.props.gcoding.enable} onClick={this.props.saveGcode}><i className="fa fa-floppy-o" /></button>
                                            <FileField style={{ display: 'none' }} onChange={this.props.loadGcode} disabled={!valid || this.props.gcoding.enable} accept=".gcode,.gc,.nc">
                                                <button title="Load G-Code from File" className="btn btn-danger btn-xs" disabled={!valid || this.props.gcoding.enable} ><i className="fa fa-folder-open" /></button>
                                            </FileField>
                                        </ButtonGroup>
                                        <button title="Clear" style={{ display: 'none' }} className="btn btn-warning btn-xs" disabled={!valid || this.props.gcoding.enable} onClick={this.props.clearGcode}><i className="fa fa-trash" /></button>
                                    </ButtonToolbar>) : <GcodeProgress onStop={(e) => this.stopGcode()} />}
                                </td>
                            </tr>
                            <tr>
                                <th >Progress</th>
                                <td className='hideMe'><span id="serverStatus">{this.state.statusMsg}</span></td>
                                <td className='hideMe'><span id="machineStatus"></span></td>
                                <td><input type="file" onChange={this.onFileChange} />
                                    <button onClick={this.onFileUpload}>
                                        Upload!
                                    </button></td>
                                <td><button className="btn btn-warning btn-l" onClick={this.convert} >Convert</button></td>
                                <td><button className="btn btn-warning btn-l " onClick={this.rotateNinety} >Rotate</button></td>
                                <td><button className="btn btn-warning btn-l hideMe" onClick={this.newProcess} >New Process</button></td>
                                <td><button className="btn btn-warning btn-l hideMe" onClick={detectX} >Detect X</button></td>
                                <td><button className="btn btn-warning btn-l hideMe" onClick={this.combine} >Combine</button></td>

                                {/*<td><span id='msgStatus'></span></td>*/}
                            </tr>
                            <tr><td><a href={this.state.svgFile} id="svgFile">File</a></td></tr>
                        </tbody>
                    </table>

                </Alert>
                <div>
                    
                </div>
                <div className="Resizer horizontal hideMe" style={{ marginTop: '2px', marginBottom: '2px' }}></div>
                <div className="panel panel-info hideMe" style={{ marginBottom: 3 }}>
                    <div className="panel-heading" style={{ padding: 2 }}>
                        <table style={{ width: 100 + '%' }}>
                            <tbody>
                                <tr>
                                    <td>
                                        <label>Documents {Info(<small>Tip:  Hold <kbd>Ctrl</kbd> to click multiple documents</small>)}</label>
                                    </td>
                                    <td style={{ display: "flex", justifyContent: "flex-end" }}>
                                        <FileField style={{ position: 'relative', cursor: 'pointer' }} onChange={loadDocument} accept={DOCUMENT_FILETYPES}>
                                            <button title="Add a DXF/SVG/PNG/BMP/JPG document to the document tree" className="btn btn-xs btn-primary">
                                                <i className="fa fa-fw fa-folder-open" />Add Document</button>
                                            {(this.props.panes.visible) ? <NoDocumentsError camBounds={bounds} settings={settings} documents={documents} operations={operations} /> : undefined}
                                        </FileField>&nbsp;
                                    </td>
                                </tr>

                            </tbody>
                        </table>
                    </div>
                </div>

                <Splitter style={{ flexShrink: 0,display:'block' }} split="horizontal" initialSize={100} resizerStyle={{ marginTop: 2, marginBottom: 2 }} splitterId="cam-documents">
                    <div style={{ height: "100%", display: "flex", flexDirection: "column", display:'none' }} >
                        <div style={{ overflowY: 'auto', flexGrow: 1 }}><Documents documents={documents} filter={this.state.filter} toggleExpanded={toggleDocumentExpanded} /></div>
                        {documents.length ? <ButtonToolbar bsSize="xsmall" bsStyle="default">

                            <ButtonGroup>
                                <Button bsStyle="info" bsSize="xsmall" onClick={() => { this.props.dispatch(selectDocuments(true)) }} title="Select all"><Icon name="cubes" /></Button>
                                <Button bsStyle="default" bsSize="xsmall" onClick={() => { this.props.dispatch(selectDocuments(false)) }} title="Select none"><Icon name="cubes" /></Button>
                            </ButtonGroup>
                            <Button bsStyle="warning" bsSize="xsmall" disabled={!someSelected} onClick={() => { this.props.dispatch(cloneDocumentSelected()) }} title="Clone selected"><Icon name="copy" /></Button>
                            <Button bsStyle="danger" bsSize="xsmall" disabled={!someSelected} onClick={() => { this.props.dispatch(removeDocumentSelected()) }} title="Remove selected"><Icon name="trash" /></Button>
                            <ButtonGroup>
                                <ColorPicker to="rgba" icon="pencil" bsSize="xsmall" disabled={!someSelected} onClick={v => this.props.dispatch(colorDocumentSelected({ strokeColor: v || [0, 0, 0, 1] }))} />
                                <ColorPicker to="rgba" icon="paint-brush" bsSize="xsmall" disabled={!someSelected} onClick={v => this.props.dispatch(colorDocumentSelected({ fillColor: v || [0, 0, 0, 0] }))} />
                            </ButtonGroup>
                            <SearchButton  bsStyle="primary" bsSize="xsmall" search={this.state.filter} onSearch={filter => { this.setState({ filter }) }} placement="bottom"><Icon name="search" /></SearchButton>
                        </ButtonToolbar> : undefined}
                    </div>
                </Splitter>

                <OperationDiagram {...{ operations, currentOperation }}  style={{display:"none"}} />
                {/* <FileUpload /> */}
                <div className="">
                    <div className={this.state.hideme} dangerouslySetInnerHTML={{ __html: this.state.generatedFile }} />
                    <img src="" id="eeveelutions"/>
                    <img src="" className="" id="testXPos" />
                    <canvas id="canvas" height="398" width="500" />
                    <canvas id="canvasMod"  />
                    <canvas id="canvasMod2" />
                </div>
                <Operations
                    style={{ flexGrow: 2, display: "flex", flexDirection: "column", display:"none" }}
                /*genGCode = {this./*generateGcode*//*docuementAdded}*/
                />
                <Com id="com" title="Comms" icon="plug" />
            </div>

            );
    }
};

Cam = connect(
    state => ({
        myText: state.content,
        settings: state.settings,
        documents: state.documents,
        operations: state.operations,
        currentOperation: state.currentOperation,
        gcode: state.gcode.content,
        gcoding: state.gcode.gcoding,
        dirty: state.gcode.dirty,
        panes: state.panes,
        saveGcode: (e) => {
            prompt('Save as', 'gcode.gcode', (file) => {
                if (file !== null) sendAsFile(appendExt(file, '.gcode'), state.gcode.content)
            }, !e.shiftKey)
        },
        viewGcode: () => openDataWindow(state.gcode.content),
    }),
    dispatch => ({
        dispatch,
        toggleDocumentExpanded: d => dispatch(setDocumentAttrs({ expanded: !d.expanded }, d.id)),
        clearGcode: () => {
            dispatch(setGcode(""))
        },
        resetWorkspace: () => {
            confirm("Are you sure?", (data) => { if (data) dispatch(resetWorkspace()); })
        },
        loadDocument: (e, modifiers = {}) => {
            // TODO: report errors
            for (let file of e.target.files) {
                let reader = new FileReader;
                if (file.name.substr(-4) === '.svg') {
                    reader.onload = () => {
                        const release = captureConsole()
                        let parser = new Parser({});
                        console.log('result of loading svg file', reader.result);
                        parser.parse(reader.result)
                            .then((tags) => {
                                let captures = release(true);
                                let warns = captures.filter(i => i.method == 'warn')
                                let errors = captures.filter(i => i.method == 'errors')
                                if (warns.length)
                                    CommandHistory.dir("The file has minor issues. Please check document is correctly loaded!", warns, 2)
                                if (errors.length)
                                    CommandHistory.dir("The file has serious issues. If you think is not your fault, report to LW dev team attaching the file.", errors, 3)
                                //onsole.log('loadDocument: imageTagPromise');
                                imageTagPromise(tags).then((tags) => {
                                    console.log('loadDocument: dispatch');
                                    dispatch(loadDocument(file, { parser, tags }, modifiers));
                                })
                            })
                            .catch((e) => {
                                //console.log('loadDocument: catch:', e);
                                release(true);
                                CommandHistory.dir("The file has serious issues. If you think is not your fault, report to LW dev team attaching the file.", String(e), 3)
                                console.error(e)
                            })

                    }
                    reader.readAsText(file);
                }
                else if (file.type.substring(0, 6) === 'image/') {

                    reader.onload = () => {
                        promisedImage(reader.result)
                            .then((img) => {
                                dispatch(loadDocument(file, reader.result, modifiers, img));
                            })
                            .catch(e => console.log('error:', e))
                    }
                    reader.readAsDataURL(file);
                } else if (file.name.match(/\.(nc|gc|gcode)$/gi)) {
                    let reader = new FileReader;
                    reader.onload = () => dispatch(setGcode(reader.result));
                    reader.readAsText(file);
                }
                else {
                    reader.onload = () => dispatch(loadDocument(file, reader.result, modifiers));
                    reader.readAsDataURL(file);
                }
            }
        },
        loadGcode: e => {
            let reader = new FileReader;
            reader.onload = () => dispatch(setGcode(reader.result));
            reader.readAsText(e.target.files[0]);
        },
    }),
)(Cam);

Cam = withDocumentCache(withGetBounds(Cam));

export default Cam;

