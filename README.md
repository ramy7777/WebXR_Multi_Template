# WebXR Multiverse

A WebXR-based multiplayer virtual reality experience.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Access the application:
- Local: https://localhost:3001/
- Network: https://[your-ip]:3001/

## Controls

### Meta Quest 3 Controller Mappings

#### Left Controller (Movement)
- **Thumbstick**:
  - Analog Movement with Color Feedback
    - Forward/Backward: Move in that direction
    - Left/Right: Strafe movement
    - Movement speed scales with thumbstick displacement
    - Visual Feedback Colors:
      - Up: Yellow (#FFFF00)
      - Down: Blue (#0000FF)
      - Left: Green (#00FF00)
      - Right: Red (#FF0000)
  - Interaction sphere scales based on movement intensity
- **Trigger** (index finger): 
  - Primary interaction button
  - Haptic feedback on press
- **Grip** (middle finger): 
  - Reserved for future features

#### Right Controller (Rotation)
- **Thumbstick**:
  - Snap Rotation System
    - Push right/left past 50% threshold to rotate
    - 45-degree rotation increments
    - 400ms cooldown between rotations
    - Visual Feedback:
      - Right rotation: Light red sphere (#FF8080)
      - Left rotation: Light green sphere (#80FF80)
      - Sphere scales up during cooldown
    - Haptic feedback (0.6 intensity) on rotation
- **Trigger** (index finger):
  - Secondary interaction button
  - Haptic feedback on press
- **Grip** (middle finger):
  - Reserved for future features

### Desktop Mode
- WASD: Movement
- Mouse: Look around
- Click: Interact with objects

## Interaction System

The application features an interactive sphere that changes color when you:
1. Point at it with your controller in VR mode
2. Press the trigger button (index finger button)

The interaction sphere is positioned in front of the user at eye level (height: 1.6 meters) and about 1 meter away.

### Debug Mode
A debug panel in the top-left corner shows:
- Current time
- WebXR availability
- Screen resolution
- Connection status
- Controller status

## Input System Implementation Details

#### Movement System
- Deadzone implementation prevents drift
- Analog control with proportional speed
- Visual feedback through interaction sphere
- Smooth acceleration and deceleration
- Real-time debug information display

#### Snap Rotation System
- Comfort-focused 45-degree increments
- Cooldown prevents disorientation
- Strong haptic feedback for clear rotation feedback
- Visual indicators through sphere color/scale
- Requires intentional input (>50% thumbstick)

## Implementation Guide

### WebXR Input System Setup

#### 1. Controller Input Setup
```javascript
// In your InputManager constructor
constructor(engine) {
    this.engine = engine;
    this.controllers = [];
    this.controllerGrips = [];
    // Add deadzone for thumbsticks
    this.deadzone = 0.2;
    // Add movement and rotation speed
    this.moveSpeed = 0.1;
    this.rotateSpeed = 0.05;
    // Add rotation cooldown properties
    this.rotationCooldown = false;
    this.rotationCooldownTime = 400; // milliseconds
}
```

#### 2. Thumbstick Implementation
```javascript
// Get thumbstick values (x, y between -1 and 1)
const gamepad = inputSource.gamepad;
if (gamepad && gamepad.axes.length >= 2) {
    const x = gamepad.axes[2];  // Horizontal
    const y = gamepad.axes[3];  // Vertical
    
    // Apply deadzone
    if (Math.abs(x) < this.deadzone) x = 0;
    if (Math.abs(y) < this.deadzone) y = 0;
}
```

#### 3. Movement System
```javascript
// Left controller movement
if (inputSource.handedness === 'left') {
    // Calculate movement vector
    const moveX = x * this.moveSpeed;
    const moveZ = y * this.moveSpeed;
    
    // Apply movement to camera rig
    this.engine.cameraRig.position.x += moveX;
    this.engine.cameraRig.position.z += moveZ;
    
    // Visual feedback
    if (Math.abs(x) > this.deadzone || Math.abs(y) > this.deadzone) {
        // Change color based on direction
        const color = x > 0 ? 0xff0000 : // Red for right
                     x < 0 ? 0x00ff00 : // Green for left
                     y > 0 ? 0xffff00 : // Yellow for up
                     0x0000ff;          // Blue for down
        this.updateInteractionSphereColor(color);
    }
}
```

#### 4. Snap Rotation System
```javascript
// Right controller rotation
if (inputSource.handedness === 'right') {
    if (Math.abs(x) > this.deadzone && !this.rotationCooldown) {
        // Only rotate if thumbstick exceeds threshold
        if (Math.abs(x) > 0.5) {
            // Snap rotation angle (in radians)
            const snapAngle = (45 * Math.PI / 180) * Math.sign(x);
            
            // Apply rotation
            this.engine.cameraRig.rotation.y -= snapAngle;
            
            // Set cooldown
            this.rotationCooldown = true;
            setTimeout(() => {
                this.rotationCooldown = false;
            }, this.rotationCooldownTime);
            
            // Haptic feedback
            this.triggerHapticFeedback(inputSource, 0.6, 50);
        }
    }
}
```

#### 5. Haptic Feedback Implementation
```javascript
triggerHapticFeedback(inputSource, intensity = 1.0, duration = 100) {
    if (inputSource.gamepad && inputSource.gamepad.hapticActuators) {
        const actuator = inputSource.gamepad.hapticActuators[0];
        if (actuator) {
            actuator.pulse(intensity, duration);
        }
    }
}
```

### Integration Steps

1. **Initialize WebXR Session**
```javascript
async function initXR() {
    // Request XR session with required features
    const session = await navigator.xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor', 'bounded-floor']
    });
}
```

2. **Set Up Controllers**
```javascript
function onXRSessionStarted(session) {
    // Create controller objects
    const controllerModelFactory = new XRControllerModelFactory();
    
    // Set up controllers
    for (let i = 0; i < 2; i++) {
        const controller = this.renderer.xr.getController(i);
        const grip = this.renderer.xr.getControllerGrip(i);
        
        // Add controller model
        grip.add(controllerModelFactory.createControllerModel(grip));
        
        this.scene.add(controller);
        this.scene.add(grip);
        
        this.controllers.push(controller);
        this.controllerGrips.push(grip);
    }
}
```

3. **Update Loop**
```javascript
function updateVRInput(frame) {
    const session = frame.session;
    const sources = session.inputSources;
    
    for (const source of sources) {
        // Process input for each controller
        this.processControllerInput(source);
    }
}
```

### Best Practices

1. **Input Handling**
   - Always use deadzones for thumbsticks to prevent drift
   - Implement cooldowns for actions that could cause disorientation
   - Provide clear visual and haptic feedback for all actions

2. **Movement**
   - Scale movement speed based on thumbstick displacement
   - Use smooth acceleration/deceleration for comfort
   - Provide visual indicators for movement direction

3. **Rotation**
   - Implement snap rotation for comfort (reduces motion sickness)
   - Add cooldown between rotations
   - Use strong haptic feedback for rotation events

4. **Feedback**
   - Combine visual, auditory, and haptic feedback
   - Use consistent color coding for actions
   - Scale feedback intensity with input intensity

### Troubleshooting

Common issues and solutions:
1. **No Controller Input**
   - Verify WebXR session has proper features enabled
   - Check if gamepad API is accessible
   - Ensure controllers are properly paired

2. **Drift Issues**
   - Implement or adjust deadzone values
   - Check for stuck thumbstick values
   - Verify input normalization

3. **Performance Issues**
   - Use requestAnimationFrame for updates
   - Implement throttling for intensive operations
   - Optimize visual feedback calculations

## Known Issues and Solutions

### Bird Spawning in Multiplayer

#### Issue: Client Birds Not Moving
Initially, birds spawned on client machines would appear frozen and not move properly. This was caused by the `isSpawning` flag not being properly synchronized between host and clients.

#### Solution
1. **Host-Client Bird Spawning**:
   - Modified `BirdManager.startSpawning()` to allow both host and clients to spawn birds
   - Host continues periodic spawning while clients spawn initial birds
   - Added debug logging to track spawning state

2. **Network Synchronization**:
   - Added automatic `isSpawning` state setting when clients receive network bird spawns
   - Updated `UIManager.handleNetworkGameStart()` to explicitly set spawning state
   - Improved error handling and logging for network bird updates

3. **Implementation Details**:
```javascript
// BirdManager.js
handleNetworkBirdSpawn(data) {
    // Ensure isSpawning is true when receiving network birds
    if (!this.isSpawning) {
        this.isSpawning = true;
    }
    // ... bird spawn logic
}

// UIManager.js
handleNetworkGameStart(data) {
    if (this.engine.birdManager) {
        this.engine.birdManager.isSpawning = true;
    }
    // ... game start logic
}
```

This solution ensures proper bird movement synchronization across all clients in the multiplayer environment.

## Development Notes

The interaction system uses Three.js raycasting for precise object selection. The InputManager handles:
- Controller input processing
- Raycaster updates
- Haptic feedback
- Visual feedback (color changes)
- Movement controls

Key files:
- `client/js/input/InputManager.js`: Handles all user input and interaction
- `client/js/core/Engine.js`: Main game engine and scene setup
- `client/index.html`: Entry point and configuration
