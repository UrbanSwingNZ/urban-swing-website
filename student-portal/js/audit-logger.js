/**
 * Audit Logger
 * Handles audit logging for student profile changes
 */

/**
 * Get current date/time in NZ timezone formatted as DD/MM/YYYY
 */
function getNZDate() {
    const date = new Date();
    // Convert to NZ timezone
    const nzDate = new Date(date.toLocaleString('en-US', { timeZone: 'Pacific/Auckland' }));
    
    const day = String(nzDate.getDate()).padStart(2, '0');
    const month = String(nzDate.getMonth() + 1).padStart(2, '0');
    const year = nzDate.getFullYear();
    
    return `${day}/${month}/${year}`;
}

/**
 * Generate audit log entries for changed fields
 * @param {Object} oldData - Original data before changes
 * @param {Object} newData - New data after changes
 * @param {boolean} isAdmin - Whether the change was made by an admin
 * @returns {Array} Array of audit log entry strings
 */
function generateAuditLog(oldData, newData, isAdmin = false) {
    const changes = [];
    const dateStr = getNZDate();
    const updatedBy = isAdmin ? 'Admin' : 'Student';
    
    // Field labels for better readability
    const fieldLabels = {
        firstName: 'first name',
        lastName: 'last name',
        email: 'email',
        phoneNumber: 'phone number',
        pronouns: 'pronouns',
        emailConsent: 'email consent'
    };
    
    // Check each field for changes
    for (const field in fieldLabels) {
        const oldValue = oldData[field] || '';
        const newValue = newData[field] || '';
        
        // Handle boolean values specially
        if (typeof oldValue === 'boolean' || typeof newValue === 'boolean') {
            if (oldValue !== newValue) {
                changes.push(`[${dateStr}]: ${updatedBy} updated ${fieldLabels[field]} from ${oldValue ? 'Yes' : 'No'} to ${newValue ? 'Yes' : 'No'}`);
            }
        } else {
            // Handle string values
            if (oldValue !== newValue) {
                const oldDisplay = oldValue || '(empty)';
                const newDisplay = newValue || '(empty)';
                changes.push(`[${dateStr}]: ${updatedBy} updated ${fieldLabels[field]} from "${oldDisplay}" to "${newDisplay}"`);
            }
        }
    }
    
    return changes;
}

/**
 * Append audit entries to existing admin notes
 * @param {string} existingNotes - Current admin notes
 * @param {Array} auditEntries - Array of audit log entries to append
 * @returns {string} Updated admin notes with audit entries appended
 */
function appendAuditLog(existingNotes, auditEntries) {
    if (auditEntries.length === 0) {
        return existingNotes;
    }
    
    if (existingNotes) {
        // Add entries on new lines
        return existingNotes + '\n' + auditEntries.join('\n');
    } else {
        // First entry
        return auditEntries.join('\n');
    }
}
