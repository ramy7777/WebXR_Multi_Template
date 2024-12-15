import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

export class ModelLoader {
    constructor() {
        this.controllerModelFactory = new XRControllerModelFactory();
        this.modelCache = new Map();
    }

    createControllerModel(handedness) {
        const cacheKey = `controller-${handedness}`;
        
        // Check cache first
        if (this.modelCache.has(cacheKey)) {
            const cachedModel = this.modelCache.get(cacheKey).clone();
            cachedModel.traverse((child) => {
                if (child.isMesh) {
                    child.material = child.material.clone();
                }
            });
            return cachedModel;
        }

        console.log(`[ModelLoader] Creating ${handedness} controller model`);
        
        // Create grip and model
        const grip = new THREE.Group();
        const model = this.controllerModelFactory.createControllerModel(grip);
        
        // Set properties
        grip.userData.handedness = handedness;
        model.visible = true;
        
        // Add visible material to ensure model is rendered
        model.traverse((child) => {
            if (child.isMesh) {
                // Use StandardMaterial for better visual quality
                child.material = new THREE.MeshStandardMaterial({
                    color: 0x303030,
                    roughness: 0.8,
                    metalness: 0.5
                });
                child.material.needsUpdate = true;
                child.visible = true;
                
                // Add subtle emissive glow for buttons
                if (child.name.includes('button')) {
                    child.material.emissive.setHex(0x202020);
                }
            }
        });

        // Add visual ray for aiming
        const rayGeometry = new THREE.CylinderGeometry(0.002, 0.002, 1, 8);
        rayGeometry.rotateX(Math.PI / 2);
        rayGeometry.translate(0, 0, -0.5);
        const rayMaterial = new THREE.MeshBasicMaterial({
            color: handedness === 'left' ? 0x4444ff : 0xff4444,
            transparent: true,
            opacity: 0.6
        });
        const ray = new THREE.Mesh(rayGeometry, rayMaterial);
        grip.add(ray);
        
        // Cache the model
        this.modelCache.set(cacheKey, grip.clone());
        
        console.log(`[ModelLoader] Created ${handedness} controller:`, {
            grip,
            model,
            children: grip.children,
            modelVisible: model.visible
        });
        
        return grip;
    }

    async loadHeadsetModel() {
        // Create a simplified Quest 3 headset model
        const headset = new THREE.Group();

        // Main body
        const bodyGeometry = new THREE.BoxGeometry(0.18, 0.1, 0.12);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x303030,
            roughness: 0.5,
            metalness: 0.7
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        headset.add(body);

        // Front plate (for cameras)
        const frontGeometry = new THREE.BoxGeometry(0.18, 0.1, 0.01);
        const frontMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x202020,
            roughness: 0.3,
            metalness: 0.8
        });
        const front = new THREE.Mesh(frontGeometry, frontMaterial);
        front.position.z = 0.065;
        headset.add(front);

        // Cameras
        const cameraGeometry = new THREE.CircleGeometry(0.01, 16);
        const cameraMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x000000,
            roughness: 0.2,
            metalness: 0.9
        });
        
        // Left camera
        const leftCamera = new THREE.Mesh(cameraGeometry, cameraMaterial);
        leftCamera.position.set(-0.04, 0, 0.071);
        headset.add(leftCamera);
        
        // Right camera
        const rightCamera = new THREE.Mesh(cameraGeometry, cameraMaterial);
        rightCamera.position.set(0.04, 0, 0.071);
        headset.add(rightCamera);

        return headset;
    }
}
