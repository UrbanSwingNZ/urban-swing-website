/**
 * DOM Utilities
 * Functions for DOM manipulation and security
 */

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML string
 * @example
 * escapeHtml('<script>alert("XSS")</script>') // Returns safe escaped string
 */
export function escapeHtml(text) {
    // Match behavior: some callers pass undefined/null, some expect it to work
    // Admin versions check for !text, student portal version doesn't
    // We'll use the safer admin behavior
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Create a DOM element with attributes and content
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Object containing element attributes
 * @param {string|Node|Node[]} content - Element content (text, single node, or array of nodes)
 * @returns {HTMLElement} Created element
 * @example
 * createElement('div', { class: 'container', id: 'main' }, 'Hello World')
 */
export function createElement(tag, attributes = {}, content = null) {
    const element = document.createElement(tag);
    
    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'class') {
            element.className = value;
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
        } else {
            element.setAttribute(key, value);
        }
    });
    
    // Set content
    if (content !== null) {
        if (typeof content === 'string') {
            element.textContent = content;
        } else if (Array.isArray(content)) {
            content.forEach(child => {
                if (child instanceof Node) {
                    element.appendChild(child);
                }
            });
        } else if (content instanceof Node) {
            element.appendChild(content);
        }
    }
    
    return element;
}
