import * as THREE from 'three';

export class VoiceManager {
    constructor(engine) {
        this.engine = engine;
        this.isActive = false;
        this.stream = null;
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.micToggleButton = null;
        this.visualizer = null;
        this.peerConnections = new Map(); // playerId -> RTCPeerConnection
        this.audioElements = new Map(); // playerId -> HTMLAudioElement
        
        this.setupUI();
    }

    setupUI() {
        // Create mic toggle button
        this.micToggleButton = document.createElement('button');
        this.micToggleButton.innerHTML = '🎤';
        this.micToggleButton.style.position = 'fixed';
        this.micToggleButton.style.bottom = '20px';
        this.micToggleButton.style.right = '20px';
        this.micToggleButton.style.width = '50px';
        this.micToggleButton.style.height = '50px';
        this.micToggleButton.style.borderRadius = '25px';
        this.micToggleButton.style.border = 'none';
        this.micToggleButton.style.backgroundColor = '#444';
        this.micToggleButton.style.color = 'white';
        this.micToggleButton.style.fontSize = '24px';
        this.micToggleButton.style.cursor = 'pointer';
        this.micToggleButton.style.zIndex = '1000';
        this.micToggleButton.title = 'Toggle Voice Chat';
        
        // Create audio visualizer
        this.visualizer = document.createElement('canvas');
        this.visualizer.style.position = 'fixed';
        this.visualizer.style.bottom = '80px';
        this.visualizer.style.right = '20px';
        this.visualizer.style.width = '50px';
        this.visualizer.style.height = '100px';
        this.visualizer.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        this.visualizer.style.borderRadius = '5px';
        
        document.body.appendChild(this.micToggleButton);
        document.body.appendChild(this.visualizer);
        
        this.micToggleButton.addEventListener('click', () => this.toggleMicrophone());
    }

    async toggleMicrophone() {
        if (!this.isActive) {
            // Check if we're in a session
            if (!this.engine.networkManager.currentRoom) {
                console.warn('[MIC] Cannot start voice chat - not in a session');
                return;
            }

            try {
                console.log('[MIC] Starting voice chat...');
                
                this.stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });

                // Initialize audio analyzer
                this.audioContext = new AudioContext();
                const source = this.audioContext.createMediaStreamSource(this.stream);
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = 32;
                source.connect(this.analyser);
                this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

                this.isActive = true;
                this.micToggleButton.style.backgroundColor = 'green';
                
                // Get list of other players in the room
                const otherPlayers = Array.from(this.engine.playerManager.players.keys())
                    .filter(id => id !== this.engine.networkManager.localPlayerId);
                
                console.log('[MIC] Other players in room:', otherPlayers);
                
                // Create peer connections for each player
                for (const playerId of otherPlayers) {
                    this.createPeerConnection(playerId);
                }
                
                this.engine.networkManager.send({
                    type: 'voice_ready',
                    playerId: this.engine.networkManager.localPlayerId,
                    roomCode: this.engine.networkManager.currentRoom
                });
                
                this.startVisualization();
            } catch (error) {
                console.error('[MIC] Error accessing microphone:', error);
                this.micToggleButton.style.backgroundColor = 'red';
            }
        } else {
            this.isActive = false;
            this.micToggleButton.style.backgroundColor = '';
            
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
            }
            
            // Clean up audio context and analyzer
            if (this.audioContext) {
                this.audioContext.close();
                this.audioContext = null;
                this.analyser = null;
                this.dataArray = null;
            }
            
            // Close all peer connections
            for (const [playerId, pc] of this.peerConnections) {
                pc.close();
            }
            this.peerConnections.clear();
            
            this.engine.networkManager.send({
                type: 'voice_stop',
                playerId: this.engine.networkManager.localPlayerId
            });
        }
    }

    startVisualization() {
        const ctx = this.visualizer.getContext('2d');
        const width = this.visualizer.width;
        const height = this.visualizer.height;
        
        const draw = () => {
            if (!this.isActive) return;
            
            requestAnimationFrame(draw);
            this.analyser.getByteFrequencyData(this.dataArray);
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, width, height);
            
            const barWidth = width / this.dataArray.length;
            
            for (let i = 0; i < this.dataArray.length; i++) {
                const barHeight = (this.dataArray[i] / 255) * height;
                const x = i * barWidth;
                const y = height - barHeight;
                
                ctx.fillStyle = `hsl(${(i * 360) / this.dataArray.length}, 100%, 50%)`;
                ctx.fillRect(x, y, barWidth - 1, barHeight);
            }
        };
        
        draw();
    }

    createPeerConnection(playerId) {
        if (this.peerConnections.has(playerId)) {
            console.log('[MIC] Peer connection already exists for player', playerId);
            return this.peerConnections.get(playerId);
        }

        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });
        this.peerConnections.set(playerId, pc);

        // Add local stream
        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                pc.addTrack(track, this.stream);
            });
        }

        // Handle incoming tracks
        pc.ontrack = (event) => {
            console.log('[MIC] Received remote track from player', playerId);
            let audioElement = this.audioElements.get(playerId);
            
            if (!audioElement) {
                audioElement = new Audio();
                audioElement.autoplay = true;
                this.audioElements.set(playerId, audioElement);
            }
            
            // Remove any existing streams
            if (audioElement.srcObject) {
                const tracks = audioElement.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            }
            
            audioElement.srcObject = event.streams[0];
            audioElement.play().catch(error => console.error('[MIC] Error playing audio:', error));
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.engine.networkManager.send({
                    type: 'voice_ice_candidate',
                    playerId: this.engine.networkManager.localPlayerId,
                    targetId: playerId,
                    candidate: event.candidate
                });
            }
        };

        pc.onconnectionstatechange = () => {
            console.log('[MIC] Connection state change:', pc.connectionState, 'with player', playerId);
        };

        return pc;
    }

    async handleVoiceReady(playerId) {
        if (playerId === this.engine.networkManager.localPlayerId) return;
        
        try {
            const pc = this.createPeerConnection(playerId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            this.engine.networkManager.send({
                type: 'voice_offer',
                playerId: this.engine.networkManager.localPlayerId,
                targetId: playerId,
                offer: offer,
                roomCode: this.engine.networkManager.currentRoom
            });
        } catch (error) {
            console.error('[MIC] Error creating offer:', error);
        }
    }

    async handleVoiceOffer(playerId, offer) {
        try {
            const pc = this.createPeerConnection(playerId);
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            this.engine.networkManager.send({
                type: 'voice_answer',
                playerId: this.engine.networkManager.localPlayerId,
                targetId: playerId,
                answer: answer,
                roomCode: this.engine.networkManager.currentRoom
            });
        } catch (error) {
            console.error('[MIC] Error handling offer:', error);
        }
    }

    async handleVoiceAnswer(playerId, answer) {
        try {
            const pc = this.peerConnections.get(playerId);
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
            }
        } catch (error) {
            console.error('[MIC] Error handling answer:', error);
        }
    }

    async handleVoiceIceCandidate(playerId, candidate) {
        try {
            const pc = this.peerConnections.get(playerId);
            if (pc) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
        } catch (error) {
            console.error('[MIC] Error handling ICE candidate:', error);
        }
    }

    handleVoiceStop(playerId) {
        const pc = this.peerConnections.get(playerId);
        if (pc) {
            pc.close();
            this.peerConnections.delete(playerId);
            console.log('[MIC] Closed connection with player', playerId);
        }
    }
}
