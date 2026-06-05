// 1. Hero Face Mesh Canvas Animation
const canvas = document.getElementById('faceMeshCanvas');
const ctx = canvas.getContext('2d');

let useWebcam = false;
let webcamStream = null;
let activeCamera = null;
let activeFaceMesh = null;

let width = canvas.width = canvas.parentElement.clientWidth;
let height = canvas.height = canvas.parentElement.clientHeight;

// Handle resize
window.addEventListener('resize', () => {
    width = canvas.width = canvas.parentElement.clientWidth;
    height = canvas.height = canvas.parentElement.clientHeight;
    initFacePoints();
});

let facePoints = [];
let connections = [];

// Base structures of a simulated face mesh
function initFacePoints() {
    facePoints = [];
    connections = [];

    // Main landmarks: forehead, eyes, nose, mouth, jawline
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Grid coordinate coordinates (relative to center)
    const pointsData = [
        { id: 0, rx: 0, ry: -90 },   // Forehead top
        { id: 1, rx: -50, ry: -60 }, // Forehead left
        { id: 2, rx: 50, ry: -60 },  // Forehead right
        
        { id: 3, rx: -30, ry: -25 }, // Left eye
        { id: 4, rx: 30, ry: -25 },  // Right eye
        
        { id: 5, rx: 0, ry: -10 },   // Nose bridge top
        { id: 6, rx: 0, ry: 20 },    // Nose tip
        { id: 7, rx: -15, ry: 25 },  // Nose left
        { id: 8, rx: 15, ry: 25 },   // Nose right
        
        { id: 9, rx: -35, ry: 50 },  // Mouth left
        { id: 10, rx: 35, ry: 50 },  // Mouth right
        { id: 11, rx: 0, ry: 40 },   // Upper lip
        { id: 12, rx: 0, ry: 60 },   // Lower lip
        
        { id: 13, rx: -75, ry: 10 },  // Left cheek outer
        { id: 14, rx: 75, ry: 10 },   // Right cheek outer
        
        { id: 15, rx: 0, ry: 100 },   // Chin
        { id: 16, rx: -60, ry: 80 },  // Jaw left
        { id: 17, rx: 60, ry: 80 }    // Jaw right
    ];

    pointsData.forEach(p => {
        facePoints.push({
            id: p.id,
            x: centerX + p.rx,
            y: centerY + p.ry,
            baseX: centerX + p.rx,
            baseY: centerY + p.ry,
            vx: 0,
            vy: 0,
            depth: 1 - Math.abs(p.rx) / 150 // Depth factor (nose tip has high depth, outer cheek has low depth)
        });
    });

    // Mesh connections
    const connectionsData = [
        [0, 1], [0, 2], [1, 2],
        [1, 3], [2, 4], [3, 4],
        [3, 5], [4, 5], [5, 6],
        [6, 7], [6, 8], [7, 8],
        [7, 9], [8, 10],
        [9, 11], [10, 11], [9, 12], [10, 12],
        [1, 13], [13, 9], [2, 14], [14, 10],
        [13, 16], [14, 17],
        [16, 15], [17, 15], [12, 15]
    ];
    
    connectionsData.forEach(c => {
        connections.push({ from: c[0], to: c[1] });
    });
}

initFacePoints();

// Interactive cursor parallax variables
let mouseX = 0;
let mouseY = 0;
const parallaxStrength = 18;

document.getElementById('overview').addEventListener('mousemove', (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // Normalize coordinates (-1 to 1)
    mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
});

document.getElementById('overview').addEventListener('mouseleave', () => {
    mouseX = 0;
    mouseY = 0;
});

