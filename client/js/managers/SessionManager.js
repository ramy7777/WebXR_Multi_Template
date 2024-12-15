export class SessionManager {
    constructor(engine) {
        this.engine = engine;
        this.currentRoom = null;
        this.setupUI();
    }

    setupUI() {
        // Get existing UI elements
        this.container = document.getElementById('sessionUI');
        this.statusContainer = document.getElementById('status');
        this.errorContainer = document.getElementById('error');
        this.roomInput = document.getElementById('roomCode');

        // Style the container
        this.container.style.position = 'absolute';
        this.container.style.top = '20px';
        this.container.style.right = '20px';
        this.container.style.zIndex = '1000';
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.container.style.padding = '20px';
        this.container.style.borderRadius = '10px';
        this.container.style.display = 'block';

        // Get buttons
        const hostButton = document.getElementById('hostButton');
        const quickJoinButton = document.getElementById('quickJoinButton');
        const joinButton = document.getElementById('joinButton');

        // Setup event listeners
        hostButton.addEventListener('click', () => this.hostSession());
        quickJoinButton.addEventListener('click', () => this.quickJoinSession());
        joinButton.addEventListener('click', () => this.joinSession());

        // Style all buttons consistently
        const buttons = this.container.getElementsByClassName('button');
        for (let button of buttons) {
            button.style.padding = '8px 16px';
            button.style.margin = '4px';
            button.style.backgroundColor = '#4CAF50';
            button.style.color = 'white';
            button.style.border = 'none';
            button.style.borderRadius = '4px';
            button.style.cursor = 'pointer';
            button.style.transition = 'background-color 0.3s';

            // Add hover effect
            button.addEventListener('mouseover', () => {
                button.style.backgroundColor = '#45a049';
            });
            button.addEventListener('mouseout', () => {
                button.style.backgroundColor = '#4CAF50';
            });
        }

        // Style the input
        if (this.roomInput) {
            this.roomInput.style.padding = '8px';
            this.roomInput.style.borderRadius = '4px';
            this.roomInput.style.border = '1px solid #ddd';
            this.roomInput.style.width = '120px';
            this.roomInput.style.marginRight = '10px';
        }
    }

    async hostSession() {
        try {
            this.engine.networkManager.hostRoom();
            this.hideUI();
        } catch (error) {
            console.error('Failed to host session:', error);
            this.showError('Failed to host session. Please try again.');
        }
    }

    async quickJoinSession() {
        try {
            console.log('Quick Join button clicked');
            this.showSuccess('Attempting to quick join...');
            await this.engine.networkManager.autoJoinRoom();
            console.log('Auto join successful');
            this.showSuccess('Joining available session...');
            this.hideUI();
        } catch (error) {
            console.error('Failed to quick join:', error);
            this.showError('Failed to quick join. Please try again.');
        }
    }

    async joinSession() {
        const roomCode = this.roomInput.value.trim();
        if (!roomCode) {
            this.showError('Please enter a room code.');
            return;
        }

        try {
            this.engine.networkManager.joinRoom(roomCode);
            this.hideUI();
        } catch (error) {
            console.error('Failed to join session:', error);
            this.showError('Failed to join session. Please try again.');
        }
    }

    showUI() {
        this.container.style.display = 'block';
    }

    hideUI() {
        this.container.style.display = 'none';
    }

    showError(message) {
        if (this.errorContainer) {
            this.errorContainer.textContent = message;
            this.errorContainer.style.color = '#ff6b6b';
            this.errorContainer.style.marginTop = '10px';

            // Clear error after 5 seconds
            setTimeout(() => {
                this.errorContainer.textContent = '';
            }, 5000);
        }
    }

    showSuccess(message) {
        if (this.statusContainer) {
            this.statusContainer.textContent = message;
            this.statusContainer.style.color = '#69db7c';
            this.statusContainer.style.marginTop = '10px';

            // Clear message after 5 seconds
            setTimeout(() => {
                this.statusContainer.textContent = '';
            }, 5000);
        }
    }
}
