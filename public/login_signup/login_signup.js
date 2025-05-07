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
        const membershipPlan = document.getElementById('loginMembershipPlan').value;
        
        // Validate form data
        if (!email || !password) {
            showError('Please enter both email and password');
            return;
        }
        
        // Make AJAX request to login API
        fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                password: password,
                membershipPlan: membershipPlan
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Show success message and redirect
                showMessage('Login successful! Redirecting...');
                setTimeout(() => {
                    window.location.href = data.redirectUrl;
                }, 1000);
            } else {
                // Show error message
                showError(data.message || 'Login failed. Please try again.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showError('An error occurred. Please try again later.');
        });
    });

    // Validate phone number
    function validatePhone(phone) {
        return /^\d{10}$/.test(phone);
    }

    // Validate matching passwords
    function validatePasswords(password, confirmPassword) {
        return password === confirmPassword;
    }

    // Handle signup form submission
    document.getElementById('signupForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const fullName = document.getElementById('userFullName').value;
        const dob = document.getElementById('dateOfBirth').value;
        const gender = document.getElementById('gender').value;
        const email = document.getElementById('userEmail').value;
        const phone = document.getElementById('phoneNumber').value;
        const password = document.getElementById('userPassword').value;
        const confirmPassword = document.getElementById('userConfirmPassword').value;
        const membershipPlan = document.getElementById('membershipPlan').value;
        const membershipDuration = document.getElementById('membershipDuration').value;
        const cardType = document.getElementById('cardType').value;
        const cardNumber = document.getElementById('cardNumber').value;
        const expirationDate = document.getElementById('expirationDate').value;
        const cvv = document.getElementById('cvv').value;
        const termsAgreed = document.getElementById('terms').checked;
        
        // Validate form data
        if (!validatePhone(phone)) {
            showError('Phone number must be exactly 10 digits');
            return;
        }

        if (!validatePasswords(password, confirmPassword)) {
            showError('Passwords do not match');
            return;
        }
        
        if (!termsAgreed) {
            showError('You must agree to the terms and conditions');
            return;
        }
        
        // Make AJAX request to signup API
        fetch('/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userFullName: fullName,
                dateOfBirth: dob,
                gender: gender,
                userEmail: email,
                phoneNumber: phone,
                userPassword: password,
                membershipPlan: membershipPlan,
                membershipDuration: membershipDuration,
                cardType: cardType,
                cardNumber: cardNumber,
                expirationDate: expirationDate,
                cvv: cvv
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Show success message
                showMessage(data.message || 'Account created successfully! Please log in.');
                
                // Clear form fields
                document.getElementById('signupForm').reset();
                
                // Switch to login form after successful signup
                setTimeout(() => {
                    toggleForm('login');
                    
                    // Pre-fill email in login form
                    document.getElementById('email').value = email;
                    
                    // Set membership plan in login form
                    const loginMembershipPlan = document.getElementById('loginMembershipPlan');
                    if (loginMembershipPlan) {
                        loginMembershipPlan.value = membershipPlan;
                    }
                }, 1500);
            } else {
                // Show error message
                showError(data.message || 'Registration failed. Please try again.');
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