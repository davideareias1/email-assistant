document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('apiKey');
    const userNameInput = document.getElementById('userName');
    const saveButton = document.getElementById('saveButton');
    const toggleVisibilityButton = document.querySelector('.toggle-visibility');
    const notification = document.getElementById('notification');

    // Load existing settings
    chrome.storage.sync.get(['openRouterApiKey', 'userName'], (result) => {
        if (result.openRouterApiKey) {
            apiKeyInput.value = result.openRouterApiKey;
        }
        if (result.userName) {
            userNameInput.value = result.userName;
        }
    });

    // Toggle password visibility
    toggleVisibilityButton.addEventListener('click', () => {
        const type = apiKeyInput.type === 'password' ? 'text' : 'password';
        apiKeyInput.type = type;

        // Update icon based on visibility state
        const eyeIcon = toggleVisibilityButton.querySelector('.eye-icon');
        if (type === 'text') {
            eyeIcon.innerHTML = `
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            `;
        } else {
            eyeIcon.innerHTML = `
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
            `;
        }
    });

    // Show notification
    function showNotification(message, type = 'success') {
        notification.textContent = message;
        notification.className = `notification ${type} show`;

        // Hide notification after 3 seconds
        setTimeout(() => {
            notification.className = 'notification';
        }, 3000);
    }

    // Validate API key format
    function isValidApiKey(key) {
        // OpenRouter API keys typically start with 'sk-' and are longer than 20 characters
        return key.startsWith('sk-') && key.length > 20;
    }

    // Save settings
    saveButton.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        const userName = userNameInput.value.trim();

        if (!apiKey) {
            showNotification('Please enter an API key', 'error');
            return;
        }

        if (!userName) {
            showNotification('Please enter your name', 'error');
            return;
        }

        if (!isValidApiKey(apiKey)) {
            showNotification('Invalid API key format. It should start with "sk-"', 'error');
            return;
        }

        chrome.storage.sync.set({
            openRouterApiKey: apiKey,
            userName: userName
        }, () => {
            showNotification('Settings saved successfully');
        });
    });

    // Handle Enter key for both inputs
    [apiKeyInput, userNameInput].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveButton.click();
            }
        });
    });

    // Add input animation for both inputs
    [apiKeyInput, userNameInput].forEach(input => {
        input.addEventListener('focus', () => {
            input.parentElement.style.transform = 'scale(1.02)';
            input.parentElement.style.transition = 'transform 0.2s ease';
        });

        input.addEventListener('blur', () => {
            input.parentElement.style.transform = 'scale(1)';
        });
    });
}); 