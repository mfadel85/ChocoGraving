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
import { ovalTemplate } from '../data/oval.svg';

import Parser from '../lib/lw.svg-parser/parser';
import DxfParser from 'dxf-parser';
import React from 'react'
import ReactDOM from 'react-dom'
import { connect } from 'react-redux';
import { renderToStaticMarkup } from 'react-dom/server';

import { loadDocument, setDocumentAttrs,transform2dSelectedDocuments, cloneDocumentSelected, selectDocuments,colorDocumentSelected,removeDocumentSelected } from '../actions/document';
import { runCommand, runJob, pauseJob, resumeJob, abortJob, clearAlarm, setZero, gotoZero, setPosition, home, probe, checkSize, laserTest, jog, jogTo, feedOverride, spindleOverride, resetMachine } from './com.js';
import { removeOperation, moveOperation, setCurrentOperation, operationRemoveDocument, setOperationAttrs, clearOperations,addOperation, operationAddDocuments  } from '../actions/operation';

import { setGcode, generatingGcode } from '../actions/gcode';
import { resetWorkspace } from '../actions/laserweb';
import { Documents,selectedDocuments } from './document';
import { withDocumentCache } from './document-cache'
import { GetBounds, withGetBounds } from './get-bounds.js';
import { Operations, Error } from './operation';
import { OperationDiagram } from './operation-diagram';
import Splitter from './splitter';
import { getGcode } from '../lib/cam-gcode';
import { sendAsFile, appendExt, openDataWindow, captureConsole } from '../lib/helpers';
import { ValidateSettings } from '../reducers/settings';
import { ApplicationSnapshotToolbar } from './settings';
import { GlobalStore } from '../index'

import { Button, ButtonToolbar, ButtonGroup, ProgressBar, Alert,Form,FormControl,FormGroup,FormLabel,FormCheck,InputGroup ,InputGroupPrepend,InputGroupRadio  } from 'react-bootstrap'
import Icon from './font-awesome'
import { alert, prompt, confirm } from './laserweb'

import CommandHistory from './command-history'
import { FileField, Info, ColorPicker, SearchButton } from './forms'

import { promisedImage, imageTagPromise } from './image-filters';
import { cssNumber } from 'jquery';
import { documents } from '../reducers/document';
import { convertOutlineToThickLines } from '../draw-commands/thick-lines';
const opentype = require('opentype.js');
const computeLayout = require('opentype-layout-improved');


