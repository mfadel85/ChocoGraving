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
import { Alert, Button, ButtonGroup, ButtonToolbar, Form, FormGroup,  Row,Col,Grid } from 'react-bootstrap';
import { connect } from 'react-redux';
import { cloneDocumentSelected, colorDocumentSelected, loadDocument,  removeDocumentSelected, selectDocument, selectDocuments, setDocumentAttrs, transform2dSelectedDocuments } from '../actions/document';
import {  saveModels } from '../actions/gcode';
import { resetWorkspace } from '../actions/laserweb';
import { addOperation, clearOperations,  setFormData, setDepth, setFont } from '../actions/operation';
import { GlobalStore } from '../index';
import {  captureConsole } from '../lib/helpers';
import Parser from '../lib/lw.svg-parser/parser';
import { ValidateSettings } from '../reducers/settings';
import CommandHistory from './command-history';
import { Documents } from './document';
import { withDocumentCache } from './document-cache';
import Icon from './font-awesome';
import { ColorPicker, FileField, Info, SearchButton } from './forms';
import { GetBounds, withGetBounds } from './get-bounds.js';
import { imageTagPromise, promisedImage } from './image-filters';
import { alert, confirm } from './laserweb';
import { Error } from './operation';
import { OperationDiagram } from './operation-diagram';
import Splitter from './splitter';
import Select from 'react-select';
import axios from 'axios';


const opentype = require('opentype.js');
const framePath = require('../data/staticdata.js');

export const DOCUMENT_FILETYPES = '.png,.jpg,.jpeg,.bmp,.gcode,.g,.svg,.dxf,.tap,.gc,.nc'

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
    moldName: 'Square in Square',
    moldPlaceHolder: '\nname\nhere',
    paddingTop: '35px',
    forwardEnabled: false,
    errorMessage: 'Test',
    statusMsg: 'Progress',
    svgFile:'',
    fileLoaded:false,
    hideme:'',
    selectedFile: null
};
class Cam extends React.Component {