// Canvas Draw Loop
let frame = 0;
function animate() {
    if (useWebcam) {
        requestAnimationFrame(animate);
        return;
    }
    ctx.clearRect(0, 0, width, height);
    frame++;

    // Calculate current scanning line position
    const scanLine = document.querySelector('.scanner-line');
    const scanY = scanLine ? scanLine.offsetTop : 0;

    // Apply parallax and random sine wave animations to points
    facePoints.forEach(p => {
        // Micro-vibrations
        const timeFactor = frame * 0.03 + p.id;
        const offsetS = Math.sin(timeFactor) * 2;
        const offsetC = Math.cos(timeFactor) * 1.5;

        // Depth parallax: 3D face structure shifts nose tip more than cheeks
        const shiftX = mouseX * parallaxStrength * p.depth;
        const shiftY = mouseY * parallaxStrength * p.depth;

        p.x = p.baseX + shiftX + offsetS;
        p.y = p.baseY + shiftY + offsetC;
    });

    // Draw lines/mesh
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
    ctx.lineWidth = 1.2;
    connections.forEach(c => {
        const fromPt = facePoints.find(p => p.id === c.from);
        const toPt = facePoints.find(p => p.id === c.to);
        
        ctx.beginPath();
        ctx.moveTo(fromPt.x, fromPt.y);
        ctx.lineTo(toPt.x, toPt.y);
        ctx.stroke();
    });

    // Draw points
    facePoints.forEach(p => {
        // If the point is close to the scanning bar, highlight it in green!
        const isHighlight = Math.abs(p.y - scanY) < 15;
        
        ctx.fillStyle = isHighlight ? '#10b981' : '#3b82f6';
        ctx.shadowColor = isHighlight ? '#10b981' : '#3b82f6';
        ctx.shadowBlur = isHighlight ? 12 : 3;

        ctx.beginPath();
        ctx.arc(p.x, p.y, isHighlight ? 4.5 : 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0; // reset
    });

    requestAnimationFrame(animate);
}

animate();


// 2. Interactive Liveness Test Simulator Logic
const btnStartDemo = document.getElementById('btnStartDemo');
const screenSimulator = document.getElementById('screenSimulator');
const screenGlowLabel = document.getElementById('screenGlowLabel');
const pupil = document.getElementById('pupil');
const specularGlow = document.getElementById('specularGlow');
const statusText = document.getElementById('statusText');
const statusIndicator = document.getElementById('statusIndicator');
const metricGeometry = document.getElementById('metricGeometry');
const metricMatch = document.getElementById('metricMatch');
const progressBarFill = document.getElementById('progressBarFill');
const eyeWrapper = document.getElementById('eyeWrapper');

let demoActive = false;

btnStartDemo.addEventListener('click', () => {
    if (demoActive) return;
    demoActive = true;
    btnStartDemo.disabled = true;

    // Reset simulator UI
    statusText.innerText = "Scanning Eye...";
    statusIndicator.style.backgroundColor = '#f59e0b'; // Amber
    metricGeometry.innerText = "Analyzing Surface...";
    metricMatch.innerText = "0%";
    progressBarFill.style.width = "0%";
    progressBarFill.style.backgroundColor = '#3b82f6';

    let step = 0;
    
    // Cycle dynamic color glow grid
    const interval = setInterval(() => {
        if (step === 0) {
            // Emerald Green
            screenSimulator.style.backgroundColor = '#047857';
            screenGlowLabel.innerText = "Glow: Green";
            specularGlow.style.backgroundColor = '#6ee7b7';
            specularGlow.style.boxShadow = "0 0 12px #6ee7b7";
            metricMatch.innerText = "33%";
            progressBarFill.style.width = "33%";
            
            // Sim pupil micro-tremor
            pupil.style.transform = "translate(3px, -2px)";
        } else if (step === 1) {
            // Sapphire Blue
            screenSimulator.style.backgroundColor = '#1d4ed8';
            screenGlowLabel.innerText = "Glow: Blue";
            specularGlow.style.backgroundColor = '#93c5fd';
            specularGlow.style.boxShadow = "0 0 12px #93c5fd";
            metricMatch.innerText = "67%";
            progressBarFill.style.width = "67%";
            
            // Sim pupil micro-tremor
            pupil.style.transform = "translate(-2px, 3px)";
        } else if (step === 2) {
            // Ruby Red
            screenSimulator.style.backgroundColor = '#b91c1c';
            screenGlowLabel.innerText = "Glow: Red";
            specularGlow.style.backgroundColor = '#fca5a5';
            specularGlow.style.boxShadow = "0 0 12px #fca5a5";
            metricMatch.innerText = "100%";
            progressBarFill.style.width = "100%";
            
            // Sim pupil micro-tremor
            pupil.style.transform = "translate(1px, 1px)";
        } else if (step === 3) {
            // Complete
            clearInterval(interval);
            
            // Restore screen state
            screenSimulator.style.backgroundColor = '#f1f5f9';
            screenGlowLabel.innerText = "Verified";
            specularGlow.style.backgroundColor = '#ffffff';
            specularGlow.style.boxShadow = "0 0 8px rgba(255, 255, 255, 0.8)";
            pupil.style.transform = "translate(0px, 0px)";

            // Update parameters
            statusText.innerText = "Verification Success (107ms)";
            statusIndicator.style.backgroundColor = '#10b981'; // Green
            metricGeometry.innerText = "Convex 3D Cornea (Verified)";
            progressBarFill.style.backgroundColor = '#10b981';

            // Auto reset back to idle after 3.5 seconds
            setTimeout(() => {
                statusText.innerText = "System Ready";
                statusIndicator.style.backgroundColor = '#64748b'; // Gray
                metricGeometry.innerText = "Waiting...";
                metricMatch.innerText = "0%";
                progressBarFill.style.width = "0%";
                screenGlowLabel.innerText = "Idle";
                screenSimulator.style.backgroundColor = '#f1f5f9';
                btnStartDemo.disabled = false;
                demoActive = false;
            }, 3500);
        }
        step++;
    }, 400); // 400ms steps to let the user visually inspect the changes
});

// 3. Live Webcam & MediaPipe Face Mesh Logic

const btnToggleCamera = document.getElementById('btnToggleCamera');
const webcamVideo = document.getElementById('webcamVideo');

btnToggleCamera.addEventListener('click', async () => {
    if (useWebcam) {
        stopWebcam();
    } else {
        await startWebcam();
    }
});

function stopWebcam() {
    useWebcam = false;
    btnToggleCamera.innerText = "Enable Camera Scan";
    webcamVideo.style.display = 'none';
    
    if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
        webcamStream = null;
    }
    if (activeCamera) {
        activeCamera.stop();
        activeCamera = null;
    }
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
}

