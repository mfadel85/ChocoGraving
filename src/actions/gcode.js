export function setGcode(gcode) {
    return { type: 'GCODE_SET', payload: gcode };
}

export function generatingGcode(enable, percent=0) {
    return { type: 'GCODE_GENERATION', payload: {enable, percent: percent!==undefined ? percent : 0}};
}

export function saveModels(models) {
    return { type: 'SAVE_MODELS', payload: models };
}