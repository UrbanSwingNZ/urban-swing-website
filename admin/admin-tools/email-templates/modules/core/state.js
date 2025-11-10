/**
 * state.js
 * Global state management for Email Templates Tool
 */

export const state = {
    currentUser: null,
    currentTemplate: null,
    htmlEditor: null,
    visualEditor: null,
    templates: [],
    hasUnsavedChanges: false,
    currentEditorMode: 'visual' // 'visual' or 'code'
};

export function setCurrentUser(user) {
    state.currentUser = user;
}

export function setCurrentTemplate(template) {
    state.currentTemplate = template;
}

export function setHtmlEditor(editor) {
    state.htmlEditor = editor;
}

export function setVisualEditor(editor) {
    state.visualEditor = editor;
}

export function setTemplates(templates) {
    state.templates = templates;
}

export function setHasUnsavedChanges(value) {
    state.hasUnsavedChanges = value;
}

export function setCurrentEditorMode(mode) {
    state.currentEditorMode = mode;
}
