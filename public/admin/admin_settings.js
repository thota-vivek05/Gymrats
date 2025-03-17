document.addEventListener('DOMContentLoaded', function() {
    initializeSettings();
});

function initializeSettings() {
    // Load saved settings from localStorage if available
    const savedSettings = JSON.parse(localStorage.getItem('adminSettings') || '{}');
    
    // Populate input fields with saved values
    Object.keys(savedSettings).forEach(key => {
        const element = document.querySelector(`[name="${key}"]`);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = savedSettings[key];
            } else {
                element.value = savedSettings[key];
            }
        }
    });

    // Add change listeners to all inputs
    document.querySelectorAll('.settings-input, .switch input').forEach(input => {
        input.addEventListener('change', function() {
            markUnsavedChanges();
        });
    });
}

function markUnsavedChanges() {
    const saveBtn = document.querySelector('.save-btn');
    if (!saveBtn.classList.contains('unsaved')) {
        saveBtn.classList.add('unsaved');
        saveBtn.textContent = 'Save Changes*';
    }
}

function toggleApiKey() {
    const apiKeyInput = document.getElementById('apiKey');
    const toggleBtn = document.querySelector('.show-hide-btn');
    
    if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        toggleBtn.textContent = 'Hide';
    } else {
        apiKeyInput.type = 'password';
        toggleBtn.textContent = 'Show';
    }
}

function saveSettings() {
    // Collect all settings
    const settings = {};
    
    // Get all input values
    document.querySelectorAll('.settings-input').forEach(input => {
        settings[input.name] = input.value;
    });
    
    // Get all toggle states
    document.querySelectorAll('.switch input').forEach(toggle => {
        settings[toggle.name] = toggle.checked;
    });
    
    // Save to backend (you would implement this)
    fetch('/admin/api/settings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to save settings');
        }
        return response.json();
    })
    .then(data => {
        // Save to localStorage as backup
        localStorage.setItem('adminSettings', JSON.stringify(settings));
        
        // Update UI
        const saveBtn = document.querySelector('.save-btn');
        saveBtn.classList.remove('unsaved');
        saveBtn.textContent = 'Save Changes';
        
        // Show success message
        showNotification('Settings saved successfully!', 'success');
    })
    .catch(error => {
        console.error('Error saving settings:', error);
        showNotification('Failed to save settings. Please try again.', 'error');
    });
}

function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Handle cancel button
document.querySelector('.cancel-btn').addEventListener('click', function() {
    if (confirm('Are you sure you want to discard changes?')) {
        window.location.reload();
    }
});
