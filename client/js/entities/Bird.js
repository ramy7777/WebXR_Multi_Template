import * as THREE from 'three';
import { ParticleSystem } from '../effects/ParticleSystem.js';

// Import GLTFLoader from CDN
const GLTFLoader = await import('https://unpkg.com/three@0.158.0/examples/jsm/loaders/GLTFLoader.js').then(m => m.GLTFLoader);

export class Bird extends THREE.Object3D {
    constructor(position = new THREE.Vector3(), direction = new THREE.Vector3(1, 0, 0)) {
        super();
        
        // Store initial spawn data for network sync
        this.initialPosition = position.clone();
        this.initialDirection = direction.clone().normalize();
        
        // Movement properties
        this.position.copy(position);
        this.direction = direction.normalize();
        this.radius = 30;
        this.angularSpeed = 0.0004;
        this.baseHeight = position.y;
        this.verticalOffset = 0;
        this.verticalSpeed = 0.0005;
        this.boundarySize = 60;
        this.health = 50;
        this.spawnTime = Date.now();
        this.lifespan = 50000; // 50 seconds lifespan
        this.wingAngle = 0;
        this.wingSpeed = 0.2;

        // Network sync properties
        this.lastNetworkUpdate = Date.now();
        this.networkUpdateInterval = 50; // Update every 50ms
        this.lastSyncedAge = 0;

        // Animation properties
        this.mixer = null;
        this.animations = new Map(); // Store multiple animations
        this.currentAnimation = null;

        // Load 3D model
        this.loadModel();

        // Set up collision box
        this.boundingBox = new THREE.Box3();
        
        // Create particle system for hit effects
        this.particleSystem = new ParticleSystem(new THREE.Vector3(0, 0, 0));
        this.add(this.particleSystem);
    }

    async loadModel() {
        const loader = new GLTFLoader();
        try {
            const gltf = await loader.loadAsync('/assets/models/animated_bird_pigeon.glb');
            this.model = gltf.scene;
            
            // Debug model hierarchy
            console.log('Model hierarchy:', this.model);
            this.model.traverse(child => {
                console.log('Child:', child.name, child.type, child.position);
            });
            
            // Increased size (0.1 * 3 = 0.3)
            this.model.scale.set(0.3, 0.3, 0.3);
            
            // Center the model at origin
            const modelBox = new THREE.Box3().setFromObject(this.model);
            const modelCenter = new THREE.Vector3();
            modelBox.getCenter(modelCenter);
            this.model.position.sub(modelCenter);
            
            // Add model to bird object
            this.add(this.model);
            
            // Update bounding box after model loads
            this.updateBoundingBox();
            
            // Setup animation mixer
            if (gltf.animations && gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(this.model);
                
                // Log available animations
                console.log('Available animations:', gltf.animations.map(a => a.name));
                
                // Store all animations in the map
                gltf.animations.forEach(clip => {
                    console.log('Setting up animation:', clip.name);
                    const action = this.mixer.clipAction(clip);
                    this.animations.set(clip.name, {
                        clip: clip,
                        action: action
                    });
                });

                // Play default animation if available
                const defaultAnim = gltf.animations[0].name;
                console.log('Playing default animation:', defaultAnim);
                this.playAnimation(defaultAnim);
            } else {
                console.warn('No animations found in the model!');
            }
        } catch (error) {
            console.error('Error loading bird model:', error);
            // Fallback to basic geometry if model fails to load
            this.createBasicBird();
        }
    }

    // Play a specific animation
    playAnimation(name, options = {}) {
        if (!this.mixer || !this.animations.has(name)) return;

        // Stop current animation
        if (this.currentAnimation) {
            const fadeTime = options.fadeTime || 0.5;
            this.currentAnimation.action.fadeOut(fadeTime);
        }

        // Get new animation
        const animation = this.animations.get(name);
        
        // Configure animation
        animation.action.reset();
        animation.action.clampWhenFinished = options.clampWhenFinished || false;
        animation.action.loop = options.loop || THREE.LoopRepeat;
        animation.action.fadeIn(options.fadeTime || 0.5);
        animation.action.play();

        this.currentAnimation = animation;
    }

