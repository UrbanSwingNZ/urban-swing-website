# Quick Reference Guide - Refactored Student Portal

## For Developers

### New Shared Utilities

#### Import in HTML
```html
<!-- Add these before your page-specific scripts -->
<script src="../js/utils.js"></script>
<script src="../js/auth-utils.js"></script>
```

#### Common Functions Available

**Notifications**
```javascript
showSnackbar('Success message', 'success');
showSnackbar('Error message', 'error', 5000); // 5 second duration
showSnackbar('Warning', 'warning');
showSnackbar('Info', 'info');
```

**Loading State**
```javascript
showLoading(true);  // Show spinner
showLoading(false); // Hide spinner
```

**Formatting**
```javascript
formatCurrency(20);        // Returns "$20.00"
formatDate(new Date());    // Returns formatted date
escapeHtml('<script>');    // XSS protection
```

**Validation**
```javascript
isValidEmail('test@example.com'); // Returns true/false
hasFieldChanged(newValue, oldValue); // Check if field changed
```

**Navigation**
```javascript
navigateTo('../dashboard/index.html');
```

**Auth Helpers**
```javascript
await waitForAuth();                    // Wait for auth system
const studentId = await getCurrentStudentId();  // Get current student ID
const student = await getCurrentStudent();      // Get current student data
const student = await getStudentById(id);       // Get student by ID
const activeId = await getActiveStudentId();    // Works for admin or student view
const isAdmin = isAdminView();                  // Check if admin
```

### Using Services

#### Payment Service (Prepay & Purchase)
```javascript
// Initialize
const paymentService = new PaymentService();
paymentService.initialize('card-element', 'card-errors');

// Process casual payment
const result = await paymentService.processCasualPayment(
    studentId, 
    rateId, 
    classDate
);

// Process concession purchase
const result = await paymentService.processConcessionPurchase(
    studentId, 
    packageId
);

// Check result
if (result.success) {
    console.log('Payment successful:', result.result);
} else {
    console.error('Payment failed:', result.error);
}

// Reset card input
paymentService.reset();
```

#### Rate Service (Prepay)
```javascript
// Initialize and load
const rateService = new RateService();
const rates = await rateService.loadRates();

// Get rates
const allRates = rateService.getRates();
const specificRate = rateService.getRateById('rateId');

// Selection
rateService.selectRate('rateId');
const selected = rateService.getSelectedRate();
rateService.clearSelection();
```

#### Package Service (Purchase)
```javascript
// Initialize and load
const packageService = new PackageService();
const packages = await packageService.loadPackages();

// Selection
packageService.selectPackage('packageId');
const selected = packageService.getSelectedPackage();

// Format description
const desc = packageService.formatPackageDescription(pkg);
// Returns: "10 classes • Valid for 3 months • $150.00"
```

#### Validation Service (Prepay)
```javascript
// Initialize
const validationService = new ValidationService();

// Validate date
const result = await validationService.validateClassDate(date, studentId);
if (!result.isValid) {
    console.error(result.message);
}

// Check specific conditions
validationService.isThursday(date);
validationService.isPastDate(date);

// Check for duplicates
const dupCheck = await validationService.checkForDuplicateClass(date, studentId);

// Update UI
validationService.updateValidationUI(isValid, message);
```

### API Endpoints

Centralized in `utils.js`:
```javascript
API_CONFIG.CASUAL_PAYMENT        // Casual payment endpoint
API_CONFIG.CONCESSION_PURCHASE   // Concession purchase endpoint
```

### Common Patterns

#### Page Initialization
```javascript
document.addEventListener('DOMContentLoaded', async () => {
    await waitForAuth();
    const studentId = await getActiveStudentId();
    
    if (!studentId) {
        // Show empty state
        return;
    }
    
    // Initialize services
    // Load data
});
```

#### Student Selection (Admin)
```javascript
window.addEventListener('studentSelected', async (event) => {
    const student = event.detail;
    await loadPageForStudent(student.id);
});
```

#### Form Submission
```javascript
document.getElementById('form').addEventListener('submit', async (event) => {
    event.preventDefault();
    
    // Validate
    if (!isValid) {
        showSnackbar('Validation error', 'error');
        return;
    }
    
    // Process
    showLoading(true);
    try {
        // Do work
        showSnackbar('Success!', 'success');
        navigateTo('../dashboard/index.html');
    } catch (error) {
        showSnackbar(error.message, 'error');
    } finally {
        showLoading(false);
    }
});
```

#### Cancel with Confirmation
```javascript
document.getElementById('cancel-btn').addEventListener('click', () => {
    if (hasChanges()) {
        showCancelModal();
    } else {
        navigateTo('../dashboard/index.html');
    }
});
```

### Error Handling

Always wrap async operations:
```javascript
try {
    const result = await service.method();
    if (!result.success) {
        throw new Error(result.error);
    }
    // Handle success
} catch (error) {
    console.error('Operation failed:', error);
    showSnackbar(error.message || 'Operation failed', 'error');
}
```

### Testing Checklist

Before committing changes:
- [ ] No console errors
- [ ] Works in student view
- [ ] Works in admin view
- [ ] Loading states show
- [ ] Error messages display
- [ ] Success messages display
- [ ] Navigation works
- [ ] Mobile responsive
- [ ] Tested in Chrome & Firefox

### Common Gotchas

1. **Always await auth**: Use `waitForAuth()` before accessing student data
2. **Check for null**: Student ID might be null in admin view with no selection
3. **Use services**: Don't duplicate Stripe or Firestore logic
4. **Escape HTML**: Always use `escapeHtml()` for user-generated content
5. **Loading states**: Always show/hide loading spinner
6. **Error messages**: Use `showSnackbar()` for user feedback

### File Locations

```
student-portal/
├── js/
│   ├── utils.js              ← Shared utilities
│   └── auth-utils.js         ← Auth helpers
├── prepay/
│   ├── payment-service.js    ← Stripe (reusable)
│   ├── rate-service.js       ← Casual rates
│   └── validation-service.js ← Date validation
└── purchase/
    └── package-service.js    ← Packages
```

### Need Help?

- **Testing**: See `TESTING.md`
- **Refactoring details**: See `REFACTORING_SUMMARY.md`
- **Rollback**: See TESTING.md > Rollback Plan

---

*Last updated: November 15, 2025*
