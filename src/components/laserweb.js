/**
 * LaserWeb main module (layout).
 * - Create the main layout.
 * - Set initial state.
 * @module
 */

// Styles/Fonts
import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'font-awesome/css/font-awesome.min.css'
import 'react-select/dist/react-select.css';
import '../styles/index.css'
import '../styles/resizer.css';
import 'bootstrap-range-input/dist/css/bootstrap-range-input.min.css'

import ReactDOM from 'react-dom'

// React/Redux
import React from 'react'
import { connect } from 'react-redux'

// Main components
import Workspace from './workspace'



import Cam from './cam'


import { AllowCapture } from './capture'
import { DocumentCacheHolder } from './document-cache'

import { keyboardUndoAction } from '../actions/laserweb';

import { keyboardLogger } from './keyboard';

import { fireMacroById } from '../actions/macros'

import { GlobalStore } from '../index'

import { VideoCapture } from '../lib/video-capture'

import { DrawCommands } from '../draw-commands'

export const vex = require('vex-js/src/vex.js')
try { vex.registerPlugin(require('vex-dialog/src/vex.dialog.js')) } catch (e) { }
vex.defaultOptions.className = 'vex-theme-default'
import 'vex-js/dist/css/vex.css';
import 'vex-js/dist/css/vex-theme-default.css';

import { version } from '../reducers/settings'


/**
 * LaserWeb main component (layout).
 * - Create the main layout.
 *
 * @extends module:react~React~Component
 * @param {Object} props Component properties.
 */

export const confirm = (message, callback) => {
    vex.dialog.confirm({ message, callback })
}

export const prompt = (message, placeholder, callback, skip) => {
    if (skip) return callback(placeholder);
    vex.dialog.open({
        message,
        input: `<input name="prompt" type="text" placeholder="${placeholder}" value="${placeholder}"  />`,
        buttons: [
            $.extend({}, vex.dialog.buttons.YES, { text: 'Ok' }),
            $.extend({}, vex.dialog.buttons.NO, { text: 'Cancel' })
        ],
        callback: function (data) {
            if (data===false) {
                callback(null)
            } else {
                callback(data.prompt || "")
            }
        }
    })
}

export const alert = (unsafeMessage) => {
    vex.dialog.alert({ unsafeMessage })
}

const updateTitle=()=>{
    document.title = `Choco Grave Simple`;
}

class LaserWeb extends React.Component {

    componentWillReceiveProps(nextProps) {
        updateTitle();
    }

    shouldComponentUpdate(nextProps, nextState) {
        return nextProps.documents !== this.props.documents;
    }

    componentWillMount() {
        try {
            let canvas = document.createElement('canvas');
            let gl = canvas.getContext('webgl', { alpha: true, depth: true, antialias: true, preserveDrawingBuffer: true });
            if (!gl)
                throw "canvas.getContext('webgl', {...}) returned " + gl;
            let drawCommands = new DrawCommands(gl);
            drawCommands.destroy();
            this.glOk = true;
        } catch (e) {
            console.error(e);
            return;
        }
    }

    componentDidMount() {
        updateTitle();
        if (this.glOk) 
            this.setupKeybindings();
    }

    setupKeybindings(){
            keyboardLogger.bind(['command + z', 'ctrl + z'], function (e) {
                this.props.handleUndo(e);
            }.bind(this));

            Object.entries(this.props.macros).filter(entry=>{
                    let [label, macro] = entry;
                    return macro.keybinding && macro.keybinding.length
                }).map(entry=>{
                    let [label, macro] = entry;
                    return macro.keybinding
                }).forEach((key)=>{
                    keyboardLogger.bind(key, function (e) { this.props.handleMacro(e, key, this.props.macros) }.bind(this))
                });
    }

    setupVideoCapture()
    {
        if (!window.videoCapture) {
            const onNextFrame = (callback) => { setTimeout(() => { window.requestAnimationFrame(callback) }, 0) }
            onNextFrame(() => {
                window.videoCapture = new VideoCapture()
                window.videoCapture.scan(this.props.settings.toolVideoDevice, this.props.settings.toolVideoResolution, (obj) => { this.props.handleVideoStream(this.props.settings.toolVideoDevice, obj) })
            })
        }
    }


    render() {

        if (!this.glOk) {
            return (
                <h1>OpenGL won't start. This app can't run without it.</h1>
            );
        }

        return (
            <AllowCapture style={{ height: '100%' }}>
                <DocumentCacheHolder style={{ width: '100%' }}  documents={this.props.documents}>
                    <div style={{ display: 'flex', flexDirection: 'row', height: '100%', backgroundColor:"#332C26" }}>
                        <Cam id="cam" title="Files" icon="pencil-square-o" style={{ flexGrow: 0, flexShrink: 0, backgroundColor:"#443B34"}} />
                        <Workspace  style={{ flexGrow: 1, position: "relative" }} />
                    </div>
                </DocumentCacheHolder>
            </AllowCapture>
        )
    }
}

const mapStateToProps = (state) => {
    return {
        macros: state.settings.macros,
        visible: state.panes.visible,
        documents: state.documents,
        settings: state.settings,
    }
}

const mapDispatchToProps = (dispatch) => {
    return {
        dispatch,
        handleUndo: evt => {
            evt.preventDefault();
            dispatch(keyboardUndoAction(evt))
        },
        handleMacro: (evt, key, macros) => {
            let macroAction = fireMacroById(key, macros)
            if (macroAction) {
                evt.preventDefault();
                dispatch(macroAction)
            }
        },
        handleVideoStream: (deviceId, props) => {
            if (props === false) dispatch({ type: "SETTINGS_SET_ATTRS", payload: { attrs: { toolVideoDevice: null } } })
        }

    }
}

// Exports
export { LaserWeb }
export default connect(mapStateToProps, mapDispatchToProps)(LaserWeb)
