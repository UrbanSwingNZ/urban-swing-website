# Casual Rates Management System

## Overview

The Casual Rates Management System provides a centralized location for managing per-class pricing (casual entry rates) across the Urban Swing website and admin system. This eliminates hardcoded prices and allows for easy updates without code changes.

## Firestore Collection Structure

### Collection: `casualRates`

Each document in the `casualRates` collection represents a casual rate (e.g., standard casual entry, student casual entry, promotional rates).

**Document Fields:**
- `name` (string): Display name (e.g., "Casual Entry", "Student Casual Entry")
- `price` (number): Price amount (e.g., 15, 12)
- `displayOrder` (number): Sort order for display in UI
- `isActive` (boolean): Whether this rate is currently available
- `isPromo` (boolean): Flag for promotional/temporary rates
- `description` (string, optional): Additional information about the rate
- `createdAt` (timestamp): When the rate was created
- `updatedAt` (timestamp): When the rate was last modified

**Example Documents:**

```javascript
// casualRates/casual-entry
{
  name: "Casual Entry",
  price: 15,
  displayOrder: 1,
  isActive: true,
  isPromo: false,
  description: "",
  createdAt: Timestamp,
  updatedAt: Timestamp
}

// casualRates/student-casual
{
  name: "Student Casual Entry",
  price: 12,
  displayOrder: 2,
  isActive: true,
  isPromo: false,
  description: "Requires valid student ID",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## Admin Interface

### Location
**Admin Tools > Concession Types Manager**

The Concession Types Manager page now includes a "Casual Rates" section at the top of the page, separate from the concession packages below.

### Features
- **Add/Edit Rates**: Create new rates or modify existing ones
- **Toggle Active Status**: Enable/disable rates without deleting them
- **Drag to Reorder**: Change the display order of rates
- **Promotional Rates**: Mark rates as promotional (displays with special styling)
- **Delete Rates**: Remove rates (use with caution as this affects the entire system)

### Visual Distinctions
- Casual rates are displayed in a separate section with different styling
- Active rates have green borders, inactive rates are grayed out
- Promotional rates have orange borders and a special badge

## Files Created/Modified

### New Files Created

1. **`admin/admin-tools/casual-rates/casual-rates.css`**
   - Styling for the casual rates management UI

2. **`admin/admin-tools/casual-rates/casual-rates-display.js`**
   - JavaScript for managing casual rates in the admin interface
   - Handles CRUD operations, drag-and-drop, status toggles

3. **`js/casual-rates-utils.js`**
   - Shared utility functions for fetching casual rates from Firestore
   - Used across the application (check-in, modals, etc.)
   - Includes caching to minimize Firestore reads

4. **`admin/check-in/js/casual-rate-display.js`**
   - Updates the check-in form to display current casual rate price

### Files Modified

5. **`admin/admin-tools/concession-types.html`**
   - Added casual rates section above concession packages
   - Added modals for adding/editing/deleting casual rates
   - Added script references for casual rates functionality

6. **`admin/check-in/index.html`**
   - Added script reference to `casual-rates-utils.js`
   - Added script reference to `casual-rate-display.js`

7. **`admin/check-in/js/main.js`**
   - Added initialization call for `initializeCasualRateDisplay()`

8. **`admin/check-in/js/checkin-firestore.js`**
   - Changed line 141: `amountPaid: entryType === 'casual' ? getCurrentCasualPrice() : 0`
   - Now uses dynamic price instead of hardcoded `15`

9. **`admin/concessions/js/casual-entry-modal.js`**
   - Updated `openCasualEntryModal()` to fetch and display current rate
   - Falls back to provided amount or default if fetch fails

10. **`admin/student-database/js/transaction-history/transaction-history-attendance.js`**
    - Updated to display actual amount paid instead of hardcoded "$15"
    - Shows payment method and amount from transaction data

11. **`functions/index.js`** (Firebase Cloud Function)
    - Added Firestore query to fetch active casual rates
    - Updated welcome email HTML to use dynamic `$${casualRate}` and `$${studentRate}`
    - Updated plain text email to use dynamic rates

12. **`index.html`**
    - Added comment explaining that priceRange is hardcoded for SEO
    - Note: This must be manually updated when rates change

## Locations Where Prices Are Now Dynamic

### ✅ Fully Dynamic (Auto-updates from Firestore)

1. **Check-In System** (`admin/check-in/`)
   - Radio button label: "Casual Entry ($XX.XX)"
   - Transaction amount saved to Firestore
   - Uses: `getCurrentCasualPrice()` from `casual-rate-display.js`

2. **Casual Entry Edit Modal** (`admin/concessions/js/casual-entry-modal.js`)
   - Amount display field
   - Uses: `getStandardCasualRate()` from `casual-rates-utils.js`

3. **Transaction History Display** (`admin/student-database/`)
   - Shows actual amount paid from transaction record
   - Displays: "Casual (payment-method) $XX.XX"

4. **Welcome Emails** (`functions/index.js`)
   - Pricing table in HTML email
   - Pricing section in plain text email
   - Queries Firestore on each new student registration

### ⚠️ Semi-Dynamic (Requires Page Refresh)

5. **Admin Check-In Page**
   - Casual entry label updates when page loads
   - Cached for 5 minutes to reduce Firestore reads
   - Refresh page to see latest rate changes

### 📝 Manual Update Required

6. **Homepage Schema.org Metadata** (`index.html`)
   - `"priceRange": "$12-$15"` is hardcoded for SEO purposes
   - Must be manually updated when rates change significantly
   - Comment added to remind developers

## Usage Examples

### Fetching Rates in JavaScript

```javascript
// Get all active casual rates
const rates = await getCasualRates();

