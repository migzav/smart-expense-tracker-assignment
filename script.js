/**
 * Smart Expense Tracker - Core Logic (Final Fixed Version)
 */

// 1. State Management
let expenses = [];
let selectedIds = new Set();
let currentSort = { column: 'date', direction: 'asc' };
let isModalOpen = false;
let pendingAction = null; 

// 2. DOM Elements
const expenseForm = document.getElementById('expense-form');
const expenseList = document.getElementById('expense-list');
const expenseTable = document.getElementById('expense-table');
const totalAmountDisplay = document.getElementById('total-amount');
const emptyState = document.getElementById('empty-state');
const selectAllCheckbox = document.getElementById('select-all');
const bulkActions = document.getElementById('bulk-actions');
const bulkDeleteBtn = document.getElementById('bulk-delete-btn');

// Form error message
const formErrorMessage = document.getElementById('form-error-message');

// Modal Elements
const modalOverlay = document.getElementById('modal-overlay');
const modalMessage = document.getElementById('modal-message');
const modalConfirmBtn = document.getElementById('modal-confirm-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');

// 3. Initialization
document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('expense-date');
    // Set default date to today
    const today = new Date();
    dateInput.value = today.toISOString().split('T')[0];

    // Real-time Error Clearing
    expenseForm.addEventListener('input', (e) => {
        const errorEl = e.target.nextElementSibling;
        if (errorEl && errorEl.classList.contains('error-text')) {
            errorEl.style.display = 'none';
        }
        if (formErrorMessage) {
            formErrorMessage.style.display = 'none';
        }
    });

    // Immediate Future Date Validation
    dateInput.addEventListener('change', () => {
        const dateVal = dateInput.value;
        const errorEl = dateInput.nextElementSibling;

        if (dateVal) {
            const [year, month, day] = dateVal.split('-').map(Number);
            const selectedDate = new Date(year, month - 1, day);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (selectedDate > today) {
                errorEl.textContent = "Future dates are not supported.";
                errorEl.style.display = 'block';
                return;
            }
        }
        errorEl.style.display = 'none';
    });

    // Amount Formatting on Blur
    const amountInput = document.getElementById('expense-amount');
    amountInput.addEventListener('blur', (e) => {
        const val = e.target.value;
        if (val) {
            const num = parseFloat(val);
            if (!isNaN(num)) {
                e.target.value = num.toFixed(2);
            }
        }
    });

    // Restrict typing to 2 decimal places
    amountInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') return;
        const val = e.target.value;
        if (val.includes('.') && val.split('.')[1].length >= 2 && 
            e.key !== 'Backspace' && e.key !== 'Delete' && 
            e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
            e.preventDefault();
        }
    });

    render();
});

// 4. Core Functions

function render() {
    sortData();
    expenseList.innerHTML = '';

    if (expenses.length === 0) {
        emptyState.style.display = 'block';
        expenseTable.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        expenseTable.style.display = 'table';
    }

    expenses.forEach(expense => {
        const tr = document.createElement('tr');
        const isChecked = selectedIds.has(expense.id);

        tr.innerHTML = `
            <td class="checkbox-col"><input type="checkbox" class="row-checkbox" data-id="${expense.id}" ${isChecked ? 'checked' : ''}></td>
            <td>${formatDate(expense.date)}</td>
            <td>${expense.name}</td>
            <td>$${expense.amount.toFixed(2)}</td>
            <td>${expense.category}</td>
            <td><button class="btn-delete" data-id="${expense.id}">Delete</button></td>
        `;
        expenseList.appendChild(tr);
    });

    updateTotal();
    updateSelectAllUI();
}

function sortData() {
    const { column, direction } = currentSort;
    const modifier = direction === 'asc' ? 1 : -1;

    expenses.sort((a, b) => {
        let valA = a[column];
        let valB = b[column];

        if (column === 'date') {
            valA = new Date(a.date);
            valB = new Date(b.date);
        }

        if (valA < valB) return -1 * modifier;
        if (valA > valB) return 1 * modifier;
        return 0;
    });
}

function updateTotal() {
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    totalAmountDisplay.textContent = `$${total.toFixed(2)}`;
}

