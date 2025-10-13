# How to Modernize Additional Pages

This guide explains how to update any remaining or new pages to use the modern design system.

---

## Quick Modernization Checklist

When updating a page, follow these steps:

### 1. Update the Stylesheet Link
```html
<!-- OLD -->
<link rel="stylesheet" href="styles.css">

<!-- NEW -->
<link rel="stylesheet" href="css/modern-styles.css">
```

### 2. Remove Inline Styles
Remove any `<style>` tags or inline `style=""` attributes. Use CSS classes instead.

### 3. Update the Main Structure
```html
<!-- OLD -->
<body>
  <div class="content-wrapper">
    <h1>Page Title</h1>
    <div>
      <!-- Content -->
    </div>
  </div>
</body>

<!-- NEW -->
<body>
  <!-- Header will be dynamically loaded by script.js -->
  
  <main class="main-content">
    <div class="container">
      <h1 class="page-title">Page Title</h1>
      
      <section class="card">
        <div class="card-body">
          <!-- Content -->
        </div>
      </section>
    </div>
  </main>
  
  <script src="script.js" defer></script>
</body>
```

### 4. Wrap Content in Cards
Group related content into card sections:

```html
<section class="card" aria-labelledby="section-heading">
  <div class="card-header">
    <h2 id="section-heading">Section Title</h2>
  </div>
  <div class="card-body">
    <!-- Your content here -->
  </div>
</section>
```

### 5. Update Buttons
```html
<!-- OLD -->
<a href="#" class="old-button-class">Click Me</a>

<!-- NEW -->
<a href="#" class="btn btn-primary">
  <i class="fas fa-icon-name"></i>
  Click Me
</a>
```

### 6. Add Icons (Optional)
Include Font Awesome icons for visual interest:

```html
<h3>
  <i class="fas fa-check-circle"></i>
  Heading with Icon
</h3>
```

### 7. Fix External Links
Add security attributes to external links:

```html
<a href="https://external-site.com" 
   target="_blank" 
   rel="noopener noreferrer">
  External Link
</a>
```

---

## Common Patterns

### Pattern: Simple Content Page

**Use for:** Basic informational pages

```html
<main class="main-content">
  <div class="container">
    <h1 class="page-title">Page Title</h1>
    
    <section class="card">
      <div class="card-body">
        <p>Your content here...</p>
      </div>
    </section>
  </div>
</main>
```

**Examples:** policies.html, simple info pages

---

### Pattern: Multi-Section Page

**Use for:** Pages with distinct sections

```html
<main class="main-content">
  <div class="container">
    <h1 class="page-title">Page Title</h1>
    
    <section class="card">
      <div class="card-header">
        <h2>First Section</h2>
      </div>
      <div class="card-body">
        <p>Section 1 content...</p>
      </div>
    </section>
    
    <section class="card">
      <div class="card-header">
        <h2>Second Section</h2>
      </div>
      <div class="card-body">
        <p>Section 2 content...</p>
      </div>
    </section>
  </div>
</main>
```

**Examples:** classes.html, index.html

---

### Pattern: FAQ/List Page

**Use for:** Question/answer or list-based content

```html
<main class="main-content">
  <div class="container">
    <h1 class="page-title">FAQs</h1>
    
    <section class="card">
      <div class="card-body">
        <article class="faq-item">
          <h3 class="faq-question">
            <i class="fas fa-question-circle"></i>
            Question 1?
          </h3>
          <p class="faq-answer">Answer 1...</p>
        </article>
        
        <article class="faq-item">
          <h3 class="faq-question">
            <i class="fas fa-question-circle"></i>
            Question 2?
          </h3>
          <p class="faq-answer">Answer 2...</p>
        </article>
      </div>
    </section>
  </div>
</main>
```

**Examples:** faqs.html

---

### Pattern: Profile/Bio Page

**Use for:** Team members, testimonials, case studies

```html
<main class="main-content">
  <div class="container">
    <h1 class="page-title">Meet the Team</h1>
    
    <section class="card">
      <div class="card-body">
        <table class="crew-table">
          <tbody>
            <tr>
              <td class="crew-photo">
                <img src="/images/person.jpg" 
                     alt="Person Name" 
                     class="crew-img">
              </td>
              <td class="crew-info">
                <h2>Person Name</h2>
                <p>Bio text here...</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</main>
```

