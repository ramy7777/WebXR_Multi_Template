import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';

export class VRScoreUI {
    constructor(engine) {
        this.engine = engine;
        this.scoreGroup = new THREE.Group();
        this.font = null;
        this.textMeshes = new Map(); // playerId -> { text: mesh, background: mesh }
        this.timerMesh = null;
        this.startButton = null;
        this.loadFont();
    }

    async loadFont() {
        const loader = new FontLoader();
        try {
            this.font = await new Promise((resolve, reject) => {
                loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', 
                    resolve, 
                    undefined, 
                    reject
                );
            });
            this.initializeUI();
        } catch (error) {
            console.error('Failed to load font:', error);
        }
    }

    initializeUI() {
        // Position the score panel on the left wall
        const roomWidth = 40; // Match the room dimensions from World.js
        this.scoreGroup.position.set(-roomWidth/2 + 0.1, 4, 0); // Slightly off the wall
        this.scoreGroup.rotation.y = Math.PI/2; // Rotate to face into the room

        // Add main background panel with gradient effect
        const mainPanelGeometry = new THREE.PlaneGeometry(4, 6); // Larger panel for wall display
        const gradientTexture = this.createGradientTexture();
        const mainPanelMaterial = new THREE.MeshBasicMaterial({ 
            map: gradientTexture,
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide
        });
        const mainPanel = new THREE.Mesh(mainPanelGeometry, mainPanelMaterial);
        mainPanel.position.z = -0.02;
        this.scoreGroup.add(mainPanel);

        // Add glow effect
        const glowGeometry = new THREE.PlaneGeometry(4.2, 6.2);
        const glowMaterial = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(0x4099ff) },
                time: { value: 0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                uniform float time;
                varying vec2 vUv;
                void main() {
                    float dist = length(vUv - vec2(0.5));
                    float alpha = smoothstep(0.5, 0.4, dist) * (0.3 + 0.1 * sin(time * 2.0));
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });
        const glowPanel = new THREE.Mesh(glowGeometry, glowMaterial);
        glowPanel.position.z = -0.03;
        this.scoreGroup.add(glowPanel);

        // Add title
        if (this.font) {
            const titleGeometry = new TextGeometry('LEADERBOARD', {
                font: this.font,
                size: 0.3, // Larger text for wall display
                height: 0.02,
                curveSegments: 12,
                bevelEnabled: true,
                bevelThickness: 0.01,
                bevelSize: 0.005,
                bevelOffset: 0,
                bevelSegments: 5
            });

            titleGeometry.computeBoundingBox();
            const centerOffset = -(titleGeometry.boundingBox.max.x - titleGeometry.boundingBox.min.x) / 2;

            const titleMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                metalness: 0.8,
                roughness: 0.2,
                emissive: 0x4099ff,
                emissiveIntensity: 0.2
            });

            const titleMesh = new THREE.Mesh(titleGeometry, titleMaterial);
            titleMesh.position.set(centerOffset, 2.8, 0);
            this.scoreGroup.add(titleMesh);
        }

        // Create timer display
        this.createTimerDisplay();

        // Create start button
        this.createStartButton();

        // Add to scene
        this.engine.scene.add(this.scoreGroup);
        
        // Start animation loop for glow effect
        const animate = () => {
            if (glowMaterial) {
                glowMaterial.uniforms.time.value = performance.now() * 0.001;
            }
            requestAnimationFrame(animate);
        };
        animate();
    }

    createGradientTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(25, 25, 35, 0.95)');
        gradient.addColorStop(1, 'rgba(15, 15, 25, 0.95)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
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
        const geometry = new THREE.PlaneGeometry(1.5, 0.75);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(0, -2.8, 0.01); // Position at bottom of panel, below start button
        this.scoreGroup.add(mesh);
        
        // Store timer display properties
        this.timerMesh = {
            mesh: mesh,
            texture: texture,
            context: canvas.getContext('2d')
        };
    }

    createStartButton() {
        // Create button geometry with more depth for better ray intersection
        const geometry = new THREE.BoxGeometry(1.2, 0.6, 0.2);
        
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
        this.startButton.position.set(0, -2, 0.1); // Move slightly forward for better ray intersection
        this.startButton.userData = {
            type: 'button',
            materials: materials,
            isStartButton: true
        };

        // Create text as a separate mesh
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.font = 'bold 128px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('START', canvas.width/2, canvas.height/2);
        
        const textTexture = new THREE.CanvasTexture(canvas);
        const textMaterial = new THREE.MeshBasicMaterial({
            map: textTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        const textGeometry = new THREE.PlaneGeometry(1, 0.5);
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.set(0, 0, 0.11); // Position text slightly in front of button
        this.startButton.add(textMesh);

        // Add to scoreGroup
        this.scoreGroup.add(this.startButton);
    }

    updatePlayerScore(playerId, score, rank) {
        if (!this.font) return;

        // Remove existing score display if any
        if (this.textMeshes.has(playerId)) {
            const { text, background } = this.textMeshes.get(playerId);
            this.scoreGroup.remove(text);
            this.scoreGroup.remove(background);
        }

        // Create background for this score entry
        const isLocalPlayer = this.engine.playerManager?.localPlayer?.id === playerId;
        const bgGeometry = new THREE.PlaneGeometry(3.6, 0.4); // Larger background for wall display
        
        let bgColor;
        if (rank === 0) bgColor = new THREE.Color(0xFFD700).multiplyScalar(0.15);
        else if (rank === 1) bgColor = new THREE.Color(0xC0C0C0).multiplyScalar(0.15);
        else if (rank === 2) bgColor = new THREE.Color(0xCD7F32).multiplyScalar(0.15);
        else bgColor = isLocalPlayer ? new THREE.Color(0x4099ff).multiplyScalar(0.15) : new THREE.Color(0xffffff).multiplyScalar(0.03);

        const bgMaterial = new THREE.MeshBasicMaterial({
            color: bgColor,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });

        const background = new THREE.Mesh(bgGeometry, bgMaterial);
        background.position.y = 2.5 - (rank * 0.5);
        background.position.z = 0.01;
        this.scoreGroup.add(background);

        // Create text for this score entry
        const playerText = isLocalPlayer ? 'You' : `Player ${playerId}`;
        const scoreText = `#${rank + 1}  ${playerText}: ${score}`;
        const textGeometry = new TextGeometry(scoreText, {
            font: this.font,
            size: 0.25, // Larger text for wall display
            height: 0.01,
            curveSegments: 12,
            bevelEnabled: false
        });

        let textColor;
        if (rank === 0) textColor = 0xFFD700;
        else if (rank === 1) textColor = 0xC0C0C0;
        else if (rank === 2) textColor = 0xCD7F32;
        else textColor = isLocalPlayer ? 0x4099ff : 0xffffff;

        const textMaterial = new THREE.MeshBasicMaterial({ color: textColor });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        
        textGeometry.computeBoundingBox();
        const centerOffset = -(textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x) / 2;
        
        textMesh.position.set(centerOffset, 2.5 - (rank * 0.5), 0.02); // Adjusted vertical spacing
        this.scoreGroup.add(textMesh);

        // Store references to both meshes
        this.textMeshes.set(playerId, { text: textMesh, background: background });
    }

    removePlayer(playerId) {
        if (this.textMeshes.has(playerId)) {
            const display = this.textMeshes.get(playerId);
            this.scoreGroup.remove(display.text);
            this.scoreGroup.remove(display.background);
            display.text.geometry.dispose();
            display.text.material.dispose();
            display.background.geometry.dispose();
            display.background.material.dispose();
            this.textMeshes.delete(playerId);
            
            // Reposition remaining scores
            this.repositionScores();
        }
    }

    repositionScores() {
        const players = Array.from(this.textMeshes.keys());
        players.forEach((playerId, index) => {
            const display = this.textMeshes.get(playerId);
            const yPosition = 2.5 - (index * 0.5);
            display.text.position.y = yPosition;
            display.background.position.y = yPosition;
        });
    }

    updateTimer() {
        if (!this.timerMesh || !this.engine.uiManager.gameStarted) return;
        
        const currentTime = Date.now();
        const elapsedTime = currentTime - this.engine.uiManager.gameStartTime;
        const remainingTime = Math.max(0, this.engine.uiManager.gameDuration - elapsedTime);
        
        // Convert to seconds and format
        const seconds = Math.ceil(remainingTime / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const timeText = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        
        // Update canvas
        const context = this.timerMesh.context;
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);
        context.fillStyle = '#ffffff';
        context.font = 'bold 96px Arial'; // Larger font for better visibility
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(timeText, context.canvas.width/2, context.canvas.height/2);
        
        // Update texture
        this.timerMesh.texture.needsUpdate = true;
    }

    update() {
        this.updateTimer();

        // Check for start button interaction
        if (this.startButton && !this.engine.uiManager.gameStarted) {
            const session = this.engine.renderer.xr.getSession();
            
            if (session) {
                // VR Mode interaction
                const controllers = this.engine.inputManager.controllers;
                
                for (let i = 0; i < controllers.length; i++) {
                    const controller = controllers[i];
                    const inputSource = session.inputSources[i];
                    if (!inputSource) continue;
                    
                    const gamepad = inputSource.gamepad;
                    if (!gamepad) continue;

                    // Create temporary objects for raycasting
                    const tempMatrix = new THREE.Matrix4();
                    const raycaster = new THREE.Raycaster();
                    
                    tempMatrix.identity().extractRotation(controller.matrixWorld);
                    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
                    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

                    // Check intersection in world space first
                    const intersects = raycaster.intersectObject(this.startButton, true);

                    if (intersects.length > 0) {
                        this.startButton.material = this.startButton.userData.materials.hover;

                        if (gamepad.buttons[0] && gamepad.buttons[0].pressed) {
                            this.startButton.material = this.startButton.userData.materials.pressed;
                            
                            // Add haptic feedback
                            if (gamepad.hapticActuators && gamepad.hapticActuators[0]) {
                                gamepad.hapticActuators[0].pulse(1.0, 100);
                            }
                            
                            this.engine.uiManager.handleGameStart();
                        }
                    } else {
                        this.startButton.material = this.startButton.userData.materials.default;
                    }
                }
            } else {
                // Non-VR Mode interaction
                const raycaster = new THREE.Raycaster();
                const mouse = this.engine.inputManager.mouse;
                
                // Convert mouse position to normalized device coordinates
                const mouseNDC = new THREE.Vector2(
                    (mouse.x / window.innerWidth) * 2 - 1,
                    -(mouse.y / window.innerHeight) * 2 + 1
                );
                
                // Update the picking ray with the camera and mouse position
                raycaster.setFromCamera(mouseNDC, this.engine.camera);

                // Check intersection in world space
                const intersects = raycaster.intersectObject(this.startButton, true);

                if (intersects.length > 0) {
                    this.startButton.material = this.startButton.userData.materials.hover;
                    
                    if (this.engine.inputManager.mouseButtons.left) {
                        this.startButton.material = this.startButton.userData.materials.pressed;
                        this.engine.uiManager.handleGameStart();
                    }
                } else {
                    this.startButton.material = this.startButton.userData.materials.default;
                }
            }
        }
    }
}
