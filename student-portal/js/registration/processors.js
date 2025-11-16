/**
 * processors.js - Registration Processors
 * Handles different registration workflows (admin, new student, existing-incomplete)
 */

/**
 * Process admin registration
 */
async function processAdminRegistration(formData) {
    const hasPassword = formData.password && formData.password.trim() !== '';
    const hasPayment = formData.rateType && formData.rateType !== '';
    
    // Generate student ID
    const studentId = generateStudentId(formData.firstName, formData.lastName);
    
    // Create student document
    const studentData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        pronouns: formData.pronouns,
        over16Confirmed: formData.over16Confirmed,
        termsAccepted: formData.termsAccepted,
        emailConsent: formData.emailConsent,
        adminNotes: formData.adminNotes || '',
        registeredAt: firebase.firestore.Timestamp.now(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await window.db.collection('students').doc(studentId).set(studentData);
    console.log('Student document created:', studentId);
    
    // If password provided, create auth user and user document
    if (hasPassword) {
        const authUser = await createAuthUser(formData.email, formData.password);
        console.log('Firebase Auth user created:', authUser.uid);
        
        await window.db.collection('users').doc(authUser.uid).set({
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            studentId: studentId,
            role: 'student',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('User document created:', authUser.uid);
        
        // Sign out the newly created user (so admin stays signed in)
        await firebase.auth().signOut();
        
        console.log('Admin should re-authenticate if needed');
    }
    
    // If payment provided, process payment
    if (hasPayment && formData.firstClassDate) {
        console.log('Processing payment for admin-registered student...');
        console.warn('Admin payment processing not fully implemented - student document created without payment');
    }
}

/**
 * Process registration for new student
 */
async function processNewStudentRegistration(formData) {
    const hasPassword = formData.password && formData.password.trim() !== '';
    
    // Step 1: Call backend Firebase Function to process payment and create student document
    const result = await processRegistrationWithPayment({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        pronouns: formData.pronouns,
        over16Confirmed: formData.over16Confirmed,
        termsAccepted: formData.termsAccepted,
        emailConsent: formData.emailConsent,
        firstClassDate: formData.firstClassDate
    });
    
    if (!result.success) {
        throw new Error('Payment processing failed');
    }
    
    console.log('Payment successful. Documents created:', result);
    
    // Step 2: If password provided, create Firebase Auth user and user document
    if (hasPassword) {
        const authUser = await createAuthUser(formData.email, formData.password);
        console.log('Firebase Auth user created:', authUser.uid);
        
        await window.db.collection('users').doc(authUser.uid).set({
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            studentId: result.studentId,
            role: 'student',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('User document created:', authUser.uid);
        
        // Redirect to dashboard (user is now fully registered and signed in)
        window.location.href = 'dashboard/index.html';
    } else {
        // No password - show success message and redirect to classes page
        showSuccessMessage('Registration successful! You can create a student portal account later by logging in.');
        
        setTimeout(() => {
            window.location.href = '../pages/classes.html';
        }, 3000);
    }
}

/**
 * Process registration for existing-incomplete student
 */
async function processExistingIncompleteRegistration(formData) {
    const studentData = getStudentData();
    const studentId = studentData.id;
    
    // 1. Create Firebase Auth user
    const authUser = await createAuthUser(formData.email, formData.password);
    console.log('Firebase Auth user created:', authUser.uid);
    
    // 2. Update student document (add termsAccepted)
    await updateStudentTerms(studentId);
    console.log('Student document updated with terms acceptance');
    
    // 3. Create user document
    const userData = {
        email: formData.email,
        firstName: studentData.firstName,
        lastName: studentData.lastName,
        authUid: authUser.uid
    };
    
    await createUser(userData, studentId);
    console.log('User document created');
}

/**
 * Generate human-readable student ID
 */
function generateStudentId(firstName, lastName) {
    const cleanFirst = firstName.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    
    const cleanLast = lastName.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    
    return `${cleanFirst}-${cleanLast}-${randomSuffix}`;
}
