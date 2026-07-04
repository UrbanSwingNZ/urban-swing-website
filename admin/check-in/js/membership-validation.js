/**
 * membership-validation.js - Membership validation for improver students
 */

/**
 * Check if student is improver and has active membership
 * @param {string} studentId - Student document ID
 * @param {Date} checkinDate - Optional check-in date to validate against (defaults to current date)
 * @returns {Promise<Object>} Membership validation result
 */
async function checkStudentMembership(studentId, checkinDate = null) {
    try {
        // Get student document
        const studentDoc = await firebase.firestore()
            .collection('students')
            .doc(studentId)
            .get();
        
        if (!studentDoc.exists) {
            return {
                isImprover: false,
                hasActiveMembership: false,
                canCheckIn: false,
                error: 'Student not found'
            };
        }
        
        const studentData = studentDoc.data();
        const isImprover = studentData.improver === true;
        
        // If not improver, allow check-in with concessions (existing logic)
        if (!isImprover) {
            return {
                isImprover: false,
                hasActiveMembership: false,
                canCheckIn: true,
                useExistingLogic: true
            };
        }
        
        // Improver - check for active membership
        if (studentData.activeMembershipId && studentData.membershipExpiryDate) {
            // Use provided checkin date or current date
            const validationDate = checkinDate || new Date();
            // Normalize to start of day for comparison
            validationDate.setHours(0, 0, 0, 0);
            
            const expiryDate = studentData.membershipExpiryDate.toDate();
            
            // Valid through end of expiry day
            expiryDate.setHours(23, 59, 59, 999);
            
            if (expiryDate >= validationDate) {
                // Has active membership - fetch membership details for auto-renew status
                let autoRenew = false;
                try {
                    const membershipDoc = await firebase.firestore()
                        .collection('memberships')
                        .doc(studentData.activeMembershipId)
                        .get();
                    
                    if (membershipDoc.exists) {
                        autoRenew = membershipDoc.data().autoRenew === true;
                    }
                } catch (error) {
                    console.error('Error fetching membership details:', error);
                }
                
                return {
                    isImprover: true,
                    hasActiveMembership: true,
                    canCheckIn: true,
                    membershipId: studentData.activeMembershipId,
                    expiryDate: studentData.membershipExpiryDate,
                    autoRenew: autoRenew,
                    source: 'membership'
                };
            } else {
                // Membership expired - clear fields
                await firebase.firestore()
                    .collection('students')
                    .doc(studentId)
                    .update({
                        activeMembershipId: null,
                        membershipStatus: null,
                        membershipExpiryDate: null
                    });
            }
        }
        
        // Improver with no active membership
        return {
            isImprover: true,
            hasActiveMembership: false,
            canCheckIn: false,
            allowOverride: true,
            reason: 'No active membership'
        };
        
    } catch (error) {
        console.error('Error checking student membership:', error);
        return {
            isImprover: false,
            hasActiveMembership: false,
            canCheckIn: false,
            error: error.message
        };
    }
}

/**
 * Get membership details for display
 * @param {string} membershipId - Membership document ID
 * @returns {Promise<Object|null>} Membership details
 */
async function getMembershipDetails(membershipId) {
    try {
        const doc = await firebase.firestore()
            .collection('memberships')
            .doc(membershipId)
            .get();
        
        if (!doc.exists) {
            return null;
        }
        
        return {
            id: doc.id,
            ...doc.data()
        };
    } catch (error) {
        console.error('Error getting membership details:', error);
        return null;
    }
}

// Expose functions globally
window.checkStudentMembership = checkStudentMembership;
window.getMembershipDetails = getMembershipDetails;
