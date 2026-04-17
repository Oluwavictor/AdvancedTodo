(function () {
	"use strict";
  
	const INTERVAL_MS        = 30000;
	const COLLAPSE_THRESHOLD = 120;
  
	// State
	
	const state = {
	  title:       "Redesign Dashboard UI",
	  description: "Revamp the main dashboard with new analytics widgets, updated color palette, improved navigation flow, and a fully responsive layout that works across all screen sizes from 320px mobile up to large desktop monitors. Coordinate with the backend team on new API endpoints needed for the widgets.",
	  priority:    "High",
	  due:         "2025-08-20T17:00:00",
	  status:      "In Progress",
	  expanded:    false,
	};
  
	let snapshot = { ...state };
  
	// Refs

	const card          = document.querySelector('[data-testid="test-todo-card"]');
	const viewMode      = document.getElementById("view-mode");
	const modalOverlay  = document.getElementById("edit-modal-overlay");
  
	const checkbox      = document.querySelector('[data-testid="test-todo-complete-toggle"]');
	const dueDateEl     = document.querySelector('[data-testid="test-todo-due-date"]');
	const timeEl        = document.querySelector('[data-testid="test-todo-time-remaining"]');
	const statusEl      = document.querySelector('[data-testid="test-todo-status"]');
	const editBtn       = document.querySelector('[data-testid="test-todo-edit-button"]');
	const deleteBtn     = document.querySelector('[data-testid="test-todo-delete-button"]');
	const titleEl       = document.querySelector('[data-testid="test-todo-title"]');
	const descEl        = document.querySelector('[data-testid="test-todo-description"]');
	const priorityBadge = document.querySelector('[data-testid="test-todo-priority"]');
	const overdueEl     = document.querySelector('[data-testid="test-todo-overdue-indicator"]');
	const statusControl = document.querySelector('[data-testid="test-todo-status-control"]');
	const expandToggle  = document.querySelector('[data-testid="test-todo-expand-toggle"]');
	const editTitleIn   = document.querySelector('[data-testid="test-todo-edit-title-input"]');
	const editDescIn    = document.querySelector('[data-testid="test-todo-edit-description-input"]');
	const editPriorityIn= document.querySelector('[data-testid="test-todo-edit-priority-select"]');
	const editDueIn     = document.querySelector('[data-testid="test-todo-edit-due-date-input"]');
	const cancelBtn     = document.querySelector('[data-testid="test-todo-cancel-button"]');
	const editCloseBtn  = document.getElementById("edit-close-btn");
	const titleError    = document.getElementById("title-error");
  
	// Helpers
  
	function formatDueDate(date) {
	  return date.toLocaleDateString("en-US", {
		month: "short",
		day:   "numeric",
		year:  "numeric",
	  });
	}
  
	function getTimeRemaining(due, isCompleted) {
	  if (isCompleted) return { text: "Completed", cls: "done-time" };
  
	  const diff  = due - Date.now();
	  const abs   = Math.abs(diff);
	  const mins  = Math.floor(abs / 60000);
	  const hours = Math.floor(abs / 3600000);
	  const days  = Math.floor(abs / 86400000);
  
	  if (diff < 0) {
		let text;
		if      (mins  < 60) text = `Overdue by ${mins} minute${mins  !== 1 ? "s" : ""}`;
		else if (hours < 24) text = `Overdue by ${hours} hour${hours  !== 1 ? "s" : ""}`;
		else                 text = `Overdue by ${days} day${days     !== 1 ? "s" : ""}`;
		return { text, cls: "overdue" };
	  }
  
	  let text, cls = "";
	  if      (mins  < 60) { text = `Due in ${mins} minute${mins   !== 1 ? "s" : ""}`;  cls = "due-soon"; }
	  else if (hours < 24) { text = `Due in ${hours} hour${hours   !== 1 ? "s" : ""}`;  cls = hours <= 6 ? "due-soon" : ""; }
	  else if (days  <  7) { text = `Due in ${days} day${days      !== 1 ? "s" : ""}`;  cls = days  <= 2 ? "due-soon" : ""; }
	  else {
		const weeks = Math.floor(days / 7);
		text = `Due in ${weeks} week${weeks !== 1 ? "s" : ""}`;
	  }
	  return { text, cls };
	}
  
	function toDatetimeLocal(iso) {
	  const d   = new Date(iso);
	  const pad = n => String(n).padStart(2, "0");
	  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}
  
	// Get all focusable elements in modal for focus trap
	function getFocusable() {
	  return Array.from(
		modalOverlay.querySelectorAll(
		  'button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
		)
	  ).filter(el => !el.disabled);
	}
  
	// Render
  
	function render() {
	  const isDone = state.status === "Done";
  
	  titleEl.textContent       = state.title;
	  descEl.textContent        = state.description;
	  priorityBadge.textContent = state.priority;
	  statusEl.textContent      = state.status;
	  statusControl.value       = state.status;
	  checkbox.checked          = isDone;
  
	  // Priority
	  priorityBadge.className = "badge priority-" + state.priority.toLowerCase();
	  priorityBadge.setAttribute("aria-label", "Priority: " + state.priority);
	  card.classList.remove("priority-low", "priority-medium", "priority-high");
	  card.classList.add("priority-" + state.priority.toLowerCase());
  
	  // Status badge
	  const statusMap = {
		"Pending":     "badge status-pending",
		"In Progress": "badge status-progress",
		"Done":        "badge status-completed",
	  };
	  statusEl.className = statusMap[state.status] || "badge status-progress";
  
	  // Status card class
	  card.classList.remove("status-pending", "status-in-progress", "status-done");
	  card.classList.add("status-" + state.status.toLowerCase().replace(" ", "-"));
	  card.classList.toggle("completed", isDone);
  
	  // Expand / collapse
	  const needsToggle = state.description.length > COLLAPSE_THRESHOLD;
	  expandToggle.hidden = !needsToggle;
  
	  if (needsToggle) {
		if (state.expanded) {
		  descEl.classList.remove("collapsed");
		  expandToggle.textContent = "Show less";
		  expandToggle.setAttribute("aria-expanded", "true");
		} else {
		  descEl.classList.add("collapsed");
		  expandToggle.textContent = "Show more";
		  expandToggle.setAttribute("aria-expanded", "false");
		}
	  } else {
		descEl.classList.remove("collapsed");
	  }
  
	  updateTimestamps();
	}
  
	function updateTimestamps() {
	  const isDone = state.status === "Done";
	  const due    = new Date(state.due);
  
	  dueDateEl.textContent = "Due " + formatDueDate(due);
	  dueDateEl.setAttribute("datetime", due.toISOString());
  
	  const { text, cls } = getTimeRemaining(due, isDone);
	  timeEl.textContent = text;
	  timeEl.setAttribute("datetime", due.toISOString());
	  timeEl.className = cls;
  
	  const isOverdue = cls === "overdue";
	  overdueEl.hidden = !isOverdue;
	  card.classList.toggle("is-overdue", isOverdue && !isDone);
  
	  if (isOverdue && !isDone) {
		statusEl.textContent = "Overdue";
		statusEl.className   = "badge status-overdue";
	  }
	}
  
	// Modal open / close
  
	function openModal() {
	  // Snapshot current state
	  snapshot = { ...state };
  
	  // Populate form
	  editTitleIn.value    = state.title;
	  editDescIn.value     = state.description;
	  editPriorityIn.value = state.priority;
	  editDueIn.value      = toDatetimeLocal(state.due);
  
	  // Clear any old errors
	  editTitleIn.classList.remove("input-error");
	  titleError.hidden = true;
  
	  // Show modal — remove hidden so edit modal shows
	  modalOverlay.hidden = false;
	  modalOverlay.classList.add("is-open");
  
	  // Prevent body scroll
	  document.body.style.overflow = "hidden";
  
	  // Focus first input
	  editTitleIn.focus();
	}
  
	function closeModal(restore) {
	  if (restore) {
		Object.assign(state, snapshot);
		render();
	  }
  
	  // Hide modal
	  modalOverlay.classList.remove("is-open");
	  modalOverlay.hidden = true;
  
	  // Restore body scroll
	  document.body.style.overflow = "";
  
	  // Return focus to Edit button
	  editBtn.focus();
	}
  
	
	// Save changes
  
	function saveEdit(e) {
	  e.preventDefault();
  
	  const newTitle = editTitleIn.value.trim();
  
	  if (!newTitle) {
		editTitleIn.classList.add("input-error");
		titleError.hidden = false;
		editTitleIn.focus();
		return;
	  }
  
	  editTitleIn.classList.remove("input-error");
	  titleError.hidden = true;
  
	  state.title       = newTitle;
	  state.description = editDescIn.value.trim();
	  state.priority    = editPriorityIn.value;
	  state.due         = editDueIn.value
		? new Date(editDueIn.value).toISOString()
		: state.due;
	  state.expanded    = false;
  
	  render();
	  closeModal(false);
	}
  
	// Focus trap
  
	function trapFocus(e) {
	  if (modalOverlay.hidden) return;
  
	  if (e.key === "Escape") {
		closeModal(true);
		return;
	  }
  
	  if (e.key !== "Tab") return;
  
	  const focusable = getFocusable();
	  const first     = focusable[0];
	  const last      = focusable[focusable.length - 1];
  
	  if (e.shiftKey) {
		if (document.activeElement === first) {
		  e.preventDefault();
		  last.focus();
		}
	  } else {
		if (document.activeElement === last) {
		  e.preventDefault();
		  first.focus();
		}
	  }
	}

	// Status helper
	function applyStatus(newStatus) {
	  state.status = newStatus;
	  render();
	}
  
	// Events
  
	// Checkbox
	checkbox.addEventListener("change", function () {
	  applyStatus(checkbox.checked ? "Done" : "Pending");
	});
  
	// Status dropdown
	statusControl.addEventListener("change", function () {
	  applyStatus(statusControl.value);
	});
  
	// Expand toggle
	expandToggle.addEventListener("click", function () {
	  state.expanded = !state.expanded;
	  render();
	});
  
	// Edit button → open modal
	editBtn.addEventListener("click", openModal);
  
	// ✕ close button → cancel
	editCloseBtn.addEventListener("click", function () {
	  closeModal(true);
	});
  
	// Click outside modal box → cancel
	modalOverlay.addEventListener("click", function (e) {
	  if (e.target === modalOverlay) closeModal(true);
	});
  
	// Form submit → save
	document.getElementById("edit-form").addEventListener("submit", saveEdit);
  
	// Cancel button → cancel
	cancelBtn.addEventListener("click", function () {
	  closeModal(true);
	});
  
	// Focus trap + Escape
	document.addEventListener("keydown", trapFocus);
  
	// Delete
	deleteBtn.addEventListener("click", function () {
	  if (card) card.remove();
	});
  
	// Init
	function init() {
	  render();
	  setInterval(updateTimestamps, INTERVAL_MS);
	}
  
	document.readyState === "loading"
	  ? document.addEventListener("DOMContentLoaded", init)
	  : init();
  
  })();