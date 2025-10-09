document.addEventListener('DOMContentLoaded', function() {
    // Check URL parameter to show the right form on page load
    const params = new URLSearchParams(window.location.search);
    const formType = params.get('form');
    if (formType === 'signup') {
        toggleForm('signup');
    }

    // Handle login form submission
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const loginMembershipPlan = document.getElementById('loginMembershipPlan').value;
        
        // Validate form data
        if (!email || !password || !loginMembershipPlan) {
            showError('Please fill in all fields');
            return;
        }
        
        // Make AJAX request to login endpoint
        fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                password,
                loginMembershipPlan
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'Login successful') {
                // Show success message and redirect
                showMessage(data.message);
                setTimeout(() => {
                    window.location.href = data.redirect;
                }, 1000);
                this.reset(); // Reset form
            } else {
                // Show error message
                showError(data.error || 'Login failed. Please try again.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showError('An error occurred. Please try again later.');
        });
    });

    // Validate phone number (aligned with backend regex)
    function validatePhone(phone) {
        return /^\+?[\d\s-]{10,}$/.test(phone);
    }

    // Validate matching passwords
    function validatePasswords(password, confirmPassword) {
        return password === confirmPassword;
    }

    // Handle signup form submission
    document.getElementById('signupForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const userFullName = document.getElementById('userFullName').value;
        const dateOfBirth = document.getElementById('dateOfBirth').value;
        const gender = document.getElementById('gender').value;
        const userEmail = document.getElementById('userEmail').value;
        const phoneNumber = document.getElementById('phoneNumber').value;
        const userPassword = document.getElementById('userPassword').value;
        const userConfirmPassword = document.getElementById('userConfirmPassword').value;
        const membershipPlan = document.getElementById('membershipPlan').value;
        const membershipDuration = document.getElementById('membershipDuration').value;
        const cardType = document.getElementById('cardType').value;
        const cardNumber = document.getElementById('cardNumber').value;
        const expirationDate = document.getElementById('expirationDate').value;
        const cvv = document.getElementById('cvv').value;
        const terms = document.getElementById('terms').checked;
        const weight = document.getElementById('weight').value;
        const height = document.getElementById('height').value;
        
        // Validate form data
        if (!userFullName || !dateOfBirth || !gender || !userEmail || !phoneNumber || !userPassword || 
            !userConfirmPassword || !membershipPlan || !membershipDuration || !cardType || 
            !cardNumber || !expirationDate || !cvv) {
            showError('Please fill in all fields');
            return;
        }

        if (!validatePhone(phoneNumber)) {
            showError('Please enter a valid phone number (at least 10 digits, may include +, spaces, or hyphens)');
            return;
        }

        if (!validatePasswords(userPassword, userConfirmPassword)) {
            showError('Passwords do not match');
            return;
        }
        
        if (!terms) {
            showError('You must agree to the terms and conditions');
            return;
        }

        // Validate weight
        if (isNaN(weight) || weight < 20 || weight > 300) {
            showError('Please enter a valid weight between 20 and 300 kg');
            return;
        }

        // Validate height (optional, but if provided, must be valid)
        if (height && (isNaN(height) || height < 50 || height > 250)) {
            showError('Please enter a valid height between 50 and 250 cm');
            return;
        }
        
        // Make AJAX request to signup endpoint
        fetch('/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userFullName,
                dateOfBirth,
                gender,
                userEmail,
                phoneNumber,
                userPassword,
                userConfirmPassword,
                membershipPlan,
                membershipDuration,
                cardType,
                cardNumber,
                expirationDate,
                cvv,
                terms,
                weight,
                height
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'Signup successful') {
                // Show success message and redirect
                showMessage(data.message);
                setTimeout(() => {
                    window.location.href = data.redirect;
                }, 1000);
                this.reset(); // Reset form
            } else {
                // Show error message
                showError(data.error || 'Registration failed. Please try again.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showError('An error occurred. Please try again later.');
        });
    });
});

// Function to toggle between login and signup forms
function toggleForm(type) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const header = document.querySelector('.auth-header h2');
    const subheader = document.querySelector('.auth-header p');

    if (type === 'signup') {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
        header.textContent = 'Create Account';
        subheader.textContent = 'Sign up to join our community';
    } else {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
        header.textContent = 'Welcome Back';
        subheader.textContent = 'Sign in to access your account';
    }
}

// Show error message
function showError(message) {
    // Create error message element if it doesn't exist
    let errorElement = document.getElementById('errorMessage');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.id = 'errorMessage';
        errorElement.className = 'error-message';
        document.querySelector('.auth-header').appendChild(errorElement);
    }
    
    // Set message and show
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

function calculateBMI() {
    const height = parseFloat(document.getElementById('height').value);
    const weight = parseFloat(document.getElementById('weight').value);
    const bmiField = document.getElementById('bmi');

    // Clear previous value if inputs are invalid
    if (!height || !weight || height <= 0 || weight <= 0) {
        bmiField.value = '';
        return;
    }

    // Calculate BMI: weight (kg) / (height (m))²
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);

    // Set BMI with 1 decimal place
    bmiField.value = bmi.toFixed(1);
}

// Show success message
function showMessage(message) {
    // Create success message element if it doesn't exist
    let successElement = document.getElementById('successMessage');
    if (!successElement) {
        successElement = document.createElement('div');
        successElement.id = 'successMessage';
        successElement.className = 'success-message';
        document.querySelector('.auth-header').appendChild(successElement);
    }
    
    // Set message and show
    successElement.textContent = message;
    successElement.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
        successElement.style.display = 'none';
    }, 5000);
}