/**
 * Workshop Check-In Modal
 * Handles workshop attendance tracking, walk-ins, and payment processing
 */

import { BaseModal } from '/components/modals/modal-base.js';
import { LoadingSpinner } from '/components/loading-spinner/loading-spinner.js';
import { showSnackbar } from '/components/snackbar/snackbar.js';
import {
    workshops,
    currentUser,
    searchStudents,
    formatDate
} from './workshop-manager.js';

// Firestore reference
const db = firebase.firestore();

// AbortControllers so we can cleanly remove old listeners before adding new ones
let checkinListenerController = null;
let walkinListenerController = null;

// Guard against concurrent/duplicate check-in writes
let checkinInProgress = false;

// Crew status cache for the current modal session (studentId -> boolean)
let crewStatusMap = new Map();

// Checkin data cache for the current modal session (studentId -> {id, paymentMethod, entryType, freeEntryReason})
let checkinDataMap = new Map();

/**
 * Fetches crew status for a list of registrations in one batch
 * @param {Array} registrations - Array of {studentId, ...}
 * @returns {Promise<Map>} Map of studentId -> boolean
 */
async function fetchCrewStatus(registrations) {
    const map = new Map();
    if (!registrations.length) return map;
    const uniqueIds = [...new Set(registrations.map(r => r.studentId))];
    const docs = await Promise.all(uniqueIds.map(id => db.collection('students').doc(id).get()));
    docs.forEach(doc => {
        if (doc.exists) map.set(doc.id, doc.data().crewMember === true);
    });
    return map;
}

/**
 * Fetches checkin documents for a workshop, keyed by studentId
 * @param {string} workshopId
 * @returns {Promise<Map>} Map of studentId -> {id, paymentMethod, entryType, freeEntryReason}
 */
async function fetchCheckinData(workshopId) {
    const map = new Map();
    const snapshot = await db.collection('checkins')
        .where('workshopId', '==', workshopId)
        .get();
    snapshot.forEach(doc => {
        const data = doc.data();
        map.set(data.studentId, {
            id: doc.id,
            paymentMethod: data.paymentMethod,
            entryType: data.entryType,
            freeEntryReason: data.freeEntryReason
        });
    });
    return map;
}

/**
 * Opens the workshop check-in modal
 * @param {string} workshopId - The workshop document ID
 */
async function openWorkshopCheckinModal(workshopId) {
    const workshop = workshops.find(w => w.id === workshopId);
    if (!workshop) {
        showSnackbar('Workshop not found', 'error');
        return;
    }

    crewStatusMap = await fetchCrewStatus(workshop.registeredStudents || []);
    checkinDataMap = await fetchCheckinData(workshopId);

    const modal = new BaseModal({
        id: 'workshop-checkin-modal',
        title: `Check-In: ${workshop.name}`,
        content: generateCheckinContent(workshop),
        size: 'medium',
        buttons: [
            {
                text: 'Walk-In',
                variant: 'primary',
                onClick: (modal) => {
                    modal.hide();
                    openWalkInCheckinModal(workshopId);
                }
            },
            {
                text: 'Close',
                variant: 'secondary',
                onClick: (modal) => modal.hide()
            }
        ]
    });
    
    modal.show();
    attachCheckinListeners(workshop, modal);
}

/**
 * Generates the HTML content for the check-in modal
 * @param {Object} workshop - The workshop object
 * @returns {string} HTML content
 */