    constructor(props) {
        super(props);
        this.chocoalteDepthRef;
    
        this.state = initialState;
        let { settings, documents, operations } = this.props;

        this.handleDepthChange = this.handleDepthChange.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleFontChange = this.handleFontChange.bind(this);
        this.handleSubmission = this.handleSubmission.bind(this);
        this.handleTemplateChange = this.handleTemplateChange.bind(this);
        this.textWrapping = this.textWrapping.bind(this);
        this.generateAll = this.generateAll.bind(this);
        this.handleMoves = this.handleMoves(this);
        this.moveDown = this.moveDown.bind(this);
        this.moveUp = this.moveUp.bind(this);
        this.moveLeft = this.moveLeft.bind(this);
        this.moveRight = this.moveRight.bind(this);
        this.scale = this.scale.bind(this);
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
        this.handleOutsideLines = this.handleOutsideLines.bind(this);        
        this.convert = this.convert.bind(this);
        //onFileChange
        this.onFileChange = this.onFileChange.bind(this);

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
            nextProps.operations !== this.props.operations ||
            nextProps.currentOperation !== this.props.currentOperation ||
            nextProps.bounds !== this.props.bounds ||
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

    validateLayout(layout, maxLines) { //// add another condition which is if the number of lines is bigger than the number of words
        return layout.lines.length > maxLines ? false:true;        
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
    getPosition(string, subString, index) {
        return string.split(subString, index).join(subString).length;
    }

    getDimension(svgObject) {
        let widthStart = this.getPosition(svgObject, '"', 1);
        let widthFin = this.getPosition(svgObject, '"', 2);
        let width = svgObject.slice(widthStart + 1, widthFin)
        let heightStart = this.getPosition(svgObject, '"', 3);
        let heightEnd = this.getPosition(svgObject, '"', 4);
        let height = svgObject.slice(heightStart + 1, heightEnd)
        console.log('width : ', width, 'height:', height);
        return [parseFloat(width), parseFloat(height)];
    }
    getDimensionAPI(svg){
        let widthStart = this.getPosition(svg, '"', 13);
        let widthFin = this.getPosition(svg, '"', 14);
        let width = svg.slice(widthStart + 1, widthFin)
        let heightStart = this.getPosition(svg, '"', 15);
        let heightEnd = this.getPosition(svg, '"', 16);
        let height = svg.slice(heightStart + 1, heightEnd)
        console.log('width : ', width, 'height:', height);
        return [parseFloat(width), parseFloat(height)];
        

    }
    getDimensionGeneral(svgObject){
        const widthStart = svgObject.indexOf('width="') + 6;
        const widthFin = svgObject.indexOf('"', widthStart+1);
        const width = svgObject.slice(widthStart + 1, widthFin);

        const heightIndex = svgObject.indexOf('height="') + 7;
        const heightFin = svgObject.indexOf('"', heightIndex+1);
        const height = svgObject.slice(heightIndex + 1, heightFin);
        return [parseFloat(width), parseFloat(height),width,height];

    }
    findStartEndIndices(string,substring){
        const startIndex = string.indexOf(substring);
        const endIndex = string.indexOf('"', startIndex+11);
        return [startIndex, endIndex]

    }
    getDimensionStr(svgObject) {
        let widthStart = this.getPosition(svgObject, '"', 1);
        let widthFin = this.getPosition(svgObject, '"', 2);
        let width = svgObject.slice(widthStart + 1, widthFin)
        let heightStart = this.getPosition(svgObject, '"', 3);
        let heightEnd = this.getPosition(svgObject, '"', 4);
        let height = svgObject.slice(heightStart + 1, heightEnd)
        console.log('width : ', width, 'height:', height);
        return [width, height];
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
        let margins = this.calcMargins();
        console.log('calc margins', margins);
        let that = this;
        
        for(let i=1;i<this.state.pcsCount;i++){
            let index = i+1;
            if( index < 5 )
                await this.parseSVG(this.state.svgOutpout, this, [this.state.moldShifts, margins], 'file'+index+'.svg', i);
            else 
                await this.parseSVG(this.state.svgOutpout, this, [this.state.moldShifts, margins], 'file' + index + '.svg', i, );
        }
        await this.props.dispatch(selectDocument(this.props.documents[0].id));
    }
    calcMargins(){

        let dims = this.getDimension(this.state.svgOutpout);
        const operator = 3.7795284176;// the division of unit per mm
        let mmDims = dims.map(n => n / operator);
        let margins = [(42 - mmDims[0]) / 2, (41 - mmDims[1]) / 2];
        return margins;
    }



    textWrapping(downloadMe,final) {
        const downloaable = final;
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
        const operator = 3.7795284176;// the division of unit per mm

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
            let finalWidth = 110;// should be maxMM * 301 (which is point in mm) 5000

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
                    shiftX = that.state.activeTemplate.shiftX * 9 - (wordWidths[i] / (2 * 3.78));/// what is this equation?

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
                let result = that.validateLayout(layout,  that.state.activeTemplate.maxLines);
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
                    result = that.validateLayout(layout, text, that.state.activeTemplate.maxLines);
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

                let mmDims = that.getDimension(makerjs.exporter.toSVG(models)).map(n => n / operator);

                if (downloaable){
                    models = makerjs.layout.cloneToGrid(models, 6, 4, [(42- mmDims[0]) * operator, (41 - mmDims[1]) * operator]); 
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

                let output = makerjs.exporter.toSVG(models );
            
                let dims = that.getDimension(output);
               
                let mmDims = dims.map(n => n / operator);
               

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
                const svgDims = that.getDimensionStr(final);
                

                const final1 = final.replace(svgDims[0], '1009.2939');
                const final2 = final1.replace(svgDims[0], '1009.2939');

                const final3 = final2.replace(svgDims[1], '635.183');
                const final4 = final3.replace(svgDims[1], '635.183');
                const secondInsertion = final4.indexOf('<g') + 2;
                var finalist = final4.slice(0, secondInsertion) + ' transform="translate(56.2611671,63.47244096)" ' + final4.slice(secondInsertion);


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
    handleOutsideLines(svgFile){
        console.log(svgFile);
    }
    deleteDocuments(){// to delete all documents except the first one
        this.props.dispatch(selectDocument(this.props.documents[0].id));

    }
    handleMoves(){
        console.log('testyyyy');
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
        // check limits:get current left limit
        let changes = this.state.changesXY;
        changes[4] -= 0.3;
        this.setState({ changesXY: changes });
        this.props.dispatch(selectDocument(this.props.documents[0].id));
        this.props.dispatch(transform2dSelectedDocuments([1, 0, 0, 1, -0.3, 0]));
    }

    moveRight() {
        //check limits: get current right limit

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
    rotateClockwise(){
        var rotateArray = [0.9986295347545738,
            0.05233595624294383,
            -0.05233595624294383,
            0.9986295347545738,
            4.684298907150151,
            -4.699918052283735];
        this.props.dispatch(selectDocument(this.props.documents[0].id));
        this.props.dispatch(transform2dSelectedDocuments(rotateArray));

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
            //shiftingChanges[4] += changes[4];
            //shiftingChanges[5] += changes[5];

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
    parseSVG(svg,that,margin,fileName,n){
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
                            }).then(() => {
                                if (n == 0) {
                                    that.setState({ originalShift: [that.props.documents[0].changes[4], that.props.documents[0].changes[5]] })
                                }
                                if (n > 4) {
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

        const makerjs = require('makerjs');
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
                    moldName:'Square in Square',                    
                    moldPlaceHolder: 'name\nhere',
                    paddingTop: '65px'
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
                this.setState({ mold: 'mold3.png', moldWidth: '260px', moldHeight: '234px',
                    moldName: 'Circle',
                    moldPlaceHolder: 'name\nhere',
                    paddingTop: '60px' });
            break;
            case 'Oval':
                activeTemplate = chocoTemplates.templates[0];
                this.setState({ mold: 'mold9.png', moldWidth: '263px', moldHeight: '210px',
                    moldName: 'Oval',
                    moldPlaceHolder: 'name here',
                    paddingTop: '65px' 
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
            break;
            case 'Heart':
                activeTemplate = chocoTemplates.templates[8];
                this.setState({ mold: 'mold8.png', moldWidth: '231px', moldHeight: '232px', 
                moldName: 'Heart',
                moldPlaceHolder: 'name here',
                paddingTop:'53px' 
            });
            break;
            case 'Rect':
                activeTemplate = chocoTemplates.templates[1];
                this.setState({ 
                    mold: 'mold4.png', moldWidth: '264', moldHeight: '210px', 
                    moldName: 'Rectangle',
                    moldPlaceHolder: 'name here',
                    paddingTop: '63px'
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
    removeBlanks(canvas,imgWidth, imgHeight) {
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

        inMemCanvas.width = cropWidth;
        inMemCanvas.height = cropHeight;
        inMemCtx.drawImage(canvas,
            cropLeft, cropTop, cropWidth, cropHeight,
            0, 0, cropWidth, cropHeight);
        canvas.width = cropWidth;
        canvas.height = cropHeight;

        context.drawImage(inMemCanvas, 0, 0);
        return [cropLeft, cropTop, cropRight, cropBottom,cropWidth,cropHeight];
    };

    convert(){
        const img = document.getElementById("eeveelutions");//eeveelutions  //eeveelutions

        var canvas = document.getElementById("canvas");
        var ctx = canvas.getContext("2d");
        img.crossOrigin = "anonymous";
        ctx.drawImage(img, 0, 0);

        var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const origData = imgData;

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
        var svgContent;
        ctx.putImageData(imgData, 0, 0);
        var pngImage = canvas.toDataURL("image/png");
        var updatedImageData = '';
        const payload = { data: pngImage };
        const that = this;
        axios.post('http://localhost:8090/http://localhost:4000', { data: payload })
            .then((response) => {
                updatedImageData = response;
                console.log('resop',response);
                var i = new Image();

                i.onload = function () {
                    //alert(i.width + ", " + i.height);
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

                    //canvas.width  = cropWidth;
                    // finally crop the guy

                    ctx.drawImage(canvasMod, 0, 0);
                    const croppedDimensions = that.removeBlanks(canvas, canvas.width, canvas.height);

                    imgData = ctx.getImageData(0, 0, croppedDimensions[4], croppedDimensions[5]);
                    var pngImage = canvas.toDataURL("image/png");
                    var updatedImageData = '';
                    
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
                        .then((response) => {
                            const moldShifts = that.state.moldShifts;//[105,96];//[70, 65];             
                            const stdMargin = that.state.activeTemplate.marginChocolate[0]; // margin between two pieces of the mo
                            const extraMargin = [0, 0];
                            const image = response;
                            const dims = that.getDimensionAPI(response);
                            //now let's repeat it 

                            that.setState({ dims: dims }, () => {
                                that.parseSVG(response, that, [moldShifts, extraMargin, stdMargin], 'file1.svg', 0);
                            });
                            svgContent = response;

                            that.setState({ fileLoaded: true, generatedFile: image, hideme: 'hideMe' });
                        }).then(() => {
                            const scale = 25 / that.state.dims[0];
                            console.log('before repeat',svgContent); /// bunu de handle
                            const updatedContent = that.minimizeSvgFile(svgContent, canvas.width / croppedDimensions[4], croppedDimensions[5] / canvas.height);
                            console.log('after repeat', updatedContent); /// bunu de handle

                            /// handle this updated content
                            // write more code,enCourage.implement(it);
                            //return a new promise that resolves with this stuff all the time, and implement the process
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
                            fetch('http://localhost:8090/http://localhost/ChocoGraveProject/LaserWeb4/dist/convertio/toAi.php', aIOptions).then(response => response.json())
                                .then((response) => {
                                    const aiFile = response;
                                    //we have to save this file and enable the user to download it
                                    console.log(response);
                                })
                            that.scale(scale * 3.7795284176);
                        });
                };
                i.src = response.data;

            })
            .catch(err => {
                alert('error happened: '+ err)
                console.error(err);
            });
    }
    
    minimizeSvgFile(svgFile,percentageX,percentageY){
        const ourFramePath = '<g stroke-linecap="round" fill-rule="evenodd" font-size="12px" stroke="#000" stroke-width="0.25mm" fill="none" style="fill:none;stroke:#000000;stroke-width:0.25mm" id="layer1" transform="matrix(2.8321,0,0,2.8321,2,-161)"><path d="m 233.83379,67.373184 c -2.53989,0.0018 -2.01422,0.247614 -2.01242,3.001398 0.002,2.761509 -2.23509,5.001401 -4.99667,5.003306 -2.76151,0.0018 -5.0014,-2.2352 -5.00331,-4.99678 -0.002,-2.438506 0.43819,-3.000199 -1.39322,-2.998999 l -29.58928,0.01979 c -1.57229,0.0011 -1.01899,0.713105 -1.01751,3.000798 0.002,2.76158 -2.23499,5.001401 -4.99661,5.003306 -2.76168,0.0018 -5.00157,-2.2352 -5.0033,-4.996709 -0.002,-2.569316 0.58282,-3.00041 -1.50619,-2.999105 l -29.08229,0.01951 c -2.01362,0.0014 -1.4133,0.467889 -1.4116,3.000904 0.002,2.761579 -2.2351,5.001507 -4.99661,5.003306 -2.76161,0.0018 -5.0015,-2.23513 -5.00341,-4.996709 -0.002,-2.664496 0.83831,-3.000516 -1.46477,-2.998894 l -29.06042,0.0193 c -2.04481,0.0014 -1.47641,0.452896 -1.47468,3.001081 0.002,2.761615 -2.23503,5.001507 -4.99671,5.003412 -2.76151,0.0018 -5.001402,-2.2352 -5.003201,-4.996815 -0.0018,-2.426476 0.550298,-3.000375 -1.258499,-2.99907 l -29.269619,0.01937 c -2.285682,0.0018 -1.473588,0.343923 -1.471789,3.00101 0.0018,2.761614 -2.235094,5.001506 -4.996709,5.003411 -2.76158,0.0018 -5.001471,-2.2352 -5.003376,-4.996815 -0.0018,-2.623678 0.825888,-3.00048 -1.382607,-2.998999 l -30.757812,0.0206 c -2.419703,0.0014 -1.361405,0.288889 -1.359676,3.000692 0.0019,2.761721 -2.235129,5.001613 -4.996603,5.003412 -4.260321,0.0028 -5.4871056,-0.635706 -5.4989942,1.399399 l 0.017568,26.354686 c 0.00113,1.74092 3.1126292,1.24742 5.5007232,1.2459 2.761579,-0.002 5.001507,2.23503 5.003376,4.99671 0.0018,2.76141 -2.235094,5.0014 -4.996568,5.00331 -2.509625,0.002 -5.5004051,-0.74369 -5.4992057,1.22319 l 0.019085,28.53069 c 0.00109,1.74092 3.1124877,1.24763 5.5006867,1.2459 2.761615,-0.002 5.001507,2.23509 5.003412,4.99671 0.0017,2.76151 -2.235094,5.00151 -4.996603,5.00341 -2.509591,0.002 -5.5005812,-0.74372 -5.4992054,1.22308 l 0.019015,28.53101 c 0.0012,1.74089 3.1124884,1.24739 5.5007934,1.24591 2.761509,-0.002 5.001401,2.23498 5.003306,4.9967 0.0018,2.76141 -2.235094,5.00141 -4.996497,5.0032 -2.509697,0.002 -5.5006174,-0.74362 -5.4992063,1.2233 0.00589,8.9566 0.011818,17.91321 0.017886,26.86988 0.014323,1.9957 1.2659083,0.90992 5.5004053,0.9071 2.761721,-0.002 5.001613,2.23502 5.003412,4.9966 0.0016,2.4421 -0.958603,3.0226 0.459987,2.9996 l 30.735199,-0.0205 c 2.399629,-0.002 2.306919,0.11 2.304908,-3.00168 -0.0018,-2.7614 2.2352,-5.00129 4.996604,-5.0032 2.761615,-0.002 5.001506,2.2351 5.003411,4.99668 0.0018,2.8334 0.417689,2.99229 1.100702,2.99931 l 29.636684,-0.0198 c 1.968395,-0.001 1.264215,-0.4905 1.262486,-3.0009 -0.0018,-2.76151 2.23513,-5.0013 4.996601,-5.0032 2.76172,-0.002 5.00151,2.23509 5.00331,4.9966 0.001,1.80898 -0.42859,3.00031 0.4978,2.99971 l 30.83239,-0.0206 c 0.9549,-7e-4 0.67102,-1.16702 0.66982,-3.00062 -0.002,-2.76147 2.2352,-5.0002 4.9966,-5.002 2.76158,-0.002 5.00151,2.23383 5.00338,4.99541 0.001,2.12181 -0.39578,3.0003 0.92802,2.99942 l 29.85449,-0.0199 c 1.9668,-0.001 1.21909,-0.49111 1.2175,-3.0008 -0.002,-2.76148 2.2351,-5.0014 4.99671,-5.0032 2.76148,-0.002 5.0014,2.23502 5.0032,4.9966 0.002,2.38831 -0.48919,3.0003 1.25169,2.99911 l 30.1975,-0.0202 c 1.38522,0.0433 0.55252,-0.49492 0.55079,-3.00041 -0.002,-2.76151 2.2352,-5.0014 4.99671,-5.0032 2.76161,-0.002 5.00151,2.23498 5.00331,4.99671 0.002,2.81177 -0.35631,2.95599 1.10179,2.99917 10.319,-0.007 20.63799,-0.0137 30.95699,-0.0206 2.47791,-0.002 1.44311,-0.2666 1.44142,-3.00098 -0.002,-2.76151 2.23509,-5.0014 4.9966,-5.0033 4.15798,-0.003 5.4876,0.83199 5.49921,-1.13482 -0.006,-8.88319 -0.0119,-17.76638 -0.0178,-26.6495 -10e-4,-1.96677 -2.99131,-1.21747 -5.5009,-1.21578 -2.7614,0.002 -5.00129,-2.2352 -5.0032,-4.99671 -0.002,-2.76161 2.23509,-5.0015 4.99671,-5.0033 2.38809,-0.001 5.50019,0.48761 5.49899,-1.25328 l -0.019,-28.5309 c -10e-4,-1.96681 -2.9912,-1.21751 -5.50079,-1.21582 -2.76151,0.002 -5.00141,-2.2352 -5.00331,-4.99671 -0.002,-2.76158 2.23509,-5.0015 4.99671,-5.00337 2.3882,-0.001 5.5003,0.48768 5.4991,-1.25321 l -0.0191,-28.5308 c -0.001,-1.9668 -2.99109,-1.2175 -5.50082,-1.21581 -2.76148,0.002 -5.0013,-2.2352 -5.00321,-4.99671 -0.002,-2.76158 2.23513,-5.00147 4.99661,-5.00327 2.3883,-0.002 5.5003,0.48757 5.4992,-1.25331 l -0.018,-26.839617 c -0.0141,-1.966771 -1.34249,-0.909779 -5.5004,-0.907203 -2.76158,0.0018 -5.00162,-2.234883 -5.00341,-4.996498 -0.002,-2.73438 1.03261,-3.000692 -1.4453,-2.998999 z" vector-effect="non-scaling-stroke" id="path5" /></g>';
        const fixedWidth = percentageX *27 * 3.7795284176/12.90; // assuming that there is no white space in the jpg image, if there is white space then it has to be handled differently
        const svgDims = this.getDimensionGeneral(svgFile);
        const scalingFactor = fixedWidth / svgDims[0];
        const scalingFactorY = fixedWidth / svgDims[1]*percentageY;

        console.log('svgFile:', svgFile);

        const final1 = svgFile.replaceAll(svgDims[2], '800');
        const final2 = final1.replaceAll(svgDims[3], '535');
        const tansformIndex = this.findStartEndIndices(final2,'transform="');

        const finalS = final2.replaceAll('fill="#000000"', ' fill="none" ');

        const final3 = finalS.replaceAll('stroke="none"', ' stroke="#76C2DA" stroke-width="0.1" ');
        const transform = ' transform="translate(147.9611671,130.17244096) scale(-' + scalingFactor + ',-' + scalingFactorY + ') ';//-0.0215,-0.0215 those has to be dynamically
        var final5 = final3.replace(final3.substring(tansformIndex[0], tansformIndex[1]), transform);
        const mainGStart = final5.indexOf('<g');
        const mainGEnd = final5.indexOf('</g>')+5;
        const g = final5.substring(mainGStart, mainGEnd);
        var final = final5;
        for(let i=0;i<4;i++){
            for(let j=0;j<6;j++){
                if (j == 0 && i == 0 )
                    continue;
                var xTransform = parseFloat(147.9611671) + j * 119;
                var yTransform = parseFloat(130.17244096)+ i * 116.5;
                const g1 = g.replace('147.9611671', xTransform).replace('130.17244096', yTransform);
                const insertionIndex = final5.indexOf('</g>') + 4;
                final = final5.slice(0, insertionIndex) + g1 + final5.slice(insertionIndex);
                final5 = final;
            }

        }

        const insertionIndex = final.indexOf('</g>') + 4;
        var final5 = final.slice(0, insertionIndex) + ourFramePath + final.slice(insertionIndex);
        var svgElement = document.getElementById("svgFile");
        svgElement.setAttribute('href', 'data:text/plain;chartset=utf-8,' + encodeURIComponent(final5));// changed final5 to final and let's see

        svgElement.setAttribute('download', 'File.svg');
        return final5;
    }

    // On file select (from the pop up)
    onFileChange(event){
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        var reader = new FileReader();
        reader.onload = function(e){
            var img = new Image();
            img.onload = function(){
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img,img.width,img.height);
            }
            img.src = e.target.result;
            const ourImage = document.getElementById('eeveelutions');
            ourImage.src=img.src;

        }
        reader.readAsDataURL(event.target.files[0]);

        // Update the state
        this.setState({ selectedFile: event.target.files[0] });

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
                                                <div className='icons' onClick={() =>this.rotate()}><img src='icon4.png'></img></div>
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
                                        onChange={this.handleChange} onKeyPress={this.checkRTL} defaultValue={globalState.gcode.text.data}  ></textarea>
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

                        <div ></div>
                        <div>
                            <Button name="textWrapping" disabled={!this.state.textEnabled} onClick={this.textWrapping} bsStyle="danger" >One Piece</Button> &nbsp;
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
                           
                            <tr>
                                <th >Progress</th>
                                <td><input type="file" onChange={this.onFileChange} />
                                    </td>
                                <td><button className="btn btn-warning btn-l" onClick={this.convert} >Convert</button></td>
                                {/*<td><span id='msgStatus'></span></td>*/}
                            </tr>
                            <tr><td><a href={this.state.svgFile} id="svgFile">File</a></td></tr>
                        </tbody>
                    </table>

                </Alert>
                <div>
                    
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
                    <canvas id="canvas" height="398" width="500" />
                    <canvas id="canvasMod"  />
                </div>
               
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
        dirty: state.gcode.dirty,
        panes: state.panes,
       
    }),
    dispatch => ({
        dispatch,
        toggleDocumentExpanded: d => dispatch(setDocumentAttrs({ expanded: !d.expanded }, d.id)),
       
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
                } 
                else {
                    reader.onload = () => dispatch(loadDocument(file, reader.result, modifiers));
                    reader.readAsDataURL(file);
                }
            }
        },

    }),
)(Cam);

Cam = withDocumentCache(withGetBounds(Cam));

export default Cam;