**Examples:** meet-the-crew.html

---

### Pattern: Grid/Directory Page

**Use for:** Lists of locations, resources, links

```html
<main class="main-content">
  <div class="container">
    <h1 class="page-title">Directory</h1>
    
    <section class="card">
      <div class="card-body">
        <div class="other-classes-container">
          <div>
            <h3><i class="fas fa-map-marker-alt"></i> Location 1</h3>
            <p><a href="#">Link 1</a></p>
          </div>
          
          <div>
            <h3><i class="fas fa-map-marker-alt"></i> Location 2</h3>
            <p><a href="#">Link 2</a></p>
          </div>
        </div>
      </div>
    </section>
  </div>
</main>
```

**Examples:** wcs-around-nz.html

---

## Component Reference

### Available CSS Classes

#### Layout
- `.main-content` - Main page wrapper
- `.container` - Content container with max-width

#### Typography
- `.page-title` - Main h1 heading
- `.tagline` - Subtitle text

#### Cards
- `.card` - Card wrapper
- `.card-header` - Card header section
- `.card-body` - Card content section

#### Buttons
- `.btn` - Base button style
- `.btn-primary` - Primary purple button
- `.btn-secondary` - Secondary pink button
- `.btn-large` - Larger button size

#### Navigation
- `.nav-buttons` - Navigation button container
- `.nav-btn` - Individual nav button

#### Tables
- `.class-details-table` - Class info table
- `.pricing-table` - Pricing table
- `.crew-table` - Team member table
- `.indent-only` - Indented table cell
- `.indent-with-italics` - Indented italic cell

#### FAQ
- `.faq-item` - Individual FAQ wrapper
- `.faq-question` - Question heading
- `.faq-answer` - Answer text

#### Other
- `.other-classes-container` - Grid container for lists
- `.crew-photo` - Crew photo cell
- `.crew-img` - Crew photo image
- `.crew-info` - Crew bio cell

---

## CSS Variables Available

### Colors
```css
var(--accent-primary)      /* #7c3aed - Purple */
var(--accent-secondary)    /* #ec4899 - Pink */
var(--text-primary)        /* #1f2937 - Dark gray */
var(--text-secondary)      /* #6b7280 - Medium gray */
var(--bg-primary)          /* #0f172a - Dark blue */
var(--bg-secondary)        /* #1e293b - Lighter dark blue */
var(--border-light)        /* #e5e7eb - Light gray */
```

### Spacing
```css
var(--space-xs)    /* 4px */
var(--space-sm)    /* 8px */
var(--space-md)    /* 16px */
var(--space-lg)    /* 24px */
var(--space-xl)    /* 32px */
var(--space-2xl)   /* 48px */
var(--space-3xl)   /* 64px */
```

### Border Radius
```css
var(--radius-sm)   /* 4px */
var(--radius-md)   /* 8px */
var(--radius-lg)   /* 12px */
var(--radius-xl)   /* 16px */
```

### Shadows
```css
var(--shadow-sm)   /* Small shadow */
var(--shadow-md)   /* Medium shadow */
var(--shadow-lg)   /* Large shadow */
```

---

## Icon Guidelines

### Recommended Icons by Category

**Navigation/Actions:**
- `fa-home` - Home
- `fa-arrow-right` - Next/Forward
- `fa-arrow-left` - Back
- `fa-external-link-alt` - External link

**Content:**
- `fa-question-circle` - FAQ questions
- `fa-check-circle` - Completed/Success
- `fa-info-circle` - Information
- `fa-exclamation-triangle` - Warning

**People/Social:**
- `fa-user` - User/Person
- `fa-users` - Group/Team
- `fa-user-plus` - Register/Join

**Location:**
- `fa-map-marker-alt` - Location pin
- `fa-globe` - Website/Global

**Media:**
- `fa-play` - Play video
- `fa-music` - Music/Audio
- `fa-calendar-alt` - Events

**Social Media:**
- `fa-brands fa-facebook` - Facebook
- `fa-brands fa-instagram` - Instagram
- `fa-brands fa-spotify` - Spotify
- `fa-brands fa-youtube` - YouTube