var playing = false;
var paused = false;
export const DOCUMENT_FILETYPES = '.png,.jpg,.jpeg,.bmp,.gcode,.g,.svg,.dxf,.tap,.gc,.nc'
let myText = '';
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
            font:"font1",
            width:0,
            lineHeight:0,
            fontSize : 25,
            activeTemplate:'',
            marginX:0,
            marginY:0
        }
        this.handleChange = this.handleChange.bind(this);
        this.handleFontChange = this.handleFontChange.bind(this);
        this.handleSubmission = this.handleSubmission.bind(this);
        this.generateGcode = this.generateGcode.bind(this);
        this.docuementAdded = this.docuementAdded.bind(this);
        this.loadMinE = this.loadMinE.bind(this);
        this.textWrapping = this.textWrapping.bind(this);
        this.runJob = this.runJob.bind(this);
        this.wordWrapped = this.wordWrapped.bind(this);
    }
    isEnglish(charCode){
        return (charCode >= 97 && charCode <= 122) 
               || (charCode>=65 && charCode<=90);
     }
     
    isPersian(key){
         var p = /^[\u0600-\u06FF\s]+$/;    
         return p.test(key) && key!=' ';
     }
    handleInput(e){
            console.log(e.Target);
            if (this.isEnglish(e.Target.charCode))
              console.log('English');
            else if(this.isPersian(e.key))
              console.log('Arabic');
            else
              console.log('Others')
       
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
    handleChange (e)  {
        this.setState({ content: e.target.value });
        myText = e.target.value;
    }
    handleFontChange (e)  {
        this.setState({ font: e.target.value });
    }    
    generateGcode() {
        this.QE = window.generateGcode();
    }

    stopGcode(e) {
        if (this.QE) { this.QE.end(); }
    }
    docuementAdded() {
        console.log('Document Added');
    }
    shouldComponentUpdate(nextProps, nextState) {
        return (
            nextState.font !== this.state.font || /*nextState.fontSize !== this.state.fontSize || */ nextProps.documents !== this.props.documents ||
            nextProps.operations !== this.props.operations ||
            nextProps.currentOperation !== this.props.currentOperation ||
            nextProps.bounds !== this.props.bounds ||
            nextProps.gcode !== this.props.gcode ||    // Needed for saveGcode() to work
            nextProps.gcoding.percent !== this.props.gcoding.percent ||
            nextProps.gcoding.enable !== this.props.gcoding.enable ||
            nextState.filter !== this.state.filter
        );
    }

    generateSVG(text){
        e.preventDefault();
        var makerjs = require('makerjs');
        //console.log(e.target.content.value);
        let output;
        let that = this;

        setTimeout(() => {opentype.load('ABeeZee-Regular.ttf', function (err, font) {
            if (err) {
                console.log('couldnot load the font.!!');
            } else {       
                var textModel = new makerjs.models.Text(font, text, 100);
                output = makerjs.exporter.toSVG(textModel);
            }
            }); 
        }, 3000);
        return output;
    }
    runJob(){
        let globalState = GlobalStore().getState(); 
        console.log('globalState',globalState);
        // you can't rely on globalstate
        /*if(!globalState.com.serverConnected || !globalState.com.machineConnected){
            console.log('server or machine is not connected');
            alert('server is not server or machine is not connected');
            return;
        }*/
            
        // check if machine is connected first
        if (!playing && !paused /*&& !globalState.com.paused && !globalState.com.playing*/) {
            //console.log(this.props);
            let cmd = this.props.gcode;
            //console.log(cmd);
            console.log('runJob(' + cmd.length + ')');
            playing = true;

            /*this.setState({
                isPlaying: true,
                liveJogging: {
                    ... this.state.liveJogging, disabled: true, hasHomed: false
                }
            })*/

            runJob(cmd);
        } 
    }

    wordWrapped(e){
        function validateWrapping(text,layout){
            var words = text.split(' ');
            if(layout.lines.length > words.length){
                console.log('to be modified: layout lines bigger');
                return 0;
            }
            words.forEach(function(word,i){
                if(layout.lines[i].length < word.length){
                    console.log('to be modified one word in two lines');
                    return 0;
                }  
            })
        }
        var t0 = performance.now();
        var words = myText.split(" ");
        var fontSize;
        var circleModel = {
            maxHeight:28,
            maxWidth:28,
            maxLines:3,
            maxWordsAr:4,
            maxWordsEn:3,
            depth:11// mm
        };
        if(words.length > circleModel.maxWordsEn)
        {
            alert(' Only max '+circleModel.maxWordsEn+' words is allowed.');
            return;
        }
        console.log('Checking stared:');
        var font = 'GreatVibes-Regular.otf';
        switch(this.state.font){
            case 'GreatVibes':
                font = 'GreatVibes-Regular.otf';
            break;
            case 'chocolatePristina':
                font = 'chocolatePristina.ttf';
            break;
            case 'ITCKRIST':
                font = 'ITCKRIST.TTF';
            break;
            case 'TrajanPro-Bold':
                font = 'TrajanPro-Bold.otf';
            break;   
            case 'TrajanPro-Regular':
                font = 'TrajanPro-Regular.otf';
            break;                       
        }        
        const computeLayout = require('opentype-layout');
        var models2 = {};
        console.log('font is',font);
        opentype.load(font,function(err,font){
            console.log('ZA font',font);
            font.unitsPerEm = 50;
            var scale = 0.032695775;
            //var scale = 1 / font.unitsPerEm * fontSize; //0.012695775
            fontSize = scale * font.unitsPerEm;
            console.log('newFontSize',fontSize);
            var lineHeight = 1.1 * font.unitsPerEm;
            let finalWidth = circleModel.maxWidth*301;
            var x = finalWidth * scale;
            console.log('Units per EM ',font.unitsPerEm);
            console.log('finalWidth ',finalWidth);
            console.log('scale ',scale);
            console.log('x ',x)
            //let fontSize = finalWidth*font.unitsPerEm;
            var layoutOptions = {
                "align":"center",
                lineHeight: lineHeight ,
                width: finalWidth
            };
            var layout = computeLayout(font, myText, layoutOptions);
            var validationResult = validateWrapping(myText,layout);
            font.glyphs.glyphs.map(function(elem,i){
                font.glyphs.glyphs[i].advanceWidth *= 0.3; 
            })

            console.log('ZA layout',layout);
            /*layout.glyphs.forEach((glyph, i) => {
                var character = makerjs.models.Text.glyphToModel(glyph.data, fontSize);
                character.origin = makerjs.point.scale(glyph.position, scale);
                makerjs.model.addModel(models, character, i);
            });*/
        });
        var t1 = performance.now();
        console.log('exection time: ',t1-t0,'milli second');
    }

    textWrapping(e){    
        function validateWrapping(text,layout){
            var words = text.split(' ');
            if(layout.lines.length > words.length){
                console.log('to be modified: layout lines bigger');
                return 0;
            }
            /*words.forEach(function(word,i){// later to be fixed
                if(layout.lines[i].length < word.length){
                    console.log('to be modified one word in two lines');
                    return 0;
                }  
            })*/
        }
        var font = 'GreatVibes-Regular.otf';   
        var words = myText.split(" ");
        var fontSize;
        var chocoTemplates = require("../data/chocolateTemplates.json");
        //circleModel = chocoTemplates.templates[0];
        var circleModel = {
            maxHeight:28,
            maxWidth:28,
            maxLines:3,
            maxWordsAr:4,
            maxWordsEn:3
        };
        if(words.length > circleModel.maxWordsEn)
        {
            alert(' Only max '+circleModel.maxWordsEn+' words is allowed.');
            return;
        }
        console.log('clean everything before you start again: delete documents,clean gcode');
        this.props.dispatch(removeDocumentSelected());
        this.props.dispatch(clearOperations());
        var mainsvgID = '';
        var that = this;
        let { settings, documents, operations } = that.props;
        //if documents is not empty then cleant it dispatch remove documets
        console.log('Text Wrapping started');
        const release = captureConsole();
        const parser = new Parser({});
        var makerjs = require('makerjs');
        ////// test
        const file = {
            name:"file.svg",
            type: "image/svg+xml"
        };
        const modifiers = {};
        const computeLayout = require('opentype-layout');
        var models = {};
        opentype.load('GreatVibes-Regular.otf', function (err, font) {
            console.log(font);
            var lineHeight = 1.1 * font.unitsPerEm;
            var width = 115; 
            var scale = 0.018695775;        
            //scale = 0.009695775;
            fontSize = scale * font.unitsPerEm;
            console.log('fontsize',fontSize);
            var finalWidth =width / scale;// should be maxMM * 301 (which is point in mm)
            finalWidth = circleModel.maxWidth*301;
            var layoutOptions = {
                "align":"center",
                lineHeight: lineHeight ,
                width: finalWidth
            };

            var layout = computeLayout(font, myText, layoutOptions);

            if( layout.lines.length > circleModel.maxLines ){
                console.log('lines now: ',layout.lines.length,' circleModel.maxLines: ',circleModel.maxLines);
            }
            var validationResult = validateWrapping(myText,layout);
            if(!validationResult){
                for(let j =0;j<font.glyphs.glyphs.length;j++){
                    font.glyphs.glyphs[j].advanceWidth *= 0.5;
                }
                layout = computeLayout(font, myText, layoutOptions);
            }
                
                    
            var widthOperator = finalWidth * scale;
            console.log('widthOperator : ',widthOperator);
            layout.glyphs.forEach((glyph, i) => {
                var character = makerjs.models.Text.glyphToModel(glyph.data, fontSize);
                character.origin = makerjs.point.scale(glyph.position, scale);
                makerjs.model.addModel(models, character, i);
            });
            

            var output = makerjs.exporter.toSVG(models/*,{origin:[-70.95,0]}*/);
            parser.parse(output).then((tags) => {
                let captures = release(true);
                let warns = captures.filter(i => i.method == 'warn')
                let errors = captures.filter(i => i.method == 'errors')
                
                if (warns.length)
                    CommandHistory.dir("The file has minor issues. Please check document is correctly loaded!", warns, 2);
                if (errors.length)
                    CommandHistory.dir("The file has serious issues. If you think is not your fault, report to LW dev team attaching the file.", errors, 3);
                
                imageTagPromise(tags).then((tags) => {
                    //console.log('loadDocument: generatedID',generatedID);
                    that.props.dispatch(loadDocument(file, { parser, tags }, modifiers));
                    //console.log('!!!!* select document: dispatch :props:',that.props);
                    that.props.dispatch(selectDocuments(true));
                    let documents = that.props.documents.map(d => that.props.documents[0].id).slice(0, 1);
                    mainsvgID = documents;
                    console.log('DocId is:',documents);
                    that.props.dispatch(addOperation({ documents}));
                    that.props.dispatch(transform2dSelectedDocuments([1, 0, 0, 1, 12, 13]));
                    that.generateGcode(e);

                    let globalState = GlobalStore().getState(); 
                    console.log('that.propts',that.props.op,'state',globalState);
                    that.props.dispatch(setOperationAttrs({ expanded: false }, that.props.operations[0].id)) 
                }).then( () => {
                    // can we load the image file from the location
                })
            });
            
            fetch("../oval.svg")
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
                        that.props.dispatch(selectDocuments(mainsvgID));
                    }).then( () => {
                        // can we load the image file from the location
                    })
                });
            });
        })

    }
    loadMinE(e){
        console.log('clean everything before you start again: delete documents,clean gcode');
        this.props.dispatch(removeDocumentSelected());
        this.props.dispatch(clearOperations());
        let that = this;
        let { settings, documents, operations } = that.props;
        //if documents is not empty then cleant it dispatch remove documets
        console.log('1 you are gonna like it');
        const release = captureConsole();
        let parser = new Parser({});
        var makerjs = require('makerjs');
        //var text = state.myText;
        var text = myText;
        if(text == '')
            text = 'NoText';
        let output;
        let file = '';
        const modifiers = {};
        file = {
            name:"file.svg",
            type: "image/svg+xml"
        }
        var font = 'GreatVibes-Regular.otf';
        switch(this.state.font){
            case 'GreatVibes':
                font = 'GreatVibes-Regular.otf';
            break;
            case 'chocolatePristina':
                font = 'chocolatePristina.ttf';
            break;
            case 'ITCKRIST':
                font = 'ITCKRIST.TTF';
            break;
            case 'TrajanPro-Bold':
                font = 'TrajanPro-Bold.otf';
            break;   
            case 'TrajanPro-Regular':
                font = 'TrajanPro-Regular.otf';
            break;                       
        }
        setTimeout(() => {opentype.load(font, function (err, font) {
            if (err) {
                console.log('could not load the font.!!');
            } else {
        
                var textModel = new makerjs.models.Text(font, text, 120);
                output = makerjs.exporter.toSVG(textModel);
                //console.log("inside ");
                //console.log(output);
                parser.parse(output)
                .then((tags) => {
                    let captures = release(true);
                    let warns = captures.filter(i => i.method == 'warn')
                    let errors = captures.filter(i => i.method == 'errors')
                    
                    if (warns.length)
                        CommandHistory.dir("The file has minor issues. Please check document is correctly loaded!", warns, 2);
                    if (errors.length)
                        CommandHistory.dir("The file has serious issues. If you think is not your fault, report to LW dev team attaching the file.", errors, 3);
                    // not gonna be used
                    //console.log("params",file,parser,tags,modifiers,this.props);

                    imageTagPromise(tags).then((tags) => {
                        //console.log('loadDocument: generatedID',generatedID);
                        that.props.dispatch(loadDocument(file, { parser, tags }, modifiers));
                        //console.log('!!!!* select document: dispatch :props:',that.props);
                        that.props.dispatch(selectDocuments(true));
                        let documents = that.props.documents.map(d => that.props.documents[0].id).slice(0, 1);

                        console.log('DocId is:',documents);
                        that.props.dispatch(addOperation({ documents}));
                        console.log('Generateing GCode');
                        that.generateGcode(e);
                        console.log('done Generateing GCode');
                        let globalState = GlobalStore().getState(); 

                        console.log('that.propts',that.props.op,'state',globalState);
                        that.props.dispatch(setOperationAttrs({ expanded: false }, that.props.operations[0].id))

                        
                    }).then( () => {


                    })
                })
                .catch((e) => {
                    release(true);
                    CommandHistory.dir("The file has serious issues. If you think is not your fault, report to LW dev team attaching the file.", String(e), 3)
                    console.log(e)
                })
            }
            }); 
        }, 3000);     

    }
    handleSubmission(e) {
        e.preventDefault();
        var text = e.target.content.value;
        myText = text;
        console.log('started');
        this.setState({
            content:text
        });
    }
    render() {
        //console.log('cam.js this.props: ',this.props);
        let { settings, documents, operations, currentOperation, toggleDocumentExpanded, loadDocument,loadMine,loadMinE, bounds } = this.props;
        let validator = ValidateSettings(false)
        let valid = validator.passes();
        let someSelected=documents.some((i)=>(i.selected));
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
                                <Button  bsStyle="info" bsSize="xsmall" onClick={e=>{this.props.dispatch(selectDocuments(true))}} title="Select all"><Icon name="cubes"/></Button>
                                <Button  bsStyle="default" bsSize="xsmall" onClick={e=>{this.props.dispatch(selectDocuments(false))}} title="Select none"><Icon name="cubes"/></Button>
                            </ButtonGroup>
                            <Button  bsStyle="warning" bsSize="xsmall" disabled={!someSelected} onClick={e=>{this.props.dispatch(cloneDocumentSelected())}} title="Clone selected"><Icon name="copy"/></Button>
                            <Button  bsStyle="danger" bsSize="xsmall" disabled={!someSelected} onClick={e=>{this.props.dispatch(removeDocumentSelected())}} title="Remove selected"><Icon name="trash"/></Button>
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
                                    </ButtonToolbar>) : <GcodeProgress onStop={(e) => this.stopGcode(e)} />}</td>
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
            <select value={this.state.font} onChange={this.handleFontChange}>
                <option value="GreatVibes">Great Vibes</option>
                <option value="chocolatePristina">Pristina</option>
                <option value="ITCKRIST">ITCKRIST</option>
                <option value="TrajanPro-Bold">TrajanPro-B</option>
                <option value="TrajanPro-Regular">TrajanPro-R</option>
            </select><br />
                Text: <br />
                <textarea name="content"  id="content" ref = "content" /*onKeyDown={this.handleInput}*/ onChange={ this.handleChange } ></textarea><br />
                <div id ="render-text">
                
                </div>
            </Form>
            <button name="sendSVG" onClick={ this.loadMinE}>Generate Image</button>
            <button name="runJob" onClick={ this.runJob}>Run</button>
            <button name="textWrapping" onClick={ this.textWrapping}>Text Wrap</button>
            <button name="checkWrapping" onClick={ this.wordWrapped}>Check</button>
            
            <div >
                <input type="radio" id="Oval" name="template" value="Oval"></input>
                <label for="Oval">Oval</label><img src="oval.jpg" height="40" width="80" /><br></br>
                <input type="radio" id="Oval" name="template" value="Oval"></input>
                <label for="Rectangle">Rectangle</label><img src="rectangle.jpg" height="40" width="80" ></img><br></br>
                <input type="radio" id="Square" name="template" value="Square"></input>
                <label for="Square">Square</label><img src="oval.jpg" height="40" width="80" ></img><br></br>
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
        //loadMinE: this.loadMinE,
        loadMine:(e, modifiers = {})   => {
            let reader = new FileReader;
            //reader.onload = () => {
                console.log('1 you are gonna like it');
                const release = captureConsole()

                let parser = new Parser({});
                var makerjs = require('makerjs');
                var text = myText;
                if(text == '')
                    text = 'NoText';
                let output;
                let file = '';
                file = {
                    name:"file.svg",
                    type: "image/svg+xml"
                }
                console.log('text is : ',text);
                setTimeout(() => {opentype.load('ABeeZee-Regular.ttf', function (err, font) {
                    if (err) {
                        console.log('could not load the font.!!');
                    } else {
                
                        var textModel = new makerjs.models.Text(font, text, 100);
                        output = makerjs.exporter.toSVG(textModel);
                        //console.log("inside ");
                        //console.log(output);
                        parser.parse(output)
                        .then((tags) => {
                            let captures = release(true);
                            let warns = captures.filter(i => i.method == 'warn')
                            let errors = captures.filter(i => i.method == 'errors')
                            if (warns.length)
                                CommandHistory.dir("The file has minor issues. Please check document is correctly loaded!", warns, 2);
                            if (errors.length)
                                CommandHistory.dir("The file has serious issues. If you think is not your fault, report to LW dev team attaching the file.", errors, 3);
                            // not gonna be used
                            const generatedID = "c298057b-6925-47d5-bc62-bb564b8c9dba";

                            imageTagPromise(tags).then((tags) => {
                                //console.log('loadDocument: generatedID',generatedID);
                                dispatch(loadDocument(file, { parser, tags }, modifiers));
                                console.log('select document: dispatch modifiers',modifiers);
                                dispatch(selectDocuments(true));
                                //get documents
                                
                                console.log('this',this);
                                // I need to access documetns to dispatch it
                                //let documents = this.props.documents;
                                //dispatch(addOperation(generatedID));
                            })
                        })
                        .catch((e) => {
                            release(true);
                            CommandHistory.dir("The file has serious issues. If you think is not your fault, report to LW dev team attaching the file.", String(e), 3)
                            console.error(e)
                        })
                    }
                    }); 
                }, 3000);                  

        },
        loadDocument: (e, modifiers = {}) => {
            // TODO: report errors
            for (let file of e.target.files) {
                let reader = new FileReader;
                if (file.name.substr(-4) === '.svg') {
                    reader.onload = () => {
                        const release = captureConsole()

                        //console.log('loadDocument: construct Parser');
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
                                    let generatedID;
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
                    //console.log('loadDocument: readAsText');
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
