import * as THREE from 'three';

export class UIManager {
    constructor(engine) {
        this.engine = engine;
        this.startButton = null;
        this.gameStarted = false;
        this.raycaster = new THREE.Raycaster();
        this.tempMatrix = new THREE.Matrix4();
        this.intersected = null;
        
        // Timer properties
        this.gameStartTime = 0;
        this.gameDuration = 120000; // 120 seconds
        this.timerDisplay = null;
        
        // Only create start button initially
        this.createStartButton();
    }

    createStartButton() {
        // Create button geometry
        const geometry = new THREE.BoxGeometry(0.3, 0.15, 0.05);
        
        // Create materials for different button states
        const materials = {
            default: new THREE.MeshPhongMaterial({ 
                color: 0x22cc22,
                transparent: true,
                opacity: 0.9
            }),
            hover: new THREE.MeshPhongMaterial({ 
                color: 0x44ff44,
                transparent: true,
                opacity: 0.9
            }),
            pressed: new THREE.MeshPhongMaterial({ 
                color: 0x118811,
                transparent: true,
                opacity: 0.9
            })
        };

        // Create button mesh
        this.startButton = new THREE.Mesh(geometry, materials.default);
        this.startButton.position.set(0, 1.6, -1); // Position in front of user
        this.startButton.userData = {
            type: 'button',
            materials: materials,
            isStartButton: true
        };

        // Create text as a separate mesh
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.font = 'bold 64px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('START', canvas.width/2, canvas.height/2);
        
        const textTexture = new THREE.CanvasTexture(canvas);
        const textMaterial = new THREE.MeshBasicMaterial({
            map: textTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        const textGeometry = new THREE.PlaneGeometry(0.25, 0.125);
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.set(0, 0, 0.026); // Slightly in front of the button
        this.startButton.add(textMesh);

        // Add to scene
        this.engine.scene.add(this.startButton);
    }

    createTimerDisplay() {
        // Create canvas for timer
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({ 
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        // Create mesh for timer display
        const geometry = new THREE.PlaneGeometry(1, 0.5);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(0, 2.2, -1.5);
        this.engine.scene.add(mesh);
        
        // Store timer display properties
        this.timerDisplay = {
            mesh: mesh,
            texture: texture,
            context: canvas.getContext('2d')
        };
    }

    update() {
        if (this.gameStarted) return;

        // Check each controller for intersection
        const controllers = this.engine.inputManager.controllers;
        const session = this.engine.renderer.xr.getSession();
        
        if (!session) {
            console.debug('[START_BUTTON] No XR session available');
            return;
        }
        
        console.debug('[START_BUTTON] Checking controllers:', controllers ? controllers.length : 0);
        
        for (let i = 0; i < controllers.length; i++) {
            const controller = controllers[i];
            
            // Get the corresponding input source
            const inputSource = session.inputSources[i];
            if (!inputSource) {
                console.debug('[START_BUTTON] No input source for controller', i);
                continue;
            }
            
            // Get gamepad from input source
            const gamepad = inputSource.gamepad;
            console.debug('[START_BUTTON] Controller', i, 'gamepad:', gamepad ? 'connected' : 'not connected');
            
            this.tempMatrix.identity().extractRotation(controller.matrixWorld);
            this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
            this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);

            const intersects = this.raycaster.intersectObject(this.startButton);
            console.debug('[START_BUTTON] Controller', i, 'intersects:', intersects.length > 0);

            if (intersects.length > 0) {
                if (this.intersected !== this.startButton) {
                    this.intersected = this.startButton;
                    this.startButton.material = this.startButton.userData.materials.hover;
                    console.debug('[START_BUTTON] Hovering over button');
                }

                // Check if trigger is pressed using gamepad from input source
                if (gamepad && gamepad.buttons[0]) {
                    console.debug('[START_BUTTON] Trigger state:', gamepad.buttons[0].pressed);
                    if (gamepad.buttons[0].pressed) {
                        this.startButton.material = this.startButton.userData.materials.pressed;
                        console.debug('[START_BUTTON] Button pressed! Triggering game start');
                        
                        // Add haptic feedback
                        if (gamepad.hapticActuators && gamepad.hapticActuators[0]) {
                            gamepad.hapticActuators[0].pulse(1.0, 100);
                        }
                        
                        this.handleGameStart();
                    }
                }
            } else if (this.intersected === this.startButton) {
                this.intersected = null;
                this.startButton.material = this.startButton.userData.materials.default;
                console.debug('[START_BUTTON] No longer hovering over button');
            }
        }
    }

    handleGameStart() {
        if (this.gameStarted) return;
        
        this.gameStarted = true;
        this.gameStartTime = Date.now();
        
        // Hide start button in VR score UI
        if (this.engine.scoreManager.vrScoreUI && this.engine.scoreManager.vrScoreUI.startButton) {
            this.engine.scoreManager.vrScoreUI.startButton.visible = false;
        }
        
        // Send start game event to all players
        if (this.engine.networkManager) {
            this.engine.networkManager.send({
                type: 'gameStart',
                data: {
                    startTime: this.gameStartTime
                }
            });
        }

        // Start the game locally
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
        // Hide start button
        if (this.startButton) {
            this.startButton.visible = false;
        }

        // Start bird spawning
        if (this.engine.birdManager) {
            this.engine.birdManager.isSpawning = true;
        }
    }

    updateTimer() {
        if (!this.timerDisplay || !this.gameStarted) return;
        
        const currentTime = Date.now();
        const elapsedTime = currentTime - this.gameStartTime;
        const remainingTime = Math.max(0, this.gameDuration - elapsedTime);
        
        // Convert to seconds and format
        const seconds = Math.ceil(remainingTime / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const timeText = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        
        // Update canvas
        const context = this.timerDisplay.context;
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);
        context.fillStyle = '#ffffff';
        context.font = 'bold 64px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(timeText, context.canvas.width/2, context.canvas.height/2);
        
        // Update texture
        this.timerDisplay.texture.needsUpdate = true;
        
        // End game if time is up and we're the host
        if (remainingTime <= 0 && this.engine.networkManager?.isHost) {
            this.handleGameEnd();
        }
    }
}
