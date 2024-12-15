import * as THREE from 'three';
import { Bird } from '../entities/Bird.js';
import AudioManager from './AudioManager.js';

export class BirdManager {
    constructor(engine) {
        this.engine = engine;
        this.birds = new Map();
        this.lastSpawnTime = 0;
        this.spawnInterval = 10000; // 10 seconds between spawns
        this.activeParticleSystems = [];
        this.maxBirds = 6; // Maximum number of birds allowed
        this.isSpawning = false;

        // Boundary for spawning birds
        this.spawnBoundary = {
            minX: -30,
            maxX: 30,
            minY: 2,
            maxY: 15,
            minZ: -30,
            maxZ: 30
        };

        // Active particles
        this.activeParticles = new Set();
        this.audioManager = new AudioManager();
    }

    update(delta) {
        if (!this.isSpawning) {
            console.debug('[BIRDMANAGER] Not spawning - isSpawning is false');
            return;
        }

        const currentTime = Date.now();

        // Only host spawns birds
        if (this.engine.networkManager && this.engine.networkManager.isHost) {
            // Only spawn if we're under the bird limit
            if (currentTime - this.lastSpawnTime > this.spawnInterval && this.birds.size < this.maxBirds) {
                console.debug('[BIRDMANAGER] Host spawning new birds. Current count:', this.birds.size);
                // Calculate how many birds we can spawn without exceeding the limit
                const birdsToSpawn = Math.min(2, this.maxBirds - this.birds.size);
                for (let i = 0; i < birdsToSpawn; i++) {
                    this.spawnBird();
                }
                this.lastSpawnTime = currentTime;
            }
        }

        // Update existing birds
        console.debug(`[BIRDMANAGER] Updating ${this.birds.size} birds. Is Host:`, this.engine.networkManager?.isHost);
        for (const [id, bird] of this.birds) {
            const shouldRemove = bird.update(delta);
            if (shouldRemove) {
                // Bird's lifetime has ended, remove it
                console.debug(`[BIRDMANAGER] Removing bird ${id.slice(0,4)} due to lifetime end`);
                this.removeBird(id);

                // If we're the host, schedule next spawn
                if (this.engine.networkManager && this.engine.networkManager.isHost) {
                    this.lastSpawnTime = currentTime;
                }
            }
        }

        // Update particle systems
        if (this.activeParticleSystems) {
            for (let i = this.activeParticleSystems.length - 1; i >= 0; i--) {
                const particles = this.activeParticleSystems[i];
                if (particles.update(delta)) {
                    // Particle system is done, remove it
                    if (particles.parent) {
                        particles.parent.remove(particles);
                    }
                    this.activeParticleSystems.splice(i, 1);
                }
            }
        }
    }

    spawnBird() {
        // Generate random position within bounds
        const x = (Math.random() - 0.5) * 60;
        const y = Math.random() * 13 + 2; // Between 2 and 15 units high
        const z = (Math.random() - 0.5) * 60;
        const position = new THREE.Vector3(x, y, z);

        // Generate random direction
        const direction = new THREE.Vector3(
            Math.random() - 0.5,
            0,
            Math.random() - 0.5
        ).normalize();

        // Create movement parameters
        const movementParams = {
            radius: 30,
            angularSpeed: 0.0004,
            verticalSpeed: 0.0005,
            baseHeight: y
        };

        // Create and add the bird
        const bird = new Bird(position, direction);
        bird.radius = movementParams.radius;
        bird.angularSpeed = movementParams.angularSpeed;
        bird.verticalSpeed = movementParams.verticalSpeed;
        bird.baseHeight = movementParams.baseHeight;
        bird.birdManager = this;
        this.birds.set(bird.uuid, bird);
        this.engine.scene.add(bird);

        console.debug('[DEBUG] Bird spawned:', bird.uuid);

        // Network the bird spawn if we're the host
        if (this.engine.networkManager && this.engine.networkManager.isHost) {
            this.engine.networkManager.send({
                type: 'birdSpawned',
                data: {
                    id: bird.uuid,
                    position: position.toArray(),
                    direction: direction.toArray(),
                    movementParams: movementParams
                }
            });
        }
    }

