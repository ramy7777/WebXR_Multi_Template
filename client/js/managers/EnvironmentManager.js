import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { TreeLeafShader } from '../shaders/TreeLeafShader.js';

export class EnvironmentManager {
    constructor(scene) {
        this.scene = scene;
        this.trees = [];
        this.loader = new GLTFLoader();
        this.treeModel = null;
        this.initialized = false;
        this.clock = new THREE.Clock();
        this.leafMaterials = null;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            const gltf = await this.loader.loadAsync('assets/models/acacia__from_tree_it.glb');
            this.treeModel = gltf.scene;
            
            this.treeModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    if (child.material && child.name === 'Object_2') {  // Leaves
                        const originalMaterial = child.material;
                        
                        // Create custom shader material
                        const customMaterial = new THREE.ShaderMaterial({
                            vertexShader: TreeLeafShader.vertexShader,
                            fragmentShader: TreeLeafShader.fragmentShader,
                            uniforms: THREE.UniformsUtils.clone(TreeLeafShader.uniforms),
                            transparent: true,
                            side: THREE.DoubleSide,
                            depthWrite: false
                        });

                        // Set the textures
                        customMaterial.uniforms.diffuseMap.value = originalMaterial.map;
                        customMaterial.uniforms.alphaMap.value = originalMaterial.alphaMap || originalMaterial.map;
                        
                        child.material = customMaterial;
                        
                        // Store reference for animation
                        if (!this.leafMaterials) this.leafMaterials = [];
                        this.leafMaterials.push(customMaterial);
                    }
                }
            });
            
            // Create a forest layout
            this.createForest();
            this.initialized = true;
        } catch (error) {
            console.error('[TREE] Error loading tree model:', error);
        }
    }

    createForest() {
        // Create trees scattered across the play area
        const numTrees = 17; // Reduced by 30% from 25
        const playAreaSize = 40; // Match the ground size from World.js
        const clearRadius = 5; // Keep this area clear around the center for player movement
        
        for (let i = 0; i < numTrees; i++) {
            // Generate random positions across the play area
            let x, z;
            do {
                x = (Math.random() * playAreaSize) - (playAreaSize / 2); // -20 to 20
                z = (Math.random() * playAreaSize) - (playAreaSize / 2); // -20 to 20
                // Keep trying until we find a spot that's not too close to the center
            } while (Math.sqrt(x * x + z * z) < clearRadius);
            
            const tree = this.treeModel.clone();
            // Smaller scale for acacia trees
            const scale = 0.3 + Math.random() * 0.2; // Scale range: 0.3 - 0.5
            tree.scale.set(scale, scale, scale);
            
            // Random rotation for natural look
            const rotation = Math.random() * Math.PI * 2;
            tree.rotation.y = rotation;
            
            tree.position.set(x, 0, z);
            this.scene.add(tree);
            this.trees.push(tree);
        }
    }

    update(camera) {
        if (!this.leafMaterials) return;
        
        const time = this.clock.getElapsedTime();
        
        // Update shader uniforms
        this.leafMaterials.forEach(material => {
            if (material.uniforms) {
                material.uniforms.time.value = time;
                material.uniforms.cameraPosition.value.copy(camera.position);
            }
        });
    }

    // Clean up resources
    dispose() {
        for (const tree of this.trees) {
            this.scene.remove(tree);
            tree.traverse((child) => {
                if (child.isMesh) {
                    child.geometry.dispose();
                    child.material.dispose();
                }
            });
        }
        this.trees = [];
        this.treeModel = null;
    }
}
