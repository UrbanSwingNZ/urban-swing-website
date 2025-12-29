/**
 * processors.js - Registration Processors
 * Handles different registration workflows (admin, new student, existing-incomplete)
 */

/**
 * Process admin registration
 */
async function processAdminRegistration(formData) {
    // Step 0: Check if email already exists
    const emailCheck = await checkEmailExists(formData.email);
    
    if (emailCheck.status !== 'new') {
        if (emailCheck.status === 'existing-complete') {
            throw new Error('This email is already registered with a portal account.');
        } else if (emailCheck.status === 'existing-incomplete') {
            throw new Error('This email is already in the system as a student.');
        }
    }
    
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
    
    // Note: Admin users cannot create portal accounts directly to avoid logout issues
    // Students can create their own portal accounts by visiting the student portal
    
    // If payment provided, process payment and create transaction
    if (hasPayment && formData.firstClassDate) {
        console.log('Processing payment for admin-registered student...');
        
        // Get selected package ID from payment handler
        const selectedPackageId = window.paymentHandler.getSelectedPackageId();
        if (!selectedPackageId) {
            throw new Error('Please select a payment option');
        }
        
        // Create payment method from card element
        const paymentMethodId = await window.paymentHandler.createPaymentMethod();
        if (!paymentMethodId) {
            throw new Error('Failed to create payment method');
        }
        
        // Call the same Firebase function that handles new student payments
        const functionUrl = 'https://us-central1-directed-curve-447204-j4.cloudfunctions.net/createStudentWithPayment';
        
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: formData.email,
                firstName: formData.firstName,
                lastName: formData.lastName,
                phoneNumber: formData.phoneNumber,
                pronouns: formData.pronouns,
                over16Confirmed: formData.over16Confirmed,
                termsAccepted: formData.termsAccepted,
                emailConsent: formData.emailConsent,
                packageId: selectedPackageId,
                paymentMethodId: paymentMethodId,
                firstClassDate: formData.firstClassDate ? formData.firstClassDate.toISOString() : null
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Payment processing failed');
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Payment processing failed');
        }
        
        console.log('Payment successful. Student and transaction created:', result.studentId);
        
        // Admin notes are not included in the function - need to update student doc separately
        if (formData.adminNotes && formData.adminNotes.trim() !== '') {
            await window.db.collection('students').doc(result.studentId).update({
                adminNotes: formData.adminNotes,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Admin notes added to student document');
        }
        
        // Return the student ID from the payment result
        return result.studentId;
    } else {
        // No payment - create student document manually
        await window.db.collection('students').doc(studentId).set(studentData);
        console.log('Student document created:', studentId);
        return studentId;
    }
}

/**
 * Process registration for new student
 */
async function processNewStudentRegistration(formData) {
    const hasPassword = formData.password && formData.password.trim() !== '';
    
    // Step 0: Check if email already exists
    const emailCheck = await checkEmailExists(formData.email);
    
    if (emailCheck.status !== 'new') {
        if (emailCheck.status === 'existing-complete') {
            throw new Error('This email is already registered. Please login instead.');
        } else if (emailCheck.status === 'existing-incomplete') {
            throw new Error('You are already in our system. Please use "I\'m an existing student" to set up portal access.');
        }
    }
    
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
    
    // Check if auth user already exists for this email
    let authUser;
    try {
        // Try to create Firebase Auth user
        authUser = await createAuthUser(formData.email, formData.password);
        console.log('Firebase Auth user created:', authUser.uid);
    } catch (error) {
        // If error is "email already in use", it means they have an auth account
        if (error.message.includes('already registered') || error.message.includes('email-already-in-use')) {
            // Check if they also have a user document
            const usersQuery = await window.db.collection('users')
                .where('email', '==', formData.email.toLowerCase().trim())
                .limit(1)
                .get();
            
            if (!usersQuery.empty) {
                // They have both auth account AND user document - fully registered
                throw new Error('This email is already registered. Please login instead.');
            } else {
                // They have auth account but no user document - should not happen, but recover
                // Sign them in and continue
                const signInResult = await firebase.auth().signInWithEmailAndPassword(
                    formData.email.toLowerCase().trim(),
                    formData.password
                );
                authUser = {
                    uid: signInResult.user.uid,
                    email: signInResult.user.email
                };
                console.log('User signed in with existing auth account:', authUser.uid);
            }
        } else {
            // Some other error - rethrow
            throw error;
        }
    }
    
    // 2. Create user document (linking auth UID to student ID)
    await window.db.collection('users').doc(authUser.uid).set({
        email: formData.email,
        firstName: studentData.firstName,
        lastName: studentData.lastName,
        studentId: studentId,
        role: 'student',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log('User document created:', authUser.uid);
    
    // 3. Update student document (add termsAccepted) - now security rules will pass
    await updateStudentTerms(studentId);
    console.log('Student document updated with terms acceptance');
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
