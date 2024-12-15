import * as THREE from 'three';

export class ParticleSystem extends THREE.Object3D {
    constructor(position, color = 0x000000, particleCount = 10) {
        super();
        
        this.particles = [];
        this.particleCount = particleCount;
        this.lifespan = 2000; // milliseconds
        this.startTime = Date.now();
        
        // Create feather geometry
        const shape = new THREE.Shape();
        // Main feather shape
        shape.moveTo(0, 0.1);
        shape.quadraticCurveTo(0.01, 0.05, 0.01, -0.1);
        shape.lineTo(-0.01, -0.1);
        shape.quadraticCurveTo(-0.01, 0.05, 0, 0.1);

        const extrudeSettings = {
            steps: 1,
            depth: 0.005,
            bevelEnabled: false
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.rotateX(Math.PI / 2);
        
        // Create materials for both sides of the feather
        const frontMaterial = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.3,
            side: THREE.FrontSide,
            transparent: true
        });

        const backMaterial = new THREE.MeshPhongMaterial({
            color: 0x222222,
            emissive: 0x222222,
            emissiveIntensity: 0.1,
            side: THREE.BackSide,
            transparent: true
        });

        // Create particles
        for (let i = 0; i < particleCount; i++) {
            const feather = new THREE.Group();
            
            // Add front and back faces with different materials
            const frontFeather = new THREE.Mesh(geometry, frontMaterial.clone());
            const backFeather = new THREE.Mesh(geometry, backMaterial.clone());
            feather.add(frontFeather);
            feather.add(backFeather);

            // Random initial velocity with more upward tendency
            feather.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                Math.random() * 0.15,
                (Math.random() - 0.5) * 0.1
            );

            // Random rotation speed for fluttering effect
            feather.rotationSpeed = {
                x: (Math.random() - 0.5) * 0.05,
                y: (Math.random() - 0.5) * 0.05,
                z: (Math.random() - 0.5) * 0.05
            };

            // Random initial rotation
            feather.rotation.set(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            );

            // Random scale variation
            const scale = 0.15 + Math.random() * 0.1;
            feather.scale.set(scale, scale, scale);

            this.add(feather);
            this.particles.push(feather);
        }

        // Set initial position
        this.position.copy(position);
    }

    update() {
        const age = Date.now() - this.startTime;
        if (age > this.lifespan) {
            return true; // Should be removed
        }

        const progress = age / this.lifespan;

        this.particles.forEach(feather => {
            // Update position based on velocity
            feather.position.add(feather.velocity);
            
            // Add gravity effect (reduced for feathers)
            feather.velocity.y -= 0.0005;

            // Add random horizontal drift for feather-like movement
            feather.velocity.x += (Math.random() - 0.5) * 0.001;
            feather.velocity.z += (Math.random() - 0.5) * 0.001;

            // Rotate feather for fluttering effect
            feather.rotation.x += feather.rotationSpeed.x;
            feather.rotation.y += feather.rotationSpeed.y;
            feather.rotation.z += feather.rotationSpeed.z;

            // Gradually slow down rotation
            feather.rotationSpeed.x *= 0.99;
            feather.rotationSpeed.y *= 0.99;
            feather.rotationSpeed.z *= 0.99;

            // Fade out
            feather.children.forEach(mesh => {
                mesh.material.opacity = 1 - progress;
            });
        });

        return false;
    }
}
