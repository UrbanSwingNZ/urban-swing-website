/**
 * modal.js
 * Main coordinator for student database modals
 */

import { ConfirmationModal } from '/components/modals/confirmation-modal.js';
import { viewStudent, editStudent, openStudentModal, closeStudentModal, saveStudentChanges } from './modals/student-modal.js';
import { editNotes, closeNotesModal, saveNotes } from './modals/notes-modal.js';
import { viewTransactionHistory, initializeModalListeners } from './modals/transaction-history-modal.js';
import { confirmDeleteStudent, confirmRestoreStudent, restoreStudent } from './modals/student-deletion-modal.js';

// Expose functions globally for onclick handlers
window.viewStudent = viewStudent;
window.editStudent = editStudent;
window.editNotes = editNotes;
window.confirmDeleteStudent = confirmDeleteStudent;
window.confirmRestoreStudent = confirmRestoreStudent;
window.restoreStudent = restoreStudent;
window.viewTransactionHistory = viewTransactionHistory;
window.closeStudentModal = closeStudentModal;
window.closeNotesModal = closeNotesModal;
window.saveNotes = saveNotes;
window.saveStudentChanges = saveStudentChanges;
window.initializeModalListeners = initializeModalListeners;
window.openStudentModal = openStudentModal;
window.ConfirmationModal = ConfirmationModal;


