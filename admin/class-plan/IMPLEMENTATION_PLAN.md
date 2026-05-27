# Class Plan Level 1 & Level 2 Implementation Plan

## Overview
Transform the Class Plan system to support two teaching levels with a tabbed interface and historical archive.

**Start Date:** June 4, 2026 (Week 1 of Level 1 cycle)  
**History Cutoff:** May 31, 2026 (everything before goes to History tab)  
**Cycle Length:** 12 weeks (configurable)

---

## 1. Data Structure Changes

### 1.1 Firestore Document Schema Updates

#### New Fields for `classPlans` Collection
```javascript
{
  // Existing fields
  date: Timestamp,
  move1: string,
  move2: string,
  move3: string,
  notes: string,
  weekNumber: number,      // Now used differently per level
  blockSize: number,
  createdAt: Timestamp,
  createdBy: string,
  updatedAt: Timestamp,
  updatedBy: string,
  
  // NEW FIELDS
  classLevel: "level1" | "level2",  // Required - indicates which level
  cycleWeek: number                 // For level1 only (1-12), null for level2
}
```

#### Level 1 Documents
- `classLevel: "level1"`
- `cycleWeek: 1-12` (fixed position in cycle)
- `date: null` or optional (not used for display)
- `weekNumber: null` (not needed for level1)
- `blockSize: 12` (standard)

#### Level 2 Documents
- `classLevel: "level2"`
- `cycleWeek: null` (not used)
- `date: Timestamp` (actual class date)
- `weekNumber: calculated` (which week in the current cycle)
- `blockSize: 12`

### 1.2 Settings Document Updates

**Collection:** `settings`  
**Document:** `classPlans`

```javascript
{
  // Existing
  blockSize: 12,
  updatedAt: Timestamp,
  updatedBy: string,
  
  // NEW FIELDS
  cycleStartDate: Timestamp("2026-06-04T00:00:00"),  // First day of Week 1
  historyCutoffDate: Timestamp("2026-05-31T23:59:59") // Everything before = history
}
```

### 1.3 Data Migration Script

**Purpose:** Update all existing documents to new schema

```javascript
// Pseudo-code for migration
const batch = db.batch();
const existingDocs = await db.collection('classPlans').get();

existingDocs.forEach(doc => {
  batch.update(doc.ref, {
    classLevel: 'level2',  // All existing are Level 2
    cycleWeek: null        // Not used for Level 2
  });
});

await batch.commit();
```

**Migration Steps:**
1. Backup Firestore data
2. Run migration script to add `classLevel: 'level2'` to all existing docs
3. Create settings document with cycle/cutoff dates
4. Verify migration in Firebase Console

---

## 2. UI Structure Changes

### 2.1 Tab System

**Three Tabs:**
1. **Level 1** - Fixed 12-week curriculum cycle
2. **Level 2** - Current/upcoming classes (≥ June 1, 2026)
3. **History** - Past classes (≤ May 31, 2026)

**HTML Structure:**
```html
<div class="tabs-container">
  <div class="tabs-header">
    <button class="tab-btn active" data-tab="level1">Level 1</button>
    <button class="tab-btn" data-tab="level2">Level 2</button>
    <button class="tab-btn" data-tab="history">History</button>
  </div>
  
  <div class="tab-content" id="level1-tab">
    <!-- Level 1 content -->
  </div>
  
  <div class="tab-content" id="level2-tab" style="display: none;">
    <!-- Level 2 content -->
  </div>
  
  <div class="tab-content" id="history-tab" style="display: none;">
    <!-- History content -->
  </div>
</div>
```

### 2.2 Level 1 Tab Layout

**Features:**
- Display all 12 weeks in ascending order (Week 1 → Week 12)
- Grid layout: 3-4 columns on desktop, 1-2 on mobile
- Empty weeks show "Add Moves" button
- Filled weeks show moves + "Edit" button
- **NO DELETE** capability
- Current week highlighted (see styling section)
- Cycle progress indicator at top

**Card States:**
- Empty (placeholder card with "Add Moves" button)
- Filled (shows moves, editable)
- Current (filled + highlighted styling)

**Top Indicator:**
```
Currently Teaching: Week 3 of 12
[Progress Bar: ▓▓▓░░░░░░░░░]
```

### 2.3 Level 2 Tab Layout

