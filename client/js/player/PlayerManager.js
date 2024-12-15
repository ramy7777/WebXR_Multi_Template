import { Player } from './Player.js';

export class PlayerManager {
    constructor(engine) {
        this.engine = engine;
        this.players = new Map();
        this.localPlayer = null;
    }

    createLocalPlayer() {
        if (this.localPlayer) return; // Don't create if already exists
        
        console.log('Creating local player');
        this.localPlayer = new Player(this.engine, 'temp-id', true);
        this.players.set('temp-id', this.localPlayer);
    }

    addPlayer(id) {
        if (!this.players.has(id)) {
            console.log('Adding remote player:', id);
            const player = new Player(this.engine, id, false);
            this.players.set(id, player);
            return player;
        }
        return this.players.get(id);
    }

    removePlayer(id) {
        const player = this.players.get(id);
        if (player) {
            console.log('Removing player:', id);
            if (player.group) {
                this.engine.scene.remove(player.group);
            }
            this.players.delete(id);
        }
    }

    updatePlayer(id, data) {
        const player = this.players.get(id);
        if (player && !player.isLocal) {
            player.updateFromNetwork(data);
        }
    }

    handlePlayerInteraction(id, data) {
        const player = this.players.get(id);
        if (player) {
            player.handleInteraction(data);
        }
    }

    update(delta, frame) {
        // Update all players
        for (const player of this.players.values()) {
            if (player && player.update) {
                player.update(delta, frame);
            }
        }
    }
}
