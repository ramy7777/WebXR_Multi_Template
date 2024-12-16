import * as THREE from 'three';
import { Bird } from '../entities/Bird.js';

export class BirdManager {
    constructor(engine) {
        this.engine = engine;
        this.birds = new Map();
        this.lastSpawnTime = 0;
        this.spawnInterval = 10000; // 10 seconds between spawns
        this.maxBirds = 6; // Maximum number of birds allowed
        this.isSpawning = false;

        // Boundary for spawning birds (match holographic room)
        this.spawnBoundary = {
            minX: -2,    // Half of roomWidth (5/2)
            maxX: 2,
            minY: 1,     // roomY (2) - 1 meter
            maxY: 4,     // roomY (2) + roomHeight (3) - 1 meter
            minZ: -1.5,  // Half of roomDepth (3/2)
            maxZ: 1.5
        };
    }

    update(delta) {
        if (!this.isSpawning) return;

        const currentTime = Date.now();

        // Only host spawns birds
        if (this.engine.networkManager && this.engine.networkManager.isHost) {
            if (currentTime - this.lastSpawnTime > this.spawnInterval && this.birds.size < this.maxBirds) {
                const birdsToSpawn = Math.min(2, this.maxBirds - this.birds.size);
                for (let i = 0; i < birdsToSpawn; i++) {
                    this.spawnBird();
                }
                this.lastSpawnTime = currentTime;
            }
        }

        // Update all birds
        for (const [id, bird] of this.birds) {
            if (bird.update(delta)) {
                this.removeBird(id);
            }
        }
    }

    spawnBird() {
        const x = THREE.MathUtils.randFloat(this.spawnBoundary.minX, this.spawnBoundary.maxX);
        const y = THREE.MathUtils.randFloat(this.spawnBoundary.minY, this.spawnBoundary.maxY);
        const z = THREE.MathUtils.randFloat(this.spawnBoundary.minZ, this.spawnBoundary.maxZ);

        const position = new THREE.Vector3(x, y, z);
        const direction = new THREE.Vector3(1, 0, 0);

        const bird = new Bird(position, direction);
        bird.birdManager = this;
        this.birds.set(bird.uuid, bird);
        this.engine.scene.add(bird);

        // Network the spawn if we're the host
        if (this.engine.networkManager && this.engine.networkManager.isHost) {
            this.engine.networkManager.send({
                type: 'birdSpawned',
                data: {
                    id: bird.uuid,
                    position: position.toArray(),
                    direction: direction.toArray(),
                    spawnTime: bird.spawnTime
                }
            });
        }

        return bird;
    }

    removeBird(id) {
        const bird = this.birds.get(id);
        if (bird) {
            this.engine.scene.remove(bird);
            this.birds.delete(id);

            // Network the removal if we're the host
            if (this.engine.networkManager && this.engine.networkManager.isHost) {
                this.engine.networkManager.send({
                    type: 'birdRemoved',
                    data: {
                        id: id
                    }
                });
            }
        }
    }

    handleBulletCollision(bullet) {
        // Check collision with each bird
        for (const [id, bird] of this.birds) {
            const birdBoundingSphere = new THREE.Sphere(bird.position, 0.5); // 0.5 is the sphere radius
            const bulletBoundingSphere = new THREE.Sphere(bullet.position, 0.05); // 0.05 is the bullet radius

            if (birdBoundingSphere.intersectsSphere(bulletBoundingSphere)) {
                // Remove the bird
                this.removeBird(id);

                // If we're the host, send the hit event
                if (this.engine.networkManager && this.engine.networkManager.isHost) {
                    this.engine.networkManager.send({
                        type: 'birdHit',
                        data: {
                            birdId: id,
                            bulletShooterId: bullet.shooterId
                        }
                    });
                }
                return true; // Collision detected
            }
        }
        return false; // No collision
    }

    handleNetworkBirdSpawn(data) {
        console.debug('[DEBUG] Handling network bird spawn:', data);
        const position = new THREE.Vector3().fromArray(data.position);
        const direction = new THREE.Vector3().fromArray(data.direction);

        const bird = new Bird(position, direction);
        bird.spawnTime = data.spawnTime;
        this.birds.set(data.id, bird);
        this.engine.scene.add(bird);

        // Make sure spawning is enabled when receiving network birds
        this.isSpawning = true;
    }

    handleNetworkBirdRemoved(data) {
        this.removeBird(data.id);
    }

    handleNetworkBirdHit(data) {
        // Remove the bird that was hit
        this.removeBird(data.birdId);
    }

    handleBirdKilled(data) {
        const bird = this.birds.get(data.id);
        if (bird) {
            // Update score
            if (data.shooterId) {
                this.engine.uiManager.updateScore(data.shooterId, 10);
            }

            // Remove the bird
            this.removeBird(data.id);
        }
    }

    startSpawning() {
        this.isSpawning = true;
    }

    stopSpawning() {
        this.isSpawning = false;
        // Remove all birds
        for (const id of this.birds.keys()) {
            this.removeBird(id);
        }
    }
}
