# Meta Quest 3 Controller Mapping Guide for WebXR

## Prerequisites
1. Three.js library
2. WebXR Device API support
3. Meta Quest 3 controllers paired and active

## Project Setup

### 1. Required Dependencies
```json
{
  "dependencies": {
    "three": "^0.158.0",
    "@webxr-input-profiles/motion-controllers": "^1.0.0"
  }
}
```

### 2. HTML Setup
```html
<!DOCTYPE html>
<html>
<head>
    <title>WebXR Controller Setup</title>
    <script type="module" src="three.module.js"></script>
    <script type="module" src="VRButton.js"></script>
    <script type="module" src="XRControllerModelFactory.js"></script>
</head>
<body>
    <div id="info">Meta Quest 3 Controller Test</div>
    <script type="module" src="main.js"></script>
</body>
</html>
```

## Controller Implementation Guide

### Step 1: Basic Controller Setup
```javascript
class InputManager {
    constructor(engine) {
        // Core properties
        this.engine = engine;
        this.controllers = [];
        this.controllerGrips = [];

        // Controller settings
        this.deadzone = 0.2;           // Thumbstick deadzone
        this.moveSpeed = 0.1;          // Movement speed
        this.rotateSpeed = 0.05;       // Rotation speed
        this.snapAngle = 45;           // Degrees
        this.rotationCooldown = false;
        this.rotationCooldownTime = 400; // ms

        // Initialize controllers
        this.initializeControllers();
    }
}
```

### Step 2: Controller Initialization
```javascript
initializeControllers() {
    const controllerModelFactory = new XRControllerModelFactory();

    // Initialize both controllers
    for (let i = 0; i < 2; i++) {
        const controller = this.renderer.xr.getController(i);
        const grip = this.renderer.xr.getControllerGrip(i);
        
        // Add controller model
        grip.add(controllerModelFactory.createControllerModel(grip));
        
        // Add to scene
        this.scene.add(controller);
        this.scene.add(grip);
        
        // Store references
        this.controllers.push(controller);
        this.controllerGrips.push(grip);
    }
}
```

### Step 3: Input Source Mapping
```javascript
// Meta Quest 3 Button Mapping
const QUEST3_MAPPING = {
    buttons: {
        trigger: 0,    // Index finger trigger
        grip: 1,       // Hand grip
        thumbstick: 3, // Thumbstick press
        X_A: 4,        // X button (left) or A button (right)
        Y_B: 5         // Y button (left) or B button (right)
    },
    axes: {
        thumbstick: {
            X: 2,     // Horizontal axis
            Y: 3      // Vertical axis
        }
    }
};
```

### Step 4: Input Processing
```javascript
processControllerInput(inputSource) {
    const gamepad = inputSource.gamepad;
    if (!gamepad) return;

    // Get thumbstick values
    const x = gamepad.axes[QUEST3_MAPPING.axes.thumbstick.X];
    const y = gamepad.axes[QUEST3_MAPPING.axes.thumbstick.Y];

    // Apply deadzone
    const deadX = Math.abs(x) < this.deadzone ? 0 : x;
    const deadY = Math.abs(y) < this.deadzone ? 0 : y;

    // Process based on controller side
    if (inputSource.handedness === 'left') {
        this.processLeftController(deadX, deadY, gamepad);
    } else if (inputSource.handedness === 'right') {
        this.processRightController(deadX, deadY, gamepad);
    }
}
```

### Step 5: Movement Implementation (Left Controller)
```javascript
processLeftController(x, y, gamepad) {
    // Movement
    if (Math.abs(x) > 0 || Math.abs(y) > 0) {
        // Calculate movement vector
        const moveX = x * this.moveSpeed;
        const moveZ = y * this.moveSpeed;
        
        // Apply movement
        this.engine.cameraRig.position.x += moveX;
        this.engine.cameraRig.position.z += moveZ;
        
        // Visual feedback
        this.updateMovementFeedback(x, y);
    }

    // Button checks
    if (gamepad.buttons[QUEST3_MAPPING.buttons.trigger].pressed) {
        this.handleTriggerPress('left');
    }
}
```

