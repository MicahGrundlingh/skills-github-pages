let scene, camera, renderer, player;
let score = 0;
let totalShots = 0;
let hits = 0;
const targets = [];
let velocity = new THREE.Vector3();
let mouseSensitivity = 0.002;
let currentSens = 100; // Sensitivity value 1-200

function createHUD() {
    // Create floating stats board
    const boardGroup = new THREE.Group();
    
    // Create larger panel for visibility
    const panelGeometry = new THREE.PlaneGeometry(2, 1.2);
    const panelMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    
    // Create text display
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 256;
    const texture = new THREE.CanvasTexture(canvas);
    
    const textMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const textGeometry = new THREE.PlaneGeometry(1.8, 1);
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.z = 0.01;
    
    panel.add(textMesh);
    boardGroup.add(panel);
    
    // Position board in world space
    boardGroup.position.set(3, 22, -3); // Above and to the right of platform
    boardGroup.rotation.y = -Math.PI / 4; // Angle towards player
    scene.add(boardGroup);
    
    function updateHUD() {
        context.fillStyle = '#000000';
        context.fillRect(0, 0, 512, 256);
        context.fillStyle = '#00ff00';
        context.font = '48px Arial';
        context.textAlign = 'center';
        context.fillText('ACCURACY STATS', 256, 50);
        context.font = '36px Arial';
        context.fillText(`Accuracy: ${((hits/totalShots || 0) * 100).toFixed(1)}%`, 256, 100);
        context.fillText(`Hits: ${hits}`, 256, 150);
        context.fillText(`Total Shots: ${totalShots}`, 256, 200);
        texture.needsUpdate = true;
    }
    
    return updateHUD;
}

function createSensitivityBoard() {
    const boardGroup = new THREE.Group();
    
    const panelGeometry = new THREE.PlaneGeometry(2, 1.2);
    const panelMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 256;
    const texture = new THREE.CanvasTexture(canvas);
    
    const textMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const textGeometry = new THREE.PlaneGeometry(1.8, 1);
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.z = 0.01;
    
    panel.add(textMesh);
    boardGroup.add(panel);
    
    // Position on opposite side from accuracy board
    boardGroup.position.set(-3, 22, -3);
    boardGroup.rotation.y = Math.PI / 4;
    scene.add(boardGroup);
    
    function updateSensitivityDisplay() {
        context.fillStyle = '#000000';
        context.fillRect(0, 0, 512, 256);
        context.fillStyle = '#00ff00';
        context.font = '48px Arial';
        context.textAlign = 'center';
        context.fillText('SENSITIVITY', 256, 50);
        context.font = '36px Arial';
        context.fillText(`${currentSens}%`, 256, 120);
        context.font = '24px Arial';
        context.fillText('↑ and ↓ to adjust', 256, 180);  // Updated control hint
        texture.needsUpdate = true;
    }
    
    return updateSensitivityDisplay;
}

function createWeapon() {
    const gunGroup = new THREE.Group();
    
    // Main body/slide
    const slideGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.5);
    const slideMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const slide = new THREE.Mesh(slideGeometry, slideMaterial);
    
    // Grip
    const gripGeometry = new THREE.BoxGeometry(0.15, 0.3, 0.15);
    const grip = new THREE.Mesh(gripGeometry, slideMaterial);
    grip.position.set(0, -0.2, 0.1);
    
    // Add barrel end point for bullet spawn
    const barrelTip = new THREE.Object3D();
    barrelTip.position.set(0, 0, -0.25); // Position at end of slide
    slide.add(barrelTip);
    gunGroup.userData.barrelTip = barrelTip; // Store reference
    
    // Add parts
    gunGroup.add(slide);
    gunGroup.add(grip);
    
    gunGroup.position.set(0.35, -0.3, -0.7);
    gunGroup.rotation.set(0, 0, 0);
    camera.add(gunGroup);
    
    return gunGroup;
}

function createPlatform() {
    // Create smaller platform higher in sky
    const platformGeometry = new THREE.BoxGeometry(10, 1, 10); // Smaller platform
    const platformMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x808080,
        metalness: 0.5,
        roughness: 0.5
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = 20; // Higher in sky
    
    // Add glowing edge effect
    const edgeGeometry = new THREE.BoxGeometry(10.2, 1.2, 10.2); // Match new size
    const edgeMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ff00,
        emissive: 0x00ff00,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.5
    });
    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge.position.copy(platform.position);
    
    scene.add(platform);
    scene.add(edge);
    return platform.position.y;
}

function createTargets() {
    // Only create one target initially
    createNewTarget();
}

function createNewTarget() {
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshPhongMaterial({ 
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.2
    });
    const target = new THREE.Mesh(geometry, material);
    
    // Position target in a more focused area against mountains
    const angle = (Math.random() - 0.5) * Math.PI / 3; // -30 to 30 degrees
    const height = Math.random() * 6 + 19; // Between platform level and 6 units above
    const distance = 25; // Fixed distance against mountains
    
    target.position.set(
        Math.sin(angle) * distance,
        height,
        -Math.cos(angle) * distance
    );
    
    targets.push(target);
    scene.add(target);
}

