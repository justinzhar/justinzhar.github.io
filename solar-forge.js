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

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000);
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
        blending: THREE.AdditiveBlending,
        depthWrite: false
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
        depthWrite: false,
        depthTest: false
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
        depthWrite: false,
        depthTest: false
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
        depthWrite: false,
        depthTest: false
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
    let isPendingExpand = false; // Pre-expand phase flag

    // Store the sun's original screen position for offset calculation
    let sunScreenPos = { x: 0, y: 0 };

    // Get hero content to combine with rings
    const heroContent = document.querySelector('.hero-content');
    const heroSection = document.querySelector('.hero');
    let expandedContainer = null;

    const calculateSunOffset = () => {
        const rect = container.getBoundingClientRect();
        // Sun center relative to viewport - captures exactly where sun is on screen
        sunScreenPos.x = ((rect.left + rect.width / 2) / window.innerWidth) * 2 - 1;
        sunScreenPos.y = -((rect.top + rect.height / 2) / window.innerHeight) * 2 + 1;
        console.log('[SolarForge] Sun position calculated:', sunScreenPos);
    };

    // Function to expand to fullscreen view
    const expandToFullscreen = () => {
        if (isExpanded) return;

        console.log('[SolarForge] Expanding to fullscreen view');
        isExpanded = true;
        hoverTarget = 1;
        calculateSunOffset();

        // Track scroll to update sun position
        const handleScroll = () => {
            calculateSunOffset();
        };
        window.addEventListener('scroll', handleScroll);

        // Create fullscreen container - transparent, behind page content
        expandedContainer = document.createElement('div');
        expandedContainer.id = 'solar-expanded';

        // Store scroll handler for cleanup
        expandedContainer._scrollHandler = handleScroll;

        expandedContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 0;
            background: transparent;
            overflow: hidden;
            pointer-events: none;
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
        canvas.style.pointerEvents = 'auto';

        // Add expanded container to body (at the beginning so it's behind content)
        document.body.insertBefore(expandedContainer, document.body.firstChild);

        // Make the hero section have a higher z-index so it stays on top
        if (heroSection) {
            heroSection.style.position = 'relative';
            heroSection.style.zIndex = '100';
            heroSection.style.background = 'transparent';
        }

        // Background layer is already created and fading in from pre-expand phase
        // Just ensure it's at full opacity now

        // Calculate the sun's center position on screen using the actual rendered position
        // sunScreenPos is in normalized coordinates (-1 to 1), convert to screen pixels
        const getSunCenter = () => {
            // Convert from normalized (-1 to 1) to screen coordinates
            const sunX = (sunScreenPos.x + 1) / 2 * window.innerWidth;
            const sunY = (1 - sunScreenPos.y) / 2 * window.innerHeight; // flip Y
            return { x: sunX, y: sunY };
        };

        // Core radius for hover detection (slightly larger than visual core)
        const coreRadius = 250;
        let hasEnteredCore = false; // Track if user has ever entered the core
        let wasInsideCore = false;

        // Track mouse movement on the DOCUMENT level (since hero section is above canvas)
        const handleDocumentMouseMove = (e) => {
            const sunCenter = getSunCenter();
            const dx = e.clientX - sunCenter.x;
            const dy = e.clientY - sunCenter.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const isInsideCore = distance < coreRadius;

            // First, track if user has entered the core at least once
            if (isInsideCore) {
                hasEnteredCore = true;
            }

            // Collapse if user has entered core once, then moved away
            if (hasEnteredCore && distance > coreRadius) {
                collapseExpanded();
            }
        };

        document.addEventListener('pointermove', handleDocumentMouseMove);

        // Store handler reference for cleanup
        expandedContainer._docMoveHandler = handleDocumentMouseMove;

        // Keep hero section visible - it's on top of the canvas now

        // Keep renderer transparent - CSS background layer handles the dark background with fade

        console.log('[SolarForge] Expanded container created');

        resize();

        // Set sun position immediately AFTER resize to use correct aspect ratio
        const fov = camera.fov * Math.PI / 180;
        const height = 2 * Math.tan(fov / 2) * camera.position.z;
        const width = height * camera.aspect;
        solarGroup.position.x = sunScreenPos.x * width / 2;
        solarGroup.position.y = sunScreenPos.y * height / 2;
    };

    // Expand when hovering the sun - start pre-expand phase with visible CSS growth
    container.addEventListener('pointerenter', () => {
        if (!isExpanded && !isPendingExpand) {
            isPendingExpand = true;
            hoverTarget = 1; // Start the 3D animation

            // Allow the sun to grow beyond container bounds
            container.style.overflow = 'visible';
            container.style.zIndex = '1000';

            // CSS scale the canvas for visible pre-expand growth
            canvas.style.transition = 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            canvas.style.transform = 'scale(2.5)';

            // Create and fade in background layer
            let bgLayer = document.getElementById('solar-bg-layer');
            if (!bgLayer) {
                bgLayer = document.createElement('div');
                bgLayer.id = 'solar-bg-layer';
                bgLayer.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: #0a0808;
                    z-index: -1;
                    opacity: 0;
                    transition: opacity 2.5s ease-out;
                    pointer-events: none;
                `;
                document.body.insertBefore(bgLayer, document.body.firstChild);
            }
            // Trigger fade-in after a frame
            requestAnimationFrame(() => {
                bgLayer.style.opacity = '1';
            });

            console.log('[SolarForge] Pre-expand phase started - CSS growth visible');
        }
    });

    // Function to collapse expanded view
    const collapseExpanded = () => {
        if (!isExpanded) return;

        isExpanded = false;
        hoverTarget = 0;
        pointerTarget.x = 0;
        pointerTarget.y = 0;

        // Start smooth fade-out of background
        const bgLayer = document.getElementById('solar-bg-layer');
        if (bgLayer) {
            bgLayer.style.transition = 'opacity 0.8s ease-out';
            bgLayer.style.opacity = '0';
        }

        // Move canvas back to original container immediately
        container.appendChild(canvas);

        // Remove expanded container and cleanup listeners
        if (expandedContainer) {
            if (expandedContainer._docMoveHandler) {
                document.removeEventListener('pointermove', expandedContainer._docMoveHandler);
            }
            if (expandedContainer._scrollHandler) {
                window.removeEventListener('scroll', expandedContainer._scrollHandler);
            }
            if (expandedContainer.parentNode) {
                expandedContainer.parentNode.removeChild(expandedContainer);
            }
            expandedContainer = null;
        }

        // Restore canvas styles immediately
        canvas.style.position = '';
        canvas.style.top = '';
        canvas.style.left = '';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '';
        canvas.style.pointerEvents = '';
        canvas.style.borderRadius = '50%';

        // Restore container styles
        container.style.overflow = '';
        container.style.zIndex = '';

        // Restore hero section visibility and styles
        if (heroSection) {
            heroSection.style.visibility = '';
            heroSection.style.position = '';
            heroSection.style.zIndex = '';
            heroSection.style.background = '';
        }

        // Restore transparent renderer
        renderer.setClearColor(0x000000, 0);

        resize();
        console.log('[SolarForge] Collapsed - canvas restored to container');

        // Remove background layer after fade completes
        setTimeout(() => {
            if (bgLayer && bgLayer.parentNode) {
                bgLayer.parentNode.removeChild(bgLayer);
            }
        }, 800);
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
        hover += (hoverTarget - hover) * 0.02; // Slowed down for visible growth animation

        // Threshold-based fullscreen: reset CSS transform first, then go fullscreen
        if (isPendingExpand && hover > 0.6) {
            isPendingExpand = false;
            // Reset CSS transform BEFORE going fullscreen to prevent position issues
            canvas.style.transition = '';
            canvas.style.transform = '';
            expandToFullscreen();
        }



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

        // Camera positioning - Deep space retreat to prevent ring clipping
        // We move the camera back significantly (Z=1000) when expanded
        // This prevents the massive rings from passing behind the camera plane
        camera.position.z = 4.6 + hover * 995.4;
        camera.updateProjectionMatrix();

        // Sun & Content Scaling - Balanced for a "usual" visual footprint
        // 170x scale keeps the core centered and professional without being massive
        const compensatesScale = 1 + hover * 169;
        solarGroup.scale.setScalar(compensatesScale);

        // RINGS expand massively to fill viewport
        // 40x scale ensures they still feel tuff and expansive around the re-balanced core
        const ringScale = 1 + hover * 39;
        ringGroup.scale.setScalar(ringScale);

        // Debug log every second
        if (Math.floor(elapsed) !== Math.floor(elapsed - delta) && hover > 0.1) {
            console.log('[SolarForge] Animate:', {
                hover: hover.toFixed(2),
                solarScale: compensatesScale.toFixed(2),
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
        } else if (!isExpanded) {
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
            const distance = 2000 + Math.random() * 2000;
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
