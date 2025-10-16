// Update Status functionality for repair management
document.addEventListener('DOMContentLoaded', function() {
    // Handle status update dropdown changes
    const statusSelects = document.querySelectorAll('.status-select');

    statusSelects.forEach(select => {
        select.addEventListener('change', function() {
            const repairId = this.dataset.repairId;
            const newStatus = this.value;

            if (confirm('Are you sure you want to update the status to "' + newStatus + '"?')) {
                updateRepairStatus(repairId, newStatus);
            } else {
                // Reset to previous value
                this.value = this.dataset.previousValue || 'Pending';
            }
        });

        // Store original value
        select.dataset.previousValue = select.value;
    });

    // Function to update repair status via AJAX
    function updateRepairStatus(repairId, status) {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', '/repair/' + repairId, true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    // Success - show notification
                    showNotification('Status updated successfully!', 'success');
                } else {
                    // Error - show notification
                    showNotification('Failed to update status. Please try again.', 'error');
                    // Reset select to previous value
                    document.querySelector(`[data-repair-id="${repairId}"]`).value =
                        document.querySelector(`[data-repair-id="${repairId}"]`).dataset.previousValue;
                }
            }
        };

        xhr.send('status=' + encodeURIComponent(status));
    }

    // Notification system
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 px-6 py-4 rounded-xl shadow-xl z-50 transform translate-x-full transition-transform duration-300 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} mr-3"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 4 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(full)';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 4000);
    }

    // Auto-refresh functionality (optional)
    let refreshInterval;
    const autoRefreshToggle = document.getElementById('autoRefreshToggle');

    if (autoRefreshToggle) {
        autoRefreshToggle.addEventListener('change', function() {
            if (this.checked) {
                refreshInterval = setInterval(() => {
                    window.location.reload();
                }, 30000); // Refresh every 30 seconds
            } else {
                clearInterval(refreshInterval);
            }
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + R to refresh
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            window.location.reload();
        }

        // Ctrl/Cmd + S to save (if form is present)
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            const form = document.querySelector('form');
            if (form) {
                form.submit();
            }
        }
    });

    // Add loading states to buttons
    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
            this.disabled = true;

            // Re-enable after 3 seconds (in case of network issues)
            setTimeout(() => {
                this.innerHTML = originalText;
                this.disabled = false;
            }, 3000);
        });
    });
});