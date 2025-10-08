# Future Improvement: Template System

## Current Situation

The website currently has 6 HTML files with repeated code:
- `index.html`
- `classes.html`
- `policies.html`
- `meet-the-crew.html`
- `faqs.html`
- `wcs-around-nz.html`

Each file repeats:
- Favicon links (6 lines)
- Font Awesome CDN link
- Open Graph meta tags structure
- Script tag for `script.js`

## Problem

This violates the **DRY (Don't Repeat Yourself)** principle:
- If you need to update favicon, you must edit 6 files
- If you add a new meta tag, you must edit 6 files
- Risk of inconsistencies between pages
- More maintenance overhead

## Recommended Solution

Consider implementing a **static site generator** or **template system**:

### Option 1: 11ty (Eleventy) - RECOMMENDED
**Best for:** Simple static sites
**Setup time:** 1-2 hours
**Benefits:**
- Write templates once, generate multiple pages
- Minimal JavaScript required
- Works with existing HTML/CSS
- Easy to learn
- Good documentation

**Example structure:**
```
_includes/
  layout.njk        (main template with head/footer)
src/
  index.md          (just content)
  classes.md
  ...
_site/              (generated HTML)
```

### Option 2: Jekyll
**Best for:** GitHub Pages hosting
**Benefits:**
- Native GitHub Pages support
- Ruby-based
- Large community
- Free hosting on GitHub

### Option 3: Hugo
**Best for:** Very fast builds, larger sites
**Benefits:**
- Extremely fast
- Go-based (single binary)
- No dependencies

### Option 4: Server-Side Includes (SSI)
**Best for:** Simple sites on Apache/Nginx
**Benefits:**
- No build process
- Works on many hosting providers
- Minimal setup

**Example:**
```html
<!--#include virtual="header.html" -->
<main>
  Page content here
</main>
<!--#include virtual="footer.html" -->
```

## Implementation Priority

**Priority:** Low (website works fine as-is)

**When to implement:**
- When you need to make frequent meta tag updates
- When adding more pages (7+ pages)
- When team collaboration increases
- During a major redesign

## Resources

- 11ty: https://www.11ty.dev/
- Jekyll: https://jekyllrb.com/
- Hugo: https://gohugo.io/
- SSI Guide: https://httpd.apache.org/docs/current/howto/ssi.html

## Current Workaround

For now, the `header.html` is dynamically loaded via JavaScript, which reduces some duplication for navigation. This is acceptable for a small site.
