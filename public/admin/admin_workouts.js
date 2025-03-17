document.addEventListener('DOMContentLoaded', function() {
    // Setup interactive elements
    setupTabNavigation();
    setupModalFunctionality();
    setupSearchFunctionality(); 
    setupActionButtons();
    initializeCharts();
});

// Tab Navigation Setup
function setupTabNavigation() {
    const tabs = document.querySelectorAll('.tab');
    const workoutCards = document.querySelectorAll('.workout-card');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            const tabType = this.getAttribute('data-tab');
            
            // Filter workout cards based on tab
            workoutCards.forEach(card => {
                const cardType = card.getAttribute('data-plan-type');
                const isPending = card.querySelector('.pending-badge') !== null;
                
                switch(tabType) {
                    case 'all':
                        card.style.display = '';
                        break;
                    case 'pending':
                        card.style.display = isPending ? '' : 'none';
                        break;
                    default:
                        card.style.display = (cardType === tabType) ? '' : 'none';
                        break;
                }
            });
        });
    });
}

// Modal Functionality
function setupModalFunctionality() {
    const modal = document.getElementById('planModal');
    const addBtn = document.getElementById('addPlanBtn');
    const closeBtn = document.querySelector('.close-modal');
    const cancelBtn = document.querySelector('.cancel-btn');
    const form = document.getElementById('workoutPlanForm');
    
    // Open modal
    addBtn.addEventListener('click', () => {
        modal.style.display = 'block';
        document.getElementById('modalTitle').textContent = 'Add New Workout Plan';
        form.reset();
    });
    
    // Close modal
    function closeModal() {
        modal.style.display = 'none';
    }
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Handle form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('planName').value,
            type: document.getElementById('planType').value,
            difficulty: document.getElementById('difficulty').value,
            description: document.getElementById('description').value,
            duration: document.getElementById('duration').value,
            sessions: document.getElementById('sessions').value,
            trainer: document.getElementById('trainer').value,
            imageUrl: document.getElementById('imageUrl').value
        };
        
        // Submit to server
        fetch('/api/workout-plans', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Show success message
            alert('Workout plan created successfully!');
            closeModal();
            // Reload page to show new plan
            window.location.reload();
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to create workout plan. Please try again.');
        });
    });
}

// Search Functionality
function setupSearchFunctionality() {
    const searchInput = document.getElementById('workoutSearchInput');
    const workoutCards = document.querySelectorAll('.workout-card');
    
    searchInput.addEventListener('keyup', function() {
        const searchTerm = this.value.toLowerCase();
        
        workoutCards.forEach(card => {
            const title = card.querySelector('.workout-card-title h4').textContent.toLowerCase();
            const type = card.querySelector('.type-tag').textContent.toLowerCase();
            const difficulty = card.querySelector('.difficulty-tag').textContent.toLowerCase();
            const description = card.querySelector('.workout-card-description').textContent.toLowerCase();
            
            if (title.includes(searchTerm) || 
                type.includes(searchTerm) || 
                difficulty.includes(searchTerm) || 
                description.includes(searchTerm)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    });
}

// Action Buttons Setup
function setupActionButtons() {
    // Edit buttons
    document.querySelectorAll('.workout-card-btn').forEach(button => {
        if (button.textContent === 'Edit') {
            button.addEventListener('click', function() {
                const card = this.closest('.workout-card');
                openEditModal(card);
            });
        } else if (button.textContent === 'View Details') {
            button.addEventListener('click', function() {
                const card = this.closest('.workout-card');
                viewPlanDetails(card);
            });
        } else if (button.classList.contains('approve-btn')) {
            button.addEventListener('click', function() {
                const card = this.closest('.workout-card');
                approvePlan(card);
            });
        } else if (button.classList.contains('reject-btn')) {
            button.addEventListener('click', function() {
                const card = this.closest('.workout-card');
                rejectPlan(card);
            });
        }
    });
}

function openEditModal(card) {
    const modal = document.getElementById('planModal');
    const form = document.getElementById('workoutPlanForm');
    
    // Populate form with card data
    document.getElementById('modalTitle').textContent = 'Edit Workout Plan';
    document.getElementById('planName').value = card.querySelector('.workout-card-title h4').textContent;
    document.getElementById('planType').value = card.getAttribute('data-plan-type');
    document.getElementById('difficulty').value = card.querySelector('.difficulty-tag').textContent.toLowerCase();
    document.getElementById('description').value = card.querySelector('.workout-card-description').textContent;
    document.getElementById('duration').value = card.querySelector('.stat-value').textContent.split(' ')[0];
    document.getElementById('sessions').value = card.querySelectorAll('.stat-value')[1].textContent.split('x')[0];
    document.getElementById('trainer').value = card.querySelector('.workout-card-author').textContent.replace('By: ', '');
    document.getElementById('imageUrl').value = card.querySelector('img').src;
    
    modal.style.display = 'block';
}

function viewPlanDetails(card) {
    // Implement view details functionality
    alert('View details functionality to be implemented');
}

function approvePlan(card) {
    if (confirm('Are you sure you want to approve this workout plan?')) {
        // Update badge
        const badges = card.querySelector('.workout-card-badges');
        badges.innerHTML = '<span class="verified-badge">Verified</span>';
        
        // Update action buttons
        const actions = card.querySelector('.workout-card-actions');
        actions.innerHTML = `
            <button class="workout-card-btn view-details-btn">View Details</button>
            <button class="workout-card-btn">Edit</button>
        `;
        
        // Reattach event listeners
        setupActionButtons();
    }
}

function rejectPlan(card) {
    if (confirm('Are you sure you want to reject this workout plan?')) {
        card.remove();
    }
}

// Initialize Charts
function initializeCharts() {
    // Plan Type Distribution Chart
    const planTypeCtx = document.getElementById('planTypeChart');
    if (planTypeCtx) {
        new Chart(planTypeCtx, {
            type: 'doughnut',
            data: {
                labels: ['Strength', 'Cardio', 'HIIT', 'Flexibility'],
                datasets: [{
                    data: [35, 25, 20, 20],
                    backgroundColor: [
                        '#8A2BE2',
                        '#E91E63',
                        '#FF5722',
                        '#009688'
                    ],
                    borderWidth: 1,
                    borderColor: '#1e1e1e'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#f1f1f1',
                            padding: 20,
                            font: {
                                size: 12
                            }
                        }
                    }
                }
            }
        });
    }

    // User Engagement Chart
    const engagementCtx = document.getElementById('engagementChart');
    if (engagementCtx) {
        new Chart(engagementCtx, {
            type: 'bar',
            data: {
                labels: ['Advanced Strength', 'HIIT Circuit', 'Dynamic Flexibility', 'Endurance Builder', 'Power Building'],
                datasets: [{
                    label: 'Active Users',
                    data: [1245, 856, 624, 942, 0],
                    backgroundColor: '#8A2BE2',
                    borderColor: '#8A2BE2',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#333'
                        },
                        ticks: {
                            color: '#f1f1f1'
                        }
                    },
                    x: {
                        grid: {
                            color: '#333'
                        },
                        ticks: {
                            color: '#f1f1f1'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#f1f1f1'
                        }
                    }
                }
            }
        });
    }
}