    removeBird(id) {
        const bird = this.birds.get(id);
        if (bird) {
            this.engine.scene.remove(bird);
            this.birds.delete(id);
            console.debug('[DEBUG] Bird removed:', id);

            // Network the bird removal if we're the host
            if (this.engine.networkManager && this.engine.networkManager.isHost) {
                console.debug('[DEBUG] Sending bird removal message');
                this.engine.networkManager.send({
                    type: 'birdRemoved',
                    data: { id: id }
                });
            }
        }
    }

    handleNetworkBirdSpawn(data) {
        console.debug('[DEBUG] Handling network bird spawn:', data);

        // Ensure isSpawning is true when receiving network birds
        if (!this.isSpawning) {
            console.debug('[BIRDMANAGER] Setting isSpawning to true after receiving network bird');
            this.isSpawning = true;
        }

        try {
            const position = new THREE.Vector3().fromArray(data.position);
            const direction = new THREE.Vector3().fromArray(data.direction);

            const bird = new Bird(position, direction);
            bird.uuid = data.id;
            bird.birdManager = this;

            // Set movement parameters from network data
            if (data.movementParams) {
                console.debug(`[BIRD ${bird.uuid.slice(0,4)}] Setting movement params:`, data.movementParams);
                bird.radius = data.movementParams.radius;
                bird.angularSpeed = data.movementParams.angularSpeed;
                bird.verticalSpeed = data.movementParams.verticalSpeed;
                bird.baseHeight = data.movementParams.baseHeight;
                
                // Verify parameters were set
                console.debug(`[BIRD ${bird.uuid.slice(0,4)}] Movement params after set:
                    radius: ${bird.radius}
                    angularSpeed: ${bird.angularSpeed}
                    verticalSpeed: ${bird.verticalSpeed}
                    baseHeight: ${bird.baseHeight}
                `);
            } else {
                console.warn(`[BIRD ${bird.uuid.slice(0,4)}] No movement params in spawn data!`);
            }

            this.birds.set(bird.uuid, bird);
            this.engine.scene.add(bird);

            console.debug(`[BIRD ${bird.uuid.slice(0,4)}] Network bird spawned successfully:
                Position: ${position.toArray().map(n => n.toFixed(2))}
                Direction: ${direction.toArray().map(n => n.toFixed(2))}
            `);
        } catch (error) {
            console.error('[ERROR] Failed to spawn network bird:', error);
        }
    }

    handleNetworkBirdRemoved(data) {
        console.debug('[DEBUG] Handling network bird removal:', data);

        // Find and remove the bird with the matching ID
        this.removeBird(data.id);
    }

    handleBulletCollision(bullet) {
        // Simple box collision check
        const bulletBox = new THREE.Box3().setFromObject(bullet);

        for (const [id, bird] of this.birds) {
            // Update bird's bounding box
            bird.updateBoundingBox();
            
            if (bulletBox.intersectsBox(bird.boundingBox)) {
                if (bird.hit(50, bullet.position)) {
                    // Bird was killed
                    console.debug('[DEBUG] Bird killed by bullet');

                    // Play bird destruction sound
                    this.audioManager.playBirdDestruction();

                    // Update score for the player who shot the bullet
                    const shooterId = bullet.shooterId;
                    if (shooterId && this.engine.scoreManager) {
                        this.engine.scoreManager.updateScore(shooterId, 10);
                    }

                    // Network the bird kill first, before removing it
                    if (this.engine.networkManager) {
                        console.debug('[DEBUG] Sending bird kill message');
                        this.engine.networkManager.send({
                            type: 'birdKilled',
                            data: {
                                id: id,
                                position: bird.position.toArray(),
                                shooterId: shooterId
                            }
                        });
                    }

                    // Remove the bird
                    this.engine.scene.remove(bird);
                    this.birds.delete(id);

                    // Trigger haptic feedback on both controllers
                    if (this.engine.renderer.xr.isPresenting) {
                        const session = this.engine.renderer.xr.getSession();
                        for (const source of session.inputSources) {
                            if (source.gamepad && source.gamepad.hapticActuators) {
                                source.gamepad.hapticActuators[0].pulse(1.0, 100);
                            }
                        }
                    }

                    // Create particle effect
                    this.createDeathEffect(bird.position);
                }
                return true; // Bullet hit something
            }
        }
        return false; // Bullet didn't hit anything
    }

