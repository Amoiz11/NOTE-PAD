// Clean SmartNotes JavaScript - NO THEME SWITCHER

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    document.documentElement.style.scrollBehavior = 'smooth';
});

function initializeApp() {
    const noteCards = document.querySelectorAll('.note-card');
    noteCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
    
    addRippleEffect();
    initializeTooltips();
    addKeyboardShortcuts();
}

function addRippleEffect() {
    const buttons = document.querySelectorAll('.btn, .action-btn, .toolbar-btn');
    
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255, 255, 255, 0.5);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
            `;
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(2);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

function initializeTooltips() {
    const tooltipElements = document.querySelectorAll('[title]');
    
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', function(e) {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = this.getAttribute('title');
            tooltip.style.cssText = `
                position: fixed;
                background: #323232;
                color: white;
                padding: 6px 8px;
                border-radius: 4px;
                font-size: 12px;
                white-space: nowrap;
                z-index: 1000;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            
            document.body.appendChild(tooltip);
            
            const rect = this.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();
            
            tooltip.style.left = `${rect.left + rect.width / 2 - tooltipRect.width / 2}px`;
            tooltip.style.top = `${rect.top - tooltipRect.height - 8}px`;
            
            setTimeout(() => {
                tooltip.style.opacity = '1';
            }, 10);
            
            this.addEventListener('mouseleave', function() {
                tooltip.style.opacity = '0';
                setTimeout(() => {
                    tooltip.remove();
                }, 300);
            }, { once: true });
        });
    });
}

function enhanceSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    let searchTimeout;
    
    searchInput.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        const searchTerm = e.target.value.toLowerCase().trim();
        
        searchTimeout = setTimeout(() => {
            const notes = document.querySelectorAll('.note-card');
            let visibleCount = 0;
            
            notes.forEach(note => {
                const title = note.querySelector('.note-title').textContent.toLowerCase();
                const content = note.querySelector('.note-content').textContent.toLowerCase();
                
                if (searchTerm === '' || title.includes(searchTerm) || content.includes(searchTerm)) {
                    note.style.display = 'block';
                    note.style.animation = 'fadeIn 0.3s ease';
                    visibleCount++;
                } else {
                    note.style.display = 'none';
                }
            });
            
            const emptyState = document.querySelector('.empty-state');
            if (emptyState) {
                if (visibleCount === 0 && searchTerm !== '') {
                    emptyState.style.display = 'block';
                    emptyState.querySelector('h2').textContent = 'No notes found';
                    emptyState.querySelector('p').textContent = 'Try a different search term';
                } else if (visibleCount === 0 && searchTerm === '') {
                    emptyState.style.display = 'block';
                    emptyState.querySelector('h2').textContent = 'Create your first note';
                    emptyState.querySelector('p').textContent = 'Click the "New Note" button to get started';
                } else {
                    emptyState.style.display = 'none';
                }
            }
        }, 300);
    });
}

function addKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'n':
                    e.preventDefault();
                    if (window.createNewNote) {
                        createNewNote();
                    }
                    break;
                case 'f':
                    e.preventDefault();
                    const searchInput = document.getElementById('searchInput');
                    if (searchInput) {
                        searchInput.focus();
                    }
                    break;
                case '/':
                    e.preventDefault();
                    const searchInput2 = document.getElementById('searchInput');
                    if (searchInput2) {
                        searchInput2.focus();
                    }
                    break;
            }
        }
        
        if (e.key === 'Escape') {
            const searchInput = document.getElementById('searchInput');
            if (searchInput && searchInput.value) {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
            }
        }
    });
}

function enhanceNoteCards() {
    const noteCards = document.querySelectorAll('.note-card');
    
    noteCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
        
        card.addEventListener('dblclick', function(e) {
            if (!e.target.closest('.action-btn')) {
                const noteId = this.dataset.noteId;
                if (noteId && !this.classList.contains('locked')) {
                    window.location.href = `/edit_note/${noteId}`;
                }
            }
        });
    });
}

function initializeDragAndDrop() {
    const noteCards = document.querySelectorAll('.note-card');
    const notesGrid = document.querySelector('.notes-grid');
    
    if (!notesGrid) return;
    
    let draggedElement = null;
    
    noteCards.forEach(card => {
        card.draggable = true;
        
        card.addEventListener('dragstart', function(e) {
            draggedElement = this;
            this.style.opacity = '0.5';
            e.dataTransfer.effectAllowed = 'move';
        });
        
        card.addEventListener('dragend', function(e) {
            this.style.opacity = '1';
            draggedElement = null;
        });
        
        card.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });
        
        card.addEventListener('drop', function(e) {
            e.preventDefault();
            if (draggedElement && draggedElement !== this) {
                const allCards = [...notesGrid.children];
                const draggedIndex = allCards.indexOf(draggedElement);
                const targetIndex = allCards.indexOf(this);
                
                if (draggedIndex < targetIndex) {
                    this.parentNode.insertBefore(draggedElement, this.nextSibling);
                } else {
                    this.parentNode.insertBefore(draggedElement, this);
                }
            }
        });
    });
}

function initializeAutoSave() {
    const editor = document.getElementById('noteEditor');
    const titleInput = document.getElementById('noteTitle');
    
    if (!editor || !titleInput) return;
    
    let autoSaveTimer;
    let lastSavedContent = editor.innerHTML;
    let lastSavedTitle = titleInput.value;
    
    function shouldAutoSave() {
        return editor.innerHTML !== lastSavedContent || titleInput.value !== lastSavedTitle;
    }
    
    function performAutoSave() {
        if (shouldAutoSave()) {
            if (window.saveNote) {
                saveNote();
                lastSavedContent = editor.innerHTML;
                lastSavedTitle = titleInput.value;
            }
        }
    }
    
    editor.addEventListener('input', function() {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(performAutoSave, 2000);
    });
    
    titleInput.addEventListener('input', function() {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(performAutoSave, 2000);
    });
    
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') {
            performAutoSave();
        }
    });
    
    window.addEventListener('beforeunload', function() {
        performAutoSave();
    });
}

document.addEventListener('DOMContentLoaded', function() {
    enhanceSearch();
    enhanceNoteCards();
    initializeDragAndDrop();
    initializeAutoSave();
});

window.app = {
    createNewNote,
    editNote,
    togglePin,
    toggleArchive,
    deleteNote,
    saveNote,
    restoreNote,
    permanentDelete
};