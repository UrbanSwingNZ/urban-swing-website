/**
 * variable-manager.js
 * Manage template variables (add, edit, delete)
 */

import { state } from '../core/state.js';
import { showSuccess, showError } from './notifications.js';

/* global db, firebase */

let editingVariableIndex = null;
let cachedVariableStructures = null;

/**
 * Build a variable structure from a Firestore document
 * @param {string} name - Variable name
 * @param {Object} doc - Firestore document data
 * @param {string} description - Human-readable description
 * @returns {Object} Variable structure with properties
 */
function buildStructureFromDocument(name, doc, description) {
    return {
        description: description,
        properties: Object.keys(doc)
            .filter(key => !key.startsWith('_'))
            .sort()
            .map(key => ({
                name: key,
                description: formatFieldDescription(key),
                example: formatExampleValue(doc[key])
            }))
    };
}

/**
 * Get variable structures dynamically from actual data
 */
async function getVariableStructures() {
    // Return cached if available
    if (cachedVariableStructures) {
        return cachedVariableStructures;
    }
    
    const structures = {};
    
    try {
        // Fetch a sample student document to introspect structure
        const studentsSnapshot = await db.collection('students')
            .limit(1)
            .get();
        
        if (!studentsSnapshot.empty) {
            const studentDoc = studentsSnapshot.docs[0].data();
            
            // Skip deleted students - get another one if this is deleted
            if (studentDoc.deleted === true && studentsSnapshot.docs.length > 1) {
                // Try to find a non-deleted one from multiple docs
                const moreStudents = await db.collection('students').limit(5).get();
                const nonDeletedStudent = moreStudents.docs.find(doc => doc.data().deleted !== true);
                if (nonDeletedStudent) {
                    const validStudentDoc = nonDeletedStudent.data();
                    structures.student = buildStructureFromDocument('student', validStudentDoc, 'Student object with all details');
                }
            } else if (studentDoc.deleted !== true) {
                structures.student = buildStructureFromDocument('student', studentDoc, 'Student object with all details');
            }
        }
        
        // Fetch a sample user document
        const usersSnapshot = await db.collection('users').limit(1).get();
        if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0].data();
            structures.user = buildStructureFromDocument('user', userDoc, 'User account object');
        }
        
        // Error is synthetic, keep it hardcoded
        structures.error = {
            description: 'Error object with message',
            properties: [
                { name: 'message', description: 'Error message text', example: 'Pricing configuration not found' }
            ]
        };
        
        console.log('Built structures for:', Object.keys(structures));
        
        // Cache the results
        cachedVariableStructures = structures;
        return structures;
        
    } catch (error) {
        console.error('Error fetching variable structures:', error);
        // Fallback to minimal structure
        return {
            error: {
                description: 'Error object with message',
                properties: [{ name: 'message', description: 'Error message text', example: 'Error message' }]
            }
        };
    }
}

/**
 * Format field name into human-readable description
 */
function formatFieldDescription(fieldName) {
    // Convert camelCase to Title Case
    const result = fieldName.replace(/([A-Z])/g, ' $1');
    const final = result.charAt(0).toUpperCase() + result.slice(1);
    
    // Add context for common fields
    const descriptions = {
        'firstName': "Student's first name",
        'lastName': "Student's last name",
        'email': "Student's email address",
        'phoneNumber': "Student's phone number",
        'pronouns': "Student's pronouns",
        'emailConsent': 'Has consented to emails',
        'adminNotes': 'Admin notes about student',
        'createdAt': 'Date created',
        'updatedAt': 'Date last updated',
        'studentId': 'Unique student identifier',
        'role': 'User role (student, admin, etc.)',
        'userId': 'Associated user ID'
    };
    
    return descriptions[fieldName] || final;
}

/**
 * Format example value based on type
 */
function formatExampleValue(value) {
    if (value === null || value === undefined) return '';
    
    const type = typeof value;
    
    if (type === 'string') return value.substring(0, 50);
    if (type === 'number') return String(value);
    if (type === 'boolean') return String(value);
    if (value instanceof Date || (value && value.toDate)) return 'Date/time';
    if (Array.isArray(value)) return 'Array';
    if (type === 'object') return 'Object';
    
    return String(value).substring(0, 50);
}

/**
 * Render variables table in Settings tab
 */