    handleBirdKilled(data) {
        const bird = this.birds.get(data.id);
        if (bird) {
            // Update score for the shooter if we're receiving this from the network
            if (data.shooterId && this.engine.scoreManager) {
                this.engine.scoreManager.updateScore(data.shooterId, 10);
            }

            // Play bird destruction sound
            this.audioManager.playBirdDestruction();

            // Create particle effect at the bird's position
            const position = new THREE.Vector3().fromArray(data.position);
            this.createDeathEffect(position);

            // Remove the bird
            this.engine.scene.remove(bird);
            this.birds.delete(data.id);
        }
    }

    handleNetworkBirdUpdate(data) {
        // Find the bird with the matching ID
        const bird = this.birds.get(data.id);
        if (bird) {
            // Update position, rotation and age
            bird.updateFromNetwork(data.position, data.rotation, data.age);
        }
    }

    handleNetworkBirdDirectionChange(data) {
        // Find the bird with the matching ID
        const bird = this.birds.get(data.id);
        if (bird) {
            // Update direction and position
            bird.position.fromArray(data.position);
            bird.direction.fromArray(data.direction);
            bird.lookAt(bird.position.clone().add(bird.direction));
        }
    }

    startSpawning() {
        console.debug('[BIRDMANAGER] Starting bird spawning');
        this.isSpawning = true;
        // Reset spawn timer to allow immediate spawn
        this.lastSpawnTime = 0;
        // If we're not the host, we should still spawn some initial birds
        if (this.engine.networkManager && !this.engine.networkManager.isHost) {
            console.debug('[BIRDMANAGER] Client spawning initial birds');
            const initialBirdsToSpawn = Math.min(2, this.maxBirds);
            for (let i = 0; i < initialBirdsToSpawn; i++) {
                this.spawnBird();
            }
        }
        console.debug('[BIRDMANAGER] Bird spawning started. Is Host:', this.engine.networkManager?.isHost);
    }

    stopSpawning() {
        console.debug('[BIRDMANAGER] Stopping bird spawning');
        this.isSpawning = false;
        console.log('[DEBUG] Bird spawning stopped');
    }

    createDeathEffect(position) {
        // Create particle system for death effect
        const particleCount = 15;  
        const particles = new THREE.Group();

        for (let i = 0; i < particleCount; i++) {
            const feather = new THREE.Mesh(
                new THREE.PlaneGeometry(0.05, 0.15),  
                new THREE.MeshBasicMaterial({
                    color: 0x000000,  
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 1
                })
            );

            // Random position spread 
            feather.position.copy(position).add(
                new THREE.Vector3(
                    (Math.random() - 0.5) * 0.25,  
                    (Math.random() - 0.5) * 0.25,  
                    (Math.random() - 0.5) * 0.25   
                )
            );

            // Random velocity
            feather.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                Math.random() * 0.05,
                (Math.random() - 0.5) * 0.1
            );

            // Random rotation
            feather.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );

            feather.rotationSpeed = new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1
            );

            particles.add(feather);
        }

        // Add update function
        particles.birthTime = Date.now();
        particles.update = function(delta) {
            const age = Date.now() - this.birthTime;
            const lifespan = 2000; // 2 seconds

            if (age > lifespan) {
                return true; // Remove particles
            }

            // Update each feather
            this.children.forEach(feather => {
                // Update position
                feather.position.add(feather.velocity);
                feather.velocity.y -= 0.001 * delta; // Gravity

                // Update rotation
                feather.rotation.x += feather.rotationSpeed.x * delta;
                feather.rotation.y += feather.rotationSpeed.y * delta;
                feather.rotation.z += feather.rotationSpeed.z * delta;

                // Slow down rotation
                feather.rotationSpeed.multiplyScalar(0.98);

                // Fade out
                feather.material.opacity = 1 - (age / lifespan);
            });

            return false;
        };

        this.engine.scene.add(particles);
        this.activeParticleSystems.push(particles);
    }
}