function generateCheckinContent(workshop) {
    const registeredStudents = workshop.registeredStudents || [];
    const checkedInIds = new Set(workshop.checkedInStudents || []);

    // Deduplicate registeredStudents by studentId (arrayUnion on objects can produce duplicates
    // if the objects differ slightly, e.g. different registeredAt timestamps)
    const seen = new Set();
    const uniqueRegistered = registeredStudents.filter(r => {
        if (seen.has(r.studentId)) return false;
        seen.add(r.studentId);
        return true;
    });

    // Separate checked-in from not-checked-in
    const notCheckedIn = uniqueRegistered.filter(r => !checkedInIds.has(r.studentId));
    const alreadyCheckedIn = uniqueRegistered.filter(r => checkedInIds.has(r.studentId));
    
    return `
        <div class="workshop-info">
            <div style="margin-bottom: 20px; padding: 16px; background: var(--hover-background); border-radius: 8px; border: 1px solid var(--border-color); border-left: 4px solid var(--purple-primary);">
                <div style="margin-bottom: 8px;"><strong>Workshop Date:</strong> ${formatDate(workshop.date)}</div>
                <div><strong>Cost:</strong> $${workshop.cost}</div>
            </div>
        </div>
        
        <!-- Registered Students Section -->
        ${notCheckedIn.length > 0 ? `
            <div class="registered-students-section" style="margin-bottom: 30px;">
                <h3 style="margin-bottom: 15px; color: var(--purple-primary);">
                    <i class="fas fa-users"></i> Registered Students (${notCheckedIn.length})
                </h3>
                <div class="checkin-list">
                    ${notCheckedIn.map(reg => renderCheckinStudent(reg, workshop, false, crewStatusMap.get(reg.studentId) || false)).join('')}
                </div>
            </div>
        ` : ''}
        
        ${alreadyCheckedIn.length > 0 ? `
            <div class="checked-in-students-section" style="margin-bottom: 30px;">
                <h3 style="margin-bottom: 15px; color: var(--purple-primary);">
                    <i class="fas fa-check-circle"></i> Already Checked In (${alreadyCheckedIn.length})
                </h3>
                <div class="checkin-list">
                    ${alreadyCheckedIn.map(reg => renderCheckedInStudent(reg, checkinDataMap.get(reg.studentId))).join('')}
                </div>
            </div>
        ` : ''}
        
        ${notCheckedIn.length === 0 && alreadyCheckedIn.length === 0 ? `
            <div style="margin-bottom: 30px; padding: 15px; background: var(--hover-background); border-radius: 6px; text-align: center;">
                <i class="fas fa-info-circle"></i> No pre-registered students yet
            </div>
        ` : ''}
    `;
}

/**
 * Renders a student in the check-in list
 * @param {Object} registration - Registration object {studentId, studentName, paidOnline, registeredAt}
 * @param {Object} workshop - Workshop object
 * @param {boolean} isWalkIn - Whether this is a walk-in student
 * @returns {string} HTML for student row
 */
function renderCheckinStudent(registration, workshop, isWalkIn = false, isCrew = false) {
    const paidBadge = registration.paidOnline
        ? `<span class="payment-indicator paid-online"><i class="fas fa-check-circle"></i> Paid Online</span>`
        : `<span class="payment-indicator pay-later"><i class="fas fa-clock"></i> Pay Later</span>`;
    
    const studentName = registration.studentName || registration.studentId;
    const crewBadge = isCrew
        ? `<span class="type-badge crew" style="margin-left: 6px;">Crew</span>`
        : '';
    const registrationInfo = !isWalkIn 
        ? `Registered: ${formatDate(registration.registeredAt)} | ${paidBadge}` 
        : `<strong style="color: var(--orange-primary);">Walk-In</strong> (requires payment)`;
    
    // Payment method selector only for pay-later and walk-ins
    const needsPayment = !registration.paidOnline || isWalkIn;
    const defaultPayment = isCrew ? 'free' : 'cash';
    
    return `
        <div class="checkin-item" data-student-id="${registration.studentId}">
            <div class="checkin-item-row">
                <div class="student-name">${studentName}${crewBadge}</div>
                <button class="btn btn-primary btn-checkin" 
                        data-student-id="${registration.studentId}" 
                        data-paid-online="${registration.paidOnline || false}"
                        data-walk-in="${isWalkIn}">
                    <i class="fas fa-check"></i><span class="btn-checkin-text"> Check In</span>
                </button>
            </div>
            ${needsPayment ? `
            <div class="checkin-item-row">
                <label class="payment-method-label">Payment Method:</label>
                <select class="payment-method-select" data-student-id="${registration.studentId}">
                    <option value="cash" ${defaultPayment === 'cash' ? 'selected' : ''}>Cash</option>
                    <option value="eftpos">EFTPOS</option>
                    <option value="bank-transfer">Bank Transfer</option>
                    <option value="free" ${defaultPayment === 'free' ? 'selected' : ''}>Free Entry (Crew)</option>
                </select>
            </div>
            ` : ''}
        </div>
    `;
}

/**
 * Renders an already checked-in student (read-only display)
 * @param {Object} registration - Registration object
 * @returns {string} HTML for checked-in student row
 */