    update(delta) {
        // Update animation mixer with delta time
        if (this.mixer) {
            this.mixer.update(delta);
        }

        // Check lifespan
        if (Date.now() - this.spawnTime > this.lifespan) {
            return true; // Bird should be removed
        }

        const currentTime = Date.now();
        const age = currentTime - this.spawnTime;

        // Debug log movement parameters and timing
        console.debug(`[BIRD ${this.uuid.slice(0,4)}] Movement Update:
            Current Time: ${currentTime}
            Spawn Time: ${this.spawnTime}
            Age: ${age}
            Initial Position: ${this.initialPosition.toArray().map(n => n.toFixed(2))}
            Current Position: ${this.position.toArray().map(n => n.toFixed(2))}
            Radius: ${this.radius}
            Angular Speed: ${this.angularSpeed}
            Is Host: ${this.birdManager?.engine?.networkManager?.isHost}
        `);

        // Calculate circular movement (same as sphere)
        const angle = this.angularSpeed * age;
        const x = this.radius * Math.cos(angle);
        const z = this.radius * Math.sin(angle);
        
        // Store previous position for movement verification
        const prevPos = this.position.clone();
        
        // Update position
        const newX = this.initialPosition.x + x;
        const newZ = this.initialPosition.z + z;
        
        // Log position calculation
        console.debug(`[BIRD ${this.uuid.slice(0,4)}] Position Calculation:
            Angle: ${angle}
            X Offset: ${x}
            Z Offset: ${z}
            New X: ${newX} (${this.initialPosition.x} + ${x})
            New Z: ${newZ} (${this.initialPosition.z} + ${z})
        `);

        this.position.x = newX;
        this.position.z = newZ;

        // Add gentle vertical oscillation
        this.verticalOffset = Math.sin(this.verticalSpeed * age) * 0.5;
        this.position.y = this.baseHeight + this.verticalOffset;

        // Log if position hasn't changed
        if (prevPos.distanceTo(this.position) < 0.0001) {
            console.warn(`[BIRD ${this.uuid.slice(0,4)}] Bird appears frozen!
                Previous Position: ${prevPos.toArray().map(n => n.toFixed(2))}
                Current Position: ${this.position.toArray().map(n => n.toFixed(2))}
                Movement Parameters:
                    Initial Position: ${this.initialPosition.toArray().map(n => n.toFixed(2))}
                    Age: ${age}
                    Angle: ${angle}
                    X offset: ${x}
                    Z offset: ${z}
            `);
        }

        // Update direction to face movement
        const nextAngle = this.angularSpeed * (age + 16);
        const nextX = this.radius * Math.cos(nextAngle);
        const nextZ = this.radius * Math.sin(nextAngle);
        this.direction.set(nextX - x, 0, nextZ - z).normalize();
        
        // Update rotation to face direction
        const targetRotation = Math.atan2(this.direction.z, this.direction.x);
        this.rotation.y = -targetRotation + Math.PI / 2;

        // Animate wings
        this.wingAngle += this.wingSpeed;
        if (this.leftWing) {
            this.leftWing.rotation.z = Math.sin(this.wingAngle) * 0.3;
        }
        if (this.rightWing) {
            this.rightWing.rotation.z = -Math.sin(this.wingAngle) * 0.3;
        }

        // Update bounding box
        this.updateBoundingBox();

        // Network position updates periodically if we're the host
        if (this.birdManager && this.birdManager.engine.networkManager && 
            this.birdManager.engine.networkManager.isHost && 
            currentTime - this.lastNetworkUpdate > this.networkUpdateInterval) {
            
            console.debug(`[BIRD ${this.uuid.slice(0,4)}] Sending network update:
                Position: ${this.position.toArray().map(n => n.toFixed(2))}
                Age: ${age}
            `);
            
            this.birdManager.engine.networkManager.send({
                type: 'birdPositionUpdate',
                data: {
                    id: this.uuid,
                    position: this.position.toArray(),
                    rotation: [this.rotation.x, this.rotation.y, this.rotation.z],
                    age: age // Send age for synchronization
                }
            });
            this.lastNetworkUpdate = currentTime;
        }

        return false;
    }

    takeDamage(damage, hitPosition) {
        this.health -= damage;
        
        // Create new particle system at hit position
        if (hitPosition) {
            this.particleSystem = new ParticleSystem(hitPosition);
        } else {
            this.particleSystem = new ParticleSystem(this.position);
        }
        this.add(this.particleSystem);
        this.particleSystem.emit(10);

        // Play hit animation if available
        this.playAnimation('hit', {
            loop: THREE.LoopOnce,
            clampWhenFinished: true,
            fadeTime: 0.2
        });

        // Return to flying animation after hit
        setTimeout(() => {
            this.playAnimation('fly', {
                fadeTime: 0.2
            });
        }, 500);

        return this.health <= 0;
    }

    updateFromNetwork(position, rotation, age) {
        console.debug(`[BIRD ${this.uuid.slice(0,4)}] Received network update:
            Position: ${position.map(n => n.toFixed(2))}
            Rotation: ${rotation.map(n => n.toFixed(2))}
            Age: ${age}
            Current spawnTime: ${this.spawnTime}
            Current Time: ${Date.now()}
        `);

        // Update position
        this.position.fromArray(position);
        
        // Update rotation
        this.rotation.set(rotation[0], rotation[1], rotation[2]);
        
        // Update age for synchronization
        this.lastSyncedAge = age;
        
        // Update spawn time based on age, ensuring smooth movement calculation
        if (Math.abs(Date.now() - age - this.spawnTime) > 1000) {
            const oldSpawnTime = this.spawnTime;
            this.spawnTime = Date.now() - age;
            console.debug(`[BIRD ${this.uuid.slice(0,4)}] Updated spawn time:
                Old: ${oldSpawnTime}
                New: ${this.spawnTime}
                Difference: ${this.spawnTime - oldSpawnTime}ms
            `);
        }

        // Update initial position for circular movement
        const oldInitialPos = this.initialPosition.clone();
        this.initialPosition.copy(this.position);
        this.initialPosition.x -= this.radius * Math.cos(this.angularSpeed * age);
        this.initialPosition.z -= this.radius * Math.sin(this.angularSpeed * age);
        
        console.debug(`[BIRD ${this.uuid.slice(0,4)}] Updated initial position:
            Old: ${oldInitialPos.toArray().map(n => n.toFixed(2))}
            New: ${this.initialPosition.toArray().map(n => n.toFixed(2))}
            Movement Params:
                Radius: ${this.radius}
                AngularSpeed: ${this.angularSpeed}
                Age: ${age}
        `);

        // Update direction based on rotation
        this.direction.set(
            Math.cos(this.rotation.y + Math.PI/2),
            0,
            Math.sin(this.rotation.y + Math.PI/2)
        ).normalize();

        // Update bounding box
        this.updateBoundingBox();
    }

