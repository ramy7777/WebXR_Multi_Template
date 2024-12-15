import { Engine } from './core/Engine.js';

async function checkVRSupport() {
    const vrStatus = document.getElementById('vrStatus');
    
    try {
        if (!navigator.xr) {
            throw new Error('WebXR not available');
        }

        // Check if VR is supported
        const isSupported = await navigator.xr.isSessionSupported('immersive-vr');
        if (!isSupported) {
            throw new Error('VR not supported');
        }

        vrStatus.className = 'success';
        vrStatus.textContent = 'VR Ready - Click "Enter VR" to begin';
        return true;
    } catch (err) {
        console.error('VR Support check failed:', err);
        vrStatus.className = 'error';
        vrStatus.textContent = `VR Error: ${err.message}`;
        return false;
    }
}

// Start the application
async function init() {
    await checkVRSupport();
    const engine = new Engine();
    engine.start();

    // Add error handler for XR session errors
    window.addEventListener('vrdisplayactivate', () => {
        console.log('VR Display Activated');
    });

    window.addEventListener('vrdisplaydeactivate', () => {
        console.log('VR Display Deactivated');
    });

    window.addEventListener('vrdisplayconnect', () => {
        console.log('VR Display Connected');
        checkVRSupport();
    });

    window.addEventListener('vrdisplaydisconnect', () => {
        console.log('VR Display Disconnected');
        checkVRSupport();
    });
}

// Initialize when the page loads
init().catch(console.error);
