import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class RifleModel extends THREE.Group {
    constructor() {
        super();
        this.loadRifleModel();
    }

    async loadRifleModel() {
        const loader = new GLTFLoader();
        try {
            const gltf = await loader.loadAsync('/assets/models/rifle model.glb');
            const model = gltf.scene;
            
            // Scale reduced by 200% (0.5) and flipped 180 degrees
            model.scale.set(0.5, 0.5, 0.5);
            model.position.set(0, -0.05, -0.2); // Moved down 0.1 units (from 0.05 to -0.05)
            model.rotation.x = 0; // Remove downward angle
            model.rotation.y = Math.PI; // 180-degree flip
            
            // Add the model to the group
            this.add(model);
            
        } catch (error) {
            console.error('Error loading rifle model:', error);
            // Fallback to create a basic rifle if model fails to load
            this.createBasicRifle();
        }
    }

    // Fallback method in case the model fails to load
    createBasicRifle() {
        const geometry = new THREE.BoxGeometry(0.05, 0.08, 0.4);
        const material = new THREE.MeshStandardMaterial({
            color: 0x444444,
            roughness: 0.7,
            metalness: 0.5
        });
        const rifle = new THREE.Mesh(geometry, material);
        this.add(rifle);
    }
}
