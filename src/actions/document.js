import { setAttrs, add, addChild, remove } from '../actions/object'

export const setDocumentAttrs = setAttrs('document');
export const addDocument = add('document');
export const addDocumentChild = addChild('document');
export const removeDocument = remove('document');

export function selectDocument(id) {
    //console.log('selectDocument being called',id);
    return { type: 'DOCUMENT_SELECT', payload: { id } };
};

export function toggleSelectDocument(id) {
    //console.log('toggleSelectDocument being called',id);

    return { type: 'DOCUMENT_TOGGLE_SELECT', payload: { id } };
};

export function toggleVisibleDocument(id) {
    //console.log('toggleVisibleDocument being called',id);
    return { type: 'DOCUMENT_TOGGLE_VISIBLE', payload: { id } };
};

export function transform2dSelectedDocuments(transform2d) {
    console.log('transform2dSelectedDocuments being called',transform2d);

    return { type: 'DOCUMENT_TRANSFORM2D_SELECTED', payload: transform2d };
}

export function loadDocument(file, content, modifiers = {}, context = undefined) {
    //console.log('step 1 ');
    return { type: 'DOCUMENT_LOAD', payload: { file, content, context, modifiers } };
}

export function removeDocumentSelected() {
    return { type: 'DOCUMENT_REMOVE_SELECTED' };
}

export function cloneDocumentSelected() {
    return { type: 'DOCUMENT_CLONE_SELECTED' };
}

export function selectDocuments(meta){
    //console.log('0 select Document ',meta);
    return { type: 'DOCUMENT_SELECT_META', payload:{meta} };
}

export function colorDocumentSelected(color){
   // console.log('1 colorDocumentSelected Document ',color);

    return { type: 'DOCUMENT_COLOR_SELECTED', payload:{color} };
}