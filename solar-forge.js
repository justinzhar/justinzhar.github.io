(() => {
    const canvas = document.getElementById('solarCanvas');
    if (!canvas) return;

    const root = document.documentElement;

    if (!window.THREE) {
        root.classList.add('no-webgl');
        return;
    }

    let glContext = null;
    try {
        glContext = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    } catch (error) {
        glContext = null;
    }

    if (!glContext) {
        root.classList.add('no-webgl');
        return;
    }

    root.classList.add('webgl-ready');

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
        root.classList.add('reduced-motion');
    }

    const isCompact = window.innerWidth < 768;
    const particleCount = prefersReduced ? 200 : (isCompact ? 350 : 650);
    const shardCount = prefersReduced ? 40 : (isCompact ? 70 : 120);
    const starCount = prefersReduced ? 200 : (isCompact ? 400 : 900);

    const container = canvas.parentElement;

    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 4.6);

    const ambient = new THREE.AmbientLight(0xffc89a, 0.35);
    const keyLight = new THREE.PointLight(0xffb464, 1.4, 20);
    keyLight.position.set(2.5, 2.5, 4);
    const rimLight = new THREE.PointLight(0xff6b6b, 1.1, 15);
    rimLight.position.set(-3, -2, -3);
    scene.add(ambient, keyLight, rimLight);

    const solarGroup = new THREE.Group();
    scene.add(solarGroup);

    const coreMaterial = new THREE.MeshStandardMaterial({
        color: 0xffc26b,
        emissive: 0xff7a3d,
        emissiveIntensity: 1.2,
        roughness: 0.35,
        metalness: 0.1
    });

    const core = new THREE.Mesh(new THREE.SphereGeometry(0.9, 64, 64), coreMaterial);
    solarGroup.add(core);

    const bloomMaterial = new THREE.MeshStandardMaterial({
        color: 0xffe3b1,
        emissive: 0xffc27a,
        emissiveIntensity: 0.7,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending
    });

    const bloom = new THREE.Mesh(new THREE.SphereGeometry(1.02, 32, 32), bloomMaterial);
    solarGroup.add(bloom);

    const coronaTexture = createGlowTexture(512, [
        'rgba(255, 186, 120, 0.95)',
        'rgba(255, 130, 90, 0.4)',
        'rgba(255, 130, 90, 0)'
    ]);

    const corona = new THREE.Sprite(new THREE.SpriteMaterial({
        map: coronaTexture,
        color: 0xffb061,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    }));
    corona.scale.set(4.5, 4.5, 1);
    solarGroup.add(corona);

    const ribbonGroup = new THREE.Group();
    const ribbonMaterial = new THREE.MeshStandardMaterial({
        color: 0xffa35f,
        emissive: 0xff6b3b,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    for (let i = 0; i < 3; i += 1) {
        const ribbon = new THREE.Mesh(
            new THREE.TorusKnotGeometry(1.8 + i * 0.25, 0.055 + i * 0.01, 200, 16, 2 + i, 3),
            ribbonMaterial.clone()
        );
        ribbon.rotation.set(Math.random() * Math.PI * 0.3, Math.random() * Math.PI, Math.random() * Math.PI * 0.3);
        ribbon.userData.spin = (Math.random() * 0.35 + 0.15) * (Math.random() > 0.5 ? 1 : -1);
        ribbonGroup.add(ribbon);
    }

    solarGroup.add(ribbonGroup);

    const ringGroup = new THREE.Group();
    const ringMaterial = new THREE.MeshStandardMaterial({
        color: 0xffb870,
        emissive: 0xff7a45,
        emissiveIntensity: 0.7,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const ringTilts = [
        { x: Math.PI * 0.15, y: 0, z: 0 },
        { x: Math.PI * 0.2, y: Math.PI * 0.3, z: Math.PI * 0.1 },
        { x: Math.PI * 0.1, y: Math.PI * 0.5, z: Math.PI * 0.15 }
    ];

    for (let i = 0; i < 3; i += 1) {
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(1.9 + i * 0.25, 0.02 + i * 0.01, 16, 140),
            ringMaterial.clone()
        );
        const tilt = ringTilts[i];
        ring.rotation.set(tilt.x, tilt.y, tilt.z);
        ringGroup.add(ring);
    }

    solarGroup.add(ringGroup);

    const dotTexture = createDotTexture(64);
    const belt = createParticleBelt(dotTexture, particleCount);
    solarGroup.add(belt);

    const shardField = createShardField(shardCount);
    solarGroup.add(shardField.mesh);

    const stars = createStarField(starCount);
    scene.add(stars);

    const pointerTarget = { x: 0, y: 0 };
    const pointer = { x: 0, y: 0 };
    let hoverTarget = 0;
    let hover = 0;

    const updatePointer = (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
        pointerTarget.x = x;
        pointerTarget.y = y;
    };

    container.addEventListener('pointermove', updatePointer);

    let isExpanded = false;

    // Store the sun's original screen position for offset calculation
    let sunScreenPos = { x: 0, y: 0 };

    // Get hero content to combine with rings
    const heroContent = document.querySelector('.hero-content');
    const heroSection = document.querySelector('.hero');
    let expandedContainer = null;

    const calculateSunOffset = () => {
        const rect = container.getBoundingClientRect();
        // Sun center relative to viewport (normalized -1 to 1)
        sunScreenPos.x = ((rect.left + rect.width / 2) / window.innerWidth) * 2 - 1;
        sunScreenPos.y = -((rect.top + rect.height / 2) / window.innerHeight) * 2 + 1;
        console.log('[SolarForge] Sun position calculated:', sunScreenPos);
    };

    container.addEventListener('pointerenter', () => {
        console.log('[SolarForge] pointerenter - isExpanded:', isExpanded);
        hoverTarget = 1;
        if (!isExpanded) {
            isExpanded = true;
            calculateSunOffset();

            // Create fullscreen container that holds BOTH canvas and hero content
            expandedContainer = document.createElement('div');
            expandedContainer.id = 'solar-expanded';
            expandedContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: 9999;
                background: #0a0808;
                overflow: hidden;
            `;

            // Move canvas into expanded container
            expandedContainer.appendChild(canvas);
            canvas.style.position = 'absolute';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.zIndex = '1';
            canvas.style.borderRadius = '0';

            // Clone hero content into expanded container (positioned over canvas)
            if (heroContent) {
                const heroClone = heroContent.cloneNode(true);
                heroClone.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50px;
                    transform: translateY(-50%);
                    z-index: 10;
                    max-width: 600px;
                `;
                expandedContainer.appendChild(heroClone);
            }

            // Add exit circle button
            const exitCircle = document.createElement('div');
            exitCircle.style.cssText = `
                position: absolute;
                top: 20px;
                right: 20px;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: rgba(255, 159, 67, 0.2);
                border: 2px solid rgba(255, 159, 67, 0.5);
                cursor: pointer;
                z-index: 100;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                color: #ff9f43;
                transition: all 0.3s ease;
            `;
            exitCircle.innerHTML = '×';
            exitCircle.addEventListener('click', () => {
                hoverTarget = 0;
                collapseExpanded();
            });
            exitCircle.addEventListener('mouseenter', () => {
                exitCircle.style.background = 'rgba(255, 159, 67, 0.4)';
            });
            exitCircle.addEventListener('mouseleave', () => {
                exitCircle.style.background = 'rgba(255, 159, 67, 0.2)';
            });
            expandedContainer.appendChild(exitCircle);

            // Add expanded container to body
            document.body.appendChild(expandedContainer);

            // Make renderer background visible (dark)
            renderer.setClearColor(0x0a0808, 1);

            console.log('[SolarForge] Expanded container created');

            resize();
        }
    });

    // Function to collapse expanded view
    const collapseExpanded = () => {
        if (!isExpanded) return;

        isExpanded = false;
        hoverTarget = 0;
        pointerTarget.x = 0;
        pointerTarget.y = 0;

        // Move canvas back to original container
        container.appendChild(canvas);

        // Remove expanded container
        if (expandedContainer && expandedContainer.parentNode) {
            expandedContainer.parentNode.removeChild(expandedContainer);
            expandedContainer = null;
        }

        // Restore canvas styles
        canvas.style.position = '';
        canvas.style.top = '';
        canvas.style.left = '';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '';
        canvas.style.pointerEvents = '';
        canvas.style.borderRadius = '50%';

        // Restore transparent renderer
        renderer.setClearColor(0x000000, 0);

        resize();
        console.log('[SolarForge] Collapsed - canvas restored to container');
    };

    container.addEventListener('pointerleave', () => {
        console.log('[SolarForge] pointerleave - isExpanded:', isExpanded);
        // Don't collapse on pointerleave since we moved to fullscreen container
        // User must click exit button to close
    });

    const resize = () => {
        let width, height;

        if (isExpanded) {
            width = window.innerWidth;
            height = window.innerHeight;
        } else {
            width = Math.max(1, container.clientWidth);
            height = Math.max(1, container.clientHeight);
        }

        renderer.setSize(width, height, true);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', resize);
    resize();

    const clock = new THREE.Clock();

    const animate = () => {
        const delta = clock.getDelta();
        const elapsed = clock.getElapsedTime();

        pointer.x += (pointerTarget.x - pointer.x) * 0.08;
        pointer.y += (pointerTarget.y - pointer.y) * 0.08;
        hover += (hoverTarget - hover) * 0.08;

        solarGroup.rotation.y += delta * (0.25 + hover * 0.3);
        solarGroup.rotation.x += (pointer.y * 0.4 - solarGroup.rotation.x) * 0.06;
        solarGroup.rotation.z += delta * 0.05;

        coreMaterial.emissiveIntensity = 1.15 + hover * 0.45 + Math.sin(elapsed * 2) * 0.08;
        bloomMaterial.opacity = 0.4 + hover * 0.15 + Math.sin(elapsed * 1.6) * 0.05;
        corona.material.opacity = 0.55 + hover * 0.3 + Math.sin(elapsed * 1.8) * 0.08;

        ribbonGroup.children.forEach((ribbon) => {
            ribbon.rotation.y += ribbon.userData.spin * delta;
            ribbon.rotation.x += ribbon.userData.spin * 0.5 * delta;
        });

        // Camera positioning
        camera.position.z = 4.6 + hover * 2.0;
        camera.updateProjectionMatrix();

        // RINGS expand massively to fill viewport from sun's offset position
        // Need 50x scale since sun is on right side of screen
        const ringScale = 1 + hover * 50;
        ringGroup.scale.setScalar(ringScale);

        // Debug log every second
        if (Math.floor(elapsed) !== Math.floor(elapsed - delta) && hover > 0.1) {
            console.log('[SolarForge] Animate:', {
                hover: hover.toFixed(2),
                ringScale: ringScale.toFixed(2),
                isExpanded,
                cameraZ: camera.position.z.toFixed(2)
            });
        }

        // Everything else stays mostly the same size
        belt.scale.setScalar(1 + hover * 0.2);
        core.scale.setScalar(1 + hover * 0.03);
        ribbonGroup.scale.setScalar(1 + hover * 0.08);

        // Position the sun at its original screen location when expanded
        // This keeps the sun visually in place while rings extend across viewport
        if (isExpanded && hover > 0.01) {
            // Convert screen position to world coordinates
            const fov = camera.fov * Math.PI / 180;
            const height = 2 * Math.tan(fov / 2) * camera.position.z;
            const width = height * camera.aspect;

            const worldX = sunScreenPos.x * width / 2;
            const worldY = sunScreenPos.y * height / 2;

            // Smoothly move to offset position
            const targetX = worldX;
            const targetY = worldY;
            solarGroup.position.x += (targetX - solarGroup.position.x) * 0.1;
            solarGroup.position.y += (targetY - solarGroup.position.y) * 0.1;
        } else {
            // Return to center when not expanded
            solarGroup.position.x += (0 - solarGroup.position.x) * 0.1;
            solarGroup.position.y += (0 - solarGroup.position.y) * 0.1;
        }
        solarGroup.position.z = 0;

        ringGroup.rotation.y += delta * (0.2 + hover * 0.15);
        ringGroup.rotation.z += delta * 0.08;

        updateShardField(shardField, elapsed);
        stars.rotation.y += delta * 0.02;

        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    };

    if (prefersReduced) {
        renderer.render(scene, camera);
    } else {
        animate();
    }

    function createGlowTexture(size, colors) {
        const glowCanvas = document.createElement('canvas');
        glowCanvas.width = size;
        glowCanvas.height = size;
        const context = glowCanvas.getContext('2d');
        const gradient = context.createRadialGradient(
            size / 2,
            size / 2,
            0,
            size / 2,
            size / 2,
            size / 2
        );
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(0.5, colors[1]);
        gradient.addColorStop(1, colors[2]);
        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);
        const texture = new THREE.CanvasTexture(glowCanvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }

    function createDotTexture(size) {
        const dotCanvas = document.createElement('canvas');
        dotCanvas.width = size;
        dotCanvas.height = size;
        const context = dotCanvas.getContext('2d');
        const gradient = context.createRadialGradient(
            size / 2,
            size / 2,
            0,
            size / 2,
            size / 2,
            size / 2
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);
        const texture = new THREE.CanvasTexture(dotCanvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }

    function createParticleBelt(texture, count) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        for (let i = 0; i < count; i += 1) {
            const major = 1.6 + Math.random() * 0.6;
            const minor = 0.05 + Math.random() * 0.18;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 2;

            const x = (major + minor * Math.cos(phi)) * Math.cos(theta);
            const y = minor * Math.sin(phi) * 0.8;
            const z = (major + minor * Math.cos(phi)) * Math.sin(theta);

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            const color = new THREE.Color();
            color.setHSL(0.08 + Math.random() * 0.05, 0.85, 0.6 + Math.random() * 0.2);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.045,
            map: texture,
            transparent: true,
            opacity: 0.85,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexColors: true
        });

        return new THREE.Points(geometry, material);
    }

    function createShardField(count) {
        const geometry = new THREE.IcosahedronGeometry(0.05, 0);
        const material = new THREE.MeshStandardMaterial({
            color: 0xffd1a1,
            emissive: 0xff8452,
            emissiveIntensity: 0.6,
            metalness: 0.8,
            roughness: 0.2,
            transparent: true,
            opacity: 0.9
        });

        const mesh = new THREE.InstancedMesh(geometry, material, count);
        const dummy = new THREE.Object3D();
        const items = [];

        for (let i = 0; i < count; i += 1) {
            const radius = 1.7 + Math.random() * 0.9;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const size = 0.04 + Math.random() * 0.06;
            const speed = 0.15 + Math.random() * 0.35;
            const wobble = Math.random() * Math.PI * 2;

            items.push({ radius, theta, phi, size, speed, wobble });
        }

        items.forEach((item, index) => {
            const position = toCartesian(item.radius, item.theta, item.phi);
            dummy.position.set(position.x, position.y, position.z);
            dummy.scale.setScalar(item.size);
            dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            dummy.updateMatrix();
            mesh.setMatrixAt(index, dummy.matrix);
        });

        mesh.instanceMatrix.needsUpdate = true;
        return { mesh, items, dummy };
    }

    function updateShardField(field, elapsed) {
        field.items.forEach((item, index) => {
            const drift = Math.sin(elapsed * 1.5 + item.wobble) * 0.08;
            item.theta += item.speed * 0.01;
            item.phi += item.speed * 0.004;

            const radius = item.radius + drift;
            const position = toCartesian(radius, item.theta, item.phi);
            field.dummy.position.set(position.x, position.y, position.z);
            field.dummy.rotation.set(
                elapsed * 0.3 + item.wobble,
                elapsed * 0.2 + item.wobble,
                elapsed * 0.15 + item.wobble
            );
            field.dummy.scale.setScalar(item.size);
            field.dummy.updateMatrix();
            field.mesh.setMatrixAt(index, field.dummy.matrix);
        });

        field.mesh.instanceMatrix.needsUpdate = true;
    }

    function createStarField(count) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);

        for (let i = 0; i < count; i += 1) {
            const distance = 6 + Math.random() * 8;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const position = toCartesian(distance, theta, phi);

            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            size: 0.03,
            color: 0xffffff,
            transparent: true,
            opacity: 0.45,
            depthWrite: false
        });

        return new THREE.Points(geometry, material);
    }

    function toCartesian(radius, theta, phi) {
        return {
            x: radius * Math.sin(phi) * Math.cos(theta),
            y: radius * Math.cos(phi),
            z: radius * Math.sin(phi) * Math.sin(theta)
        };
    }
})();
