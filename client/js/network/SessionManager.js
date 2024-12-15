export class SessionManager {
    constructor(engine) {
        this.engine = engine;
        this.currentRoomCode = null;
        this.initializeUI();
        this.setupNetworkCallbacks();
    }

    initializeUI() {
        // Get existing UI elements
        this.container = document.getElementById('sessionUI');
        this.sessionInfo = document.getElementById('status');
        this.errorDisplay = document.getElementById('error');
        this.roomInput = document.getElementById('roomCode');
        this.hostButton = document.getElementById('hostButton');
        this.joinButton = document.getElementById('joinButton');
        this.mainMenu = document.getElementById('mainMenu');

        // Add event listeners
        this.hostButton.addEventListener('click', () => this.hostSession());
        this.joinButton.addEventListener('click', () => this.joinSession(this.roomInput.value));
    }

    setupNetworkCallbacks() {
        // Listen for network state changes
        if (this.engine.networkManager) {
            this.engine.networkManager.onConnect = () => {
                console.log('Network connection established');
            };
        }
    }

    async hostSession() {
        try {
            // First connect to server
            await this.engine.networkManager.connect();
            
            // Generate a random room code
            const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            console.log('Attempting to host session with code:', roomCode);
            
            // Send host request
            this.engine.networkManager.send({
                type: 'host',
                roomCode: roomCode
            });
            
            // Update UI with pending status
            this.updateSessionUI('Creating session...', roomCode);
            
            // Store room code
            this.currentRoomCode = roomCode;
            
        } catch (error) {
            console.error('Failed to host session:', error);
            this.showError('Failed to host session. Please try again.');
        }
    }

    async joinSession(roomCode) {
        if (!roomCode) {
            this.showError('Please enter a room code');
            return;
        }

        try {
            // First connect to server
            await this.engine.networkManager.connect();
            
            // Normalize room code
            roomCode = roomCode.toUpperCase();
            console.log('Attempting to join session:', roomCode);
            
            // Send join request
            this.engine.networkManager.send({
                type: 'join',
                roomCode: roomCode
            });
            
            // Update UI with pending status
            this.updateSessionUI('Joining session...', roomCode);
            
            // Store room code
            this.currentRoomCode = roomCode;
            
        } catch (error) {
            console.error('Failed to join session:', error);
            this.showError('Failed to join session. Please check the room code and try again.');
        }
    }

    leaveSession() {
        if (this.currentRoomCode) {
            // Notify server
            this.engine.networkManager.send({
                type: 'leave',
                roomCode: this.currentRoomCode
            });
            
            // Reset state
            this.currentRoomCode = null;
            this.engine.networkManager.currentRoom = null;
            
            // Reset UI
            this.updateSessionUI('', '');
            this.mainMenu.style.display = 'block';
            if (this.leaveButton) {
                this.leaveButton.style.display = 'none';
            }
            
            // Disconnect from server
            this.engine.networkManager.disconnect();
        }
    }

    updateSessionUI(status, roomCode) {
        if (this.sessionInfo) {
            let message = status;
            if (roomCode) {
                message += ` (Room: ${roomCode})`;
                if (status.includes('Creating')) {
                    message += ' - Share this code with others to join!';
                }
            }
            this.sessionInfo.textContent = message;
        }
        
        // Hide/show main menu based on connection state
        if (this.mainMenu) {
            this.mainMenu.style.display = roomCode ? 'none' : 'block';
        }
        
        // Add leave button if it doesn't exist
        if (roomCode && !this.leaveButton) {
            this.leaveButton = document.createElement('button');
            this.leaveButton.textContent = 'Leave Session';
            this.leaveButton.className = 'button';
            this.leaveButton.onclick = () => this.leaveSession();
            this.container.appendChild(this.leaveButton);
        }
        
        // Show/hide leave button
        if (this.leaveButton) {
            this.leaveButton.style.display = roomCode ? 'block' : 'none';
        }
        
        // Clear any previous errors
        this.clearError();
    }

    showError(message) {
        console.error('Session error:', message);
        if (this.errorDisplay) {
            this.errorDisplay.textContent = message;
            this.errorDisplay.style.display = 'block';
            
            // Auto-hide error after 5 seconds
            setTimeout(() => this.clearError(), 5000);
        }
    }

    clearError() {
        if (this.errorDisplay) {
            this.errorDisplay.textContent = '';
            this.errorDisplay.style.display = 'none';
        }
    }
}
