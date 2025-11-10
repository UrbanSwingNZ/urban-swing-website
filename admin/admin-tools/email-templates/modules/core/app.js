/**
 * app.js
 * Application initialization
 */

import { showLoading } from '../ui/notifications.js';
import { loadTemplates } from '../firebase/template-operations.js';
import { initializeCodeMirror } from './editor.js';

/**
 * Initialize the application
 */
export async function initializeApp() {
    try {
        showLoading(true);
        
        // Load templates
        await loadTemplates();
        
        // Initialize CodeMirror
        initializeCodeMirror();
        
        showLoading(false);
    } catch (error) {
        console.error('Error initializing app:', error);
        const { showError } = await import('../ui/notifications.js');
        showError('Failed to load templates: ' + error.message);
        showLoading(false);
    }
}
