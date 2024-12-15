# WebXR Multiplayer Application Template Guide

This guide provides a comprehensive template for building WebXR multiplayer applications, based on our experience developing the WebXR Multiverse game. It covers architecture, networking, synchronization, and common challenges with their solutions.

## Table of Contents
1. [Project Structure](#project-structure)
2. [Core Technologies](#core-technologies)
3. [Architecture Overview](#architecture-overview)
4. [Implementation Guide](#implementation-guide)
5. [Common Challenges & Solutions](#common-challenges--solutions)
6. [Best Practices](#best-practices)
7. [Testing & Deployment](#testing--deployment)

## Project Structure

```
project-root/
├── client/
│   ├── js/
│   │   ├── engine/         # Core game engine
│   │   ├── entities/       # Game objects
│   │   ├── managers/       # System managers
│   │   ├── input/         # Input handling
│   │   ├── network/       # Network communication
│   │   └── effects/       # Visual effects
│   ├── assets/            # 3D models, textures
│   ├── styles/            # CSS files
│   └── index.html         # Entry point
├── server/
│   └── server.js          # WebSocket server
├── certs/                 # SSL certificates
└── docs/                  # Documentation
```

## Core Technologies

1. **Frontend**
   - Three.js for 3D rendering
   - WebXR for VR/AR support
   - WebSocket for real-time communication

2. **Backend**
   - Node.js
   - ws (WebSocket library)
   - Express.js for static file serving

3. **Development**
   - SSL certificates for HTTPS (required for WebXR)
   - Modern JavaScript (ES6+)
   - Git for version control

## Architecture Overview

### 1. Engine Layer
```javascript
class Engine {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera();
        this.renderer = new THREE.WebGLRenderer();
        this.networkManager = new NetworkManager(this);
        this.inputManager = new InputManager(this);
        this.playerManager = new PlayerManager(this);
        // ... other managers
    }

    init() {
        // Initialize WebXR
        // Set up scene
        // Connect to server
    }

    update() {
        // Game loop
        // Update all managers
        // Render scene
    }
}
```

### 2. Network Layer

#### Client-Side
```javascript
class NetworkManager {
    constructor(engine) {
        this.ws = null;
        this.engine = engine;
        this.players = new Map();
        this.localPlayerId = null;
    }

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.ws = new WebSocket(`${protocol}//${window.location.host}`);
        // Set up message handlers
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }
}
```

#### Server-Side
```javascript
const wss = new WebSocket.Server({ server });
const rooms = new Map();
const clients = new Map();

wss.on('connection', (ws) => {
    const clientId = generateUniqueId();
    clients.set(ws, { id: clientId, room: null });

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        handleMessage(ws, data);
    });
});
```

## Implementation Guide

### 1. Setting Up the Project

1. **Initialize Project**
   ```bash
   npm init
   npm install three express ws https fs path
   ```

2. **SSL Certificates**
   ```bash
   openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes
   ```

3. **Basic Server**
   ```javascript
   const https = require('https');
   const express = require('express');
   const WebSocket = require('ws');
   
   const app = express();
   const server = https.createServer({
       key: fs.readFileSync('certs/key.pem'),
       cert: fs.readFileSync('certs/cert.pem')
   }, app);
   
   const wss = new WebSocket.Server({ server });
   ```

### 2. Implementing Core Features

#### Player Management
```javascript
class PlayerManager {
    constructor(engine) {
        this.players = new Map();
        this.localPlayer = null;
    }

    createLocalPlayer() {
        this.localPlayer = new Player(/* params */);
        this.players.set(networkManager.localPlayerId, this.localPlayer);
    }

    updatePlayerPosition(id, position) {
        const player = this.players.get(id);
        if (player) {
            player.position.copy(position);
        }
    }
}
```

#### Input Handling
```javascript
class InputManager {
    constructor(engine) {
        this.engine = engine;
        this.controllers = [];
        this.setupVRControllers();
    }

    setupVRControllers() {
        this.engine.renderer.xr.addEventListener('sessionstart', () => {
            // Initialize VR controllers
        });
    }

    update() {
        // Handle input from controllers
        // Send network updates for local player
    }
}
```

## Common Challenges & Solutions

### 1. Network Synchronization

**Challenge**: Keeping game state synchronized across clients.

**Solution**:
1. Use a host-based architecture
2. Implement state validation
3. Use timestamps for synchronization

```javascript
// Network message structure
{
    type: 'stateUpdate',
    timestamp: Date.now(),
    data: {
        position: vector.toArray(),
        rotation: quaternion.toArray(),
        velocity: velocity.toArray()
    }
}
```

### 2. Object Ownership

**Challenge**: Determining which client controls what objects.

**Solution**:
1. Assign unique IDs to all objects
2. Track object ownership
3. Validate actions based on ownership

```javascript
class NetworkEntity {
    constructor() {
        this.id = generateUniqueId();
        this.ownerId = null;
    }

    canModify(playerId) {
        return this.ownerId === playerId;
    }
}
```

### 3. Late-Join Synchronization

**Challenge**: Synchronizing state for players joining mid-game.

**Solution**:
1. Implement state snapshots
2. Send full state to new players
3. Gradually synchronize non-critical elements

```javascript
function handlePlayerJoin(ws, clientId) {
    const gameState = generateStateSnapshot();
    ws.send(JSON.stringify({
        type: 'fullState',
        data: gameState
    }));
}
```

## Best Practices

1. **Network Messages**
   - Use consistent message formats
   - Include sender IDs
   - Validate all incoming messages
   - Handle disconnections gracefully

2. **Performance**
   - Implement object pooling
   - Use delta compression
   - Batch network updates
   - Optimize Three.js scene

3. **Code Organization**
   - Use manager classes for subsystems
   - Implement event system for communication
   - Keep network logic separate from game logic
   - Document message types and formats

## Testing & Deployment

### Local Testing
1. Run with SSL certificates
2. Test with multiple clients
3. Simulate network conditions
4. Profile performance

### Deployment Checklist
1. Valid SSL certificates
2. Environment configuration
3. Error logging
4. Performance monitoring
5. Backup systems

## Example Implementation

Here's a minimal example to get started:

```javascript
// client/js/main.js
class Game {
    constructor() {
        this.engine = new Engine();
        this.networkManager = new NetworkManager(this.engine);
        this.inputManager = new InputManager(this.engine);
    }

    async init() {
        await this.networkManager.connect();
        this.engine.start();
    }
}

// Start the game
const game = new Game();
game.init().catch(console.error);
```

## Troubleshooting Guide

1. **WebXR Not Working**
   - Check HTTPS setup
   - Verify SSL certificates
   - Confirm WebXR device support

2. **Network Issues**
   - Check WebSocket connection
   - Verify message formats
   - Monitor network traffic

3. **Performance Problems**
   - Profile JavaScript
   - Check Three.js render stats
   - Monitor memory usage
   - Optimize network messages

## Resources

1. **Documentation**
   - [Three.js Docs](https://threejs.org/docs/)
   - [WebXR Device API](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API)
   - [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

2. **Tools**
   - Three.js Inspector
   - Chrome DevTools
   - WebXR Emulator
   - Network analyzers
