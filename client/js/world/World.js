import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class World {
    constructor(engine) {
        this.engine = engine;
        this.objects = new Set();
        this.clock = new THREE.Clock();
        this.materials = new Map(); // Store reusable materials
        this.setupEnvironment();
    }

    async setupEnvironment() {
        const platformRadius = 10;

        // Create circular platform texture with fade
        const textureSize = 1024;
        const canvas = document.createElement('canvas');
        canvas.width = textureSize;
        canvas.height = textureSize;
        const ctx = canvas.getContext('2d');

        // Create radial gradient for the fade effect
        const gradient = ctx.createRadialGradient(
            textureSize/2, textureSize/2, 0,
            textureSize/2, textureSize/2, textureSize/2
        );
        gradient.addColorStop(0, '#3a3a4a');
        gradient.addColorStop(0.7, '#3a3a4a');
        gradient.addColorStop(1, 'transparent');

        // Fill the circle with gradient
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(textureSize/2, textureSize/2, textureSize/2, 0, Math.PI * 2);
        ctx.fill();

        // Add subtle circular grid lines
        ctx.strokeStyle = '#4444ff';
        for (let radius = platformRadius * 20; radius > 0; radius -= 20) {
            ctx.beginPath();
            ctx.arc(textureSize/2, textureSize/2, radius, 0, Math.PI * 2);
            ctx.globalAlpha = 0.1 * (radius / (platformRadius * 20));
            ctx.stroke();
        }

        const platformTexture = new THREE.CanvasTexture(canvas);

        // Create the circular platform
        const platformGeometry = new THREE.CircleGeometry(platformRadius, 64);
        const platformMaterial = new THREE.MeshStandardMaterial({
            map: platformTexture,
            transparent: true,
            roughness: 0.4,
            metalness: 0.6,
            emissive: new THREE.Color(0x1111ff),
            emissiveIntensity: 0.1
        });

        const platform = new THREE.Mesh(platformGeometry, platformMaterial);
        platform.rotation.x = -Math.PI / 2;
        platform.position.y = 0;
        this.engine.scene.add(platform);
        this.ground = platform;
        this.objects.add(platform);

        // Add a grid helper that matches the platform size
        const gridHelper = new THREE.GridHelper(platformRadius * 2, 20, 0x0000ff, 0x404040);
        gridHelper.position.y = 0.01;
        gridHelper.material.opacity = 0.3;
        gridHelper.material.transparent = true;
        this.engine.scene.add(gridHelper);
        this.objects.add(gridHelper);

        // Add a darker skybox
        const skyGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0x1a1a2a,
            side: THREE.BackSide
        });
        this.materials.set('sky', skyMaterial);
        const skybox = new THREE.Mesh(skyGeometry, skyMaterial);
        this.engine.scene.add(skybox);
        this.objects.add(skybox);

        // Add ambient lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        this.engine.scene.add(ambientLight);

        // Add central light
        const centralLight = new THREE.PointLight(0xffffff, 1, platformRadius * 4);
        centralLight.position.set(0, platformRadius, 0);
        this.engine.scene.add(centralLight);

        // Add accent lights around the platform
        const numLights = 6;
        for (let i = 0; i < numLights; i++) {
            const angle = (i / numLights) * Math.PI * 2;
            const x = Math.cos(angle) * (platformRadius - 1);
            const z = Math.sin(angle) * (platformRadius - 1);
            
            const light = new THREE.PointLight(0x4444ff, 0.5, platformRadius * 2);
            light.position.set(x, 2, z);
            this.engine.scene.add(light);
        }

        // Add a subtle glow effect around the platform
        const glowGeometry = new THREE.RingGeometry(platformRadius, platformRadius + 1, 64);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x0033ff,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide
        });
        
        const glowRing = new THREE.Mesh(glowGeometry, glowMaterial);
        glowRing.rotation.x = -Math.PI / 2;
        glowRing.position.y = 0.02;
        this.engine.scene.add(glowRing);
        this.objects.add(glowRing);
    }

    addGlowingEdges() {
        // This method is no longer needed
    }

    addFuturisticWalls() {
        // This method is no longer needed
    }

    createFallbackGround() {
        // This is now just a backup in case something goes wrong
        const groundSize = 40;
        const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a3a4a,
            roughness: 0.4,
            metalness: 0.6
        });
        this.materials.set('ground', groundMaterial);

        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        this.engine.scene.add(ground);
        this.ground = ground;
        this.objects.add(ground);
    }

    update() {
        // No shader updates needed for GLB model
    }

    highlightObject(object, highlight) {
        if (object && object.userData.isInteractive) {
            if (highlight) {
                object.material.emissive.setHex(0xff0000);
                object.scale.setScalar(1.2);
            } else {
                object.material.emissive.setHex(0x222222);
                object.scale.setScalar(1.0);
            }
        }
    }

    cleanup() {
        // Dispose geometries and materials
        this.objects.forEach(object => {
            if (object.geometry) object.geometry.dispose();
        });
        
        this.materials.forEach(material => {
            material.dispose();
        });
        
        // Clear references
        this.objects.clear();
        this.materials.clear();
    }
}
