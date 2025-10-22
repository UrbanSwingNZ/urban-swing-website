/**
 * history-state.js - Manages history modal state
 */

let selectedHistoryStudentId = null;

function setSelectedHistoryStudentId(studentId) {
    selectedHistoryStudentId = studentId;
}

function getSelectedHistoryStudentId() {
    return selectedHistoryStudentId;
}

function clearSelectedHistoryStudentId() {
    selectedHistoryStudentId = null;
}
