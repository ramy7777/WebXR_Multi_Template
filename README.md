# WebXR Multiplayer Game Template

A complete template for building WebXR multiplayer games using Three.js and WebSocket. This template includes networking, scoring, VR controls, and multiplayer synchronization out of the box.

## Features

### 1. Networking
- WebSocket-based multiplayer system
- Room-based matchmaking
  - Host room with auto-generated code
  - Quick join for instant matching
  - Manual room code join
- Player synchronization
  - Position and rotation sync
  - Head and controller tracking
  - Action synchronization (shooting, interactions)

### 2. VR Controls and Interaction
- Complete VR setup with Three.js
- Controller mapping:
  - Trigger: Shoot/Select
  - Grip: Grab objects
  - Thumbstick: Teleport movement
  - Menu button: Open in-game menu
- Physics-based interactions
- Haptic feedback support

### 3. Scoring System
- Real-time score synchronization
- Leaderboard display in VR
- Score persistence during gameplay
- Points system:
  - Target hits: 10 points
  - Customizable scoring rules

### 4. Game Management
- Start/Restart synchronization
- Room state management
- Player join/leave handling
- Game session timing
- Score reset on game restart

### 5. 3D Models and Assets
- Hunting rifle model integration
- Target sphere system
- VR hands models
- Environment setup
- Holographic room boundaries

## Project Structure

```
├── client/
│   ├── js/
│   │   ├── entities/         # Game objects (Birds, Bullets)
│   │   ├── managers/         # Game systems
│   │   ├── network/         # Networking code
│   │   ├── ui/             # User interface
│   │   └── world/          # 3D world setup
│   ├── models/             # 3D models
│   └── index.html          # Main entry point
└── server/
    ├── server.js           # Express server
    └── websocket.js        # WebSocket handler
```

## Key Components

### NetworkManager
Handles all multiplayer functionality:
- Connection management
- Room creation and joining
- State synchronization
- Message handling

### ScoreManager
Manages scoring system:
- Score tracking
- Leaderboard updates
- Score synchronization
- VR score display

### BirdManager (Target System)
Controls target spawning and interaction:
- Spawn management
- Collision detection
- Network synchronization
- Score updates

### PlayerManager
Handles player-related functionality:
- Player creation/removal
- Position updates
- Controller tracking
- Player state sync

## Setup and Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd multiplayer-template
```

2. Install dependencies:
```bash
npm install
```

3. Generate SSL certificates (for local HTTPS):
```bash
node generate-certificates.js
```

4. Start the server:
```bash
node server/server.js
```

5. Access the game:
- Open https://localhost:3000 in your browser
- Accept the self-signed certificate
- Connect your VR headset

## Customization

### Adding New Features
1. Create new entity classes in `client/js/entities/`
2. Add managers in `client/js/managers/`
3. Update network messages in `NetworkManager.js`
4. Modify scoring rules in `ScoreManager.js`

### Modifying Game Rules
- Adjust spawn rates in `BirdManager.js`
- Modify scoring values
- Change game duration
- Update room boundaries

### Adding New Models
1. Place models in `client/models/`
2. Load using `GLTFLoader` in Three.js
3. Add to scene in relevant manager

## Networking Protocol

### Message Types
- `playerJoined`: New player connection
- `playerLeft`: Player disconnection
- `position`: Player position update
- `bulletSpawned`: Bullet creation
- `birdSpawned`: Target spawning
- `birdHit`: Target hit registration
- `scoreUpdate`: Score synchronization
- `gameStart`: Game session start
- `gameEnd`: Game session end

### Room Management
- Room codes are 6 characters
- Quick join finds/creates rooms
- Host has authority over game start
- Clients sync to host state

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions, please open an issue on the GitHub repository.
