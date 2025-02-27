document.addEventListener('DOMContentLoaded', () => {
    const userNameInput = document.getElementById('userName');
    const saveButton = document.getElementById('saveButton');
    const notification = document.getElementById('notification');

    // Load existing settings
    chrome.storage.sync.get(['userName'], (result) => {
        if (result.userName) {
            userNameInput.value = result.userName;
        }
    });

    // Show notification
    function showNotification(message, type = 'success') {
        notification.textContent = message;
        notification.className = `notification ${type} show`;

        setTimeout(() => {
            notification.className = 'notification';
        }, 3000);
    }

    // Save settings
    saveButton.addEventListener('click', () => {
        const userName = userNameInput.value.trim();

        if (!userName) {
            showNotification('Please enter your name', 'error');
            return;
        }

        chrome.storage.sync.set({
            userName: userName
        }, () => {
            showNotification('Settings saved successfully');
        });
    });

    // Handle Enter key
    userNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveButton.click();
        }
    });

    // Add input animation
    userNameInput.addEventListener('focus', () => {
        userNameInput.parentElement.style.transform = 'scale(1.02)';
        userNameInput.parentElement.style.transition = 'transform 0.2s ease';
    });

    userNameInput.addEventListener('blur', () => {
        userNameInput.parentElement.style.transform = 'scale(1)';
    });
}); 