    createBasicBird() {
        // Original geometric bird code as fallback
        const bodyGeometry = new THREE.ConeGeometry(0.2, 0.5, 4);
        bodyGeometry.rotateX(Math.PI / 2);
        
        const material = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.2,
            shininess: 30
        });

        this.body = new THREE.Mesh(bodyGeometry, material);
        this.add(this.body);

        const wingGeometry = new THREE.BoxGeometry(0.6, 0.1, 0.2);
        const wingMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        this.leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
        this.rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
        
        this.leftWing.position.set(-0.3, 0, 0);
        this.rightWing.position.set(0.3, 0, 0);
        
        this.add(this.leftWing);
        this.add(this.rightWing);
        
        this.updateBoundingBox();
    }

    updateBoundingBox() {
        // Only update if model exists
        if (this.model) {
            // Get all meshes from the model
            const meshes = [];
            this.model.traverse(child => {
                if (child.isMesh) {
                    meshes.push(child);
                }
            });

            if (meshes.length > 0) {
                // Create temporary box
                const box = new THREE.Box3();
                
                // Get bird's world matrix
                const birdWorldMatrix = new THREE.Matrix4();
                this.updateMatrixWorld();
                birdWorldMatrix.copy(this.matrixWorld);
                
                // Compute box from all meshes relative to bird
                meshes.forEach(mesh => {
                    mesh.geometry.computeBoundingBox();
                    const meshBox = mesh.geometry.boundingBox.clone();
                    
                    // Transform mesh box to world space
                    const meshMatrix = new THREE.Matrix4();
                    mesh.updateMatrixWorld();
                    meshMatrix.copy(mesh.matrixWorld);
                    meshBox.applyMatrix4(meshMatrix);
                    
                    box.union(meshBox);
                });
                
                // Update our bounding box
                this.boundingBox.copy(box);
                
                // Log positions for debugging
                console.log('Bird world position:', this.getWorldPosition(new THREE.Vector3()));
                console.log('Model world position:', this.model.getWorldPosition(new THREE.Vector3()));
                console.log('Box center:', box.getCenter(new THREE.Vector3()));
            }
        }
    }

    hit(damage, hitPosition) {
        this.health -= damage;
        if (this.health <= 0) {
            // Create death particles
            const deathParticles = new ParticleSystem(this.position.clone());
            this.parent.add(deathParticles);
            this.birdManager.activeParticleSystems.push(deathParticles);
            
            // Play death animation if available
            if (this.animations.has('death')) {
                this.playAnimation('death', {
                    loop: THREE.LoopOnce,
                    clampWhenFinished: true
                });
            }

            // Network the hit if we're the host
            if (this.birdManager && this.birdManager.engine.networkManager && 
                this.birdManager.engine.networkManager.isHost) {
                this.birdManager.engine.networkManager.send({
                    type: 'birdHit',
                    data: {
                        id: this.uuid,
                        damage: damage,
                        position: hitPosition ? hitPosition.toArray() : this.position.toArray(),
                        health: this.health
                    }
                });
            }

            return true;
        }

        // Create hit particles
        const particles = new ParticleSystem(hitPosition || this.position.clone());
        this.parent.add(particles);
        this.birdManager.activeParticleSystems.push(particles);

        // Play hit animation
        if (this.animations.has('hit')) {
            this.playAnimation('hit', {
                loop: THREE.LoopOnce,
                clampWhenFinished: true,
                fadeTime: 0.2
            });

            // Return to flying animation after hit
            setTimeout(() => {
                this.playAnimation('fly', {
                    fadeTime: 0.2
                });
            }, 500);
        }

        // Network the hit if we're the host
        if (this.birdManager && this.birdManager.engine.networkManager && 
            this.birdManager.engine.networkManager.isHost) {
            this.birdManager.engine.networkManager.send({
                type: 'birdHit',
                data: {
                    id: this.uuid,
                    damage: damage,
                    position: hitPosition ? hitPosition.toArray() : this.position.toArray(),
                    health: this.health
                }
            });
        }

        return false;
    }
}
