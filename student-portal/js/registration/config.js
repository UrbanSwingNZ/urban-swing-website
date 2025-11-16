/**
 * config.js - Registration Configuration
 * Manages registration state and mode
 */

const registrationConfig = {
    mode: 'new', // 'new', 'existing-incomplete', or 'admin'
    studentData: null,
    email: null,
    isAdmin: false,
    userRole: null
};

// Date picker instance
let firstClassDatePicker = null;

/**
 * Get current registration mode
 */
function getRegistrationMode() {
    return registrationConfig.mode;
}

/**
 * Set registration mode
 */
function setRegistrationMode(mode) {
    registrationConfig.mode = mode;
}

/**
 * Check if user is admin
 */
function isAdminUser() {
    return registrationConfig.isAdmin;
}

/**
 * Set admin status
 */
function setAdminStatus(isAdmin) {
    registrationConfig.isAdmin = isAdmin;
}

/**
 * Get student data
 */
function getStudentData() {
    return registrationConfig.studentData;
}

/**
 * Set student data
 */
function setStudentData(data) {
    registrationConfig.studentData = data;
}

/**
 * Get date picker instance
 */
function getDatePicker() {
    return firstClassDatePicker;
}

/**
 * Set date picker instance
 */
function setDatePicker(picker) {
    firstClassDatePicker = picker;
}
