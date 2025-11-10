/**
 * student-operations.js
 * Firestore operations for students
 */

import { state } from '../core/state.js';
import { updatePreview } from '../ui/preview.js';
import { formatDate } from '../utils/format.js';

/* global db, getSampleData */

/**
 * Load students into preview dropdown
 */
export async function loadStudentsForPreview() {
    const select = document.getElementById('preview-student-select');
    
    try {
        // Fetch all students from Firestore (no orderBy to avoid index requirement)
        const snapshot = await db.collection('students').get();
        
        // Convert to array and sort in JavaScript
        const students = [];
        snapshot.forEach(doc => {
            students.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Sort by firstName, then lastName
        students.sort((a, b) => {
            const firstNameCompare = (a.firstName || '').localeCompare(b.firstName || '');
            if (firstNameCompare !== 0) return firstNameCompare;
            return (a.lastName || '').localeCompare(b.lastName || '');
        });
        
        let options = '';
        
        students.forEach(student => {
            const name = `${student.firstName} ${student.lastName}`;
            const email = student.email || '';
            options += `<option value="${student.id}">${name}${email ? ' - ' + email : ''}</option>`;
        });
        
        select.innerHTML = options;
        
        // Add change event listener
        select.onchange = updatePreview;
    } catch (error) {
        console.error('Error loading students:', error);
        select.innerHTML = '<option value="">No students available</option>';
    }
}

/**
 * Get student data for preview
 */
export async function getStudentDataForPreview() {
    const select = document.getElementById('preview-student-select');
    const selectedId = select.value;
    
    // If no student selected, return sample data
    if (!selectedId) {
        return getSampleData(state.currentTemplate.id);
    }
    
    // Fetch the student from Firestore
    try {
        const doc = await db.collection('students').doc(selectedId).get();
        
        if (!doc.exists) {
            return getSampleData(state.currentTemplate.id);
        }
        
        const student = doc.data();
        
        // Map student data to template variables based on template type
        return mapStudentToTemplateVariables(student, selectedId);
    } catch (error) {
        console.error('Error fetching student:', error);
        return getSampleData(state.currentTemplate.id);
    }
}

/**
 * Map student data to template variables
 */
function mapStudentToTemplateVariables(student, studentId) {
    const baseData = {
        student: {
            firstName: student.firstName || '',
            lastName: student.lastName || '',
            email: student.email || '',
            phoneNumber: student.phoneNumber || '',
            pronouns: student.pronouns || '',
            emailConsent: student.emailConsent !== false,
            adminNotes: student.adminNotes || ''
        },
        studentId: studentId,
        registeredAt: student.createdAt ? formatDate(student.createdAt) : 'Unknown',
        casualRate: 20, // Default pricing
        studentRate: 15,
        fiveClassPrice: 90,
        tenClassPrice: 170,
        hasUserAccount: !!student.userId,
        setupDate: formatDate(new Date())
    };
    
    // Template-specific additions
    if (state.currentTemplate.id === 'account-setup' && student.userId) {
        baseData.user = {
            email: student.email || ''
        };
    }
    
    if (state.currentTemplate.id === 'error-notification') {
        baseData.error = {
            message: 'Sample error message'
        };
    }
    
    return baseData;
}
