import * as THREE from 'three';

export class Player {
    constructor(engine, id, isLocal = false) {
        this.engine = engine;
        this.id = id;
        this.isLocal = isLocal;

        // Create VR avatar
        this.createAvatar();
        
        // Movement properties
        this.moveSpeed = 5;
        this.rotateSpeed = 2;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        
        // Interaction properties
        this.lastInteractionTime = 0;
        this.interactionCooldown = 500; // ms
        
        // Network interpolation
        this.targetPosition = new THREE.Vector3();
        this.targetRotation = new THREE.Euler();
        this.lerpFactor = 0.3;
        this.targetControllers = null;
    }

    createAvatar() {
        // Create avatar group
        this.group = new THREE.Group();

        // Head (VR Headset)
        const headGeometry = new THREE.BoxGeometry(0.25, 0.15, 0.2);
        const headMaterial = new THREE.MeshPhongMaterial({ 
            color: this.isLocal ? 0x00ff00 : 0xff0000,
            shininess: 30
        });
        this.head = new THREE.Mesh(headGeometry, headMaterial);
        this.head.position.y = 1.6;
        this.group.add(this.head);

        // Body
        const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.15, 0.6, 8);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: this.isLocal ? 0x008800 : 0x880000,
            shininess: 20
        });
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.position.y = 1.2;
        this.group.add(this.body);

        // Controllers
        this.controllers = {
            left: this.createController(0x0000ff),
            right: this.createController(0xff0000)
        };
        
        // Add nametag with better visibility
        this.createNametag();

        // Add to scene
        this.engine.scene.add(this.group);
    }

    createController(color) {
        const controller = new THREE.Group();

        // Controller body
        const grip = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.08, 0.15),
            new THREE.MeshPhongMaterial({ color: color, shininess: 30 })
        );
        controller.add(grip);

        // Controller pointer
        const pointer = new THREE.Mesh(
            new THREE.ConeGeometry(0.02, 0.08, 8),
            new THREE.MeshPhongMaterial({ color: 0xffffff })
        );
        pointer.rotation.x = -Math.PI / 2;
        pointer.position.z = 0.1;
        controller.add(pointer);

        this.group.add(controller);
        return controller;
    }

    createNametag() {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        // Background with alpha
        context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Text with shadow
        context.shadowColor = 'black';
        context.shadowBlur = 4;
        context.fillStyle = this.isLocal ? '#00ff00' : '#ffffff';
        context.font = 'bold 32px Arial';
        context.textAlign = 'center';
        context.fillText(`Player ${this.id}`, canvas.width/2, canvas.height/2 + 10);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true
        });
        this.nameTag = new THREE.Sprite(spriteMaterial);
        this.nameTag.position.y = 2;
        this.nameTag.scale.set(2, 0.5, 1);
        this.group.add(this.nameTag);
    }

    update(delta, frame) {
        if (this.isLocal) {
            // Update local player's avatar with VR camera and controllers
            if (this.engine.renderer.xr.isPresenting) {
                // Update head position from camera
                const camera = this.engine.camera;
                this.head.position.copy(camera.position);
                this.head.rotation.copy(camera.rotation);
                
                // Update body position
                this.body.position.x = camera.position.x;
                this.body.position.z = camera.position.z;
                
                // Update controllers
                const leftController = this.engine.renderer.xr.getController(0);
                const rightController = this.engine.renderer.xr.getController(1);
                
                if (leftController.position && leftController.quaternion) {
                    this.controllers.left.position.copy(leftController.position);
                    this.controllers.left.quaternion.copy(leftController.quaternion);
                }
                
                if (rightController.position && rightController.quaternion) {
                    this.controllers.right.position.copy(rightController.position);
                    this.controllers.right.quaternion.copy(rightController.quaternion);
                }
            }
        } else {
            // Interpolate network player's position and rotation
            this.group.position.lerp(this.targetPosition, this.lerpFactor);
            
            // Interpolate head rotation
            this.head.rotation.x = THREE.MathUtils.lerp(
                this.head.rotation.x,
                this.targetRotation.x,
                this.lerpFactor
            );
            this.head.rotation.y = THREE.MathUtils.lerp(
                this.head.rotation.y,
                this.targetRotation.y,
                this.lerpFactor
            );
            this.head.rotation.z = THREE.MathUtils.lerp(
                this.head.rotation.z,
                this.targetRotation.z,
                this.lerpFactor
            );

            // Interpolate controller positions and rotations if available
            if (this.targetControllers) {
                if (this.targetControllers.left) {
                    this.controllers.left.position.lerp(this.targetControllers.left.position, this.lerpFactor);
                    this.controllers.left.quaternion.slerp(this.targetControllers.left.quaternion, this.lerpFactor);
                }
                if (this.targetControllers.right) {
                    this.controllers.right.position.lerp(this.targetControllers.right.position, this.lerpFactor);
                    this.controllers.right.quaternion.slerp(this.targetControllers.right.quaternion, this.lerpFactor);
                }
            }
        }
    }

    updateFromNetwork(data) {
        // Update target position
        this.targetPosition.fromArray(data.position);
        this.targetRotation.fromArray(data.rotation);
        
        // Update target controller positions and rotations
        if (data.controllers) {
            if (!this.targetControllers) {
                this.targetControllers = {
                    left: {
                        position: new THREE.Vector3(),
                        quaternion: new THREE.Quaternion()
                    },
                    right: {
                        position: new THREE.Vector3(),
                        quaternion: new THREE.Quaternion()
                    }
                };
            }
            
            if (data.controllers.left) {
                this.targetControllers.left.position.fromArray(data.controllers.left.position);
                this.targetControllers.left.quaternion.fromArray(data.controllers.left.rotation);
            }
            if (data.controllers.right) {
                this.targetControllers.right.position.fromArray(data.controllers.right.position);
                this.targetControllers.right.quaternion.fromArray(data.controllers.right.rotation);
            }
        }
    }

    handleInteraction(interaction) {
        const now = Date.now();
        if (now - this.lastInteractionTime > this.interactionCooldown) {
            switch (interaction.type) {
                case 'wave':
                    this.playWaveAnimation();
                    break;
                case 'point':
                    this.highlightController(interaction.data.hand);
                    break;
                // Add more interaction types as needed
            }
            this.lastInteractionTime = now;
        }
    }

    playWaveAnimation() {
        // Example animation - make the avatar bounce
        const startY = this.group.position.y;
        const amplitude = 0.1;
        const duration = 500;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed < duration) {
                const delta = (Math.sin(elapsed / duration * Math.PI * 4) * amplitude);
                this.group.position.y = startY + delta;
                requestAnimationFrame(animate);
            } else {
                this.group.position.y = startY;
            }
        };
        animate();
    }

    highlightController(hand) {
        const controller = this.controllers[hand];
        if (controller) {
            const originalColor = controller.children[0].material.color.getHex();
            controller.children[0].material.color.setHex(0xffff00);
            setTimeout(() => {
                controller.children[0].material.color.setHex(originalColor);
            }, 200);
        }
    }

    destroy() {
        this.engine.scene.remove(this.group);
    }
}
