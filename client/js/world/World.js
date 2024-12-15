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
        // Create the main room
        const roomWidth = 40;
        const roomHeight = 8;
        const roomDepth = 40;

        // Floor
        const floorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a3a4a,
            roughness: 0.4,
            metalness: 0.6,
        });
        this.materials.set('floor', floorMaterial);

        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        this.engine.scene.add(floor);
        this.ground = floor;
        this.objects.add(floor);

        // Ceiling
        const ceilingGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
        const ceilingMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a3a4a,
            roughness: 0.4,
            metalness: 0.6,
        });
        this.materials.set('ceiling', ceilingMaterial);

        const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = roomHeight;
        this.engine.scene.add(ceiling);
        this.objects.add(ceiling);

        // Add glowing edges
        this.addGlowingEdges(roomWidth, roomHeight, roomDepth);

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

        // Add walls with a futuristic look
        this.addFuturisticWalls(roomWidth, roomHeight, roomDepth);

        // Add ambient lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        this.engine.scene.add(ambientLight);

        // Add point lights in corners
        const cornerLights = [
            [-roomWidth/2.2, roomHeight-1, -roomDepth/2.2],
            [-roomWidth/2.2, roomHeight-1, roomDepth/2.2],
            [roomWidth/2.2, roomHeight-1, -roomDepth/2.2],
            [roomWidth/2.2, roomHeight-1, roomDepth/2.2]
        ];

        cornerLights.forEach(position => {
            const light = new THREE.PointLight(0x6666ff, 0.8, roomWidth * 1.5);
            light.position.set(...position);
            this.engine.scene.add(light);
        });

        // Add central light
        const centralLight = new THREE.PointLight(0xffffff, 1, roomWidth * 2);
        centralLight.position.set(0, roomHeight - 2, 0);
        this.engine.scene.add(centralLight);

        // Add strip lights along the walls
        const stripLights = [
            [0, roomHeight-1, depth/2-0.5],  // front
            [0, roomHeight-1, -depth/2+0.5], // back
            [-width/2+0.5, roomHeight-1, 0], // left
            [width/2-0.5, roomHeight-1, 0]   // right
        ];

        stripLights.forEach(position => {
            const light = new THREE.PointLight(0xaaaaff, 0.6, roomWidth);
            light.position.set(...position);
            this.engine.scene.add(light);
        });
    }

    addGlowingEdges(width, height, depth) {
        const edgeGeometry = new THREE.BoxGeometry(0.1, height, 0.1);
        const edgeMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.8
        });
        this.materials.set('edge', edgeMaterial);

        // Create vertical edges at corners
        const edgePositions = [
            [-width/2, height/2, -depth/2],
            [-width/2, height/2, depth/2],
            [width/2, height/2, -depth/2],
            [width/2, height/2, depth/2]
        ];

        edgePositions.forEach(position => {
            const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
            edge.position.set(...position);
            this.engine.scene.add(edge);
            this.objects.add(edge);
        });
    }

    addFuturisticWalls(width, height, depth) {
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a3a4a,
            roughness: 0.4,
            metalness: 0.6,
            side: THREE.DoubleSide
        });
        this.materials.set('wall', wallMaterial);

        // Create walls
        const wallGeometries = [
            new THREE.PlaneGeometry(width, height), // front
            new THREE.PlaneGeometry(width, height), // back
            new THREE.PlaneGeometry(depth, height), // left
            new THREE.PlaneGeometry(depth, height)  // right
        ];

        const wallPositions = [
            [0, height/2, depth/2],
            [0, height/2, -depth/2],
            [-width/2, height/2, 0],
            [width/2, height/2, 0]
        ];

        const wallRotations = [
            [0, 0, 0],
            [0, Math.PI, 0],
            [0, -Math.PI/2, 0],
            [0, Math.PI/2, 0]
        ];

        wallGeometries.forEach((geometry, index) => {
            const wall = new THREE.Mesh(geometry, wallMaterial);
            wall.position.set(...wallPositions[index]);
            wall.rotation.setFromVector3(new THREE.Vector3(...wallRotations[index]));
            this.engine.scene.add(wall);
            this.objects.add(wall);
        });
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
