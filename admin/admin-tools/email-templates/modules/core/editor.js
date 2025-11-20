/**
 * editor.js
 * CodeMirror and TinyMCE editor initialization and management
 */

import { state, setHtmlEditor, setVisualEditor, setHasUnsavedChanges, setCurrentEditorMode } from './state.js';
import { updateSaveButton } from '../ui/save-button.js';

/**
 * Initialize editors (CodeMirror and TinyMCE)
 */
export function initializeCodeMirror() {
    // Initialize CodeMirror for code editing
    const textarea = document.getElementById('html-editor');
    const htmlEditor = CodeMirror.fromTextArea(textarea, {
        mode: 'htmlmixed',
        theme: 'monokai',
        lineNumbers: true,
        lineWrapping: true,
        indentUnit: 2,
        tabSize: 2,
        autoCloseTags: true
    });
    
    // Track changes in CodeMirror
    htmlEditor.on('change', () => {
        setHasUnsavedChanges(true);
        updateSaveButton();
    });
    
    setHtmlEditor(htmlEditor);
    
    // Initialize TinyMCE for visual editing
    tinymce.init({
        selector: '#visual-editor',
        height: 600,
        menubar: false,
        plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'help', 'wordcount'
        ],
        toolbar: 'undo redo | blocks | ' +
            'bold italic forecolor backcolor | alignleft aligncenter ' +
            'alignright alignjustify | bullist numlist outdent indent | ' +
            'removeformat | link image | insertvariable | code | help',
        content_style: 'body { font-family: Arial, sans-serif; font-size: 14px; }' +
            '.template-variable { ' +
            'background: linear-gradient(135deg, #e3f2fd, #f3e5f5); ' +
            'color: #9a16f5; ' +
            'padding: 2px 8px; ' +
            'border-radius: 12px; ' +
            'font-family: "Courier New", monospace; ' +
            'font-weight: 600; ' +
            'font-size: 0.9em; ' +
            'border: 1px solid #ce93d8; ' +
            'display: inline-block; ' +
            'margin: 0 2px; ' +
            '}',
        // Custom content CSS for email preview
        content_css: false,
        // Allow all HTML tags and attributes for email templates
        valid_elements: '*[*]',
        extended_valid_elements: '*[*]',
        valid_children: '+body[style]',
        // Don't convert URLs or encode entities - keep raw HTML
        convert_urls: false,
        relative_urls: false,
        remove_script_host: false,
        entity_encoding: 'raw',
        // Don't cleanup or verify HTML
        verify_html: false,
        cleanup: false,
        // Keep template literals intact
        protect: [
            /\$\{[^}]+\}/g,  // Protect ${variableName} patterns
            /\`[^`]*\`/g      // Protect backtick strings
        ],
        // Setup callback
        setup: function(editor) {
            // Add custom "Insert Variable" button
            editor.ui.registry.addMenuButton('insertvariable', {
                text: 'Variable',
                icon: 'template',
                fetch: function(callback) {
                    // Get variables from current template
                    const variables = state.currentTemplate?.variables || [];
                    
                    if (variables.length === 0) {
                        callback([{
                            type: 'menuitem',
                            text: 'No variables defined',
                            enabled: false
                        }]);
                        return;
                    }
                    
                    const items = variables.map(variable => ({
                        type: 'menuitem',
                        text: `${variable.name} - ${variable.description}`,
                        onAction: function() {
                            insertVariableIntoTinyMCE(editor, variable.name);
                        }
                    }));
                    
                    callback(items);
                }
            });
            
            editor.on('init', function() {
                setVisualEditor(editor);
                // Wrap existing variables on load
                wrapExistingVariables(editor);
            });
            
            editor.on('change keyup', function() {
                setHasUnsavedChanges(true);
                updateSaveButton();
            });
            
            // Wrap variables after paste
            editor.on('paste', function() {
                setTimeout(() => wrapExistingVariables(editor), 100);
            });
            
            // Prevent TinyMCE from encoding special characters in template variables
            editor.on('BeforeSetContent', function(e) {
                // Don't let TinyMCE mess with our template syntax
                if (e.content) {
                    e.content = e.content.replace(/&lt;!--mce:protected[^>]+--&gt;/g, function(match) {
                        // Decode any protected content back to original
                        return match;
                    });
                }
            });
        }
    });
}

/**
 * Switch between visual and code editor modes
 */
export function switchEditorMode(mode) {
    // Sync content before switching
    if (state.currentEditorMode === 'visual' && state.visualEditor) {
        // Save visual editor content to code editor
        const visualContent = state.visualEditor.getContent();
        state.htmlEditor.setValue(visualContent);
    } else if (state.currentEditorMode === 'code' && state.visualEditor) {
        // Save code editor content to visual editor
        const codeContent = state.htmlEditor.getValue();
        state.visualEditor.setContent(codeContent);
    }
    
    // Update current mode
    setCurrentEditorMode(mode);
    
    // Update button states
    document.querySelectorAll('.editor-mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    // Show/hide appropriate editor
    const visualContainer = document.getElementById('visual-editor-container');
    const codeContainer = document.getElementById('code-editor-container');
    
    if (mode === 'visual') {
        visualContainer.style.display = 'block';
        codeContainer.style.display = 'none';
    } else {
        visualContainer.style.display = 'none';
        codeContainer.style.display = 'block';
        // Refresh CodeMirror display
        state.htmlEditor.refresh();
    }
}

/**
 * Insert variable into editor at cursor position
 */
export function insertVariable(variableName) {
    // Check which tab is active
    const htmlTab = document.querySelector('[data-tab="html"]');
    const textTab = document.querySelector('[data-tab="text"]');
    const isTextTabActive = textTab && textTab.classList.contains('active');
    
    if (isTextTabActive) {
        // Insert into text template textarea
        const textarea = document.getElementById('text-template');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const variableText = `\${${variableName}}`;
        
        // Insert at cursor position
        textarea.value = text.substring(0, start) + variableText + text.substring(end);
        
        // Set cursor position after the inserted variable
        const newCursorPos = start + variableText.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
        
        // Trigger input event to mark as changed
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (state.currentEditorMode === 'visual' && state.visualEditor) {
        insertVariableIntoTinyMCE(state.visualEditor, variableName);
    } else {
        // Insert into CodeMirror
        const doc = state.htmlEditor.getDoc();
        const cursor = doc.getCursor();
        doc.replaceRange(`\${${variableName}}`, cursor);
        state.htmlEditor.focus();
    }
}

/**
 * Insert variable into TinyMCE editor with styling
 */
function insertVariableIntoTinyMCE(editor, variableName) {
    const variableHtml = `<span class="template-variable" contenteditable="false">\${${variableName}}</span>&nbsp;`;
    editor.insertContent(variableHtml);
}

/**
 * Wrap existing ${variableName} text in TinyMCE with styled spans
 */
function wrapExistingVariables(editor) {
    let content = editor.getContent();
    
    // Find all ${variable} patterns that aren't already wrapped
    const regex = /(?!<span class="template-variable"[^>]*>)\$\{([a-zA-Z_$][a-zA-Z0-9_$\.]*)\}(?!<\/span>)/g;
    
    content = content.replace(regex, function(match, varName) {
        return `<span class="template-variable" contenteditable="false">\${${varName}}</span>`;
    });
    
    // Only update if content changed (prevents infinite loops)
    if (content !== editor.getContent()) {
        const bookmark = editor.selection.getBookmark();
        editor.setContent(content);
        editor.selection.moveToBookmark(bookmark);
    }
}
