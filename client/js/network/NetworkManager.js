import * as THREE from 'three';
import { Bullet } from '../entities/Bullet.js';

export class NetworkManager {
    constructor(engine) {
        this.engine = engine;
        this.players = new Map();
        this.localPlayerId = null;
        this.lastUpdateTime = 0;
        this.updateInterval = 50; // Send updates every 50ms
        this.connected = false;
        this.ws = null;
        this.onConnect = null; // Callback for when connection is established
        this.currentRoom = null; // Track current room
        this.isHost = false; // Track if this client is the host
    }

    async connect() {
        return new Promise((resolve, reject) => {
            try {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                this.ws = new WebSocket(`${protocol}//${window.location.host}`);

                this.ws.onopen = () => {
                    this.connected = true;
                    if (this.onConnect) {
                        this.onConnect();
                    }
                    resolve();
                };
                
                this.ws.onclose = () => {
                    this.connected = false;
                    this.currentRoom = null; // Clear room on disconnect
                    this.clearPlayers(); // Clear all players on disconnect
                };
                
                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    reject(error);
                };
                
                this.ws.onmessage = (event) => this.handleMessage(event);
            } catch (error) {
                console.error('Failed to connect:', error);
                reject(error);
            }
        });
    }

    disconnect() {
        if (this.ws) {
            if (this.currentRoom) {
                // Send leave message before disconnecting
                this.send({
                    type: 'leave',
                    roomCode: this.currentRoom
                });
            }
            this.ws.close();
            this.ws = null;
            this.connected = false;
            this.currentRoom = null;
            this.clearPlayers();
        }
    }

    clearPlayers() {
        // Remove all players except local
        for (const [id, player] of this.players) {
            if (id !== this.localPlayerId) {
                this.engine.playerManager.removePlayer(id);
            }
        }
        this.players.clear();
    }

    handleMessage(message) {
        const data = JSON.parse(message.data);
        
        switch(data.type) {
            case 'init':
                this.localPlayerId = data.id;
                break;
                
            case 'hostConfirm':
                this.currentRoom = data.roomCode;
                this.isHost = true;
                this.engine.playerManager.createLocalPlayer();
                
                if (data.players) {
                    data.players.forEach(player => {
                        if (player.id !== this.localPlayerId) {
                            this.engine.playerManager.addPlayer(player.id);
                            if (player.position) {
                                this.engine.playerManager.updatePlayer(player.id, {
                                    position: player.position,
                                    headPosition: player.headPosition,
                                    headRotation: player.headRotation,
                                    controllers: player.controllers
                                });
                            }
                        }
                    });
                }
                break;
                
            case 'joinConfirm':
            case 'autoJoinConfirm':
                this.currentRoom = data.roomCode;
                this.isHost = false;
                this.engine.playerManager.createLocalPlayer();
                
                if (data.players) {
                    data.players.forEach(player => {
                        if (player.id !== this.localPlayerId) {
                            this.engine.playerManager.addPlayer(player.id);
                            if (player.position) {
                                this.engine.playerManager.updatePlayer(player.id, {
                                    position: player.position,
                                    headPosition: player.headPosition,
                                    headRotation: player.headRotation,
                                    controllers: player.controllers
                                });
                            }
                        }
                    });
                }
                break;
                
            case 'playerJoined':
                if (!this.currentRoom) return;
                if (data.id !== this.localPlayerId) {
                    this.engine.playerManager.addPlayer(data.id);
                }
                break;
                
            case 'playerLeft':
                if (!this.currentRoom) return;
                if (data.id !== this.localPlayerId) {
                    this.engine.playerManager.removePlayer(data.id);
                }
                break;
                
            case 'position':
                if (!this.currentRoom) return;
                if (data.id !== this.localPlayerId) {
                    this.engine.playerManager.updatePlayer(data.id, {
                        position: data.position,
                        headPosition: data.headPosition,
                        headRotation: data.headRotation,
                        controllers: data.controllers
                    });
                }
                break;

            case 'bulletSpawned':
                this.engine.bulletManager.handleNetworkBulletSpawn(data.data, data.senderId);
                break;

            case 'bulletHit':
                this.engine.bulletManager.handleNetworkBulletHit(data.data);
                break;

            case 'sphereSpawned':
                if (data.senderId !== this.localPlayerId) {
                    console.debug('[DEBUG] Received sphere spawn message:', data);
                    this.engine.sphereManager.handleNetworkSphereSpawn(data.data, data.senderId);
                }
                break;

            case 'sphereRemoved':
                this.engine.sphereManager.handleNetworkSphereRemoved(data.data);
                break;

            case 'birdSpawned':
                if (data.senderId !== this.localPlayerId) {
                    console.debug('[DEBUG] Received bird spawn message:', data);
                    this.engine.birdManager.handleNetworkBirdSpawn(data.data);
                }
                break;

            case 'birdRemoved':
                this.engine.birdManager.handleNetworkBirdRemoved(data.data);
                break;

            case 'birdKilled':
                console.debug('[DEBUG] Received bird kill message:', data);
                this.engine.birdManager.handleBirdKilled(data.data);
                break;

            case 'gameStart':
                console.debug('[DEBUG] Received game start message:', data);
                this.engine.handleNetworkMessage(data, data.senderId);
                break;

            case 'voice_ready':
                this.engine.voiceManager.handleVoiceReady(data.playerId);
                break;
            
            case 'voice_offer':
                this.engine.voiceManager.handleVoiceOffer(data.playerId, data.offer);
                break;
            
            case 'voice_answer':
                this.engine.voiceManager.handleVoiceAnswer(data.playerId, data.answer);
                break;
            
            case 'voice_ice_candidate':
                this.engine.voiceManager.handleVoiceIceCandidate(data.playerId, data.candidate);
                break;
            
            case 'voice_stop':
                this.engine.voiceManager.handleVoiceStop(data.playerId);
                break;

            case 'error':
                console.error('Server error:', data.message);
                if (this.engine.sessionManager) {
                    this.engine.sessionManager.showError(data.message);
                }
                break;

            default:
                console.warn('Unknown message type:', data.type);
        }
    }

    async autoJoinRoom() {
        try {
            if (!this.connected) {
                await this.connect();
            }
            
            // Return a promise that resolves when we receive the autoJoinConfirm
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Auto join timed out'));
                }, 5000);

                const checkAutoJoin = (event) => {
                    const message = JSON.parse(event.data);
                    if (message.type === 'autoJoinConfirm') {
                        clearTimeout(timeout);
                        this.ws.removeEventListener('message', checkAutoJoin);
                        this.currentRoom = message.roomCode;
                        resolve(message);
                    }
                };

                this.ws.addEventListener('message', checkAutoJoin);
                
                this.send({
                    type: 'autoJoin'
                });
            });
        } catch (error) {
            console.error('Failed to auto join:', error);
            throw error;
        }
    }

    async hostRoom() {
        if (!this.connected) {
            await this.connect();
        }

        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.send({
            type: 'host',
            roomCode: roomCode
        });
    }

    async joinRoom(roomCode) {
        if (!this.connected) {
            await this.connect();
        }

        this.send({
            type: 'join',
            roomCode: roomCode
        });
    }

    update(delta) {
        if (!this.connected || !this.currentRoom || !this.engine.playerManager.localPlayer) return;

        const now = performance.now();
        if (now - this.lastUpdateTime > this.updateInterval) {
            this.lastUpdateTime = now;
            this.sendPlayerUpdate();
        }
    }

    sendPlayerUpdate() {
        const player = this.engine.playerManager.localPlayer;
        if (!this.connected || !this.currentRoom || !player || !player.mesh) return;

        // Get the network update from the player which includes all necessary data
        const playerData = player.getNetworkUpdate();
        
        const update = {
            type: 'position',
            roomCode: this.currentRoom,
            id: this.localPlayerId,
            position: playerData.position,
            headPosition: playerData.headPosition,
            headRotation: playerData.headRotation,
            controllers: playerData.controllers
        };
        
        this.send(update);
    }

    send(data) {
        if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
            // Add room code to all messages if in a room
            if (this.currentRoom && !data.roomCode) {
                data.roomCode = this.currentRoom;
            }
            this.ws.send(JSON.stringify(data));
        }
    }
}
