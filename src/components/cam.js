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
import { Alert, Button, ButtonGroup, ButtonToolbar, Form, FormGroup, ProgressBar,Text } from 'react-bootstrap';
import { connect } from 'react-redux';
import { cloneDocumentSelected, colorDocumentSelected, loadDocument, removeDocumentSelected, selectDocument,selectDocuments, setDocumentAttrs, transform2dSelectedDocuments, toggleSelectDocument } from '../actions/document';
import { generatingGcode, setGcode } from '../actions/gcode';
import { resetWorkspace } from '../actions/laserweb';
import { addOperation, clearOperations, setOperationAttrs } from '../actions/operation';
import { GlobalStore } from '../index';
import { getGcode } from '../lib/cam-gcode';
import { appendExt, captureConsole, openDataWindow, sendAsFile } from '../lib/helpers';
import Parser from '../lib/lw.svg-parser/parser';
import { ValidateSettings } from '../reducers/settings';
import { runJob } from './com.js';
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
import { layout } from 'makerjs';

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

class Cam extends React.Component {

    constructor(props){
        super(props);
        this.state={
            filter:null,
            content:"",
            svg:"",
            font: 'Bubble.otf',
            width:0,
            lineHeight:0,
            activeTemplateName:'Oval',
            activeTemplate:{
                "id":"OvalModel",
                "maxHeight":17,
                "maxWidth":25,
                "maxLines":2,
                "maxWordsAr":3,
                "maxWordsEn":3,
                "shiftX":8,
                "shiftY":11,
                "file":"../Oval.svg" ,
				"scale":0.029,
				fontSize:17
            },
            marginX:0,
            marginY:0,
			scale:0.012695775,
			fontSize: 17,
            fontchange:0,
            textDocID:'',
            templateDocID:'',
            direction:'LTR'
        }
        this.handleChange = this.handleChange.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleFontChange = this.handleFontChange.bind(this);
        this.handleSubmission = this.handleSubmission.bind(this);
        this.handleTemplateChange = this.handleTemplateChange.bind(this);
        this.generateGcode = this.generateGcode.bind(this);
        this.docuementAdded = this.docuementAdded.bind(this);
        this.textWrapping = this.textWrapping.bind(this);
        this.runJob = this.runJob.bind(this);
        this.wordWrapped = this.wordWrapped.bind(this);
        this.changeFont = this.changeFont.bind(this);
        this.updateFontChangeAmount = this.updateFontChangeAmount.bind(this);
        this.checkRTL = this.checkRTL.bind(this);
        this.handleFontChange = this.handleFontChange.bind(this);

    }