### Step 6: Rotation Implementation (Right Controller)
```javascript
processRightController(x, y, gamepad) {
    // Snap Rotation
    if (Math.abs(x) > 0.5 && !this.rotationCooldown) {
        // Calculate rotation
        const angle = (this.snapAngle * Math.PI / 180) * Math.sign(x);
        
        // Apply rotation
        this.engine.cameraRig.rotation.y -= angle;
        
        // Set cooldown
        this.enableRotationCooldown();
        
        // Feedback
        this.triggerHapticFeedback(gamepad, 0.6, 50);
        this.updateRotationFeedback(x > 0);
    }
}
```

### Step 7: Feedback Systems
```javascript
// Visual Feedback
updateMovementFeedback(x, y) {
    const color = x > 0 ? 0xff0000 :  // Red for right
                 x < 0 ? 0x00ff00 :  // Green for left
                 y > 0 ? 0xffff00 :  // Yellow for forward
                 0x0000ff;           // Blue for backward
    
    this.updateInteractionSphere(color, Math.max(Math.abs(x), Math.abs(y)));
}

// Haptic Feedback
triggerHapticFeedback(gamepad, intensity = 1.0, duration = 100) {
    if (gamepad.hapticActuators && gamepad.hapticActuators[0]) {
        gamepad.hapticActuators[0].pulse(intensity, duration);
    }
}
```

## Integration Checklist

1. **Project Setup**
   - [ ] Install required dependencies
   - [ ] Set up HTML structure
   - [ ] Import necessary Three.js modules

2. **Controller Setup**
   - [ ] Initialize InputManager
   - [ ] Set up controller models
   - [ ] Define button mappings

3. **Input Processing**
   - [ ] Implement thumbstick handling
   - [ ] Add button event listeners
   - [ ] Set up haptic feedback

4. **Movement System**
   - [ ] Implement deadzone logic
   - [ ] Add movement calculations
   - [ ] Set up visual feedback

5. **Rotation System**
   - [ ] Implement snap rotation
   - [ ] Add cooldown system
   - [ ] Set up rotation feedback

## Testing Guide

1. **Controller Connection**
   ```javascript
   // Debug controller connection
   console.log('Connected controllers:', this.controllers.length);
   console.log('Controller handedness:', inputSource.handedness);
   ```

2. **Input Values**
   ```javascript
   // Debug input values
   console.log('Thumbstick values:', {
       x: gamepad.axes[2],
       y: gamepad.axes[3]
   });
   ```

3. **Button States**
   ```javascript
   // Debug button states
   gamepad.buttons.forEach((button, index) => {
       console.log(`Button ${index}: ${button.pressed}`);
   });
   ```

## Common Issues and Solutions

1. **No Controller Input**
   - Verify WebXR session is properly initialized
   - Check browser console for WebXR errors
   - Ensure controllers are properly paired

2. **Incorrect Movement**
   - Verify deadzone values
   - Check movement speed scaling
   - Confirm coordinate system orientation

3. **Rotation Issues**
   - Check rotation angle calculations
   - Verify cooldown timer
   - Test haptic feedback timing

## Performance Optimization

1. **Input Processing**
   - Use request
AnimationFrame for updates
   - Implement throttling for intensive calculations
   - Cache frequently used values

2. **Visual Feedback**
   - Optimize color updates
   - Use efficient geometry for indicators
   - Minimize material updates

## Security Considerations

1. **WebXR Permissions**
   - Request minimum required features
   - Handle permission denials gracefully
   - Provide clear user instructions

2. **Input Validation**
   - Sanitize controller inputs
   - Validate movement boundaries
   - Handle disconnection events