function createMountainLandscape() {
    const landscape = new THREE.Group();
    
    function createMountain(x, z, height, radius) {
        const geometry = new THREE.ConeGeometry(radius, height, 12);
        const material = new THREE.MeshPhongMaterial({
            color: 0x4a5568,
            flatShading: true
        });
        const mountain = new THREE.Mesh(geometry, material);
        mountain.position.set(x, height / 2 - 2, z);
        return mountain;
    }
    
    function createDistantTrees(x, z, count = 15) {
        const treeCluster = new THREE.Group();
        for (let i = 0; i < count; i++) {
            const height = 3 + Math.random() * 2;
            const geometry = new THREE.ConeGeometry(1, height, 8);
            const material = new THREE.MeshPhongMaterial({ 
                color: 0x1a472a,
                flatShading: true 
            });
            const tree = new THREE.Mesh(geometry, material);
            tree.position.set(
                x + Math.random() * 8 - 4,
                height / 2 - 2,
                z + Math.random() * 8 - 4
            );
            treeCluster.add(tree);
        }
        return treeCluster;
    }
    
    // Create mountains in a circle around platform
    for(let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2;
        const radius = 40;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const height = 35 + Math.random() * 15;
        
        landscape.add(createMountain(x, z, height, 12));
        
        // Add dense trees between mountains
        for(let j = 0; j < 3; j++) {
            const treeX = x * (0.8 + j * 0.1);
            const treeZ = z * (0.8 + j * 0.1);
            landscape.add(createDistantTrees(treeX, treeZ, 20));
        }
    }
    scene.add(landscape);
}

function init() {
    // Setup scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Adjust fog for mountain view
    scene.fog = new THREE.Fog(0x87CEEB, 30, 90); // Increased fog distance

    // Create ground plane
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x3d7c3a,
        side: THREE.DoubleSide 
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = Math.PI / 2;
    ground.position.y = -2;
    scene.add(ground);

    // Create platform and get its height
    const platformHeight = createPlatform();

    // Adjust player starting position to platform height
    player = new THREE.Object3D();
    player.position.set(0, platformHeight + 2, 0); // Start player on platform
    scene.add(player);
    player.add(camera);
    
    // Create weapon
    const weapon = createWeapon();

    // Add lighting
    const light = new THREE.AmbientLight(0xffffff);
    scene.add(light);

    // Enhance lighting for better gun materials
    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(0, 2, 1);
    camera.add(pointLight);
    
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    // Enhance lighting for mountains
    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(5, 10, 5);
    scene.add(sunLight);

    // Create targets
    createTargets();

    // Add mountain landscape instead of forest
    createMountainLandscape();

    // Create HUD displays
    const updateHUDDisplay = createHUD();
    const updateSensDisplay = createSensitivityBoard();
    
    // Store both update functions globally
    window.updateHUDDisplay = updateHUDDisplay;
    window.updateSensDisplay = updateSensDisplay;
    
    // Initial display update
    updateSensDisplay();
    
    // Add key listeners for sensitivity adjustment
    document.addEventListener('keydown', (event) => {
        switch(event.code) {
            case 'ArrowUp':
                currentSens = Math.min(200, currentSens + 10);
                mouseSensitivity = (currentSens / 100) * 0.002;
                updateSensDisplay();
                break;
            case 'ArrowDown':
                currentSens = Math.max(10, currentSens - 10);
                mouseSensitivity = (currentSens / 100) * 0.002;
                updateSensDisplay();
                break;
        }
    });

    // Event listeners
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('click', shoot);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    window.addEventListener('resize', onWindowResize);

    // Lock pointer
    renderer.domElement.addEventListener('click', () => {
        renderer.domElement.requestPointerLock();
    });
}

function onKeyDown(event) {
    // Remove all movement controls
}

function onKeyUp(event) {
    // Remove all movement controls
}

function onMouseMove(event) {
    if (document.pointerLockElement === renderer.domElement) {
        player.rotation.y -= event.movementX * mouseSensitivity;
        camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x - event.movementY * mouseSensitivity));
    }
}

function updatePlayer() {
    // Only keep camera rotation, remove movement
}

function shoot() {
    if (document.pointerLockElement === renderer.domElement) {
        totalShots++;
        const raycaster = new THREE.Raycaster();
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        raycaster.set(camera.getWorldPosition(new THREE.Vector3()), direction);
        
        const intersects = raycaster.intersectObjects(targets);
        if (intersects.length > 0) {
            hits++;
            const hitTarget = intersects[0].object;
            scene.remove(hitTarget);
            targets.splice(0, 1);
            score += 10;
            document.getElementById('scoreValue').textContent = score;
            // Spawn new target immediately
            createNewTarget();
        }
        window.updateHUDDisplay();
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onPointerLockChange() {
    if (document.pointerLockElement === renderer.domElement) {
        console.log('Pointer locked');
    } else {
        console.log('Pointer unlocked');
    }
}

function animate() {
    requestAnimationFrame(animate);
    updatePlayer();
    renderer.render(scene, camera);
}

init();
animate();
