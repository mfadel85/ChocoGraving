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

import Parser from '../lib/lw.svg-parser/parser';
import DxfParser from 'dxf-parser';
import React from 'react'
import ReactDOM from 'react-dom'
import { connect } from 'react-redux';
import { renderToStaticMarkup } from 'react-dom/server';

import { loadDocument, setDocumentAttrs, cloneDocumentSelected, selectDocuments,colorDocumentSelected,removeDocumentSelected } from '../actions/document';
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

import { Button, ButtonToolbar, ButtonGroup, ProgressBar, Alert } from 'react-bootstrap'
import Icon from './font-awesome'
import { alert, prompt, confirm } from './laserweb'

import CommandHistory from './command-history'
import { FileField, Info, ColorPicker, SearchButton } from './forms'

import { promisedImage, imageTagPromise } from './image-filters';
import { cssNumber } from 'jquery';
import { documents } from '../reducers/document';
import { convertOutlineToThickLines } from '../draw-commands/thick-lines';
//import { computeLayout } from 'opentype-layout';
const opentype = require('opentype.js');
const computeLayout = require('opentype-layout-improved');


var playing = false;
var paused = false;

export const DOCUMENT_FILETYPES = '.png,.jpg,.jpeg,.bmp,.gcode,.g,.svg,.dxf,.tap,.gc,.nc'
let myText = '';


let __interval;

class Creator extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            filter:null,
            content:"",
            svg:"",
            font:"font1",
            width:0,
            lineHeight:0,
            fontSize : 25
        }
        this.handleChange = this.handleChange.bind(this);
        this.handleFontChange = this.handleFontChange.bind(this);
        this.handleSubmission = this.handleSubmission.bind(this);
        this.generateGcode = this.generateGcode.bind(this);
        this.docuementAdded = this.docuementAdded.bind(this);
        this.textWrapping = this.textWrapping.bind(this);
        this.runJob = this.runJob.bind(this);
        this.wordWrapped = this.wordWrapped.bind(this);
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
    runJob(){
        let globalState = GlobalStore().getState(); 
        console.log('globalState',globalState);    
        console.log('playing',playing,'paused',paused);
        if (!playing && !paused ) {
            let cmd = this.props.gcode;
            console.log('runJob(' + cmd.length + ')');
            playing = true;
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
            var scale = 0.012695775;
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
            var scale = 0.048695775;        
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
            console.log('origlayoutOptions ',layoutOptions);
            console.log('line Height',lineHeight);
            console.log('scale',scale);
            console.log('finalWidth',finalWidth);

            var layout = computeLayout(font, myText, layoutOptions);
            console.log('layout',layout);
            console.log('ZA layout lines',layout.lines);

            if( layout.lines.length > circleModel.maxLines ){
                console.log('lines now: ',layout.lines.length,' circleModel.maxLines: ',circleModel.maxLines);
            }
            var validationResult = validateWrapping(myText,layout);
            if(!validationResult){
                for(let j =0;j<font.glyphs.glyphs.length;j++){
                    font.glyphs.glyphs[j].advanceWidth *= 0.5;
                }
                console.log('newfont',font);   
                layout = computeLayout(font, myText, layoutOptions);
                console.log('new layout',layout);
            }
                
             console.log('newfont',font);   
                    
            var widthOperator = finalWidth * scale;
            console.log('widthOperator : ',widthOperator);
            layout.glyphs.forEach((glyph, i) => {
                var character = makerjs.models.Text.glyphToModel(glyph.data, fontSize);
                character.origin = makerjs.point.scale(glyph.position, scale);
                makerjs.model.addModel(models, character, i);
            });
            
            console.log('modesl',models);
            var output = makerjs.exporter.toSVG(models);
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
        })
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
        let { settings, documents, operations, currentOperation, toggleDocumentExpanded, loadDocument,loadMine,loadMinE, bounds } = this.props;
        let validator = ValidateSettings(false)
        let valid = validator.passes();
        let someSelected=documents.some((i)=>(i.selected));
        return(
            <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <h3>String to Image</h3>
        
                <form onSubmit={ this.handleSubmission }>

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
                </form>
                <button name="sendSVG" onClick={ this.loadMinE}>Generate Image</button>
                <button name="runJob" onClick={ this.runJob}>Run</button>
                <button name="textWrapping" onClick={ this.textWrapping}>Text Wrap</button>
                <button name="checkWrapping" onClick={ this.wordWrapped}>Check</button> 
            </div>
        )
    }
    
};
Creator = connect(
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
        loadDocument: (e, modifiers = {}) => {
            // TODO: report errors
            for (let file of e.target.files) {
                let reader = new FileReader;
                if (file.name.substr(-4) === '.svg') {
                    reader.onload = () => {
                        const release = captureConsole()
                        let parser = new Parser({});
                        parser.parse(reader.result)
                            .then((tags) => {
                                let captures = release(true);
                                let warns = captures.filter(i => i.method == 'warn')
                                let errors = captures.filter(i => i.method == 'errors')
                                if (warns.length)
                                    CommandHistory.dir("The file has minor issues. Please check document is correctly loaded!", warns, 2)
                                if (errors.length)
                                    CommandHistory.dir("The file has serious issues. If you think is not your fault, report to LW dev team attaching the file.", errors, 3)
                                imageTagPromise(tags).then((tags) => {
                                    console.log('loadDocument: dispatch');
                                    let generatedID;
                                    dispatch(loadDocument(file, { parser, tags }, modifiers));
                                })
                            })
                            .catch((e) => {
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
    })
)(Creator);
Creator = withDocumentCache(withGetBounds(Creator));

export default Creator;