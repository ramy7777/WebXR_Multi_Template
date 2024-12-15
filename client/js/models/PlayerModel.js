import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

export class PlayerModel extends THREE.Group {
    constructor(isLocal = false) {
        super();
        this.isLocal = isLocal;
        this.controllerModelFactory = new XRControllerModelFactory();
        
        // Create the model structure
        this.setupBody();
        this.setupHead();
        this.setupControllers();
    }

    setupBody() {
        // Create a simple body that represents the player
        const bodyGeometry = new THREE.CapsuleGeometry(0.2, 0.8, 4, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: this.isLocal ? 0x4444ff : 0xff4444,
            roughness: 0.7,
            metalness: 0.3
        });
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.position.y = 0.9; // Position body at standing height
        this.add(this.body);
    }

    setupHead() {
        // Create head group that will follow VR headset
        this.headGroup = new THREE.Group();
        this.headGroup.position.y = 1.6; // Average eye height
        this.add(this.headGroup);

        // Create the head mesh
        const headGeometry = new THREE.SphereGeometry(0.12, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: this.isLocal ? 0x4444ff : 0xff4444,
            roughness: 0.7,
            metalness: 0.3
        });
        this.head = new THREE.Mesh(headGeometry, headMaterial);
        this.headGroup.add(this.head);

        // Add visor to the head
        const visorGeometry = new THREE.SphereGeometry(0.1, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const visorMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            roughness: 0.2,
            metalness: 0.8
        });
        this.visor = new THREE.Mesh(visorGeometry, visorMaterial);
        this.visor.rotation.x = Math.PI * 0.2;
        this.visor.position.z = 0.06;
        this.head.add(this.visor);
    }

    setupControllers() {
        // Create groups for left and right controllers
        this.leftGroup = new THREE.Group();
        this.rightGroup = new THREE.Group();
        this.add(this.leftGroup);
        this.add(this.rightGroup);

        // Create controller models using XRControllerModelFactory
        this.leftController = this.controllerModelFactory.createControllerModel(this.leftGroup);
        this.rightController = this.controllerModelFactory.createControllerModel(this.rightGroup);

        // Set initial positions
        this.leftGroup.position.set(-0.2, 1.0, -0.3);
        this.rightGroup.position.set(0.2, 1.0, -0.3);

        // Add visual rays for aiming
        const rayGeometry = new THREE.CylinderGeometry(0.002, 0.002, 1, 8);
        rayGeometry.rotateX(Math.PI / 2);
        rayGeometry.translate(0, 0, -0.5);

        const leftRayMaterial = new THREE.MeshBasicMaterial({
            color: 0x4444ff,
            transparent: true,
            opacity: 0.6
        });
        const rightRayMaterial = new THREE.MeshBasicMaterial({
            color: 0xff4444,
            transparent: true,
            opacity: 0.6
        });

        this.leftRay = new THREE.Mesh(rayGeometry, leftRayMaterial);
        this.rightRay = new THREE.Mesh(rayGeometry, rightRayMaterial);
        this.leftGroup.add(this.leftRay);
        this.rightGroup.add(this.rightRay);
    }

    updateFromXRCamera(camera) {
        if (!camera) return;

        // Update head position and rotation from camera
        this.headGroup.position.copy(camera.position);
        this.headGroup.rotation.copy(camera.rotation);
        
        // Keep the body position following the head but on the ground
        this.position.x = camera.position.x;
        this.position.z = camera.position.z;
        this.position.y = 0;
    }

    updateFromNetworkData(data) {
        if (data.position) {
            this.position.fromArray(data.position);
        }
        if (data.headPosition) {
            this.headGroup.position.fromArray(data.headPosition);
        }
        if (data.headRotation) {
            this.headGroup.rotation.fromArray(data.headRotation);
        }
        if (data.controllers) {
            if (data.controllers.left) {
                this.leftGroup.position.fromArray(data.controllers.left.position);
                this.leftGroup.quaternion.fromArray(data.controllers.left.rotation);
            }
            if (data.controllers.right) {
                this.rightGroup.position.fromArray(data.controllers.right.position);
                this.rightGroup.quaternion.fromArray(data.controllers.right.rotation);
            }
        }
    }

    getNetworkData() {
        return {
            position: this.position.toArray(),
            headPosition: this.headGroup.position.toArray(),
            headRotation: this.headGroup.rotation.toArray(),
            controllers: {
                left: {
                    position: this.leftGroup.position.toArray(),
                    rotation: this.leftGroup.quaternion.toArray()
                },
                right: {
                    position: this.rightGroup.position.toArray(),
                    rotation: this.rightGroup.quaternion.toArray()
                }
            }
        };
    }

    updateControllers(leftController, rightController) {
        if (leftController) {
            this.leftGroup.position.copy(leftController.position);
            this.leftGroup.quaternion.copy(leftController.quaternion);
        }
        if (rightController) {
            this.rightGroup.position.copy(rightController.position);
            this.rightGroup.quaternion.copy(rightController.quaternion);
        }
    }
}
