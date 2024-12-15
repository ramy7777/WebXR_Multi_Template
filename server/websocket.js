const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

class WebSocketServer {
    constructor(server) {
        this.wss = new WebSocket.Server({ server });
        this.clients = new Map(); // Map to store client connections
        this.setupWebSocket();
    }

    setupWebSocket() {
        this.wss.on('connection', (ws) => {
            const clientId = uuidv4();
            this.clients.set(ws, { 
                id: clientId, 
                position: null, 
                rotation: null,
                controllers: null 
            });

            console.log(`Client connected: ${clientId}`);

            // Send the client their ID
            ws.send(JSON.stringify({
                type: 'init',
                id: clientId
            }));

            // Send existing players to the new client
            const players = Array.from(this.clients.values())
                .filter(client => client.id !== clientId)
                .map(client => ({
                    id: client.id,
                    position: client.position,
                    rotation: client.rotation,
                    controllers: client.controllers
                }));

            ws.send(JSON.stringify({
                type: 'players',
                players
            }));

            // Broadcast new player to all other clients
            this.broadcast({
                type: 'playerJoined',
                id: clientId
            }, ws);

            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    const client = this.clients.get(ws);

                    switch (data.type) {
                        case 'position':
                            // Update client data
                            client.position = data.position;
                            client.rotation = data.rotation;
                            client.controllers = data.controllers;

                            // Broadcast position update to all other clients
                            this.broadcast({
                                type: 'position',
                                id: client.id,
                                position: data.position,
                                rotation: data.rotation,
                                controllers: data.controllers
                            }, ws);
                            break;

                        case 'interaction':
                            // Handle player interactions
                            this.broadcast({
                                type: 'interaction',
                                id: client.id,
                                data: data.data
                            }, ws);
                            break;
                    }
                } catch (error) {
                    console.error('Error processing message:', error);
                }
            });

            ws.on('close', () => {
                const client = this.clients.get(ws);
                console.log(`Client disconnected: ${client.id}`);
                
                // Broadcast player left to all other clients
                this.broadcast({
                    type: 'playerLeft',
                    id: client.id
                });
                
                this.clients.delete(ws);
            });
        });
    }

    broadcast(message, exclude = null) {
        this.wss.clients.forEach(client => {
            if (client !== exclude && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }
}

module.exports = WebSocketServer;