export function renderVariablesTable() {
    const tbody = document.getElementById('variables-table-body');
    const table = document.getElementById('variables-table');
    const noDataMessage = document.getElementById('no-variables-message');
    
    if (!state.currentTemplate || !state.currentTemplate.variables || state.currentTemplate.variables.length === 0) {
        table.style.display = 'none';
        noDataMessage.style.display = 'block';
        return;
    }
    
    table.style.display = 'table';
    noDataMessage.style.display = 'none';
    
    let html = '';
    state.currentTemplate.variables.forEach((variable, index) => {
        html += `
            <tr>
                <td>\${${variable.name}}</td>
                <td>${variable.description || ''}</td>
                <td>${variable.example || '-'}</td>
                <td>
                    <div class="variable-actions">
                        <button class="btn-icon" onclick="editVariable(${index})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="deleteVariable(${index})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

/**
 * Show add variable modal
 */
export function showAddVariableModal() {
    editingVariableIndex = null;
    
    document.getElementById('variable-modal-title').innerHTML = 
        '<i class="fas fa-plus"></i> Add Variable';
    
    // Populate dropdown with all unique variables from all templates
    populateVariableDropdown();
    
    document.getElementById('variable-select').value = '';
    document.getElementById('variable-name').value = '';
    document.getElementById('variable-description').value = '';
    document.getElementById('variable-example').value = '';
    
    // Hide name field initially (show when user selects "Create New")
    document.getElementById('variable-name-group').style.display = 'none';
    document.getElementById('variable-name').removeAttribute('required');
    
    document.getElementById('variable-modal').style.display = 'flex';
}

/**
 * Populate variable dropdown with all variables from all templates
 */
function populateVariableDropdown() {
    const select = document.getElementById('variable-select');
    
    // Keep first two options (placeholder and "Create New")
    const options = `
        <option value="">-- Select existing or create new --</option>
        <option value="_new_">+ Create New Variable</option>
    `;
    
    // Collect all unique variables from all templates
    const allVariables = new Map(); // Use Map to store unique variables with their metadata
    
    if (state.templates && state.templates.length > 0) {
        state.templates.forEach(template => {
            if (template.variables && Array.isArray(template.variables) && template.variables.length > 0) {
                template.variables.forEach(variable => {
                    // Validate variable has a name
                    if (!variable || !variable.name) return;
                    
                    // Only add if not already in current template
                    const currentVars = state.currentTemplate?.variables || [];
                    const existsInCurrent = currentVars.some(v => v && v.name === variable.name);
                    
                    if (!existsInCurrent && !allVariables.has(variable.name)) {
                        allVariables.set(variable.name, variable);
                    }
                });
            }
        });
    }
    
    // Convert to sorted array
    const sortedVariables = Array.from(allVariables.values())
        .filter(v => v && v.name) // Extra safety filter
        .sort((a, b) => a.name.localeCompare(b.name));
    
    // Build options HTML
    let variableOptions = '';
    sortedVariables.forEach(variable => {
        variableOptions += `<option value="${variable.name}" 
            data-description="${escapeHtml(variable.description || '')}" 
            data-example="${escapeHtml(variable.example || '')}">
            ${variable.name} - ${variable.description || 'No description'}
        </option>`;
    });
    
    select.innerHTML = options + variableOptions;
}

/**
 * Escape HTML for safe attribute values
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Handle variable selection from dropdown
 */
export async function handleVariableSelection() {
    const select = document.getElementById('variable-select');
    const selectedValue = select.value;
    const nameGroup = document.getElementById('variable-name-group');
    const nameInput = document.getElementById('variable-name');
    const descriptionInput = document.getElementById('variable-description');
    const exampleInput = document.getElementById('variable-example');
    const propertiesPreview = document.getElementById('variable-properties-preview');
    
    if (selectedValue === '_new_') {
        // Show name field for creating new variable
        nameGroup.style.display = 'block';
        nameInput.setAttribute('required', 'required');
        nameInput.value = '';
        nameInput.removeAttribute('readonly');
        descriptionInput.value = '';
        exampleInput.value = '';
        propertiesPreview.style.display = 'none';
        nameInput.focus();
    } else if (selectedValue) {
        // Selected existing variable - populate fields
        const selectedOption = select.options[select.selectedIndex];
        const description = selectedOption.dataset.description || '';
        const example = selectedOption.dataset.example || '';
        
        nameGroup.style.display = 'block';
        nameInput.value = selectedValue;
        nameInput.setAttribute('readonly', 'readonly');
        nameInput.removeAttribute('required');
        descriptionInput.value = description;
        exampleInput.value = example;
        
        // Show properties if this is a known object type
        await showVariableProperties(selectedValue);
        
        descriptionInput.focus();
    } else {
        // Nothing selected
        nameGroup.style.display = 'none';
        nameInput.removeAttribute('required');
        nameInput.value = '';
        descriptionInput.value = '';
        exampleInput.value = '';
        propertiesPreview.style.display = 'none';
    }
}

/**
 * Show properties for object-type variables
 */
async function showVariableProperties(variableName) {
    const propertiesPreview = document.getElementById('variable-properties-preview');
    const propertiesList = document.getElementById('properties-list');
    
    try {
        // Get current variable structures
        const VARIABLE_STRUCTURES = await getVariableStructures();
        
        console.log('Available structures:', Object.keys(VARIABLE_STRUCTURES));
        console.log(`Looking for structure for: ${variableName}`);
        
        // Check if this variable has a known structure
        const structure = VARIABLE_STRUCTURES[variableName];
        
        if (!structure || !structure.properties || structure.properties.length === 0) {
            console.log(`No structure found for ${variableName}`);
            propertiesPreview.style.display = 'none';
            return;
        }
        
        console.log(`Found ${structure.properties.length} properties for ${variableName}`);
        
        // Build properties HTML
        let html = '';
        structure.properties.forEach(prop => {
            html += `
                <div class="property-item">
                    <div class="property-name">\${${variableName}.${prop.name}}</div>
                    <div class="property-description">${prop.description}</div>
                    ${prop.example ? `<div class="property-example">Example: ${prop.example}</div>` : ''}
                </div>
            `;
        });
        
        propertiesList.innerHTML = html;
        propertiesPreview.style.display = 'block';
    } catch (error) {
        console.error('Error showing variable properties:', error);
        propertiesPreview.style.display = 'none';
    }
}

/**
 * Show edit variable modal
 */
export async function showEditVariableModal(index) {
    editingVariableIndex = index;
    const variable = state.currentTemplate.variables[index];
    
    document.getElementById('variable-modal-title').innerHTML = 
        '<i class="fas fa-edit"></i> Edit Variable';
    
    // Hide dropdown when editing
    document.getElementById('variable-select').parentElement.style.display = 'none';
    
    // Show name field (readonly for editing)
    document.getElementById('variable-name-group').style.display = 'block';
    document.getElementById('variable-name').value = variable.name;
    document.getElementById('variable-name').setAttribute('readonly', 'readonly');
    document.getElementById('variable-name').setAttribute('required', 'required');
    document.getElementById('variable-description').value = variable.description || '';
    document.getElementById('variable-example').value = variable.example || '';
    
    // Show properties if this is a known object type (even if not stored yet)
    await showVariableProperties(variable.name);
    
    document.getElementById('variable-modal').style.display = 'flex';
}

/**
 * Close variable modal
 */
export function closeVariableModal() {
    document.getElementById('variable-modal').style.display = 'none';
    
    // Reset form
    document.getElementById('variable-select').parentElement.style.display = 'block';
    document.getElementById('variable-name').removeAttribute('readonly');
    
    editingVariableIndex = null;
}

/**
 * Save variable (add or update)
 */
export async function saveVariable(event) {
    event.preventDefault();
    
    if (!state.currentTemplate) return;
    
    const nameInput = document.getElementById('variable-name');
    const name = nameInput.value.trim();
    const description = document.getElementById('variable-description').value.trim();
    const example = document.getElementById('variable-example').value.trim();
    
    // Validation
    if (!name) {
        showError('Variable name is required');
        return;
    }
    
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$\.]*$/.test(name)) {
        showError('Variable name must be a valid identifier (letters, numbers, underscore, dollar sign, dots for nested properties)');
        return;
    }
    
    if (!description) {
        showError('Description is required');
        return;
    }
    
    try {
        // Get current variables or initialize empty array
        const variables = state.currentTemplate.variables || [];
        
        // Check for duplicate name (only if adding or changing name)
        if (editingVariableIndex === null || variables[editingVariableIndex].name !== name) {
            const duplicate = variables.find(v => v.name === name);
            if (duplicate) {
                showError(`Variable "${name}" already exists`);
                return;
            }
        }
        
        const newVariable = {
            name,
            description,
            example: example || ''
        };
        
        // Add properties if this is a known object type
        const VARIABLE_STRUCTURES = await getVariableStructures();
        const structure = VARIABLE_STRUCTURES[name];
        if (structure && structure.properties) {
            newVariable.properties = structure.properties;
        }
        
        // Update or add variable
        if (editingVariableIndex !== null) {
            variables[editingVariableIndex] = newVariable;
        } else {
            variables.push(newVariable);
        }
        
        // Save to Firestore
        await db.collection('emailTemplates').doc(state.currentTemplate.id).update({
            variables: variables,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: state.currentUser.email
        });
        
        // Update local state
        state.currentTemplate.variables = variables;
        
        // Re-render
        renderVariablesTable();
        
        // Re-render variables list in HTML tab
        const { renderVariablesList } = await import('./template-editor.js');
        renderVariablesList();
        
        closeVariableModal();
        showSuccess(editingVariableIndex !== null ? 'Variable updated' : 'Variable added');
        
    } catch (error) {
        console.error('Error saving variable:', error);
        showError('Failed to save variable: ' + error.message);
    }
}

/**
 * Delete variable
 */
export async function deleteVariable(index) {
    if (!state.currentTemplate) return;
    
    const variable = state.currentTemplate.variables[index];
    
    if (!confirm(`Are you sure you want to delete the variable "${variable.name}"?\n\nThis will not remove it from your template content - you'll need to manually remove any references.`)) {
        return;
    }
    
    try {
        const variables = [...state.currentTemplate.variables];
        variables.splice(index, 1);
        
        // Save to Firestore
        await db.collection('emailTemplates').doc(state.currentTemplate.id).update({
            variables: variables,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: state.currentUser.email
        });
        
        // Update local state
        state.currentTemplate.variables = variables;
        
        // Re-render
        renderVariablesTable();
        
        // Re-render variables list in HTML tab
        const { renderVariablesList } = await import('./template-editor.js');
        renderVariablesList();
        
        showSuccess('Variable deleted');
        
    } catch (error) {
        console.error('Error deleting variable:', error);
        showError('Failed to delete variable: ' + error.message);
    }
}

// Make functions available globally for onclick handlers
window.editVariable = showEditVariableModal;
window.deleteVariable = deleteVariable;
