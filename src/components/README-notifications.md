# Modal and Toast Notification Systems

This project includes a custom confirmation modal and toast notification system that has **completely replaced** all browser `confirm()` and `alert()` calls throughout the application.

## Components Created

### 1. ConfirmModal (`src/components/ConfirmModal.tsx`)
- Universal confirmation modal with customizable content
- Support for different variants (danger, warning, info)
- Promise-based API for easy async/await usage
- Backdrop click to cancel
- Keyboard accessibility

### 2. Toast (`src/components/Toast.tsx`)
- Toast notification system with auto-dismiss
- Support for success, error, warning, and info types
- Positioned in top-right corner
- Error messages don't auto-dismiss
- Optional action buttons
- Manual dismiss option

### 3. Utility Module (`src/lib/notifications.ts`)
- Pre-defined common confirmation messages
- Pre-defined common toast messages
- Helper functions for creating custom confirmations
- Re-exports hooks for convenient importing

## Setup

The providers are already integrated into `src/app.tsx`:

```tsx
<ToastProvider>
  <ConfirmModalProvider>
    {/* Your app content */}
  </ConfirmModalProvider>
</ToastProvider>
```

## Usage

### Basic Import

```tsx
import { useConfirm, useToast } from "~/lib/notifications";

function MyComponent() {
  const confirm = useConfirm();
  const toast = useToast();
  
  // Your component logic
}
```

### Confirmation Modal Examples

```tsx
// Basic confirmation
const handleDelete = async () => {
  const confirmed = await confirm.confirm({
    title: "Delete Item",
    message: "Are you sure you want to delete this item?",
    confirmText: "Delete",
    variant: "danger"
  });
  
  if (confirmed) {
    // Proceed with deletion
    toast.success("Item deleted successfully");
  }
};

// Using pre-defined messages
import { confirmMessages } from "~/lib/notifications";

const handleDeleteRecipe = async () => {
  const confirmed = await confirm.confirm(confirmMessages.deleteRecipe);
  if (confirmed) {
    // Delete the recipe
  }
};
```

### Toast Notification Examples

```tsx
// Different types of toasts
toast.success("Operation completed successfully");
toast.error("Something went wrong");
toast.warning("Please check your input");
toast.info("Processing your request...");

// Custom duration and actions
toast.toast({
  message: "File uploaded successfully",
  type: "success",
  duration: 3000,
  action: {
    label: "View",
    onClick: () => navigateToFile()
  }
});

// Using pre-defined messages
import { toastMessages } from "~/lib/notifications";

toast.success(toastMessages.success.saved);
toast.error(toastMessages.error.network);
```

### Helper Functions

```tsx
import { createConfirmDelete, createConfirmAction } from "~/lib/notifications";

// Dynamic confirmation messages
const deleteConfirm = createConfirmDelete("Recipe");
const customConfirm = createConfirmAction("Export Data", "This will export all your data to a file.");
```

## Replacing Browser Methods

### Before (Browser confirm/alert)
```tsx
if (confirm("Are you sure you want to delete this?")) {
  // delete logic
}

alert("Item deleted successfully");
```

### After (Custom modal/toast)
```tsx
const confirmed = await confirm.confirm({
  message: "Are you sure you want to delete this?",
  variant: "danger"
});

if (confirmed) {
  // delete logic
  toast.success("Item deleted successfully");
}
```

## API Reference

### ConfirmOptions
```tsx
interface ConfirmOptions {
  title?: string;           // Modal title (default: "Confirm Action")
  message: string;          // Modal message (required)
  confirmText?: string;     // Confirm button text (default: "Confirm")
  cancelText?: string;      // Cancel button text (default: "Cancel")
  variant?: 'danger' | 'warning' | 'info'; // Visual style (default: 'info')
}
```

### ToastOptions
```tsx
interface ToastOptions {
  message: string;          // Toast message (required)
  type?: 'success' | 'error' | 'warning' | 'info'; // Visual style (default: 'info')
  duration?: number;        // Auto-dismiss time in ms (0 = no auto-dismiss)
  action?: {                // Optional action button
    label: string;
    onClick: () => void;
  };
}
```

## Live Implementation

The modal and toast systems are actively used throughout the application in the following scenarios:

### Confirmation Modals
- **Recipe Deletion** (`src/routes/recipe/[id].tsx:413`) - Confirms recipe deletion with success toast
- **Grocery List Deletion** (`src/routes/grocery-lists/index.tsx:99`) - Confirms list deletion with success feedback
- **Cookbook Member Removal** (`src/routes/cookbooks/[id]/index.tsx:189`) - Confirms member removal with success toast

### Toast Notifications
- **Error Handling**: All previous `alert()` calls now use error toasts that don't auto-dismiss
- **Success Feedback**: Added success toasts for completed actions like deletions and invitations
- **User Communication**: Network errors, validation issues, and operation confirmations

### Files Updated
- `src/components/InvitationNotifications.tsx` - Error toast for invitation failures
- `src/routes/cookbooks/index.tsx` - Error toast for cookbook creation
- `src/routes/cookbooks/[id]/index.tsx` - Multiple confirmations and notifications
- `src/routes/cookbooks/[id]/add-recipe.tsx` - Error toast for recipe addition failures
- `src/routes/recipe/[id].tsx` - Delete confirmation and feedback
- `src/routes/grocery-lists/index.tsx` - Delete confirmation and feedback

## Best Practices

1. **Use semantic variants**: `danger` for destructive actions, `warning` for potentially risky actions, `info` for general confirmations
2. **Error toasts don't auto-dismiss**: Users need to manually close error messages
3. **Provide clear action text**: Use specific button text like "Delete Recipe" instead of generic "OK"
4. **Use pre-defined messages**: Leverage the common messages in `notifications.ts` for consistency
5. **Handle promise rejections**: Always handle the case when users cancel confirmations

## Future Enhancements

- Add sound effects for different toast types
- Implement toast queuing for multiple simultaneous notifications
- Add swipe-to-dismiss gesture on mobile
- Create toast persistence across page navigation
- Add keyboard shortcuts for modal actions