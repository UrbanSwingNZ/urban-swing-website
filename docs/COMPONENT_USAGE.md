# Component Usage Across All Pages

This document shows which components are used on each page for easy reference.

---

## Page Component Matrix

| Component | index.html | classes.html | faqs.html | meet-the-crew.html | wcs-around-nz.html | policies.html |
|-----------|------------|--------------|-----------|-------------------|-------------------|---------------|
| **Layout** |
| `.main-content` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `.container` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Typography** |
| `.page-title` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `.tagline` | ✅ | - | - | - | - | - |
| **Cards** |
| `.card` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `.card-header` | ✅ | ✅ | - | - | - | - |
| `.card-body` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Buttons** |
| `.btn` | ✅ | ✅ | - | - | - | - |
| `.btn-primary` | ✅ | ✅ | - | - | - | - |
| `.btn-secondary` | ✅ | - | - | - | - | - |
| `.btn-large` | - | ✅ | - | - | - | - |
| **Navigation** |
| `.nav-buttons` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `.nav-btn` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Header** |
| `.header-top` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `.logo-container` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `.social-icons` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Tables** |
| `.class-details-table` | - | ✅ | - | - | - | - |
| `.pricing-table` | - | ✅ | - | - | - | - |
| `.crew-table` | - | - | - | ✅ | - | - |
| **FAQ** |
| `.faq-item` | - | - | ✅ | - | - | - |
| `.faq-question` | - | - | ✅ | - | - | - |
| `.faq-answer` | - | - | ✅ | - | - | - |
| `.other-classes-container` | - | - | - | - | ✅ | - |
| **Icons** |
| Font Awesome | ✅ | ✅ | ✅ | - | ✅ | ✅ |

---

## Common Patterns

### Pattern 1: Basic Content Page
```html
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
```

**Used in:** faqs.html, meet-the-crew.html, wcs-around-nz.html, policies.html

---

### Pattern 2: Content with Headers
```html
<main class="main-content">
  <div class="container">
    <h1 class="page-title">Page Title</h1>
    
    <section class="card">
      <div class="card-header">
        <h2>Section Title</h2>
      </div>
      <div class="card-body">
        <!-- Content -->
      </div>
    </section>
  </div>
</main>
```

**Used in:** index.html, classes.html

---

### Pattern 3: Multiple Card Sections
```html
<main class="main-content">
  <div class="container">
    <h1 class="page-title">Page Title</h1>
    
    <section class="card">
      <div class="card-header">
        <h2>Section 1</h2>
      </div>
      <div class="card-body">
        <!-- Content -->
      </div>
    </section>
    
    <section class="card">
      <div class="card-header">
        <h2>Section 2</h2>
      </div>
      <div class="card-body">
        <!-- Content -->
      </div>
    </section>
  </div>
</main>
```

**Used in:** classes.html (Class Details + Pricing)

---

## Icon Usage

### Font Awesome Icons Used

| Page | Icons | Purpose |
|------|-------|---------|
| index.html | `fa-play`, `fa-users`, `fa-calendar-alt` | Button actions, feature highlights |
| classes.html | `fa-user-plus` | Register button |
| faqs.html | `fa-question-circle` | FAQ questions |
| wcs-around-nz.html | `fa-map-marker-alt` | Location markers |
| policies.html | `fa-hard-hat` | Under construction |

### Social Icons (Header - All Pages)
- `fa-brands fa-facebook` - Facebook link
- `fa-brands fa-instagram` - Instagram link
- `fa-brands fa-spotify` - Spotify link

---

## Responsive Breakpoints

All components use consistent breakpoints:

```css
/* Mobile: Default styles */

/* Tablet: 768px+ */
@media (min-width: 768px) {
  /* Tablet styles */
}

/* Desktop: 1024px+ */
@media (min-width: 1024px) {
  /* Desktop styles */
}

/* Large Desktop: 1440px+ */
@media (min-width: 1440px) {
  /* Large desktop styles */
}
```

### Component Behavior by Breakpoint

| Component | Mobile | Tablet (768px+) | Desktop (1024px+) |
|-----------|--------|----------------|------------------|
| `.container` | 95% width | 90% width | 1200px max-width |
| `.nav-buttons` | Stacked | Horizontal | Horizontal |
| `.crew-table` | Stacked | Side-by-side | Side-by-side + alternating |
| `.other-classes-container` | 1 column | 2 columns | 2 columns |
| `.card` | Full width | Full width | Full width with padding |

---

## Color Usage Guide

### Primary Colors (from variables.css)
- **Accent Primary:** `var(--accent-primary)` - #7c3aed (Purple)
- **Accent Secondary:** `var(--accent-secondary)` - #ec4899 (Pink)

### Where Each Color is Used

| Color Variable | Used For |
|---------------|----------|
| `--accent-primary` | Primary buttons, links, heading accents, icons |
| `--accent-secondary` | Button hover states, secondary highlights |
| `--text-primary` | Main body text |
| `--text-secondary` | Muted text, descriptions |
| `--bg-primary` | Page background |
| `--bg-secondary` | Card backgrounds |
| `--border-light` | Card borders, dividers |

---

## Spacing Scale

All pages use consistent spacing:

| Variable | Value | Common Use |
|----------|-------|------------|
| `--space-xs` | 0.25rem (4px) | Tight spacing |
| `--space-sm` | 0.5rem (8px) | Icon gaps, small padding |
| `--space-md` | 1rem (16px) | Standard spacing |
| `--space-lg` | 1.5rem (24px) | Section spacing |
| `--space-xl` | 2rem (32px) | Large gaps |
| `--space-2xl` | 3rem (48px) | Major section spacing |
| `--space-3xl` | 4rem (64px) | Page section spacing |

---

## Typography Scale

| Element | Font Size | Font Weight | Color |
|---------|-----------|-------------|-------|
| `h1.page-title` | 2.5rem (40px) | 700 | `--accent-primary` |
| `h2` | 1.75rem (28px) | 600 | `--accent-primary` |
| `h3` | 1.25rem (20px) | 600 | `--accent-primary` |
| `p` | 1rem (16px) | 400 | `--text-primary` |
| `.btn` | 1rem (16px) | 500 | Various |

---

## Quick Reference: Adding New Content

### Add a New Card Section
```html
<section class="card" aria-labelledby="section-id">
  <div class="card-header">
    <h2 id="section-id">Section Title</h2>
  </div>
  <div class="card-body">
    <p>Your content here...</p>
  </div>
</section>
```

### Add a Button
```html
<a href="#" class="btn btn-primary">
  <i class="fas fa-icon-name"></i>
  Button Text
</a>
```

### Add an FAQ Item
```html
<article class="faq-item">
  <h3 class="faq-question">
    <i class="fas fa-question-circle"></i>
    Your Question?
  </h3>
  <p class="faq-answer">Your answer here...</p>
</article>
```

---

*This guide covers all components and patterns used across the Urban Swing website.*