**Features:**
- Display classes in descending order (newest first)
- Shows classes from June 1, 2026 onward
- Full add/edit/delete capabilities
- Search functionality active
- Shows date + week number (e.g., "June 5, 2026 - Week 1 of 12")
- "Add Class Plan" button visible
- Settings section visible (block size, cycle start, etc.)

**Essentially:** Current implementation but with date filter applied

### 2.4 History Tab Layout

**Features:**
- Display classes in descending order (newest first)
- Shows classes ≤ May 31, 2026
- Search functionality active
- **NO ADD** button (archive is read-only for new entries)
- Edit capability: **YES** (allow updating notes/moves for historical record)
- Delete capability: **YES** (in case of mistakes)
- Displays with same card style as Level 2

### 2.5 Actions Bar Visibility

| Element | Level 1 Tab | Level 2 Tab | History Tab |
|---------|-------------|-------------|-------------|
| Add Class Plan Button | Hidden | Visible | Hidden |
| Search Input | Hidden | Visible | Visible |
| Settings (Block Size, etc.) | Hidden | Visible | Hidden |

**Note:** Settings affect the entire system, so only show on Level 2 tab to avoid confusion

---

## 3. JavaScript Logic Changes

### 3.1 Current Week Calculation

```javascript
/**
 * Calculate which week in the Level 1 cycle we're currently teaching
 * @returns {number} Current week number (1-12)
 */
function getCurrentCycleWeek() {
  const today = new Date();
  const cycleStartDate = new Date(settings.cycleStartDate.toDate());
  
  // Calculate days since cycle started
  const daysSinceStart = Math.floor((today - cycleStartDate) / (1000 * 60 * 60 * 24));
  
  // Calculate weeks (assuming classes are weekly)
  const weeksSinceStart = Math.floor(daysSinceStart / 7);
  
  // Get current week in cycle (1-12, repeating)
  const currentWeek = (weeksSinceStart % settings.blockSize) + 1;
  
  return currentWeek;
}
```

**Edge Cases:**
- Before cycle start: return 0 or null, show "Cycle starts [date]"
- Negative dates: handle gracefully

### 3.2 Data Loading Functions

**Refactor `loadClassPlans()` into three functions:**

```javascript
async function loadLevel1Plans() {
  // Query: classLevel == 'level1'
  // Order by: cycleWeek ASC
  // Display: All 12 weeks (show empty placeholders for missing weeks)
  // Highlight: currentWeek
}

async function loadLevel2Plans() {
  // Query: classLevel == 'level2' AND date >= June 1, 2026
  // Order by: date DESC
  // Display: Standard cards with full edit/delete
}

async function loadHistoryPlans() {
  // Query: classLevel == 'level2' AND date <= May 31, 2026
  // Order by: date DESC
  // Display: Standard cards with edit/delete
}
```

### 3.3 Tab Switching Logic

```javascript
function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none';
  });
  
  // Remove active class from all buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show selected tab
  document.getElementById(`${tabName}-tab`).style.display = 'block';
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  
  // Load data for selected tab
  if (tabName === 'level1') {
    loadLevel1Plans();
    hideSearchAndActions();
  } else if (tabName === 'level2') {
    loadLevel2Plans();
    showSearchAndActions();
  } else if (tabName === 'history') {
    loadHistoryPlans();
    showSearchOnly();
  }
  
  // Save preference to localStorage
  localStorage.setItem('classPlanActiveTab', tabName);
}
```

### 3.4 Modal Logic Updates

**Add Class Plan Modal:**
- When on Level 1 tab + clicking "Add" for specific week:
  - Pre-populate `cycleWeek` field
  - Hide date picker (not needed)
  - Save with `classLevel: 'level1'`
  
- When on Level 2 tab + clicking "Add Class Plan":
  - Show date picker (Thursday only)
  - Calculate and display week number
  - Save with `classLevel: 'level2'`

**Edit Modal:**
- Detect document's `classLevel`
- For level1: hide date picker, show week number
- For level2: show date picker, allow full edit

### 3.5 Form Submission Updates

