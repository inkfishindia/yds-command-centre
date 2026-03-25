// Toast notification system
export function createToastsModule() {
  return {
    // State
    toasts: [],
    _toastId: 0,

    // Methods
    addToast(message, type = 'info', duration = 4000) {
      const id = ++this._toastId;
      this.toasts.push({ id, message, type, exiting: false });
      if (duration > 0) {
        setTimeout(() => this.removeToast(id), duration);
      }
      return id;
    },

    removeToast(id) {
      const toast = this.toasts.find(t => t.id === id);
      if (toast) {
        toast.exiting = true;
        setTimeout(() => {
          this.toasts = this.toasts.filter(t => t.id !== id);
        }, 300); // match CSS animation duration
      }
    },

    showSuccess(message) { return this.addToast(message, 'success'); },
    showError(message) { return this.addToast(message, 'error', 6000); },
    showInfo(message) { return this.addToast(message, 'info'); },
  };
}
