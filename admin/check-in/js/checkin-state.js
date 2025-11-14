/**
 * checkin-state.js - Manages selected student state
 */

let selectedStudent = null;
let isEditingCheckin = false;
let editingCheckinId = null;

function setSelectedStudent(student) {
    selectedStudent = student;
}

function getSelectedStudent() {
    return selectedStudent;
}

function clearSelectedStudent() {
    selectedStudent = null;
}

function setEditingCheckin(checkinId) {
    isEditingCheckin = true;
    editingCheckinId = checkinId;
}

function isEditMode() {
    return isEditingCheckin;
}

function getEditingCheckinId() {
    return editingCheckinId;
}

function clearEditingCheckin() {
    isEditingCheckin = false;
    editingCheckinId = null;
}