```javascript
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const activeTab = getCurrentActiveTab(); // 'level1', 'level2', or 'history'
  
  if (activeTab === 'level1') {
    // Save as Level 1 document
    const planData = {
      classLevel: 'level1',
      cycleWeek: selectedWeekNumber, // from modal context
      move1: ...,
      move2: ...,
      move3: ...,
      notes: ...,
      date: null, // optional
      weekNumber: null,
      blockSize: currentBlockSize,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: currentUser.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: currentUser.uid
    };
  } else {
    // Save as Level 2 document (existing logic)
    const planData = {
      classLevel: 'level2',
      cycleWeek: null,
      date: datePicker.selectedDate,
      move1: ...,
      move2: ...,
      move3: ...,
      notes: ...,
      weekNumber: calculateWeekNumber(date), // based on cycle
      blockSize: currentBlockSize,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: currentUser.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: currentUser.uid
    };
  }
  
  await saveToFirestore(planData);
}
```

### 3.6 Week Number Calculation for Level 2

```javascript
/**
 * Calculate which week number a date falls into
 * @param {Date} classDate - The date of the class
 * @returns {number} Week number in cycle (1-12)
 */
function calculateWeekNumber(classDate) {
  const cycleStartDate = new Date(settings.cycleStartDate.toDate());
  const daysDiff = Math.floor((classDate - cycleStartDate) / (1000 * 60 * 60 * 24));
  const weeksDiff = Math.floor(daysDiff / 7);
  const weekNumber = (weeksDiff % settings.blockSize) + 1;
  return weekNumber;
}
```

---

## 4. CSS Styling Changes

### 4.1 Tab Styles

```css
/* Tabs Container */
.tabs-container {
  background: var(--white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  margin-bottom: var(--space-lg);
}

/* Tab Header */
.tabs-header {
  display: flex;
  border-bottom: 2px solid var(--border-light);
  background: var(--bg-light);
}

.tab-btn {
  flex: 1;
  padding: var(--space-md) var(--space-lg);
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tab-btn:hover {
  background: var(--white);
  color: var(--purple-primary);
}

.tab-btn.active {
  background: var(--white);
  color: var(--purple-primary);
  border-bottom-color: var(--purple-primary);
}

/* Tab Content */
.tab-content {
  padding: var(--space-lg);
  min-height: 400px;
}

/* Mobile: Stack tabs vertically if needed */
@media (max-width: 640px) {
  .tabs-header {
    flex-direction: column;
  }
  
  .tab-btn {
    text-align: left;
    border-bottom: none;
    border-left: 3px solid transparent;
  }
  
  .tab-btn.active {
    border-left-color: var(--purple-primary);
  }
}
```

### 4.2 Current Week Highlight (Level 1)

**Reference Style:** Promo concession cards from Admin Tools > Concession Types

```css
/* Current week highlight - matches promo card styling */
.class-plan-card.current-week {
  border-color: var(--text-orange);  /* #ff9800 */
  background: var(--gradient-warning); /* linear-gradient(135deg, var(--warning-light), var(--warning-lightest)) */
}

.class-plan-card.current-week:hover {
  /* Maintain highlight on hover */
  border-color: var(--text-orange);
  background: var(--gradient-warning);
}
```

**NO badge/icon** - just the border and gradient background highlight.

### 4.3 Level 1 Cycle Progress Indicator

```css
.cycle-progress-indicator {
  background: var(--bg-light);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  margin-bottom: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.cycle-progress-text {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  text-align: center;
}

.progress-bar-container {
  width: 100%;
  height: 8px;
  background: var(--bg-gray);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--gradient-blue-purple);
  transition: width var(--transition-base);
}
```

### 4.4 Level 1 Empty Week Card

```css
.class-plan-card.empty-week {
  background: var(--bg-light);
  border: 2px dashed var(--border-light);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  cursor: pointer;
  transition: all var(--transition-base);
}

.class-plan-card.empty-week:hover {
  border-color: var(--purple-primary);
  background: var(--bg-purple-light);
  transform: translateY(-2px);
}

.empty-week-label {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-muted);
  margin-bottom: var(--space-sm);
}

.empty-week .btn-add {
  margin-top: var(--space-sm);
}
```

### 4.5 Level 1 Grid Layout

