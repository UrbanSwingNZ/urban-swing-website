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
            'removeformat | link image | code | help',
        content_style: 'body { font-family: Arial, sans-serif; font-size: 14px; }',
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
            editor.on('init', function() {
                setVisualEditor(editor);
            });
            editor.on('change keyup', function() {
                setHasUnsavedChanges(true);
                updateSaveButton();
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
    const doc = state.htmlEditor.getDoc();
    const cursor = doc.getCursor();
    doc.replaceRange(`\${${variableName}}`, cursor);
    state.htmlEditor.focus();
}
