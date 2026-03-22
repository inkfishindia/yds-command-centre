# CSS Patterns — Content Calendar Implementation

Reference these patterns when writing styles in `public/css/styles.css`. Do NOT invent new patterns.

## Calendar Container

```css
.calendar-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-primary);
  height: 100%;
  overflow-y: auto;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
}

.calendar-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.calendar-header button {
  padding: 0.35rem 0.7rem;
  font-size: 12px;
}
```

## Filter Bar

```css
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-group > label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.filter-chip {
  padding: 0.3rem 0.7rem;
  font-size: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.filter-chip:hover {
  border-color: var(--border-light);
  color: var(--text-primary);
}

.filter-chip.active {
  border-color: var(--accent);
  background: var(--accent-dim);
  color: var(--text-primary);
}

.filter-chip:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

## Calendar Grid

```css
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
  background: var(--bg-primary);
}

/* Week day headers */
.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  border-bottom: 2px solid var(--border-light);
  padding-bottom: 0.5rem;
}

.calendar-weekday {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  text-align: center;
  padding: 0.5rem 0;
}

/* Day cells */
.calendar-day {
  display: flex;
  flex-direction: column;
  min-height: 100px;
  padding: 0.5rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  position: relative;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.calendar-day:hover {
  background: var(--bg-hover);
  border-color: var(--border-light);
}

.calendar-day.today {
  border-color: var(--accent);
  background: var(--accent-dim);
  opacity: 0.95;
}

.calendar-day.other-month {
  opacity: 0.4;
  background: transparent;
}

.calendar-day-number {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  align-self: flex-end;
  margin-bottom: 0.25rem;
  font-family: var(--font-mono);
}

.calendar-day.today .calendar-day-number {
  color: var(--accent);
  font-weight: 600;
}

/* Content chips container */
.day-content {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1;
  overflow: hidden;
}
```

## Content Chips

```css
.content-chip {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  height: 24px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  background: rgba(59, 130, 246, 0.15); /* fallback blue */
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Channel-specific colors via CSS custom property */
.content-chip[data-channel="email"] {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.3);
}

.content-chip[data-channel="linkedin"] {
  background: rgba(20, 184, 166, 0.15);
  border-color: rgba(20, 184, 166, 0.3);
}

.content-chip[data-channel="instagram"] {
  background: rgba(168, 85, 247, 0.15);
  border-color: rgba(168, 85, 247, 0.3);
}

.content-chip[data-channel="twitter"] {
  background: rgba(136, 136, 136, 0.15);
  border-color: rgba(136, 136, 136, 0.3);
}

.content-chip[data-channel="website"] {
  background: rgba(34, 197, 94, 0.15);
  border-color: rgba(34, 197, 94, 0.3);
}

.content-chip[data-channel="video"] {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
}

.content-chip:hover {
  opacity: 0.95;
  border-color: var(--accent);
}

.content-chip:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.chip-icon {
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.chip-overflow {
  padding: 0.25rem 0.35rem;
  font-size: 11px;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: default;
}
```

## Add Button (in day cell)

```css
.day-add-button {
  padding: 0.2rem 0.4rem;
  font-size: 11px;
  background: transparent;
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--transition-fast);
  align-self: flex-start;
  margin-top: auto;
}

.day-add-button:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-dim);
}

.day-add-button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
```

## Modal / Dialog

```css
.modal {
  display: none; /* controlled by Alpine x-show */
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 1000;
  overflow: auto;
  padding: 1rem;
}

.modal[open],
.modal.open {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 2rem;
}

.modal-content {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-overlay);
  max-width: 500px;
  width: 100%;
  padding: 1.5rem;
  position: relative;
  animation: slide-up 0.2s ease;
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
}

.modal-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.modal-close {
  padding: 0.25rem;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  transition: color var(--transition-fast);
}

.modal-close:hover {
  color: var(--text-primary);
}

.modal-close:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

## Form Styles

```css
.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.form-group label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 0.5rem 0.75rem;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-primary);
  font-family: var(--font-ui);
  font-size: 14px;
  transition: all var(--transition-fast);
}

.form-group input::placeholder,
.form-group textarea::placeholder {
  color: var(--text-muted);
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-dim);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

/* Checkbox group (for multi-select channels) */
.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-primary);
}

.checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--accent);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

/* Form actions (buttons at bottom) */
.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.form-actions button {
  padding: 0.5rem 1.25rem;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}
```

## Weekly List (Optional Companion View)

```css
.weekly-list {
  padding: 1rem 0;
  border-top: 1px solid var(--border);
}

.weekly-list h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.75rem;
}

.content-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.content-item {
  padding: 0.75rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  transition: all var(--transition-fast);
  cursor: pointer;
}

.content-item:hover {
  background: var(--bg-hover);
  border-color: var(--border-light);
}

.item-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
  font-size: 11px;
}

.item-date {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--text-muted);
  min-width: 50px;
}

.item-type-badge,
.item-status-badge {
  padding: 0.15rem 0.5rem;
  font-size: 10px;
  font-weight: 500;
  border-radius: 4px;
  background: var(--accent-dim);
  color: var(--accent);
}

.content-item h4 {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 0.25rem;
}

.item-channels {
  display: flex;
  gap: 0.35rem;
  margin-bottom: 0.35rem;
  flex-wrap: wrap;
}

.channel-tag {
  padding: 0.15rem 0.4rem;
  font-size: 10px;
  background: var(--border);
  color: var(--text-secondary);
  border-radius: 3px;
}

.item-notes {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}
```

## Approval Banner (for writes)

```css
.approval-banner {
  padding: 0.75rem;
  background: var(--amber-dim);
  border: 1px solid var(--amber);
  border-radius: var(--radius);
  margin-bottom: 1rem;
}

.approval-banner-header {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--amber);
  margin-bottom: 0.5rem;
}

.approval-banner-actions {
  display: flex;
  gap: 0.5rem;
}

.approval-banner button {
  padding: 0.35rem 0.75rem;
  font-size: 12px;
  border-radius: var(--radius);
  transition: all var(--transition-fast);
}
```

## Loading States

```css
.skeleton {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.skeleton-line {
  height: 12px;
  background: linear-gradient(90deg, var(--bg-card) 0%, var(--bg-hover) 50%, var(--bg-card) 100%);
  border-radius: var(--radius);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
```

---

**Note**: All selectors use BEM-style naming (`.calendar-*`, `.content-*`, `.filter-*`). Follow this convention for new elements. No shorthand CSS or utility classes.
