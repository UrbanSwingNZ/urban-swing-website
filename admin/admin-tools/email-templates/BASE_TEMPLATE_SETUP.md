# Base Template Setup Instructions

## Overview
You need to manually create a `_base-template` document in your Firestore `emailTemplates` collection. This template will be used as the starting point for all new email templates.

## Steps to Create the Base Template

1. Open Firebase Console and navigate to your Firestore database
2. Go to the `emailTemplates` collection
3. Click "Add document"
4. Use the following configuration:

### Document ID
```
_base-template
```

### Fields

**name** (string):
```
Email Base Template
```

**category** (string):
```
other
```

**type** (string):
```
administrative
```

**description** (string):
```
Base template used for creating new email templates. Contains standard header, footer, and social media links.
```

**active** (boolean):
```
false
```

**subject** (string):
```
(leave empty)
```

**htmlTemplate** (string):
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #3534Fa 0%, #9a16f5 50%, #e800f2 100%); padding: 30px; text-align: center;">
    <h1 style="color: white; margin: 0 0 10px 0;">Urban Swing</h1>
    <p style="color: white; margin: 0; font-size: 1.1rem;">Email Title Here</p>
  </div>
  
  <div style="padding: 30px; background: #fff;">
    <h2 style="color: #9a16f5; margin-top: 0;">Hi ${firstName}! 👋</h2>
    
    <p style="font-size: 1rem; line-height: 1.6; color: #333;">
      Start editing your email content here...
    </p>
    
    <p style="margin-top: 30px; font-size: 0.95rem; color: #666; line-height: 1.6;">
      If you have any questions, feel free to reply to this email or contact us at 
      <a href="mailto:dance@urbanswing.co.nz" style="color: #9a16f5;">dance@urbanswing.co.nz</a>.
    </p>

    <p style="font-size: 1rem; color: #333; margin-top: 20px;">
      See you on the dance floor!<br>
      <strong style="color: #9a16f5;">The Urban Swing Team</strong>
    </p>
  </div>
  
  <div style="padding: 20px; text-align: center; background: #f8f9fa; border-top: 1px solid #e0e0e0;">
    <p style="margin: 0 0 15px 0; font-size: 0.9rem; color: #666;">
      Follow us for updates and events:
    </p>
    
    <div style="margin-bottom: 15px;">
      <a href="https://www.facebook.com/UrbanSwingNZ" style="display: inline-block; margin: 0 8px;" target="_blank">
        <img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" alt="Facebook" style="width: 32px; height: 32px; vertical-align: middle;">
      </a>
      <a href="https://www.instagram.com/urbanswingnz" style="display: inline-block; margin: 0 8px;" target="_blank">
        <img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" alt="Instagram" style="width: 32px; height: 32px; vertical-align: middle;">
      </a>
      <a href="https://urbanswing.co.nz" style="display: inline-block; margin: 0 8px;" target="_blank">
        <img src="https://cdn-icons-png.flaticon.com/512/1006/1006771.png" alt="Website" style="width: 32px; height: 32px; vertical-align: middle;">
      </a>
      <a href="mailto:dance@urbanswing.co.nz" style="display: inline-block; margin: 0 8px;">
        <img src="https://cdn-icons-png.flaticon.com/512/732/732200.png" alt="Email" style="width: 32px; height: 32px; vertical-align: middle;">
      </a>
    </div>
  </div>
</div>
```

**textTemplate** (string):
```
Hi ${firstName},

Start editing your plain text email content here...

If you have any questions, feel free to reply to this email or contact us at dance@urbanswing.co.nz.

See you on the dance floor!
The Urban Swing Team

--
Urban Swing
Facebook: https://www.facebook.com/UrbanSwingNZ
Instagram: https://www.instagram.com/urbanswingnz
Website: https://urbanswing.co.nz
Email: dance@urbanswing.co.nz
```

**variables** (array):
```
(leave empty array)
```

**currentVersion** (number):
```
1
```

**versions** (array):
Add one item with these fields:
- **version** (number): `1`
- **createdAt** (timestamp): current timestamp
- **createdBy** (string): your email
- **subject** (string): (empty)
- **htmlTemplate** (string): same as above
- **textTemplate** (string): same as above
- **changeNote** (string): `Initial base template creation`

**createdAt** (timestamp):
```
current timestamp
```

**createdBy** (string):
```
your admin email
```

**updatedAt** (timestamp):
```
current timestamp
```

**updatedBy** (string):
```
your admin email
```

## After Creation

Once the base template is created:
1. Refresh the Email Templates page
2. You should see "Email Base Template" in the "Other" category with a special file-code icon
3. Click on it to view the template
4. You'll see "Copy to New Template" and "Update Template" buttons instead of the normal toolbar
5. Click "Copy to New Template" to test creating a new template from the base
6. Edit the base template anytime by clicking "Update Template" (with confirmation)

## How It Works

- **Copy to New Template**: Opens the modal to create a new template. The HTML and text content will be copied from this base template.
- **Update Template**: Opens a warning modal, then saves your changes to the base template. This affects all future templates created from this base.
- The base template cannot be deleted (no delete button shown).
- Regular templates require a subject line before saving; the base template does not.
