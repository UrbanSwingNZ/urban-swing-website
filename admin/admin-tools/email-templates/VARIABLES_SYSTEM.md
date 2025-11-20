# Email Template Variables System

## Overview
The email template system now includes comprehensive variable management with a visual UI and enhanced editor integration.

## Features

### 1. Variables Management UI (Settings Tab)

**Location:** Settings tab → Template Variables section

**Features:**
- ✅ Add new variables with name, description, and example
- ✅ Edit existing variables
- ✅ Delete variables with confirmation
- ✅ Table view showing all variables

**How to Use:**
1. Open any email template
2. Click the **Settings** tab
3. Scroll to **Template Variables** section
4. Click **Add Variable** to create a new one

**Variable Fields:**
- **Name** (required): The variable identifier (e.g., `firstName`, `totalAmount`)
  - Must be valid JavaScript identifier (letters, numbers, underscore, dollar sign)
  - Use camelCase convention
- **Description** (required): What the variable represents
- **Example** (optional): Sample value to help template creators

### 2. Visual Editor Integration

**Variables are now visually distinct in the Visual Editor:**
- Styled as purple gradient pills/badges
- Easy to identify at a glance
- Non-editable (prevents accidental modification)
- Hover effect for better UX

**Insert Variables in Visual Editor:**
1. Click the **Variable** dropdown in the toolbar
2. Select from available variables
3. Variable is inserted at cursor position with styling

### 3. Code Editor Integration

**Variables work as before in Code Editor:**
- Click any variable in the "Available Variables" sidebar
- Inserts `${variableName}` at cursor position
- Works for both HTML and Text templates

### 4. Automatic Variable Wrapping

**Visual Editor automatically wraps variables:**
- When you load a template with existing `${variable}` syntax
- After pasting content with variables
- Variables are converted to styled pills automatically

## Using Variables in Templates

### Syntax
```
${variableName}
```

### Examples

**Simple variable:**
```html
<p>Hi ${firstName}!</p>
```

**Nested properties:**
```html
<p>Your email is ${student.email}</p>
```

**Conditional (ternary):**
```html
<p>${hasUserAccount ? 'Welcome back!' : 'Please register'}</p>
```

**With default value:**
```html
<p>${phoneNumber || 'No phone provided'}</p>
```

**Math expressions:**
```html
<p>Total: $${casualRate * 5 - discount}</p>
```

## How Variables Are Rendered

Variables are replaced when emails are sent:

1. **Template defines variables** in the Settings tab
2. **Backend provides values** when sending email
3. **Variables are replaced** before email is sent
4. **Recipient sees actual values** (not `${variableName}`)

### Example Flow:

**Template:**
```
Hi ${firstName},

Your class on ${classDate} is confirmed!
Total: $${totalAmount}
```

**Data provided:**
```javascript
{
  firstName: "Sarah",
  classDate: "Dec 15, 2025",
  totalAmount: 75
}
```

**Email sent:**
```
Hi Sarah,

Your class on Dec 15, 2025 is confirmed!
Total: $75
```

## Common Variables

Here are some commonly used variables across templates:

### Student Data
- `firstName` - Student's first name
- `lastName` - Student's last name
- `email` - Student's email address
- `phoneNumber` - Student's phone number
- `pronouns` - Student's pronouns

### Pricing
- `casualRate` - Single class price
- `studentRate` - Student discount rate
- `fiveClassPrice` - 5-class package price
- `tenClassPrice` - 10-class package price

### Account Info
- `hasUserAccount` - Boolean: has student portal access
- `studentId` - Unique student ID

### Class Info
- `classDate` - Date of class
- `className` - Name of class/event
- `instructor` - Instructor name

### System
- `registeredAt` - When student registered
- `setupDate` - When account was set up

## Best Practices

1. **Use descriptive names**: `totalAmount` instead of `total`
2. **Follow camelCase**: `firstName` not `first_name`
3. **Add descriptions**: Help other admins understand what each variable does
4. **Provide examples**: Makes it easier to understand expected values
5. **Test before sending**: Use the Preview feature with real student data
6. **Don't delete variables in use**: Check template content before deleting

## Troubleshooting

### Variables not showing in Visual Editor dropdown?
- Make sure you've added them in the Settings tab
- Save the template after adding variables
- Refresh the page if needed

### Variables look like plain text in Visual Editor?
- Switch to Code Editor and back to Visual Editor
- The system will automatically wrap them with styling

### Variable not being replaced in emails?
- Check that the backend provides that variable when sending
- Verify variable name spelling matches exactly
- Check Firebase Functions logs for errors

### Can't edit variable content in Visual Editor?
- This is intentional - variables are marked as non-editable
- To change a variable, delete it and insert again
- Or switch to Code Editor for manual editing

## Technical Details

### Files Modified
- `index.html` - Added variables table UI and modal
- `email-templates.css` - Variable styling (badges, table)
- `modules/ui/variable-manager.js` - NEW: Variable CRUD operations
- `modules/ui/template-editor.js` - Load variables table
- `modules/core/editor.js` - Enhanced TinyMCE with variable insertion
- `modules/ui/event-listeners.js` - Wired up variable UI events

### Storage
Variables are stored in Firestore in the `emailTemplates` collection:

```javascript
{
  variables: [
    {
      name: "firstName",
      description: "Student's first name",
      example: "John"
    },
    // ... more variables
  ]
}
```

### TinyMCE Integration
- Custom toolbar button: `insertvariable`
- Custom content styling for `.template-variable` class
- Automatic wrapping on load and paste
- Protected patterns prevent encoding issues
