// Re-export the hooks for convenient importing
export { useConfirm, type ConfirmOptions } from "../components/ConfirmModal";
export { useToast, type ToastOptions } from "../components/Toast";

// Common confirmation messages
export const confirmMessages = {
  delete: {
    title: "Delete Item",
    message: "Are you sure you want to delete this item? This action cannot be undone.",
    confirmText: "Delete",
    variant: "danger" as const,
  },
  deleteRecipe: {
    title: "Delete Recipe",
    message: "Are you sure you want to delete this recipe? This action cannot be undone.",
    confirmText: "Delete Recipe",
    variant: "danger" as const,
  },
  deleteCookbook: {
    title: "Delete Cookbook",
    message: "Are you sure you want to delete this cookbook? All recipes and data will be lost.",
    confirmText: "Delete Cookbook",
    variant: "danger" as const,
  },
  removeFromGroceryList: {
    title: "Remove from Grocery List",
    message: "Are you sure you want to remove this item from your grocery list?",
    confirmText: "Remove",
    variant: "warning" as const,
  },
  leaveTeam: {
    title: "Leave Team",
    message: "Are you sure you want to leave this team? You will lose access to all shared content.",
    confirmText: "Leave Team",
    variant: "warning" as const,
  },
  discardChanges: {
    title: "Discard Changes",
    message: "You have unsaved changes. Are you sure you want to discard them?",
    confirmText: "Discard",
    variant: "warning" as const,
  },
};

// Common toast messages
export const toastMessages = {
  success: {
    saved: "Changes saved successfully",
    created: "Created successfully",
    updated: "Updated successfully",
    deleted: "Deleted successfully",
    copied: "Copied to clipboard",
    sent: "Sent successfully",
  },
  error: {
    generic: "Something went wrong. Please try again.",
    network: "Network error. Please check your connection and try again.",
    unauthorized: "You don't have permission to perform this action.",
    notFound: "The requested item could not be found.",
    validation: "Please check your input and try again.",
    save: "Failed to save changes. Please try again.",
    load: "Failed to load data. Please refresh the page.",
  },
  info: {
    loading: "Loading...",
    processing: "Processing your request...",
    noResults: "No results found",
    comingSoon: "This feature is coming soon!",
  },
};

// Utility functions for common patterns
export const createConfirmDelete = (itemName: string = "item") => ({
  title: `Delete ${itemName}`,
  message: `Are you sure you want to delete this ${itemName.toLowerCase()}? This action cannot be undone.`,
  confirmText: "Delete",
  variant: "danger" as const,
});

export const createConfirmAction = (action: string, description?: string) => ({
  title: `Confirm ${action}`,
  message: description || `Are you sure you want to ${action.toLowerCase()}?`,
  confirmText: action,
  variant: "info" as const,
});