```css
/* Level 1 specific grid - always show 12 cards */
#level1-tab .class-plans-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-md);
}

@media (min-width: 1200px) {
  #level1-tab .class-plans-container {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 768px) and (max-width: 1199px) {
  #level1-tab .class-plans-container {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 767px) {
  #level1-tab .class-plans-container {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

---

## 5. Settings UI Updates

### 5.1 New Settings Fields

Add to the settings section (visible on Level 2 tab only):

```html
<div class="settings-inline">
  <label for="block-size-input" class="setting-label">
    Block Size (weeks):
  </label>
  <input type="number" id="block-size-input" min="1" max="52" value="12" />
  <button class="btn-primary btn-sm" id="save-block-size-btn">
    <i class="fas fa-save"></i> Save
  </button>
</div>

<div class="settings-inline">
  <label for="cycle-start-date" class="setting-label">
    Cycle Start Date:
  </label>
  <input type="date" id="cycle-start-date" value="2026-06-04" />
  <button class="btn-primary btn-sm" id="save-cycle-start-btn">
    <i class="fas fa-save"></i> Save
  </button>
</div>

<div class="settings-inline">
  <label for="history-cutoff-date" class="setting-label">
    History Cutoff Date:
  </label>
  <input type="date" id="history-cutoff-date" value="2026-05-31" />
  <button class="btn-primary btn-sm" id="save-history-cutoff-btn">
    <i class="fas fa-save"></i> Save
  </button>
</div>
```

### 5.2 Settings Functions

```javascript
async function saveCycleStartDate() {
  const input = document.getElementById('cycle-start-date');
  const dateValue = new Date(input.value);
  
  await db.collection('settings').doc('classPlans').update({
    cycleStartDate: firebase.firestore.Timestamp.fromDate(dateValue),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedBy: currentUser.uid
  });
  
  showSnackbar('Cycle start date updated', 'success');
  // Reload Level 1 and Level 2 tabs to reflect changes
}

async function saveHistoryCutoffDate() {
  const input = document.getElementById('history-cutoff-date');
  const dateValue = new Date(input.value);
  
  await db.collection('settings').doc('classPlans').update({
    historyCutoffDate: firebase.firestore.Timestamp.fromDate(dateValue),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedBy: currentUser.uid
  });
  
  showSnackbar('History cutoff date updated', 'success');
  // Reload Level 2 and History tabs to reflect changes
}
```

---

## 6. Implementation Steps (Order of Execution)

**REVISED ORDER:** Level 2 before Level 1 for progressive enhancement and early functionality.

### Phase 1: Data Foundation (30 min) ✅ COMPLETE
1. ✅ **Add May 28 class plan** (COMPLETED)
2. ✅ Create settings document with `cycleStartDate` and `historyCutoffDate`
3. ✅ Create and run data migration script to add `classLevel: 'level2'` to all existing docs
4. ✅ Verify data in Firebase Console
5. ✅ Create Firestore composite indexes for queries
6. **Milestone:** Data structure is ready ✅

### Phase 2: Tabs + History (1 hour) ✅ COMPLETE
1. ✅ Add tab HTML structure to `index.html`
2. ✅ Add tab CSS (header, buttons, content areas)
3. ✅ Add basic tab switching JavaScript
4. ✅ Wire up History tab query (`classLevel == 'level2' AND date <= May 31`)
5. ✅ Test: May 28 class appears in History tab
6. **Milestone:** Can see existing data in History tab ✅

### Phase 3: Level 2 Tab (1.5 hours) ✅ COMPLETE
1. ✅ Create `loadLevel2Plans()` function (query: `date >= June 1`)
2. ✅ Conditional UI visibility (actions bar in level2 tab content)
3. ✅ Update form submission to add `classLevel: 'level2'`
4. ✅ Tab-specific search functionality
5. ✅ Edit/delete reload current tab
6. ✅ Delete migration.html file
7. **Milestone:** Level 2 is fully functional for future classes ✅

### Phase 4: Level 1 Tab (2-3 hours) ⭐ NEXT
1. Create `loadLevel1Plans()` function (query: `classLevel == 'level1'`)
2. Generate 12-week grid with placeholder cards for empty weeks
3. Add current week calculation function
4. Add current week highlighting (promo card style: orange border + warning gradient)
5. Create cycle progress indicator at top of Level 1 tab
6. Update modal to handle Level 1 (hide date picker, show week number)
7. Wire up add/edit for Level 1 weeks (NO delete)
8. Test all 12 weeks display correctly
9. Test current week highlighting updates
10. **Milestone:** Level 1 cycle management works

### Phase 5: Settings UI (30 min)
1. Add cycle start date input field to settings section
2. Add history cutoff date input field to settings section
3. Add save handlers for new date fields
4. Test changing cycle start date and seeing current week update
5. Test changing history cutoff and seeing classes move between Level 2/History
6. **Milestone:** All settings configurable

### Phase 6: Polish & Testing (1 hour)
1. Test all three tabs thoroughly
2. Test mobile responsiveness
3. Test edge cases (before cycle start, no data, partial Level 1, etc.)
4. Add loading states for each tab
5. Add empty states for each tab
6. Ensure smooth tab transitions
7. Final UI tweaks and polish
8. **Milestone:** Production ready

---

## 7. Firestore Query Examples

### Level 1 Query
```javascript
const level1Query = db.collection('classPlans')
  .where('classLevel', '==', 'level1')
  .orderBy('cycleWeek', 'asc');
