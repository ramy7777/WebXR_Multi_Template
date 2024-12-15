import { Player } from './entities/Player.js';

export class PlayerManager {
    constructor(scene, modelLoader, networkManager) {
        this.scene = scene;
        this.modelLoader = modelLoader;
        this.networkManager = networkManager;
        this.players = new Map();
    }

    createLocalPlayer() {
        const localPlayer = new Player(true, this.modelLoader, this.networkManager);
        this.players.set(this.networkManager.id, localPlayer);
        this.scene.add(localPlayer);
        console.log('[PlayerManager] Created local player:', localPlayer);
        return localPlayer;
    }

    addPlayer(id) {
        if (!this.players.has(id)) {
            const player = new Player(false, this.modelLoader, this.networkManager);
            this.players.set(id, player);
            this.scene.add(player);
            console.log('[PlayerManager] Added network player:', { id, player });
            return player;
        }
        return this.players.get(id);
    }

    removePlayer(id) {
        const player = this.players.get(id);
        if (player) {
            this.scene.remove(player);
            this.players.delete(id);
            console.log('[PlayerManager] Removed player:', id);
        }
    }

    getPlayer(id) {
        return this.players.get(id);
    }

    getLocalPlayer() {
        return this.players.get(this.networkManager.id);
    }

    update(frame, referenceSpace) {
        for (const player of this.players.values()) {
            player.update(frame, referenceSpace);
        }
    }
}