function getCheckinBadge(checkinData) {
    if (!checkinData || checkinData.entryType === 'free') {
        return `<span class="type-badge crew">Crew</span>`;
    }
    const method = checkinData.paymentMethod || 'unknown';
    const labels = { cash: 'Cash', eftpos: 'EFTPOS', 'bank-transfer': 'Bank Transfer', online: 'Online' };
    const label = labels[method] || method;
    return `<span class="type-badge ${method}">${label}</span>`;
}

function renderCheckedInStudent(registration, checkinData) {
    const studentName = registration.studentName || registration.studentId;
    const badge = getCheckinBadge(checkinData);
    const checkinId = checkinData ? checkinData.id : '';
    return `
        <div class="checkin-item checked-in" data-student-id="${registration.studentId}">
            <div class="checkin-item-row">
                <span class="student-name">${studentName}</span>
                <div class="checkin-item-actions">
                    ${badge}
                    <button class="btn-icon btn-delete btn-undo-checkin"
                            data-student-id="${registration.studentId}"
                            data-checkin-id="${checkinId}"
                            title="Undo Check-In">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Attaches event listeners for check-in interactions
 * @param {Object} workshop - Workshop object
 * @param {BaseModal} modal - Modal instance
 */
function attachCheckinListeners(workshop, modal) {
    if (checkinListenerController) checkinListenerController.abort();
    checkinListenerController = new AbortController();
    const { signal } = checkinListenerController;

    document.addEventListener('click', async (e) => {
        const checkinBtn = e.target.closest('.btn-checkin');
        if (!checkinBtn) return;

        const studentId = checkinBtn.dataset.studentId;
        const paidOnline = checkinBtn.dataset.paidOnline === 'true';
        const isWalkIn = checkinBtn.dataset.walkIn === 'true';

        await handleWorkshopCheckin(workshop.id, studentId, paidOnline, isWalkIn, modal);
    }, { signal });

    document.addEventListener('click', async (e) => {
        const undoBtn = e.target.closest('.btn-undo-checkin');
        if (!undoBtn) return;
        await handleUndoCheckin(workshop.id, undoBtn.dataset.studentId, undoBtn.dataset.checkinId, modal);
    }, { signal });
}

/**
 * Displays selected walk-in student for check-in
 * @param {Object} student - Student object from search
 * @param {Object} workshop - Workshop object
 * @param {HTMLElement} container - Container to render into
 */
function selectWalkInStudent(student, workshop, container) {
    const isCrew = student.crewMember === true;
    const walkInRegistration = {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        paidOnline: false,
        registeredAt: null
    };
    
    container.innerHTML = renderCheckinStudent(walkInRegistration, workshop, true, isCrew);
    container.style.display = 'block';
}

/**
 * Handles workshop check-in process
 * @param {string} workshopId - Workshop document ID
 * @param {string} studentId - Student document ID
 * @param {boolean} paidOnline - Whether student paid online during registration
 * @param {boolean} isWalkIn - Whether this is a walk-in student
 * @param {BaseModal} modal - Modal instance to refresh
 */
async function handleWorkshopCheckin(workshopId, studentId, paidOnline, isWalkIn, modal) {
    if (checkinInProgress) return;
    checkinInProgress = true;
    try {
        LoadingSpinner.showGlobal('Checking in student...');
        
        const workshop = workshops.find(w => w.id === workshopId);
        if (!workshop) {
            throw new Error('Workshop not found');
        }
        
        // Get student details
        const studentDoc = await db.collection('students').doc(studentId).get();
        if (!studentDoc.exists) {
            throw new Error('Student not found');
        }
        
        const student = studentDoc.data();
        const studentName = `${student.firstName} ${student.lastName}`;
        
        let paymentMethod = 'online';
        let transactionId = null;
        
        // If pay later (or walk-in, which always requires payment), create transaction
        if (!paidOnline) {
            const paymentMethodSelect = document.querySelector(`.payment-method-select[data-student-id="${studentId}"]`);
            paymentMethod = paymentMethodSelect ? paymentMethodSelect.value : 'cash';

            if (paymentMethod !== 'free') {
                // Create transaction document with deterministic ID
                const workshopDate = workshop.date.toDate();
                const txYear = workshopDate.getFullYear();
                const txMonth = String(workshopDate.getMonth() + 1).padStart(2, '0');
                const txDay = String(workshopDate.getDate()).padStart(2, '0');
                const txDateStr = `${txYear}-${txMonth}-${txDay}`;
                const transactionDocId = `${student.firstName.toLowerCase()}-${student.lastName.toLowerCase()}-workshop-entry-${txDateStr}`;

                const transactionRef = db.collection('transactions').doc(transactionDocId);
                await transactionRef.set({
                    type: 'workshop-entry',
                    workshopId: workshopId,
                    workshopName: workshop.name,
                    studentId: studentId,
                    studentName: studentName,
                    amountPaid: workshop.cost,
                    paymentMethod: paymentMethod,
                    classDate: workshop.date,
                    transactionDate: firebase.firestore.FieldValue.serverTimestamp(),
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdBy: currentUser.uid,
                    reversed: false,
                    refunded: null
                });

                transactionId = transactionRef.id;
            }
        } else {
            // Find existing online transaction for this student/workshop
            const transactionQuery = await db.collection('transactions')
                .where('type', '==', 'workshop-entry')
                .where('workshopId', '==', workshopId)
                .where('studentId', '==', studentId)
                .where('paymentMethod', '==', 'online')
                .limit(1)
                .get();
            
            if (!transactionQuery.empty) {
                transactionId = transactionQuery.docs[0].id;
            }
        }
        
        // Create checkin document
        const checkinDate = workshop.date.toDate();
        // Use local date instead of UTC to avoid timezone shifting
        const year = checkinDate.getFullYear();
        const month = String(checkinDate.getMonth() + 1).padStart(2, '0');
        const day = String(checkinDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const checkinId = `checkin-${dateStr}-${student.firstName.toLowerCase()}-${student.lastName.toLowerCase()}`;
        
        const isFreeEntry = paymentMethod === 'free';
        await db.collection('checkins').doc(checkinId).set({
            studentId: studentId,
            studentName: studentName,
            checkinDate: workshop.date,
            entryType: isFreeEntry ? 'free' : 'workshop-entry',
            freeEntryReason: isFreeEntry ? 'crew-member' : null,
            workshopId: workshopId,
            workshopName: workshop.name,
            paymentMethod: paymentMethod,
            amountPaid: (paidOnline || isFreeEntry) ? 0 : workshop.cost,
            onlineTransactionId: paidOnline ? transactionId : null,
            notes: isWalkIn ? 'Walk-in registration' : null,
            reversed: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.uid
        });

        // Update local checkin data cache
        checkinDataMap.set(studentId, {
            id: checkinId,
            paymentMethod: paymentMethod,
            entryType: isFreeEntry ? 'free' : 'workshop-entry',
            freeEntryReason: isFreeEntry ? 'crew-member' : null
        });

        // Update workshop document
        const updates = {
            checkedInStudents: firebase.firestore.FieldValue.arrayUnion(studentId)
        };
        
        // Add walk-ins to both invitedStudents (for portal access) and updatedAt
        if (isWalkIn) {
            updates.invitedStudents = firebase.firestore.FieldValue.arrayUnion(studentId);
            // Only add to registeredStudents if not already present (arrayUnion on objects
            // is NOT idempotent when the object contains new Date() — use a guard)
            const alreadyRegistered = (workshop.registeredStudents || []).some(r => r.studentId === studentId);
            if (!alreadyRegistered) {
                updates.registeredStudents = firebase.firestore.FieldValue.arrayUnion({
                    studentId: studentId,
                    studentName: studentName,
                    registeredAt: new Date(),
                    paidOnline: false,
                    transactionId: transactionId
                });
            }
        }
        
        updates.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        await db.collection('workshops').doc(workshopId).update(updates);
        
        // Update local state
        const workshopIndex = workshops.findIndex(w => w.id === workshopId);
        if (workshopIndex !== -1) {
            if (!workshops[workshopIndex].checkedInStudents) {
                workshops[workshopIndex].checkedInStudents = [];
            }
            workshops[workshopIndex].checkedInStudents.push(studentId);
            
            if (isWalkIn) {
                if (!workshops[workshopIndex].invitedStudents) {
                    workshops[workshopIndex].invitedStudents = [];
                }
                if (!workshops[workshopIndex].invitedStudents.includes(studentId)) {
                    workshops[workshopIndex].invitedStudents.push(studentId);
                }

                if (!workshops[workshopIndex].registeredStudents) {
                    workshops[workshopIndex].registeredStudents = [];
                }
                const alreadyInLocal = workshops[workshopIndex].registeredStudents.some(r => r.studentId === studentId);
                if (!alreadyInLocal) {
                    workshops[workshopIndex].registeredStudents.push({
                        studentId: studentId,
                        studentName: studentName,
                        registeredAt: new Date(),
                        paidOnline: false,
                        transactionId: transactionId
                    });
                }
            }
        }
        
        showSnackbar(`${studentName} checked in successfully`, 'success');
        LoadingSpinner.hideGlobal();
        
        // Refresh the modal content based on modal type
        if (modal.id === 'walkin-checkin-modal') {
            modal.setContent(generateWalkInContent(workshops[workshopIndex]));
            attachWalkInListeners(workshops[workshopIndex], modal);
            // Change Back button to Close — no point returning to check-in modal after completing a walk-in
            const backBtn = modal.element.querySelector('[data-button-index="0"]');
            if (backBtn) {
                backBtn.textContent = 'Close';
                modal.options.buttons[0].onClick = (m) => m.hide();
            }
        } else {
            modal.setContent(generateCheckinContent(workshops[workshopIndex]));
            attachCheckinListeners(workshops[workshopIndex], modal);
        }
        
        // Refresh workshop display in main table
        if (typeof renderWorkshops === 'function') {
            renderWorkshops();
        }
        
    } catch (error) {
        console.error('Check-in error:', error);
        showSnackbar(`Failed to check in student: ${error.message}`, 'error');
        LoadingSpinner.hideGlobal();
    } finally {
        checkinInProgress = false;
    }
}

/**
 * Undoes a workshop check-in, reverting the student to registered-not-checked-in
 */
async function handleUndoCheckin(workshopId, studentId, checkinId, modal) {
    try {
        LoadingSpinner.showGlobal('Undoing check-in...');

        // Prefer the ID passed directly from the button attribute;
        // fall back to the in-memory map; last resort: reconstruct deterministic ID
        if (!checkinId) {
            const cached = checkinDataMap.get(studentId);
            if (cached) {
                checkinId = cached.id;
            } else {
                const workshop = workshops.find(w => w.id === workshopId);
                const studentDoc = await db.collection('students').doc(studentId).get();
                if (!studentDoc.exists) throw new Error('Student not found');
                const s = studentDoc.data();
                const d = workshop.date.toDate();
                const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                checkinId = `checkin-${dateStr}-${s.firstName.toLowerCase()}-${s.lastName.toLowerCase()}`;
            }
        }
        await db.collection('checkins').doc(checkinId).delete();

        await db.collection('workshops').doc(workshopId).update({
            checkedInStudents: firebase.firestore.FieldValue.arrayRemove(studentId),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        const workshopIndex = workshops.findIndex(w => w.id === workshopId);
        if (workshopIndex !== -1) {
            workshops[workshopIndex].checkedInStudents =
                (workshops[workshopIndex].checkedInStudents || []).filter(id => id !== studentId);
        }

        checkinDataMap.delete(studentId);

        showSnackbar('Check-in undone', 'success');
        LoadingSpinner.hideGlobal();

        modal.setContent(generateCheckinContent(workshops[workshopIndex]));
        attachCheckinListeners(workshops[workshopIndex], modal);

        if (typeof renderWorkshops === 'function') renderWorkshops();

    } catch (error) {
        console.error('Undo check-in error:', error);
        showSnackbar(`Failed to undo check-in: ${error.message}`, 'error');
        LoadingSpinner.hideGlobal();
    }
}

/**
 * Opens the walk-in check-in modal
 * @param {string} workshopId - The workshop document ID
 */
function openWalkInCheckinModal(workshopId) {
    const workshop = workshops.find(w => w.id === workshopId);
    if (!workshop) {
        showSnackbar('Workshop not found', 'error');
        return;
    }
    
    const modal = new BaseModal({
        id: 'walkin-checkin-modal',
        title: `Walk-In Check-In: ${workshop.name}`,
        content: generateWalkInContent(workshop),
        size: 'medium',
        buttons: [
            {
                text: 'Back',
                variant: 'secondary',
                onClick: (modal) => {
                    modal.hide();
                    openWorkshopCheckinModal(workshopId);
                }
            }
        ],
        onOpen: () => {
            // Attach listeners after modal is fully rendered
            attachWalkInListeners(workshop, modal);
        }
    });
    
    modal.show();
}

/**
 * Generates the HTML content for the walk-in check-in modal
 * @param {Object} workshop - The workshop object
 * @returns {string} HTML content
 */
function generateWalkInContent(workshop) {
    return `
        <div class="workshop-info">
            <div style="margin-bottom: 20px; padding: 16px; background: var(--hover-background); border-radius: 8px; border: 1px solid var(--border-color); border-left: 4px solid var(--purple-primary);">
                <div style="margin-bottom: 8px;"><strong>Workshop Date:</strong> ${formatDate(workshop.date)}</div>
                <div><strong>Cost:</strong> $${workshop.cost}</div>
            </div>
        </div>
        
        <div class="walkin-students-section">
            <div class="form-group" style="margin-bottom: 15px;">
                <label for="walkin-search" style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 10px;">
                    Search for Walk-In Student
                </label>
                <div class="student-search" style="position: relative;">
                    <input type="text" 
                           id="walkin-search" 
                           placeholder="Type student name..." 
                           autocomplete="off">
                    <div id="walkin-search-results" class="search-results" style="display: none;"></div>
                </div>
            </div>
            
            <div id="walkin-selected-student" style="display: none;">
                <!-- Selected walk-in student will be rendered here -->
            </div>
        </div>
    `;
}

/**
 * Attaches event listeners for walk-in check-in interactions
 * @param {Object} workshop - Workshop object
 * @param {BaseModal} modal - Modal instance
 */
function attachWalkInListeners(workshop, modal) {
    if (walkinListenerController) walkinListenerController.abort();
    walkinListenerController = new AbortController();
    const { signal } = walkinListenerController;

    const searchInput = document.getElementById('walkin-search');
    const searchResults = document.getElementById('walkin-search-results');
    const selectedContainer = document.getElementById('walkin-selected-student');

    let searchTimeout;
    
    // Walk-in student search
    if (searchInput) {
        searchInput.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            
            if (query.length < 2) {
                searchResults.style.display = 'none';
                return;
            }
            
            // Debounce search
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                try {
                    const students = await searchStudents(query);
                    
                    // Filter out students who are already registered or checked in
                    const registeredIds = new Set((workshop.registeredStudents || []).map(r => r.studentId));
                    const availableStudents = students.filter(s => !registeredIds.has(s.id));
                    
                    if (availableStudents.length === 0) {
                        searchResults.innerHTML = '<div class="search-result-item" style="padding: 10px; color: var(--text-secondary);">No matching students found</div>';
                        searchResults.style.display = 'block';
                        return;
                    }
                    
                    searchResults.innerHTML = availableStudents.map(student => `
                        <div class="search-result-item" data-student-id="${student.id}">
                            ${student.firstName} ${student.lastName}
                        </div>
                    `).join('');
                    searchResults.style.display = 'block';
                    
                    // Add click handlers to search results
                    searchResults.querySelectorAll('.search-result-item').forEach(item => {
                        item.addEventListener('click', () => {
                            const studentId = item.dataset.studentId;
                            const student = availableStudents.find(s => s.id === studentId);
                            if (student) {
                                selectWalkInStudent(student, workshop, selectedContainer);
                                searchInput.value = '';
                                searchResults.style.display = 'none';
                            }
                        });
                    });
                } catch (error) {
                    console.error('Search error:', error);
                    showSnackbar('Failed to search students', 'error');
                }
            }, 300);
        });
    }
    
    // Hide search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.student-search')) {
            searchResults.style.display = 'none';
        }
    }, { signal });

    // Check-in button handlers
    document.addEventListener('click', async (e) => {
        const checkinBtn = e.target.closest('.btn-checkin');
        if (!checkinBtn) return;

        const studentId = checkinBtn.dataset.studentId;
        const paidOnline = checkinBtn.dataset.paidOnline === 'true';
        const isWalkIn = checkinBtn.dataset.walkIn === 'true';

        await handleWorkshopCheckin(workshop.id, studentId, paidOnline, isWalkIn, modal);
    }, { signal });
}

// Export functions for use in other modules
window.openWorkshopCheckinModal = openWorkshopCheckinModal;
window.openWalkInCheckinModal = openWalkInCheckinModal;