**Other:**
- `fa-hard-hat` - Under construction
- `fa-envelope` - Email/Contact
- `fa-phone` - Phone

---

## Accessibility Checklist

When modernizing a page, ensure:

- [ ] Use semantic HTML (`<main>`, `<section>`, `<article>`)
- [ ] Proper heading hierarchy (only one `<h1>`, then `<h2>`, etc.)
- [ ] Add `aria-labelledby` to sections
- [ ] Include alt text on all images
- [ ] Use descriptive link text (avoid "click here")
- [ ] Add `target="_blank"` and `rel="noopener noreferrer"` to external links
- [ ] Ensure sufficient color contrast
- [ ] Make interactive elements keyboard accessible
- [ ] Test with screen reader if possible

---

## Testing Checklist

After modernizing a page:

- [ ] Page loads without errors
- [ ] Header/navigation appears correctly
- [ ] All links work properly
- [ ] Buttons have correct styling
- [ ] Icons display correctly
- [ ] Page is responsive on mobile
- [ ] Page is responsive on tablet
- [ ] Page is responsive on desktop
- [ ] No CSS errors in console
- [ ] No JavaScript errors in console

---

## Common Mistakes to Avoid

### ❌ Don't Do This

```html
<!-- Don't use old wrapper classes -->
<div class="content-wrapper">

<!-- Don't use inline styles -->
<div style="padding: 20px;">

<!-- Don't forget security attributes on external links -->
<a href="https://external.com" target="_blank">

<!-- Don't nest cards incorrectly -->
<div class="card">
  <div>Content</div>
</div>

<!-- Don't use old button classes -->
<a class="old-button">Click</a>
```

### ✅ Do This Instead

```html
<!-- Use new main-content wrapper -->
<main class="main-content">

<!-- Use CSS classes -->
<div class="card-body">

<!-- Include security attributes -->
<a href="https://external.com" 
   target="_blank" 
   rel="noopener noreferrer">

<!-- Use proper card structure -->
<div class="card">
  <div class="card-body">Content</div>
</div>

<!-- Use new button classes -->
<a class="btn btn-primary">Click</a>
```

---

## Need Help?

Refer to these documentation files:

1. **PHASE_1_IMPLEMENTATION.md** - Complete design system reference
2. **PHASE_2_COMPLETION.md** - Detailed implementation examples
3. **COMPONENT_USAGE.md** - Component reference matrix
4. **QUICK_START.md** - Quick reference guide

---

## Example: Complete Page Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Page description for SEO">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://urbanswing.co.nz/page.html">
  <meta property="og:title" content="Page Title - Urban Swing">
  <meta property="og:description" content="Page description">
  <meta property="og:image" content="https://urbanswing.co.nz/images/urban-swing-logo.png">
  
  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="https://urbanswing.co.nz/page.html">
  <meta property="twitter:title" content="Page Title - Urban Swing">
  <meta property="twitter:description" content="Page description">
  <meta property="twitter:image" content="https://urbanswing.co.nz/images/urban-swing-logo.png">
  
  <title>Page Title - Urban Swing</title>
  <link rel="stylesheet" href="css/modern-styles.css">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
  <link rel="icon" href="/images/icons/favicon.ico" type="image/x-icon">
  <link rel="icon" href="/images/icons/android-chrome-192x192.png" sizes="192x192" type="image/png">
  <link rel="icon" href="/images/icons/android-chrome-512x512.png" sizes="512x512" type="image/png">
  <link rel="apple-touch-icon" href="/images/icons/apple-touch-icon.png">
</head>

<body>
  <!-- Header will be dynamically loaded by script.js -->
  
  <main class="main-content">
    <div class="container">
      <h1 class="page-title">Page Title</h1>
      
      <section class="card" aria-labelledby="section-heading">
        <div class="card-header">
          <h2 id="section-heading">Section Title</h2>
        </div>
        <div class="card-body">
          <p>Your content here...</p>
          
          <a href="#" class="btn btn-primary">
            <i class="fas fa-arrow-right"></i>
            Call to Action
          </a>
        </div>
      </section>
    </div>
  </main>
  
  <script src="script.js" defer></script>
</body>
</html>
```

---

*Follow this guide to ensure consistent styling across all pages of the Urban Swing website.*