function updateSelectAllUI() {
    const totalCount = expenses.length;
    const selectedCount = selectedIds.size;

    if (totalCount === 0 || isModalOpen) {
        bulkActions.style.display = 'none';
    } else if (selectedCount > 0) {
        bulkActions.style.display = 'block';
    } else {
        bulkActions.style.display = 'none';
    }

    if (totalCount === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (selectedCount === totalCount) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else if (selectedCount > 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    }
}

// 5. Modal Logic

function openModal(message, onConfirm) {
    modalMessage.textContent = message;
    pendingAction = onConfirm;
    isModalOpen = true;
    modalOverlay.style.display = 'flex';
    bulkActions.style.display = 'none'; 
    render();
}

function closeModal() {
    isModalOpen = false;
    pendingAction = null;
    modalOverlay.style.display = 'none';
    render();
}

// 6. Event Listeners

expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const dateVal = document.getElementById('expense-date').value;
    const nameVal = document.getElementById('expense-name').value.trim();
    const amountValString = document.getElementById('expense-amount').value;
    const amountVal = parseFloat(amountValString);
    const categoryVal = document.getElementById('expense-category').value;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monetaryRegex = /^\d+(\.\d{1,2})?$/;
    const errorMsg = "Please enter a valid value";

    // Date validation specifics
    let isFutureDate = false;
    let isDateValid = dateVal !== "";
    if (dateVal) {
        const [year, month, day] = dateVal.split('-').map(Number);
        const selectedDate = new Date(year, month - 1, day);
        if (selectedDate > today) {
            isFutureDate = true;
            isDateValid = false;
        }
    }

    const validationRules = [
        { 
            id: 'expense-date', 
            valid: isDateValid, 
            message: isFutureDate ? "Future dates are not supported." : errorMsg 
        },
        { id: 'expense-name', valid: nameVal.length > 0 },
        { id: 'expense-amount', valid: !isNaN(amountVal) && amountVal > 0 && monetaryRegex.test(amountValString) },
        { id: 'expense-category', valid: categoryVal !== "" }
    ];

    let isValid = true;
    validationRules.forEach(rule => {
        const inputEl = document.getElementById(rule.id);
        const errorEl = inputEl.nextElementSibling;
        
        if (!rule.valid) {
            errorEl.textContent = rule.message || errorMsg;
            errorEl.style.display = 'block';
            isValid = false;
        } else {
            errorEl.style.display = 'none';
        }
    });

    if (!isValid) {
        formErrorMessage.style.display = 'block';
        return;
    }

    formErrorMessage.style.display = 'none';
    
    expenses.push({
        id: Date.now(),
        date: dateVal,
        name: nameVal,
        amount: amountVal,
        category: categoryVal
    });
    
    expenseForm.reset();
    document.getElementById('expense-date').value = today.toISOString().split('T')[0];
    selectedIds.clear();
    render();
});

expenseList.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-delete')) {
        const id = parseInt(e.target.dataset.id);
        openModal("Are you sure you want to delete this expense?", () => {
            expenses = expenses.filter(exp => exp.id !== id);
            selectedIds.delete(id);
        });
    }

    if (e.target.classList.contains('row-checkbox')) {
        const id = parseInt(e.target.dataset.id);
        if (e.target.checked) selectedIds.add(id);
        else selectedIds.delete(id);
        updateSelectAllUI();
    }
});

selectAllCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
        expenses.forEach(exp => selectedIds.add(exp.id));
    } else {
        selectedIds.clear();
    }
    render();
});

document.querySelectorAll('.sortable').forEach(header => {
    header.addEventListener('click', () => {
        const col = header.dataset.column;
        if (currentSort.column === col) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.column = col;
            currentSort.direction = 'asc';
        }
        document.querySelectorAll('.sort-icon').forEach(icon => icon.textContent = '↕');
        header.querySelector('.sort-icon').textContent = currentSort.direction === 'asc' ? '↑' : '↓';
        render();
    });
});

bulkDeleteBtn.addEventListener('click', () => {
    const count = selectedIds.size;
    openModal(`Are you sure you want to delete ${count} selected item(s)?`, () => {
        expenses = expenses.filter(exp => !selectedIds.has(exp.id));
        selectedIds.clear();
    });
});

modalConfirmBtn.addEventListener('click', () => {
    if (pendingAction) pendingAction();
    closeModal();
});

modalCancelBtn.addEventListener('click', closeModal);

modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});

function formatDate(dateStr) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString(undefined, options);
}
