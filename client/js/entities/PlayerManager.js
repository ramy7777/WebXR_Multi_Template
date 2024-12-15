import { Player } from './Player.js';

export class PlayerManager {
    constructor(engine) {
        this.engine = engine;
        this.players = new Map();
        this.localPlayer = null;
    }

    createLocalPlayer() {
        const id = this.engine.networkManager.localPlayerId;
        this.localPlayer = new Player(this.engine, id, true);
        this.players.set(id, this.localPlayer);
        return this.localPlayer;
    }

    addPlayer(id) {
        if (!this.players.has(id)) {
            const player = new Player(this.engine, id, false);
            this.players.set(id, player);
            return player;
        }
        return this.players.get(id);
    }

    removePlayer(id) {
        const player = this.players.get(id);
        if (player) {
            player.cleanup();
            this.players.delete(id);
        }
    }

    updatePlayer(id, data) {
        const player = this.players.get(id);
        if (player) {
            player.updateFromNetwork(data);
        }
    }

    update(delta, frame) {
        // Update all players
        for (const player of this.players.values()) {
            player.update(delta, frame);
        }

        // Send local player update to network
        if (this.localPlayer && this.engine.networkManager) {
            this.engine.networkManager.sendPlayerUpdate();
        }
    }
}
