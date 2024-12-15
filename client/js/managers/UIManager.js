import * as THREE from 'three';

export class UIManager {
    constructor(engine) {
        this.engine = engine;
        this.gameStarted = false;
        this.raycaster = new THREE.Raycaster();
        this.tempMatrix = new THREE.Matrix4();
        this.intersected = null;
        
        // Timer properties
        this.gameStartTime = 0;
        this.gameDuration = 120000; // 120 seconds
    }

    update() {
        // All interaction is now handled by VRScoreUI
    }

    handleGameStart() {
        if (this.gameStarted) return;
        
        console.log('[GAME_START] Starting game...');
        this.gameStarted = true;
        this.gameStartTime = Date.now();
        
        // Hide start button in VR score UI
        if (this.engine.scoreManager.vrScoreUI && this.engine.scoreManager.vrScoreUI.startButton) {
            console.log('[GAME_START] Hiding start button');
            this.engine.scoreManager.vrScoreUI.startButton.visible = false;
        }
        
        // Send start game event to all players
        if (this.engine.networkManager) {
            console.log('[GAME_START] Sending start game event to network');
            this.engine.networkManager.send({
                type: 'gameStart',
                data: {
                    startTime: this.gameStartTime
                }
            });
        }

        // Start the game locally
        console.log('[GAME_START] Starting local game');
        this.startGame();
    }

    handleGameEnd() {
        // Reset game state
        this.gameStarted = false;
        this.gameStartTime = 0;
        
        // Show start button in VR score UI
        if (this.engine.scoreManager.vrScoreUI && this.engine.scoreManager.vrScoreUI.startButton) {
            this.engine.scoreManager.vrScoreUI.startButton.visible = true;
        }
        
        // Stop bird spawning and remove all birds
        if (this.engine.birdManager) {
            this.engine.birdManager.isSpawning = false;
            this.engine.birdManager.birds.forEach((bird, id) => {
                this.engine.birdManager.removeBird(id);
            });
        }
        
        // Send game end event if we're the host
        if (this.engine.networkManager?.isHost) {
            this.engine.networkManager.send({
                type: 'gameEnd'
            });
        }
    }

    handleNetworkGameStart(data) {
        if (this.gameStarted) return;
        
        this.gameStarted = true;
        this.gameStartTime = data.startTime;
        
        // Hide start button in VR score UI
        if (this.engine.scoreManager.vrScoreUI && this.engine.scoreManager.vrScoreUI.startButton) {
            this.engine.scoreManager.vrScoreUI.startButton.visible = false;
        }
        
        // Start the game
        this.startGame();
    }

    handleNetworkGameEnd() {
        // Reset game state
        this.gameStarted = false;
        this.gameStartTime = 0;
        
        // Show start button in VR score UI
        if (this.engine.scoreManager.vrScoreUI && this.engine.scoreManager.vrScoreUI.startButton) {
            this.engine.scoreManager.vrScoreUI.startButton.visible = true;
        }
        
        // Stop bird spawning and remove all birds
        if (this.engine.birdManager) {
            this.engine.birdManager.isSpawning = false;
            this.engine.birdManager.birds.forEach((bird, id) => {
                this.engine.birdManager.removeBird(id);
            });
        }
    }

    startGame() {
        // Start bird spawning
        if (this.engine.birdManager) {
            console.log('[GAME_START] Starting bird spawning');
            this.engine.birdManager.isSpawning = true;
        }
    }

    updateTimer() {
        if (!this.gameStarted) return;
        
        const currentTime = Date.now();
        const elapsedTime = currentTime - this.gameStartTime;
        const remainingTime = Math.max(0, this.gameDuration - elapsedTime);
        
        // Convert to seconds and format
        const seconds = Math.ceil(remainingTime / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const timeText = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        
        // Update VRScoreUI timer display
        if (this.engine.scoreManager.vrScoreUI && this.engine.scoreManager.vrScoreUI.timerDisplay) {
            this.engine.scoreManager.vrScoreUI.timerDisplay.text = timeText;
        }
        
        // End game if time is up and we're the host
        if (remainingTime <= 0 && this.engine.networkManager?.isHost) {
            this.handleGameEnd();
        }
    }
}