```

### Level 2 Query
```javascript
const cutoffDate = firebase.firestore.Timestamp.fromDate(new Date('2026-06-01'));
const level2Query = db.collection('classPlans')
  .where('classLevel', '==', 'level2')
  .where('date', '>=', cutoffDate)
  .orderBy('date', 'desc');
```

### History Query
```javascript
const historyCutoff = firebase.firestore.Timestamp.fromDate(new Date('2026-05-31T23:59:59'));
const historyQuery = db.collection('classPlans')
  .where('classLevel', '==', 'level2')
  .where('date', '<=', historyCutoff)
  .orderBy('date', 'desc');
```

**Note:** Firestore composite indexes will be needed:
- `classLevel` + `cycleWeek` (Level 1)
- `classLevel` + `date` (Level 2 and History)

---

## 8. Edge Cases & Considerations

### 8.1 Before Cycle Start (Before June 4, 2026)
- Current week calculation returns 0 or negative
- Show message: "Cycle starts on June 4, 2026"
- Don't highlight any Level 1 card
- Or highlight Week 1 as "Starting Soon"

### 8.2 Partial Level 1 Completion
- Only 5 of 12 weeks filled in
- Show 5 filled cards + 7 empty placeholder cards
- All 12 cards always visible

### 8.3 Changing Cycle Start Date
- Affects current week calculation
- Affects Level 2 week number calculations
- Requires reload of Level 1 and Level 2 tabs
- Show confirmation: "This will recalculate all week numbers"

### 8.4 Changing History Cutoff Date
- Moves classes between Level 2 and History tabs
- Show confirmation: "This will reclassify classes between Level 2 and History"
- Reload Level 2 and History tabs after save

### 8.5 Deleting Level 1 Weeks
- **Not allowed** - no delete button on Level 1 cards
- Maintains integrity of 12-week cycle
- Can edit to clear moves, but card remains

### 8.6 Search Functionality
- Level 1: No search (only 12 items, always visible)
- Level 2: Search works (current behavior)
- History: Search works (current behavior)
- Hide/show search input based on active tab

### 8.7 Empty States
- **Level 1:** Never empty (always shows 12 cards)
- **Level 2:** "No upcoming classes yet. Click 'Add Class Plan' to create one!"
- **History:** "No historical classes found."

---

## 9. Testing Checklist

### Data Migration
- [ ] All existing documents have `classLevel: 'level2'`
- [ ] May 28 class appears in History tab
- [ ] No data loss during migration
- [ ] Settings document created correctly

### Level 1 Tab
- [ ] All 12 weeks display in order (Week 1-12)
- [ ] Empty weeks show placeholder with "Add Moves"
- [ ] Current week is highlighted correctly
- [ ] Cycle progress indicator shows correct week
- [ ] No delete button on cards
- [ ] Edit works correctly
- [ ] No search input visible
- [ ] No "Add Class Plan" button visible
- [ ] No settings visible

### Level 2 Tab
- [ ] Only classes from June 1 onward display
- [ ] Sorted in descending order (newest first)
- [ ] Add Class Plan button visible and works
- [ ] Edit works correctly
- [ ] Delete works correctly
- [ ] Search input visible and functional
- [ ] Settings visible and functional
- [ ] Week numbers calculate correctly
- [ ] Date picker works (Thursday only)

### History Tab
- [ ] Only classes before June 1 display
- [ ] Sorted in descending order (newest first)
- [ ] May 28 class appears
- [ ] Edit works correctly
- [ ] Delete works correctly
- [ ] Search input visible and functional
- [ ] No "Add Class Plan" button visible
- [ ] No settings visible

### Tab Switching
- [ ] Tabs switch smoothly
- [ ] Active tab indicated clearly
- [ ] Tab preference saved to localStorage
- [ ] Correct data loaded for each tab
- [ ] Correct UI elements shown for each tab

### Mobile Responsiveness
- [ ] Tabs work on mobile (swipeable if implemented)
- [ ] Level 1 grid: 2 columns on mobile
- [ ] Level 2 grid: 1 column on mobile
- [ ] History grid: 1 column on mobile
- [ ] All buttons accessible
- [ ] No horizontal scrolling

### Settings
- [ ] Cycle start date saves correctly
- [ ] History cutoff date saves correctly
- [ ] Block size saves correctly
- [ ] Changes reflect immediately in UI
- [ ] Validation works (can't set invalid dates)

---

## 10. Potential Issues & Solutions

### Issue 1: Firestore Index Requirements
**Problem:** Queries with multiple `where` + `orderBy` require composite indexes

**Solution:** Create indexes via Firebase Console or firestore.indexes.json:
```json
{
  "indexes": [
    {
      "collectionGroup": "classPlans",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "classLevel", "order": "ASCENDING" },
        { "fieldPath": "cycleWeek", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "classPlans",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "classLevel", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### Issue 2: Current Week Calculation Across Midnight
**Problem:** If checking at 11:59 PM vs 12:01 AM, might show different weeks

**Solution:** Use consistent time reference (e.g., always check against midnight of current day)

### Issue 3: Missing Level 1 Weeks
**Problem:** If you've only created 3 of 12 weeks, need to show placeholders

**Solution:** 
```javascript
// Generate array of 12 weeks
const allWeeks = Array.from({length: 12}, (_, i) => i + 1);
// Merge with existing data
const level1Plans = allWeeks.map(weekNum => {
  const existingPlan = plansFromDb.find(p => p.cycleWeek === weekNum);
  return existingPlan || { cycleWeek: weekNum, isEmpty: true };
});
```

### Issue 4: Tab State Persistence
**Problem:** User switches tabs, refreshes page, loses tab selection

**Solution:** Save to localStorage:
```javascript
localStorage.setItem('classPlanActiveTab', 'level2');
// On load:
const savedTab = localStorage.getItem('classPlanActiveTab') || 'level2';
switchTab(savedTab);
```

---

## 11. Files to Modify

### HTML
- `admin/class-plan/index.html` - Add tab structure, update content sections

### CSS
- `admin/class-plan/class-plan.css` - Add tab styles, current week highlight, empty week styles

### JavaScript
- `admin/class-plan/class-plan.js` - Major refactor for tab logic, data loading, modal handling

### Firestore
- Migration script (one-time run)
- `config/firestore.indexes.json` - Add composite indexes

### Documentation
- This implementation plan (reference during development)

---

## 12. Success Criteria

✅ **Level 1 Tab:**
- All 12 weeks visible in order
- Current week highlighted with orange border and warning gradient
- Empty weeks show as placeholders
- No delete functionality

✅ **Level 2 Tab:**
- Shows current/future classes (≥ June 1, 2026)
- Sorted newest first
- Full CRUD functionality
- Search works

✅ **History Tab:**
- Shows past classes (≤ May 31, 2026)
- Sorted newest first
- Edit/delete works
- Search works

✅ **General:**
- Tab switching is smooth and intuitive
- Mobile-friendly
- No data loss
- Settings work correctly
- May 28 class appears in History

---

## 13. Timeline Estimate

- **Phase 1 (Data/Backend):** 30 minutes
- **Phase 2 (HTML):** 45 minutes
- **Phase 3 (CSS):** 45 minutes
- **Phase 4 (JavaScript):** 2-3 hours (most complex)
- **Phase 5 (Testing):** 1 hour
- **Phase 6 (Polish):** 30 minutes

**Total Estimate:** 5-6 hours of development time

---

## Notes
- This plan maintains backward compatibility with existing data
- All existing class plans become Level 2/History entries
- Level 1 starts as a clean slate
- The May 28 class serves as a test case for the History tab functionality
