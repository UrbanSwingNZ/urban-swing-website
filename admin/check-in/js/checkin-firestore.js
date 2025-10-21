/**
 * checkin-firestore.js - Firestore save operations
 */

/**
 * Handle check-in submission
 */
function handleCheckinSubmit() {
    const student = getSelectedStudent();
    if (!student) return;
    
    const entryType = document.querySelector('input[name="entry-type"]:checked')?.value;
    if (!entryType) {
        showSnackbar('Please select an entry type', 'error');
        return;
    }
    
    const paymentMethod = document.getElementById('payment-method').value;
    const freeEntryReason = document.getElementById('free-entry-reason').value;
    const notes = document.getElementById('checkin-notes').value;
    
    // Validate payment for casual
    if (entryType === 'casual' && !paymentMethod) {
        showSnackbar('Please select a payment method for casual entry', 'error');
        return;
    }
    
    // Validate reason for free entry
    if (entryType === 'free' && !freeEntryReason) {
        showSnackbar('Please select a reason for free entry', 'error');
        return;
    }
    
    // Save check-in to Firestore
    saveCheckinToFirestore(student, entryType, paymentMethod, freeEntryReason, notes);
}

/**
 * Save check-in to Firestore
 */
async function saveCheckinToFirestore(student, entryType, paymentMethod, freeEntryReason, notes) {
    try {
        // Get the selected check-in date from date picker
        const checkinDate = getSelectedCheckinDate(); // Returns Date object
        
        // Format date for document ID: YYYY-MM-DD
        const year = checkinDate.getFullYear();
        const month = String(checkinDate.getMonth() + 1).padStart(2, '0');
        const day = String(checkinDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        // Create document ID: checkin-YYYY-MM-DD-firstname-lastname
        const firstName = student.firstName.toLowerCase().replace(/\s+/g, '-');
        const lastName = student.lastName.toLowerCase().replace(/\s+/g, '-');
        const docId = `checkin-${dateStr}-${firstName}-${lastName}`;
        
        let concessionBlockId = null;
        
        // Check if this student already has a check-in for this date
        const existingCheckin = await firebase.firestore()
            .collection('checkins')
            .doc(docId)
            .get();
        
        if (existingCheckin.exists) {
            const existingData = existingCheckin.data();
            
            // If they're changing FROM concession TO another type, restore the concession
            if (existingData.entryType === 'concession' && entryType !== 'concession' && existingData.concessionBlockId) {
                await restoreBlockEntry(existingData.concessionBlockId);
            }
            // If they're changing FROM another type TO concession, use a concession
            else if (existingData.entryType !== 'concession' && entryType === 'concession') {
                const block = await getNextAvailableBlock(student.id, true);
                if (!block) {
                    showSnackbar('No concession entries available for this student', 'error');
                    return;
                }
                await useBlockEntry(block.id);
                concessionBlockId = block.id;
            }
            // If both are concession, keep the existing block ID (no change needed)
            else if (existingData.entryType === 'concession' && entryType === 'concession') {
                concessionBlockId = existingData.concessionBlockId;
            }
        } else {
            // New check-in - if concession, use a block entry
            if (entryType === 'concession') {
                const block = await getNextAvailableBlock(student.id, true); // Allow expired
                
                if (!block) {
                    showSnackbar('No concession entries available for this student', 'error');
                    return;
                }
                
                // Use one entry from the block
                await useBlockEntry(block.id);
                concessionBlockId = block.id;
            }
        }
        
        // Build check-in data
        const checkinData = {
            studentId: student.id,
            studentName: getStudentFullName(student),
            checkinDate: firebase.firestore.Timestamp.fromDate(checkinDate),
            entryType: entryType,
            paymentMethod: entryType === 'casual' ? paymentMethod : null,
            freeEntryReason: entryType === 'free' ? freeEntryReason : null,
            amountPaid: entryType === 'casual' ? 15 : 0,
            concessionBlockId: concessionBlockId,
            notes: notes || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'unknown'
        };
        
        // Save to Firestore with custom document ID
        await firebase.firestore()
            .collection('checkins')
            .doc(docId)
            .set(checkinData);
        
        // Close modal and show success
        closeCheckinModal();
        showSnackbar(`${getStudentFullName(student)} checked in successfully!`, 'success');
        
        // Reload today's check-ins to display the new one
        loadTodaysCheckins();
        
    } catch (error) {
        console.error('Error saving check-in:', error);
        showSnackbar('Failed to save check-in. Please try again.', 'error');
    }
}