async function startWebcam() {
    try {
        btnToggleCamera.innerText = "Starting Camera...";
        
        webcamStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 640, facingMode: 'user' },
            audio: false
        });
        
        webcamVideo.srcObject = webcamStream;
        webcamVideo.style.display = 'block';
        useWebcam = true;
        btnToggleCamera.innerText = "Stop Camera Scan";

        // Initialize MediaPipe Face Mesh
        if (!activeFaceMesh) {
            activeFaceMesh = new FaceMesh({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
                }
            });

            activeFaceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: false,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            activeFaceMesh.onResults(onFaceMeshResults);
        }

        activeCamera = new Camera(webcamVideo, {
            onFrame: async () => {
                if (useWebcam) {
                    await activeFaceMesh.send({ image: webcamVideo });
                }
            },
            width: 480,
            height: 480
        });

        activeCamera.start();

    } catch (err) {
        console.error("Camera access failed:", err);
        alert("Camera access denied or failed to load. Falling back to simulation mode.");
        stopWebcam();
    }
}

// MediaPipe results handler
function onFaceMeshResults(results) {
    if (!useWebcam) return;
    
    ctx.clearRect(0, 0, width, height);
    
    // Draw the camera frame on canvas first
    ctx.drawImage(results.image, 0, 0, width, height);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        // Face detected!
        const landmarks = results.multiFaceLandmarks[0];
        
        // Draw connections using MediaPipe drawing utilities
        drawConnectors(ctx, landmarks, FACEMESH_TESSELATION, {
            color: 'rgba(37, 99, 235, 0.25)',
            lineWidth: 0.8
        });
        
        drawConnectors(ctx, landmarks, FACEMESH_RIGHT_EYE, {
            color: '#2563eb',
            lineWidth: 1.2
        });
        
        drawConnectors(ctx, landmarks, FACEMESH_LEFT_EYE, {
            color: '#2563eb',
            lineWidth: 1.2
        });

        drawConnectors(ctx, landmarks, FACEMESH_LIPS, {
            color: '#059669',
            lineWidth: 1.2
        });

        // Trigger active liveness indicators
        const leftEyeUpper = landmarks[159];
        const leftEyeLower = landmarks[145];
        const leftEyeDist = Math.hypot(leftEyeUpper.x - leftEyeLower.x, leftEyeUpper.y - leftEyeLower.y);
        
        // Check if eye is blinking (very rough estimate)
        if (leftEyeDist < 0.012) {
            document.querySelector('.scanner-line').style.background = 'linear-gradient(90deg, transparent, #10b981, transparent)';
            document.querySelector('.scanner-line').style.boxShadow = '0 0 15px #10b981';
        } else {
            document.querySelector('.scanner-line').style.background = 'linear-gradient(90deg, transparent, var(--accent-blue), transparent)';
            document.querySelector('.scanner-line').style.boxShadow = '0 0 8px var(--accent-blue-glow)';
        }
    }
}
