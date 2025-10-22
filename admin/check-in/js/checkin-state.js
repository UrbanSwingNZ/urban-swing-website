/**
 * checkin-state.js - Manages selected student state
 */

let selectedStudent = null;

function setSelectedStudent(student) {
    selectedStudent = student;
}

function getSelectedStudent() {
    return selectedStudent;
}

function clearSelectedStudent() {
    selectedStudent = null;
}
