# Membership Types Manager

Admin interface for managing monthly membership types on the Urban Swing platform.

## Files

- **membership-display.js** - Renders membership type cards with pricing and status
- **status-toggle.js** - Handles active/inactive status toggling
- **modal-handlers.js** - Add/edit/delete modal operations
- **drag-drop.js** - Drag-and-drop reordering functionality
- **auth.js** - Initialization and authentication

## Features

- **Card Display:** Shows membership name, monthly price, description, and status
- **Status Toggle:** Active/Inactive switch with immediate Firestore updates
- **Drag & Drop:** Reorder memberships by display order (updates `displayOrder` field)
- **Add/Edit Modal:** Form for creating and editing membership types
- **Delete Protection:** Prevents deletion if active memberships exist
- **Registration Badge:** Indicates if membership is shown on registration form
- **Color Scheme:** Distinctive indigo/purple (#5b4a99) to differentiate from packages

## Integration

Integrated into `concession-types.html` as the "Memberships" section between Casual Rates and Concession Packages.

## Firestore Collection

**Collection:** `membershipTypes`

**Fields:**
- `name` (string): Membership type name
- `price` (number): Monthly price in dollars
- `description` (string): Optional description
- `showOnRegistration` (boolean): Display on registration form
- `isActive` (boolean): Active/inactive status
- `displayOrder` (number): Sort order
- `createdAt` (timestamp): Creation timestamp
- `updatedAt` (timestamp): Last update timestamp

## Usage

Admin navigates to Admin Tools > Concession Types, where the Memberships section is displayed alongside Casual Rates and Concession Packages.
