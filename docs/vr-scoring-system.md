# VR Scoring System Documentation

This document explains how the scoring system is implemented in our WebXR multiplayer game, including both the visual representation in VR and the network synchronization.

## Architecture Overview

The scoring system consists of three main components:

1. **VRScoreUI**: Handles the 3D visualization of scores in VR
2. **ScoreManager**: Manages score data and network synchronization
3. **Integration Points**: BirdManager and BulletManager for score events

## VR Score Display Implementation

### VRScoreUI Class

The `VRScoreUI` class (`client/js/ui/VRScoreUI.js`) creates and manages a fixed 3D scoreboard in the VR space:

```javascript
export class VRScoreUI {
    constructor(engine) {
        this.scoreGroup = new THREE.Group();
        this.textMeshes = new Map(); // playerId -> mesh
    }
}
```

Key features:
- Fixed position scoreboard at (0, 2.5, -3) in world space
- Semi-transparent background panel for readability
- Dynamic text updates using Three.js TextGeometry
- Player scores vertically stacked and centered

### Score Visualization

The scoreboard includes:
- Title "SCORES" at the top
- Individual player scores listed below
- Semi-transparent black background (opacity: 0.5)
- Green text for visibility (0x00ff00)

## Network Synchronization

### ScoreManager Implementation

The `ScoreManager` (`client/js/managers/ScoreManager.js`) handles:
1. Score data management
2. Network message handling
3. Score update broadcasting

```javascript
// Score update message format
{
    type: 'score_update',
    playerId: string,
    score: number
}
```

### Synchronization Flow

1. **Score Event**:
   - Player shoots a bird
   - BirdManager detects hit
   - Awards points to shooter

2. **Local Update**:
   ```javascript
   scoreManager.updateScore(playerId, points);
   ```

3. **Network Broadcast**:
   - Score update sent to all players
   - Other clients receive and update their displays

4. **Visual Update**:
   - VRScoreUI updates text meshes
   - All players see the same scores

## Integration Points

### Bird Hit Detection

```javascript
// In BirdManager
onBirdHit(birdId, bulletId) {
    const shooterId = this.bulletManager.getBulletShooter(bulletId);
    this.scoreManager.awardPoints(shooterId, 10); // 10 points per bird
}
```

### Score Updates

```javascript
// In ScoreManager
awardPoints(playerId, points) {
    this.scores[playerId] += points;
    this.broadcastScore(playerId);
    this.updateUI(playerId);
}
```

## Best Practices

1. **Performance**:
   - Text geometries are created once and reused
   - Only update meshes when scores change
   - Efficient network message format

2. **Visibility**:
   - Fixed position for consistent viewing
   - Background panel for readability
   - Optimal height and distance from spawn point

3. **Reliability**:
   - Score synchronization on player join
   - Proper cleanup on player disconnect
   - Error handling for network messages

## Technical Considerations

1. **Font Loading**:
   - Asynchronous font loading using FontLoader
   - Fallback handling if font fails to load
   - Uses helvetiker_regular font from Three.js

2. **Memory Management**:
   - Proper disposal of Three.js geometries and materials
   - Cleanup of player scores on disconnect
   - Efficient text mesh updates

3. **Network Optimization**:
   - Minimal network message size
   - Rate limiting for score updates
   - Efficient serialization

## Future Improvements

Potential enhancements to consider:

1. **Visual Enhancements**:
   - Animated score changes
   - Player-specific color coding
   - More detailed statistics display

2. **Performance Optimizations**:
   - Batched score updates
   - LOD (Level of Detail) for distant viewing
   - Text sprite optimization

3. **Features**:
   - Leaderboard functionality
   - Score persistence
   - Achievement system integration