// Get standard (non-student) casual rate
const standardRate = await getStandardCasualRate();
console.log(standardRate.price); // 15

// Get student casual rate
const studentRate = await getStudentCasualRate();
console.log(studentRate.price); // 12

// Get rate by name
const rate = await getCasualRateByName("Casual Entry");

// Get just the price with fallback
const price = await getCasualRatePrice("Casual Entry", 15);

// Clear cache after updating rates
clearCasualRatesCache();
```

### In Check-In System

```javascript
// The check-in system automatically uses the current rate
const price = getCurrentCasualPrice(); // Returns current rate
```

## Caching

The `casual-rates-utils.js` module includes a 5-minute cache to minimize Firestore reads:
- First call fetches from Firestore and caches the result
- Subsequent calls within 5 minutes return cached data
- After 5 minutes, next call re-fetches from Firestore
- Call `clearCasualRatesCache()` to force immediate refresh

## Adding a New Casual Rate

1. Navigate to **Admin Tools > Concession Types Manager**
2. In the "Casual Rates" section, click **"Add Casual Rate"**
3. Fill in the form:
   - **Rate Name**: e.g., "First-Timer Special"
   - **Price**: e.g., 10.00
   - **Description**: (optional) "First class free for new students"
   - **Promotional Rate**: ✓ (if temporary)
   - **Active**: ✓
4. Click **"Save Rate"**
5. Rate is immediately available across the system

## Changing Existing Rates

1. Navigate to **Admin Tools > Concession Types Manager**
2. Find the rate you want to change
3. Click **"Edit"**
4. Update the price or other fields
5. Click **"Save Rate"**
6. Changes take effect immediately (may take up to 5 minutes to reflect due to caching)

## Best Practices

### Do's ✅
- Create promotional rates instead of editing standard rates (preserves history)
- Mark old rates as "Inactive" rather than deleting them
- Use clear, descriptive names (e.g., "Student Casual Entry" not "Student")
- Add descriptions for promotional or special rates

### Don'ts ❌
- Don't delete rates that have been used in historical transactions
- Don't create duplicate rate names
- Don't forget to deactivate promotional rates when they expire
- Don't change the price of historical rates (create new ones instead)

## Troubleshooting

### Rates Not Updating
1. Check that the rate is marked as "Active"
2. Clear browser cache and refresh
3. Check browser console for errors
4. Call `clearCasualRatesCache()` in console to force refresh

### Email Showing Wrong Prices
- Firebase Cloud Function fetches rates in real-time on each email send
- Check that casualRates collection has active rates
- Check Firebase Functions logs for errors

### Check-In Amount Wrong
- Check-in uses `getCurrentCasualPrice()` which is loaded on page load
- Refresh the check-in page to get latest rates
- Verify the rate is active in Firestore

## Future Enhancements

Potential improvements for future versions:
- Real-time updates using Firestore listeners (no refresh needed)
- Rate history tracking (audit log of price changes)
- Scheduled rate changes (activate on specific dates)
- Multiple rate tiers (member vs non-member)
- Dynamic homepage schema.org update via client-side JavaScript

## Migration Notes

When first deploying this system:
1. Create initial casualRates documents in Firestore
2. Verify rates display correctly in admin interface
3. Test check-in flow with new rates
4. Test welcome email sending
5. Update index.html priceRange if needed
6. Deploy Firebase Cloud Function updates

## Support

For questions or issues with the Casual Rates system, contact the development team or refer to the codebase documentation.

**Last Updated**: October 29, 2025
