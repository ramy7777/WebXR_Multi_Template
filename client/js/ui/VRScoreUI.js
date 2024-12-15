import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';

export class VRScoreUI {
    constructor(engine) {
        this.engine = engine;
        this.scoreGroup = new THREE.Group();
        this.font = null;
        this.textMeshes = new Map(); // playerId -> { text: mesh, background: mesh }
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
        // Position the score panel in a fixed position in the VR world
        this.scoreGroup.position.set(0, 2.5, -3); // Above and in front of the initial spawn point
        this.scoreGroup.rotation.x = -0.2; // Slight tilt for better visibility

        // Add main background panel with gradient effect
        const mainPanelGeometry = new THREE.PlaneGeometry(2.2, 2);
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
        const glowGeometry = new THREE.PlaneGeometry(2.3, 2.1);
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
                size: 0.15,
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
            titleMesh.position.set(centerOffset, 0.8, 0);
            this.scoreGroup.add(titleMesh);
        }

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
        const bgGeometry = new THREE.PlaneGeometry(1.8, 0.15);
        
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
        background.position.y = 0.6 - (rank * 0.2);
        background.position.z = 0.01;
        this.scoreGroup.add(background);

        // Create text for this score entry
        const playerText = isLocalPlayer ? 'You' : `Player ${playerId}`;
        const scoreText = `#${rank + 1}  ${playerText}: ${score}`;
        const textGeometry = new TextGeometry(scoreText, {
            font: this.font,
            size: 0.1,
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
        
        textMesh.position.set(centerOffset, 0.6 - (rank * 0.2), 0.02);
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
            const yPosition = 0.6 - (index * 0.2);
            display.text.position.y = yPosition;
            display.background.position.y = yPosition;
        });
    }

    update() {
        // Empty update method since we want the scoreboard to stay fixed
    }
}
