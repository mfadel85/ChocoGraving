
export const GCODE_INITIALSTATE = {
    gcoding: { enable: false, percent: 0},
    content: '',
    dirty:false,
    text:'',
    chocolateDepth:15,
    chocolateFont:'Almarai-Bold.ttf'
}

export function gcode(state = GCODE_INITIALSTATE, action) {

    if (action.type.match(/^(DOCUMENT|OPERATION)_/gi)) {
        if (action.type=='DOCUMENT_SET_ATTRS'){
            if (!action.payload.attrs.hasOwnProperty('visible') && !action.payload.attrs.hasOwnProperty('selected'))
                return Object.assign(state, {dirty: true })
        }
        if (action.type=='OPERATION_SET_ATTRS'){
            if (!action.payload.attrs.hasOwnProperty('expanded') && !action.payload.attrs.hasOwnProperty('_docs_visible')){
                return Object.assign(state, {dirty: true })
            }
        }
    }
    if (action.type === 'GCODE_SET')
        return { ...state, dirty: false , content: action.payload };
    if (action.type === 'SET_FORM_DATA')
        return { ...state,  text: action.payload };
    if (action.type === 'SET_DEPTH')
        return { ...state, chocolateDepth: action.payload };        
    if (action.type === 'SET_FONT')
        return { ...state, chocolateFont: action.payload };          
    else if (action.type === 'GCODE_GENERATION')
        return { ...state, gcoding: action.payload }
    else if (action.type== 'WORKSPACE_RESET') 
        return { ...state, dirty:false, content:''}
    else
        return state;
}
