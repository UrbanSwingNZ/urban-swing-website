/**
 * Membership Service
 * Handles fetching membership types and current membership data
 */

export class MembershipService {
    constructor() {
        this.db = firebase.firestore();
    }

    /**
     * Get active membership types
     * @returns {Promise<Array>} Array of active membership types
     */
    async getActiveMembershipTypes() {
        try {
            const snapshot = await this.db.collection('membershipTypes')
                .where('isActive', '!=', false)
                .orderBy('isActive')
                .orderBy('displayOrder', 'asc')
                .get();

            const membershipTypes = [];
            snapshot.forEach(doc => {
                membershipTypes.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return membershipTypes;
        } catch (error) {
            console.error('Error fetching membership types:', error);
            throw new Error('Failed to load membership types');
        }
    }

    /**
     * Get current or most recently expired membership for a student
     * @param {string} studentId - Student document ID
     * @returns {Promise<Object|null>} Current/recent membership or null
     */
    async getCurrentMembership(studentId) {
        try {
            // First try to get active membership
            let snapshot = await this.db.collection('memberships')
                .where('studentId', '==', studentId)
                .where('status', '==', 'active')
                .limit(1)
                .get();

            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                return {
                    id: doc.id,
                    ...doc.data()
                };
            }

            // No active membership - get most recently expired one
            snapshot = await this.db.collection('memberships')
                .where('studentId', '==', studentId)
                .where('status', '==', 'expired')
                .orderBy('currentPeriodEnd', 'desc')
                .limit(1)
                .get();

            if (snapshot.empty) {
                return null;
            }

            const doc = snapshot.docs[0];
            return {
                id: doc.id,
                ...doc.data()
            };
        } catch (error) {
            console.error('Error fetching current membership:', error);
            throw new Error('Failed to load current membership');
        }
    }

    /**
     * Check if a student is marked as improver
     * @param {string} studentId - Student document ID
     * @returns {Promise<boolean>} True if student is improver
     */
    async isImprover(studentId) {
        try {
            const doc = await this.db.collection('students').doc(studentId).get();
            if (!doc.exists) {
                return false;
            }
            const data = doc.data();
            return data.improver === true;
        } catch (error) {
            console.error('Error checking improver status:', error);
            return false;
        }
    }
}

export default MembershipService;