    componentWillMount() {
        let that = this
        console.log('this',this);
        window.generateGcode = () => {
            let { settings, documents, operations } = that.props;
            let percent = 0;
            __interval = setInterval(() => {
                that.props.dispatch(generatingGcode(true, isNaN(percent) ? 0 : Number(percent)));
            }, 100)

            let QE = getGcode(settings, documents, operations, that.props.documentCacheHolder,
                (msg, level) => { CommandHistory.write(msg, level); },
                (gcode) => {
                    clearInterval(__interval)
                    that.props.dispatch(setGcode(gcode));
                    console.log('gcode is ready');
                    that.props.dispatch(generatingGcode(false))
                    //this.runJob();

                },
                (threads) => {
                    percent = ((Array.isArray(threads)) ? (threads.reduce((a, b) => a + b, 0) / threads.length) : threads).toFixed(2);
                }
            );
            return QE;
        }

        this.generateGcode.bind(this);
        this.stopGcode.bind(this);

    }
    componentDidMount() {
        this.updateCanvas();
    }
    updateCanvas(context) {
        //const ctx = this.refs.canvas.getContext('2d');
        //ctx.fillRect(context);
    }
    resetFontSize(e){ // a bug here!!!
        let activeTemplateName = this.state.activeTemplateName;
        this.handleTemplateChange(e,activeTemplateName);
    }
    handleChange (e)  {

        this.resetFontSize(e);
        var lines = e.target.value.split("\n");
        lines.forEach((line,i) => {
            var words = line.split(" ");
            words.forEach(word => {
                if(word.length> 13){
                    alert('Very long name please use  a shorter name, less than 13 char');
                    return;            
                }        
                if(words.length > this.state.activeTemplate.maxWordsEn)
                {
                    alert(' Only max '+ this.state.activeTemplate.maxWordsEn + ' words is allowed.');
                    return;
                }
            });
        });        
        this.setState({ content: e.target.value });
    }
    handleFontChange(selectedOption)  {
        //this.resetFontSize(e);
        console.log(selectedOption);
        switch(selectedOption){
            case 'GreatVibes':
                this.setState({ font: 'GreatVibes-Regular.otf' });
            break;
            case 'Arslan':
                console.log('Almaarai is chosen');
                this.setState({font:'Almarai-Bold.ttf'});
            break;
            case 'chocolatePristina':
                console.log('chocolatePristina is chosen');
                this.setState({ font: 'chocolatePristina.ttf' });
            break;
            case 'ITCKRIST':
                this.setState({ font:  'ITCKRIST.TTF' });
            break;
            case 'TrajanPro-Bold':
                this.setState({ font:  'TrajanPro-Bold.otf' });
            break;   
            case 'Bevan':
                this.setState({ font:  'Bevan.ttf' });
            break;   
            default:                
                this.setState({ font: 'ITCKRIST.TTF'});
            break;
        }
        this.setState({ font: selectedOption.value });
        console.log(`Option selected:`, selectedOption);
      };
    /*handleFontChange (e)  {
        console.log(e);
        this.resetFontSize(e);
        switch(e.target.value){
            case 'GreatVibes':
                this.setState({ font: 'GreatVibes-Regular.otf' });
            break;
            case 'Arslan':
                console.log('Almaarai is chosen');
                this.setState({font:'Almarai-Bold.ttf'});
            break;
            case 'chocolatePristina':
                console.log('chocolatePristina is chosen');
                this.setState({ font: 'chocolatePristina.ttf' });
            break;
            case 'ITCKRIST':
                this.setState({ font:  'ITCKRIST.TTF' });
            break;
            case 'TrajanPro-Bold':
                this.setState({ font:  'TrajanPro-Bold.otf' });
            break;   
            case 'Bevan':
                this.setState({ font:  'Bevan.ttf' });
            break;   
            default:                
                this.setState({ font: 'Almarai-Bold.ttf' });
            break;
        }
    }    */
    handleKeyDown(e){
        var words = e.target.value.split(" ");
        if(words.length > this.state.activeTemplate.maxWordsEn)
        {
        }
    }
    handleTemplateChange (e,templateName = null) { 
        let	{ value } = e.target;
        
        if(templateName)
			value=templateName;
		this.setState({
			activeTemplateName: value
		});
        var chocoTemplates = require("../data/chocolateTemplates.json");
        switch(value){
            case "Oval":
                this.setState({
                    activeTemplate:chocoTemplates.templates[0]
                });
                console.log(' Template Change Oval');
                break;
            case "Rectangle":
                this.setState({
                    activeTemplate:chocoTemplates.templates[1]
                });                
                console.log('Template Change Recatngle');
                break;
            case "Square":
                this.setState({
                    activeTemplate:chocoTemplates.templates[2]
                });                
                console.log('Template Change Square');
                break;
            default:
                break;
        }
      };
    generateGcode() {
        this.QE = window.generateGcode();
    }
    checkRTL(s){          
 
        var ltrChars        = 'A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF'+'\u2C00-\uFB1C\uFDFE-\uFE6F\uFEFD-\uFFFF',
            rtlChars        = '\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC',
            rtlDirCheck     = new RegExp('^[^'+ltrChars+']*['+rtlChars+']');
        if(rtlDirCheck.test(s.target.value)){
            this.setState({direction:'RTL'});
        }
            
        else
            this.setState({direction:'LTR'});
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
            nextState.filter !== this.state.filter
        );
    }

    runJob(){/// bug here to be solved
        /*if(this.state.content == '')
            return;*/
        this.generateGcode(); 

        let globalState = GlobalStore().getState(); 
        console.log('globalState',globalState);
        // check if machine is connected first
        if (!playing && !paused /*&& !globalState.com.paused && !globalState.com.playing*/) {
            let cmd = this.props.gcode;
            console.log('runJob(' + cmd.length + ')');
            playing = true;

            runJob(cmd);
        } 
        else {
            console.log("didn't work",'Playing',playing,'Paused',paused);
        }
    }

    wordWrapped(){
        console.log("maybe help later!!");
    }

    /// to test this I guess there are some conditions to be solved
    isWrappedWord(layout,text){
        let result = true;
        // for each word check if it is in the same line
        var words = text.split(" ");
       words.forEach((word) => {
            layout.lines.forEach((line,j)=>{
                console.log('end',layout.lines[j].end,'start',layout.lines[j].start);
                if(layout.lines[j].end-layout.lines[j].start<word.length)
                    return false;
            })
		})
		return true;
        return result;
    }
    /// to bet tested this I guess there are some conditions to be solved

    validateLayout(layout,text,maxLines){ //// add another condition which is if the number of lines is bigger than the number of words
        var result = true;
        console.log('Comparing layout then max lines: ',layout.lines.length,maxLines);
        if(layout.lines.length > maxLines){
            console.log("get here for this reason not entering wrappedWord");
            return false;
        }
            
        else if(!this.isWrappedWord(layout,text))
            return false;
        return result;

    }
    init(){
        console.log('clean everything before you start again: delete documents,clean gcode');
        if(this.state.templateDocID !='')
            this.props.dispatch(selectDocument(this.state.templateDocID));
        if(this.state.textDocID !='')
            this.props.dispatch(selectDocument(this.state.textDocID));
        this.props.dispatch(selectDocuments(true));
        this.props.dispatch(removeDocumentSelected());
        this.props.dispatch(clearOperations());
    }
    changeFont(amount){
        console.log('amount',amount);
        if( amount>0 )
            console.log('Bigger Font');
        else 
            console.log('Smaller Font');
        this.updateFontChangeAmount(amount);
        console.log('chnage Font');

        this.textWrapping(); 
    }
    updateFontChangeAmount(amount){
        let fontchange = this.state.fontchange;
        console.log('before  fontChange',this.state.fontchange);

        this.setState({fontchange:fontchange+amount});
        console.log('new fontChange',this.state.fontchange);
	}
	getPosition(string, subString, index) {
		return string.split(subString, index).join(subString).length;
	}
	getDimension(output) {
		///<svg width="27.24" height="10.62" viewBox="0 0 27.24 10.62"
		// how to get the heıght and the width
		// divide by 3.7777
		//console.log('full output is ',output);
		let widthStart = this.getPosition(output, '"', 1);
		let widthFin = this.getPosition(output,'"',2);
		let width = output.slice(widthStart+1,widthFin)
		let heightStart = this.getPosition(output, '"', 3);
		let heightEnd = this.getPosition(output, '"', 4);
		let height = output.slice(heightStart + 1, heightEnd)

		console.log('width : ', width, 'height:', height);
		/// starting from n+6 until next '"'

		return [parseFloat(width),parseFloat(height)];
	}
    textWrapping(){  
        console.log(this.state);
        if(this.state.content == ''){
            alert('no text???');
            return;
        }
        console.log('Text Wrapping started directoin',this.state.direction);

        var that = this;
       // const toggleSelectDocument  = this.props.toggleSelectDocument ;
        const computeLayout = require('opentype-layout');
        let font = this.state.font;
        console.log('this.state.font',font);
        let text = this.state.content;
        var lines = text.split("\n");
        console.log('text: ',text,lines);
        let models = {};
        let fontSize;
        this.init();
        var mainsvgID = '';
        const release = captureConsole();
        const parser = new Parser({});
        const makerjs = require('makerjs');
		let layout;
        opentype.load(font, function (err, font) {//for arabic fonst we will see

            let activeTemplate = that.state.activeTemplate;
            console.log(font);
            let lineHeight = 1 * font.unitsPerEm;
            console.log('active Scale is : ',activeTemplate.scale);
			console.log('active template : ', activeTemplate);

			//let scale = activeTemplate.scale * (1 + that.state.fontchange * 0.1); //1 / font.unitsPerEm * fontSize0
			//usamaaaaaaaee fafsddafassssss
			
            /*if(fontChange != null)
				scale = scale * (1+fontChange);*/
			fontSize = font.unitsPerEm /150;
			let scale = 1 / font.unitsPerEm * fontSize; //1 / font.unitsPerEm * fontSize0
			let finalWidth = 100;// should be maxMM * 301 (which is point in mm) 5000
			//finalWidht depends on the font
			

            let layoutOptions = {
                "align":"center",
                lineHeight: lineHeight ,
				width: finalWidth/scale
            };
			console.log('Final Width: ', finalWidth);
			console.log('fontsize', that.state.fontSize);
			console.log('modified scale', scale);
			console.log('unitsPerEm : ', font.unitsPerEm);
			console.log('layout widht is ', finalWidth / scale);
            if(that.state.direction == 'RTL'){
                let wordModel ='';
                /*let wordModel = new makerjs.models.Text(font, text, fontSize);
                makerjs.model.addModel(models, wordModel); 
                //let testOutput = makerjs.exporter.toSVG(models);/*,{origin:[-70.95,0]}*/
                // console.log(testOutput);

                let wordWidths = [];
                let wordHeigths = [];
                let svgWords =[];

                let shiftX = 0;
                let shiftY = 0;
                let shifts = [shiftX,shiftY];
                let prevWordWidth =0;

                models= {};

                console.log('lines are : ',lines);
                svgWords =[];
                lines.forEach((line,i) => {
                    wordModel  = new makerjs.models.Text(font,line,fontSize);
                    makerjs.model.addModel(models, wordModel); 
                    svgWords[i] = makerjs.exporter.toSVG(models/*,{origin:[-70.95,0]}*/);
                    models= {};
                    let parts = svgWords[i].split("\"");
                    wordWidths[i] = parseFloat(parts[1]);
                    wordHeigths[i] = parseFloat(parts[3]);
                    //console.log('width',wordWidths[i],'line',line,svgWords[i]);
                });
                let maxWHeight = Math.max(...wordHeigths);
                console.log('widths',wordWidths,'heights',wordHeigths); 

                models= {};
                lines.forEach((line,i) => {
                    wordModel  = new makerjs.models.Text(font,line,fontSize,true);
                    let count = 0;
                    for(var c in wordModel.models)
                        count++;
                    console.log('count',count);
                    shiftY = shiftY +maxWHeight+3;
                    shiftX = that.state.activeTemplate.shiftX*9 - (wordWidths[i]/(2*3.78));
                    console.log('shiftX',shiftX,' wordWidths[i]', wordWidths[i]/(2*3.78),'activetempalte.shiftx',that.state.activeTemplate.shiftX);
                    for (let index = 0; index < count; index++) {
                        shifts = [wordModel.models[index].origin[0]+shiftX,wordModel.models[index].origin[1]-shiftY] ;
                        console.log('xShiftFinal',shifts);
                        wordModel.models[index].origin = [shifts[0],shifts[1]];
                        console.log('wordModel.models[index].origin',wordModel.models[index].origin);
                    }
                    var newWordModel = makerjs.model.moveRelative(wordModel,[10,10]);
                    makerjs.model.addModel(models, newWordModel); 
                });
                console.log('models',models);           
                prevWordWidth =0;

            }
			else {// LTR
				console.log("we are here 0");
				try {
					layout = computeLayout(font, text, layoutOptions);
				}
				catch(ex){
					console.log(ex);
				}
				console.log("we are here 1");
                console.log('Layout is like this: ',layout,'Layout options',layoutOptions);
                let result = that.validateLayout(layout,text,that.state.activeTemplate.maxLines);
				console.log("we are here 2");

                console.log('first layout evaluation result is ',result);
                
                while(!result)
                {
                    console.log("we get here!!!");
                    that.setState({
                        activeTemplate:activeTemplate
                    });
                    //font.unitsPerEm = font.unitsPerEm*0.85; // maybe we should cancel this or make it dynamic
                    console.log('new unitsPerEm : ',font.unitsPerEm);
					activeTemplate.fontSize = fontSize;
					fontSize = that.state.fontSize * 0.8; /// we should change font size
					that.setState({activeTemplate:activeTemplate});
					let scale = 1 / font.unitsPerEm * fontSize; //1 / font.unitsPerEm * fontSize0
					//finalWidth = activeTemplate.maxWidth * 230;

                    layoutOptions = { // depends on the situation we change the layout option
                    	"align":"center",
                        lineHeight: lineHeight ,
						width: finalWidth / scale
                    }
                    layout = computeLayout(font, text, layoutOptions);
                    if(layout.lines.length > 1)
                        activeTemplate.shiftY -= 2;
                    activeTemplate.shiftX -= 3;
                    console.log('new layout is ',layout);
                    result = that.validateLayout(layout,text,that.state.activeTemplate.maxLines);
				}
				

                layout.glyphs.forEach((glyph, i) => {
                    let character = makerjs.models.Text.glyphToModel(glyph.data, fontSize);
                    character.origin = makerjs.point.scale(glyph.position, scale);
                    makerjs.model.addModel(models, character, i);
                });
                
            }
            const moldShifts = [65,60];//[105,96];
            /// testlertestler testytyq
            try 
            {
				let output = makerjs.exporter.toSVG(models/*,{origin:[-70.95,0]}*/);
				let dims = that.getDimension(output);
				let mmDims = dims.map(n => n/3.777);
				//// get layout.lines, the  max value of them, get the number of letters in that line
				const max = layout.lines.reduce(
					(prev,current) => (prev.width > current.width) ? prev : current
				);
				const letterCount = max.end - max.start;
				const letterWidth = mmDims[0]/letterCount;
				console.log("Letters:  ",  dims, max,mmDims,'letter count:',letterCount,'letter width',letterWidth,layout);

                parser.parse(output).then((tags) => {
                    let captures = release(true);
                    let warns = captures.filter(i => i.method == 'warn')
                    let errors = captures.filter(i => i.method == 'errors')
                    
                    if (warns.length)
						CommandHistory.dir("The file has minor issues. Please check document is correctly loaded!", warns, 2);
						
                    if (errors.length)
						CommandHistory.dir("The file has serious issues. If you think is not your fault, report to LW dev team attaching the file.", errors, 3);
						
                    let file = {
                        name:"file.svg",
                        type: "image/svg+xml"
                    };

                    const modifiers = {};
                    imageTagPromise(tags).then((tags) => {
                        that.props.dispatch(loadDocument(file, { parser, tags }, modifiers));
                        that.props.dispatch(selectDocuments(true));
                        let documents = that.props.documents.map(() => that.props.documents[0].id).slice(0, 1);
                        console.log('the docs are : ',that.props.documents);
                        mainsvgID = documents;
                        console.log('DocId is:',documents);
                        that.setState({textDocID:documents});
                        that.props.dispatch(addOperation({ documents}));
                        // we need two shiftX shifty one for Arabic and one for English
                        that.props.dispatch(transform2dSelectedDocuments([1, 0, 0, 1, activeTemplate.shiftX, activeTemplate.shiftY]));

                        let globalState = GlobalStore().getState(); 
                        console.log('that.propts',that.props.op,'state',globalState);
                        that.props.dispatch(setOperationAttrs({ expanded: false }, that.props.operations[0].id)) 
                    }).then( () => {
                        file = {
                            name:"template.svg",
                            type: "image/svg+xml"
                        };
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
                                imageTagPromise(tags).then((tags) => { // this is for chocolate template  
                                	let templateDoc = that.props.documents.map(() => that.props.documents[1].id).slice(0, 1);
                                    that.setState({templateDocID:templateDoc});
                                    console.log('templateDoc:',templateDoc);
                                    that.props.dispatch(selectDocument(templateDoc));
                                    that.props.dispatch(loadDocument(file, { parser, tags }, modifiers));
                                    that.props.dispatch(selectDocument(that.state.textDocID));
                                    that.props.dispatch(selectDocuments(true));
                                    console.log("applied twice");
                                    that.props.dispatch(transform2dSelectedDocuments([1, 0, 0, 1, moldShifts[0], moldShifts[1]]));

                                    console.log('text doc id ',that.state.textDocID,'template doc id ',that.state.templateDocID,templateDoc);
                                    that.props.dispatch(selectDocuments(false));
                                    that.props.dispatch(selectDocument(that.state.textDocID));
                                    that.props.dispatch(toggleSelectDocument(that.state.textDocID));
                                    that.props.dispatch(toggleSelectDocument(templateDoc[0]));
                                }).then( () => {

                                })
                            });
                        });
                    })
                });
            }
            catch(Exception)
            {
                console.log(Exception);
            }
        })
    }

    handleSubmission(e) {
        e.preventDefault();
        var text = e.target.content.value;
        this.setState({
            content:text
        });
    }
    render() {
        const { selectedOption } = this.state;

        //console.log('cam.js this.props: ',this.props);
        let { settings, documents, operations, currentOperation, toggleDocumentExpanded, loadDocument,bounds } = this.props;
        let validator = ValidateSettings(false)
        let valid = validator.passes();
        let someSelected=documents.some((i)=>(i.selected));

        const Fonts = [
            { value: 'GreatVibes-Regular.otf', label: 'Great Vibes' },
            { value: 'Almarai-Bold.ttf', label: 'Arslan' },
            { value: 'chocolatePristina.ttf', label: 'Pristina' },
            { value: 'ITCKRIST.TTF', label: 'ITCKRIST' },
            { value: 'TrajanPro-Bold.otf', label: 'TrajanPro-B' },
            { value: 'Bevan.ttf', label: 'Bevan' },
        ];



        return (
            <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div className="panel panel-danger" style={{ marginBottom: 0 }}>
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
                <div className="Resizer horizontal" style={{ marginTop: '2px', marginBottom: '2px' }}></div>
                <div className="panel panel-info" style={{ marginBottom: 3 }}>
                    <div className="panel-heading" style={{ padding: 2 }}>
                        <table style={{ width: 100 + '%' }}>
                            <tbody>
                                <tr>
                                    <td>
                                        <label>Documents {Info(<small>Tip:  Hold <kbd>Ctrl</kbd> to click multiple documents</small>)}</label>
                                    </td>
                                    <td style={{display:"flex", justifyContent: "flex-end" }}>
                                        <FileField style={{   position: 'relative', cursor: 'pointer' }} onChange={ loadDocument} accept={DOCUMENT_FILETYPES}>
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
                <Splitter style={{ flexShrink: 0 }} split="horizontal" initialSize={100} resizerStyle={{ marginTop: 2, marginBottom: 2 }} splitterId="cam-documents">
                    <div style={{height:"100%", display:"flex", flexDirection:"column"}} >
                        <div style={{ overflowY: 'auto', flexGrow:1 }}><Documents documents={documents} filter={this.state.filter} toggleExpanded={toggleDocumentExpanded} /></div>
                        {documents.length ? <ButtonToolbar bsSize="xsmall" bsStyle="default">
                            
                            <ButtonGroup>
                                <Button  bsStyle="info" bsSize="xsmall" onClick={()=>{this.props.dispatch(selectDocuments(true))}} title="Select all"><Icon name="cubes"/></Button>
                                <Button  bsStyle="default" bsSize="xsmall" onClick={()=>{this.props.dispatch(selectDocuments(false))}} title="Select none"><Icon name="cubes"/></Button>
                            </ButtonGroup>
                            <Button  bsStyle="warning" bsSize="xsmall" disabled={!someSelected} onClick={()=>{this.props.dispatch(cloneDocumentSelected())}} title="Clone selected"><Icon name="copy"/></Button>
                            <Button  bsStyle="danger" bsSize="xsmall" disabled={!someSelected} onClick={()=>{this.props.dispatch(removeDocumentSelected())}} title="Remove selected"><Icon name="trash"/></Button>
                            <ButtonGroup>
                                <ColorPicker to="rgba" icon="pencil" bsSize="xsmall" disabled={!someSelected} onClick={v=>this.props.dispatch(colorDocumentSelected({strokeColor:v||[0,0,0,1]}))}/>
                                <ColorPicker to="rgba" icon="paint-brush" bsSize="xsmall" disabled={!someSelected} onClick={v=>this.props.dispatch(colorDocumentSelected({fillColor:v||[0,0,0,0]}))}/>
                            </ButtonGroup>
                            <SearchButton bsStyle="primary" bsSize="xsmall" search={this.state.filter} onSearch={filter=>{this.setState({filter})}} placement="bottom"><Icon name="search"/></SearchButton>
                            </ButtonToolbar>:undefined}
                    </div>
                </Splitter>
                <Alert bsStyle="success" style={{ padding: "4px", marginBottom: 7 }}>
                    <table style={{ width: 100 + '%' }}>
                        <tbody>
                            <tr>
                                <th>GCODE</th>
                                <td style={{ width: "80%", textAlign: "right" }}>{!this.props.gcoding.enable ? (
                                    <ButtonToolbar style={{ float: "right" }}>
                                        <button title="Generate G-Code from Operations below" className={"btn btn-xs btn-attention " + (this.props.dirty ? 'btn-warning' : 'btn-primary')} disabled={!valid || this.props.gcoding.enable} onClick={(e) => this.generateGcode(e)}><i className="fa fa-fw fa-industry" />&nbsp;Generate</button>
                                        <ButtonGroup>
                                            <button title="View generated G-Code. Please disable popup blockers" className="btn btn-info btn-xs" disabled={!valid || this.props.gcoding.enable} onClick={this.props.viewGcode}><i className="fa fa-eye" /></button>
                                            <button title="Export G-code to File" className="btn btn-success btn-xs" disabled={!valid || this.props.gcoding.enable} onClick={this.props.saveGcode}><i className="fa fa-floppy-o" /></button>
                                            <FileField onChange={this.props.loadGcode} disabled={!valid || this.props.gcoding.enable} accept=".gcode,.gc,.nc">
                                                <button title="Load G-Code from File" className="btn btn-danger btn-xs" disabled={!valid || this.props.gcoding.enable} ><i className="fa fa-folder-open" /></button>
                                            </FileField>
                                        </ButtonGroup>
                                        <button title="Clear" className="btn btn-warning btn-xs" disabled={!valid || this.props.gcoding.enable} onClick={this.props.clearGcode}><i className="fa fa-trash" /></button>
                                    </ButtonToolbar>) : <GcodeProgress onStop={(e) => this.stopGcode()} />}</td>
                            </tr>
                        </tbody>
                    </table>
                </Alert>
                <OperationDiagram {...{ operations, currentOperation }} />
                <Operations 
                    style={{ flexGrow: 2, display: "flex", flexDirection: "column" }  } 
                    /*genGCode = {this./*generateGcode*//*docuementAdded}*/
                 />

            <h3>String to Image</h3>
        
            <Form onSubmit={ this.handleSubmission }>

             Font: 
            <Select value={this.state.font}  onChange={this.handleFontChange} defaultValue= {this.state.font} options={Fonts} >
                <option value="GreatVibes">Great Vibes</option>
                <option value="Arslan">ArslanFont</option>
                <option value="chocolatePristina">Pristina</option>
                <option value="ITCKRIST">ITCKRIST</option>
                <option value="TrajanPro-Bold">TrajanPro-B</option>
                <option value="Bevan">Eevan</option>
            </Select>
            <br />
            Text: <br />

        </Form>
        <FormGroup>
            <div>
                <div className="form-check" >
                    <label htmlFor ="Oval"> 
                        <input 
                        type="radio"  name="template" 
                        value="Oval"                         
                        onChange={this.handleTemplateChange}
                        className="form-check-input" 
                        />
                        Oval
                    </label>
                    <img src="oval.jpg" height="40" width="80" />
                </div>
                <div className="form-check">
                    <label htmlFor ="Rectangle"> 
                        <input type="radio"  name="template" value="Rectangle"                         
                        onChange={this.handleTemplateChange} 
                        className="form-check-input"
                    />
                    Rectangle
                    </label>
                    <img src="rectangle.jpg" height="40" width="80" />
                </div>    
                <div className="form-check">
                    <label htmlFor ="Square"> 
                        <input type="radio"  name="template" value="Square"
                        onChange={this.handleTemplateChange} 
                        className="form-check-input" 
                        />
                        Square
                    </label>
                    <img src="rectangle.jpg" height="50" width="50" />
                </div>                             
            </div>
        </FormGroup>
        Line Main:<textarea 
					name="content" id="content" ref="content" maxLength="23" 
            onKeyDown={this.handleKeyDown} onChange={ this.handleChange } onKeyPress={this.checkRTL} defaultValue ={this.state.content}
        />
        {/*<label style={{visibility:  'hidden' }} >Line 2:</label>
        <input type="text" 
            name="line2"  id="line2" ref = "line2"   maxLength="25"    
            style={{visibility:  'hidden' }}          
            onKeyDown={this.handleKeyDown} onChange={ this.handleChange } onKeyPress={this.checkRTL} defaultValue ={this.state.content}
        />
        <label style={{visibility:  'hidden' }} >Line 3:</label>
        <input type="text" 
            name="line3"  id="line3" ref = "line3"   maxLength="25"     
            style={{visibility:  'hidden' }}          
            onKeyDown={this.handleKeyDown} onChange={ this.handleChange } onKeyPress={this.checkRTL} defaultValue ={this.state.content}
        />*/}
        <div>
            {/*<Button name="checkWrapping" onClick={ this.wordWrapped} bsSize="small" bsStyle="primary">Check</Button>
            <Button name="runJob" onClick={ this.runJob} bsSize="small" bsStyle="warning" >R</Button>*/}
            <Button name="textWrapping" onClick={ this.textWrapping}  bsStyle="danger" >Generate</Button>
            <Button name="fontplus" onClick={() => { this.changeFont(1) }}   bsSize="small" bsStyle="primary">Bigger ++</Button>                    
            <Button name="fontminus" onClick={ () => {this.changeFont(-1)}} bsSize="small" bsStyle="primary">Smaller --</Button>                    
        </div>

        </div>);
    }
};

Cam = connect(
    state => ({
        myText:state.content,
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
            }, !e.shiftKey) },
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
                        console.log('result of loading svg file',reader.result);
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