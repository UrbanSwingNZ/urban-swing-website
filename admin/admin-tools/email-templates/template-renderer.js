/**
 * template-renderer.js
 * Template rendering utility for email templates
 * Handles ${variable} replacement and expression evaluation
 */

/**
 * Renders a template string by replacing variables and evaluating expressions
 * @param {string} template - Template string with ${...} placeholders
 * @param {Object} variables - Object containing variable values
 * @returns {string} Rendered template
 */
function renderTemplate(template, variables) {
    if (!template) return '';
    
    try {
        // Replace ${...} with actual values
        // This regex matches ${anything} including nested expressions
        return template.replace(/\$\{([^}]+)\}/g, (match, expression) => {
            try {
                // Create a safe evaluation context with only the provided variables
                // Using Function constructor for expression evaluation
                const func = new Function(...Object.keys(variables), `return ${expression}`);
                const result = func(...Object.values(variables));
                
                // Handle undefined/null results
                if (result === undefined || result === null) {
                    return '';
                }
                
                // Convert result to string
                return String(result);
            } catch (error) {
                console.warn(`Error evaluating expression: ${expression}`, error);
                // Return the original placeholder if evaluation fails
                return match;
            }
        });
    } catch (error) {
        console.error('Error rendering template:', error);
        return template;
    }
}

/**
 * Extract all variable names from a template
 * @param {string} template - Template string
 * @returns {Array<string>} Array of unique variable names
 */
function extractVariables(template) {
    if (!template) return [];
    
    const variables = new Set();
    const regex = /\$\{([^}]+)\}/g;
    let match;
    
    while ((match = regex.exec(template)) !== null) {
        const expression = match[1].trim();
        
        // Extract variable names from the expression
        // This regex matches JavaScript identifiers
        const identifiers = expression.match(/[a-zA-Z_$][a-zA-Z0-9_$]*/g);
        
        if (identifiers) {
            identifiers.forEach(identifier => {
                // Exclude JavaScript keywords and operators
                if (!isJavaScriptKeyword(identifier)) {
                    variables.add(identifier);
                }
            });
        }
    }
    
    return Array.from(variables);
}

/**
 * Check if a string is a JavaScript keyword or common operator
 * @param {string} word - Word to check
 * @returns {boolean}
 */
function isJavaScriptKeyword(word) {
    const keywords = [
        'true', 'false', 'null', 'undefined', 'typeof', 'instanceof',
        'new', 'this', 'super', 'class', 'extends', 'return',
        'if', 'else', 'for', 'while', 'do', 'switch', 'case',
        'break', 'continue', 'function', 'var', 'let', 'const'
    ];
    return keywords.includes(word);
}

/**
 * Validate template syntax
 * @param {string} template - Template string to validate
 * @returns {Object} { valid: boolean, errors: Array<string> }
 */
function validateTemplate(template) {
    const errors = [];
    
    if (!template) {
        return { valid: true, errors: [] };
    }
    
    // Check for unmatched ${
    const openBraces = (template.match(/\$\{/g) || []).length;
    const closeBraces = (template.match(/\}/g) || []).length;
    
    if (openBraces > closeBraces) {
        errors.push('Unclosed template expression ${...}');
    }
    
    // Try to extract variables to check for syntax errors
    try {
        const regex = /\$\{([^}]+)\}/g;
        let match;
        
        while ((match = regex.exec(template)) !== null) {
            const expression = match[1].trim();
            
            // Check for empty expressions
            if (!expression) {
                errors.push('Empty template expression ${}');
                continue;
            }
            
            // Try to validate the expression syntax
            try {
                // Create a function with dummy variables to check syntax
                new Function('x', `return ${expression}`);
            } catch (error) {
                errors.push(`Invalid expression: ${expression}`);
            }
        }
    } catch (error) {
        errors.push(`Template parsing error: ${error.message}`);
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Get sample data for template preview
 * @param {string} templateId - Template ID
 * @returns {Object} Sample data object
 */
function getSampleData(templateId) {
    const commonData = {
        // Student data
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@example.com',
        phoneNumber: '021 123 4567',
        pronouns: 'she/her',
        
        // Pricing data
        casualRate: 20,
        studentRate: 15,
        fiveClassPrice: 90,
        tenClassPrice: 170,
        
        // Dates
        registeredAt: 'November 8, 2025 at 2:30 PM',
        setupDate: 'November 8, 2025',
        
        // Booleans
        hasUserAccount: true,
        emailConsent: true,
        
        // IDs
        studentId: 'ABC123DEF456',
        
        // Notes
        adminNotes: 'Referred by existing student. Interested in beginner classes.',
    };
    
    // Template-specific additions
    switch (templateId) {
        case 'admin-notification':
            return {
                ...commonData,
                student: {
                    firstName: commonData.firstName,
                    lastName: commonData.lastName,
                    email: commonData.email,
                    phoneNumber: commonData.phoneNumber,
                    pronouns: commonData.pronouns,
                    emailConsent: commonData.emailConsent,
                    adminNotes: commonData.adminNotes
                },
                studentId: commonData.studentId,
                registeredAt: commonData.registeredAt
            };
            
        case 'welcome-student':
            return {
                ...commonData,
                student: {
                    firstName: commonData.firstName
                }
            };
            
        case 'account-setup':
            return {
                ...commonData,
                student: {
                    firstName: commonData.firstName,
                    lastName: commonData.lastName
                },
                user: {
                    email: commonData.email
                },
                setupDate: commonData.setupDate
            };
            
        case 'error-notification':
            return {
                ...commonData,
                student: {
                    firstName: commonData.firstName,
                    lastName: commonData.lastName,
                    email: commonData.email
                },
                studentId: commonData.studentId,
                error: {
                    message: 'Pricing configuration not found. Please ensure all casual rates are active.'
                }
            };
            
        default:
            return commonData;
    }
}

/**
 * Sanitize HTML to prevent XSS in preview
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML
 */
function sanitizeHTML(html) {
    // For preview purposes, we'll allow most HTML but remove potentially dangerous attributes
    // In production, consider using a library like DOMPurify
    const dangerous = ['onclick', 'onerror', 'onload', 'onmouseover'];
    let sanitized = html;
    
    dangerous.forEach(attr => {
        const regex = new RegExp(`${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
        sanitized = sanitized.replace(regex, '');
    });
    
    return sanitized;
}

/**
 * Convert template variables object to array format for UI
 * @param {Array<Object>} variables - Array of variable objects from template
 * @returns {Array<Object>} Formatted variable array
 */
function formatVariablesForUI(variables) {
    if (!Array.isArray(variables)) return [];
    
    return variables.map(v => ({
        name: v.name || '',
        description: v.description || '',
        required: v.required !== false,
        example: v.example || ''
    }));
}

/**
 * Create a variables object from form inputs
 * @param {HTMLElement} container - Container element with variable inputs
 * @returns {Object} Variables object
 */
function getVariablesFromForm(container) {
    const variables = {};
    const inputs = container.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
        const name = input.dataset.variable;
        if (name) {
            let value = input.value;
            
            // Try to convert to appropriate type
            if (value === 'true') value = true;
            else if (value === 'false') value = false;
            else if (!isNaN(value) && value !== '') value = Number(value);
            
            variables[name] = value;
        }
    });
    
    return variables;
}
