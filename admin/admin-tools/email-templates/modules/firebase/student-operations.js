/**
 * student-operations.js
 * Firestore operations for students
 */

import { state } from '../core/state.js';
import { updatePreview } from '../ui/preview.js';
import { formatDate } from '../utils/format.js';

/* global db */

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
        select.onchange = async () => await updatePreview();
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
    
    // If no student selected, throw error
    if (!selectedId) {
        throw new Error('No student selected for preview');
    }
    
    // Fetch the student from Firestore
    const doc = await db.collection('students').doc(selectedId).get();
    
    if (!doc.exists) {
        throw new Error(`Student with ID ${selectedId} not found`);
    }
    
    const student = doc.data();
    
    // Map student data to template variables based on template type
    return await mapStudentToTemplateVariables(student, selectedId);
}

/**
 * Map student data to template variables
 */
async function mapStudentToTemplateVariables(student, studentId) {
    // Validate required student fields
    if (!student.firstName) {
        throw new Error('Student missing required field: firstName');
    }
    if (!student.lastName) {
        throw new Error('Student missing required field: lastName');
    }
    if (!student.email) {
        throw new Error('Student missing required field: email');
    }
    
    // Fetch pricing data from Firestore - will throw error if not found
    const pricingData = await fetchPricingData();
    
    const baseData = {
        student: {
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            phoneNumber: student.phoneNumber || '',
            pronouns: student.pronouns || '',
            emailConsent: student.emailConsent !== false,
            adminNotes: student.adminNotes || ''
        },
        studentId: studentId,
        registeredAt: student.createdAt ? formatDate(student.createdAt) : 'Unknown',
        casualRate: pricingData.casualRate,
        studentRate: pricingData.studentRate,
        fiveClassPrice: pricingData.fiveClassPrice,
        tenClassPrice: pricingData.tenClassPrice,
        hasUserAccount: !!student.userId,
        setupDate: formatDate(new Date())
    };
    
    // Template-specific additions
    if (state.currentTemplate.id === 'account-setup') {
        baseData.user = {
            email: student.email
        };
    }
    
    if (state.currentTemplate.id === 'error-notification') {
        baseData.error = {
            message: 'Sample error message'
        };
    }
    
    return baseData;
}

/**
 * Fetch pricing data from Firestore collections
 */
async function fetchPricingData() {
    // Fetch casual rates
    const casualRatesSnapshot = await db.collection('casualRates').get();
    
    let casualRate = null;
    let studentRate = null;
    
    casualRatesSnapshot.forEach(doc => {
        const rate = doc.data();
        // Only process active, non-promo rates
        if (rate.isActive && !rate.isPromo) {
            if (rate.name && rate.name.toLowerCase().includes('student')) {
                studentRate = rate.price;
            } else if (rate.name) {
                casualRate = rate.price;
            }
        }
    });
    
    // Validate casual rates were found
    if (casualRate === null) {
        throw new Error('Casual rate not found in database. Please check Admin Tools > Concession Types Manager and ensure "Casual Entry" is active.');
    }
    if (studentRate === null) {
        throw new Error('Student rate not found in database. Please check Admin Tools > Concession Types Manager and ensure "Student Casual Entry" is active.');
    }
    
    // Fetch concession packages
    const concessionPackagesSnapshot = await db.collection('concessionPackages').get();
    
    let fiveClassPrice = null;
    let tenClassPrice = null;
    
    concessionPackagesSnapshot.forEach(doc => {
        const pkg = doc.data();
        if (pkg.isActive && !pkg.isPromo) {
            if (pkg.numberOfClasses === 5) {
                fiveClassPrice = pkg.price;
            } else if (pkg.numberOfClasses === 10) {
                tenClassPrice = pkg.price;
            }
        }
    });
    
    // Validate concession packages were found
    if (fiveClassPrice === null) {
        throw new Error('5-class concession package not found in database. Please check Admin Tools > Concession Types Manager.');
    }
    if (tenClassPrice === null) {
        throw new Error('10-class concession package not found in database. Please check Admin Tools > Concession Types Manager.');
    }
    
    return {
        casualRate,
        studentRate,
        fiveClassPrice,
        tenClassPrice
    };
}
