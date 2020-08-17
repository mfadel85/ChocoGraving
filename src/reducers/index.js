import { undoCombineReducers, shouldSaveUndo } from './undo'

import { camera, zoomArea } from './camera'
import { documents, documentsLoad } from './document'
import { gcode } from './gcode'
import { operations, currentOperation, operationsAddDocuments, fixupOperations } from './operation'
import panes from './panes'
import { settings } from './settings'
import { splitters } from './splitters'
import { workspace } from './workspace'

import { machineProfiles } from './machine-profiles'
import { materialDatabase } from './material-database'
import { com } from './com'

import omit from 'object.omit';
import { deepMerge } from '../lib/helpers'

const combined = undoCombineReducers({ camera, documents, operations, currentOperation, gcode, panes, settings, splitters, workspace, machineProfiles, materialDatabase, com }, {}, shouldSaveUndo);

export default function reducer(state, action) {
    //console.log("the action of the reducer is ",action);
    //console.log("state before ",state);
    
    switch (action.type) {
        case 'CAMERA_ZOOM_AREA':
            return { ...state, camera: zoomArea(state.camera, state.settings, state.workspace, action) };
        case 'DOCUMENT_REMOVE':
        case "DOCUMENT_REMOVE_SELECTED":
            state = combined(state, action);
            return { ...state, operations: fixupOperations(state.operations, state.documents) };
        case 'DOCUMENT_LOAD':
            {
                //console.log('documentsLoad is being called');
                //console.log(state.settings);
                // we could add action.generatedID
                return { ...state, documents: documentsLoad(state.documents, state.settings, action) };
            }
            
        case 'OPERATION_ADD_DOCUMENTS':
            console.log('operation add, OPERATION_ADD_DOCUMENTS');
            state = combined(state, action);
            return { ...state, operations: operationsAddDocuments(state.operations, state.documents, action) };
        case "SNAPSHOT_UPLOAD":
            let newState = omit(action.payload.snapshot, ["history"]);
                newState = Object.assign(newState, { gcode: { ...state.gcode, dirty: true } });
                newState = Object.assign({}, state, deepMerge(action.getState(), newState));
            return reducer(newState, { type: 'LOADED', payload: newState });
        default:
           // console.log(" Action here is: ",action.type);
            //console.log('state now is ',state);
            const combinedState = combined(state, action)
            //console.log("state after ",state);

            return combinedState;
    }
}
