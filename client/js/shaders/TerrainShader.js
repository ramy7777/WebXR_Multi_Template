export const TerrainShader = {
    uniforms: {
        time: { value: 0 },
        fadeEdgeStart: { value: 0.7 },
        tileScale: { value: 8.0 },
        gridLineWidth: { value: 0.03 }
    },

    vertexShader: /* glsl */`
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
            vUv = uv;
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,

    fragmentShader: /* glsl */`
        uniform float time;
        uniform float fadeEdgeStart;
        uniform float tileScale;
        uniform float gridLineWidth;
        
        varying vec2 vUv;
        varying vec3 vPosition;

        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        void main() {
            // Create tile pattern
            vec2 tilePos = fract(vUv * tileScale);
            vec2 gridLines = smoothstep(0.0, gridLineWidth, tilePos) * 
                            smoothstep(0.0, gridLineWidth, 1.0 - tilePos);
            float grid = gridLines.x * gridLines.y;

            // Add some variation to tiles
            vec2 tileId = floor(vUv * tileScale);
            float tileRandom = random(tileId);
            float tilePattern = mix(0.2, 0.4, tileRandom);

            // Create edge fade
            float distanceFromCenter = length(vPosition.xz) / 20.0;
            float edgeFade = 1.0 - smoothstep(fadeEdgeStart, 1.0, distanceFromCenter);

            // Combine patterns
            float pattern = mix(tilePattern, 1.0, grid);
            
            // Add subtle animation
            float animation = sin(time * 0.5 + tileRandom * 6.28) * 0.1 + 0.9;

            // Final color
            vec3 color = vec3(0.1) * pattern * animation;
            float alpha = edgeFade;

            gl_FragColor = vec4(color, alpha);
        }
    `
};
