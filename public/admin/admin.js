document.addEventListener('DOMContentLoaded', function() {
    // Charts initialization
    initializeCharts();
    
    // Mobile sidebar toggle functionality
    setupResponsiveFeatures();
});

function initializeCharts() {
    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart').getContext('2d');
    const revenueChart = new Chart(revenueCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{
                label: 'Monthly Revenue ($)',
                data: [72000, 85000, 91000, 88000, 96000, 102000, 110000, 108000, 105000, 118000, 125000, 130000],
                backgroundColor: 'rgba(138, 43, 226, 0.3)',
                borderColor: '#8A2BE2',
                borderWidth: 2,
                pointBackgroundColor: '#8A2BE2',
                pointRadius: 4,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#f1f1f1',
                        font: {
                            family: "'Outfit', sans-serif",
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#f1f1f1',
                    bodyColor: '#f1f1f1',
                    bodyFont: {
                        family: "'Outfit', sans-serif"
                    },
                    titleFont: {
                        family: "'Outfit', sans-serif",
                        weight: 'bold'
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#f1f1f1',
                        font: {
                            family: "'Outfit', sans-serif"
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#f1f1f1',
                        font: {
                            family: "'Outfit', sans-serif"
                        },
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });

    // Member Growth Chart
    const memberCtx = document.getElementById('memberChart').getContext('2d');
    const memberChart = new Chart(memberCtx, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [
                {
                    label: 'New Members',
                    data: [320, 380, 420, 390, 450, 520, 580, 560, 610, 650, 700, 750],
                    backgroundColor: 'rgba(138, 43, 226, 0.6)',
                    borderColor: '#8A2BE2',
                    borderWidth: 1
                },
                {
                    label: 'Cancelled Memberships',
                    data: [120, 140, 150, 130, 170, 190, 200, 180, 210, 230, 220, 250],
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: '#ff6384',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#f1f1f1',
                        font: {
                            family: "'Outfit', sans-serif",
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#f1f1f1',
                    bodyColor: '#f1f1f1',
                    bodyFont: {
                        family: "'Outfit', sans-serif"
                    },
                    titleFont: {
                        family: "'Outfit', sans-serif",
                        weight: 'bold'
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#f1f1f1',
                        font: {
                            family: "'Outfit', sans-serif"
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#f1f1f1',
                        font: {
                            family: "'Outfit', sans-serif"
                        }
                    }
                }
            }
        }
    });
}

function setupResponsiveFeatures() {
    // Navigation buttons - show/hide sidebar on mobile
    const navItems = document.querySelectorAll('.nav-link');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            navItems.forEach(link => link.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Action buttons
    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Here you would typically handle the action
            // For now, let's just add a quick animation
            this.classList.add('clicked');
            setTimeout(() => {
                this.classList.remove('clicked');
            }, 200);
        });
    });

    // Approve buttons logic
    const approveButtons = document.querySelectorAll('.action-btn.approve');
    approveButtons.forEach(button => {
        button.addEventListener('click', function() {
            const row = this.closest('tr');
            const statusCell = row.querySelector('.status');
            statusCell.classList.remove('pending');
            statusCell.classList.add('active');
            statusCell.textContent = 'Approved';
            this.textContent = 'View';
            this.classList.remove('approve');
        });
    });
}