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
    const isHighDensity = window.devicePixelRatio > 1.6;
    const detailScale = isHighDensity ? 0.72 : 1;
    const particleCount = prefersReduced ? 200 : Math.floor((isCompact ? 350 : 650) * detailScale);
    const shardCount = prefersReduced ? 40 : Math.floor((isCompact ? 70 : 120) * detailScale);
    const starCount = prefersReduced ? 200 : Math.floor((isCompact ? 400 : 900) * (isHighDensity ? 0.62 : 1));
    const knotTubularSegments = Math.max(96, Math.floor(200 * detailScale));
    const knotRadialSegments = Math.max(10, Math.floor(16 * detailScale));
    const ringTubularSegments = Math.max(84, Math.floor(140 * detailScale));

    const container = canvas.parentElement;

    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: !isHighDensity,
        alpha: true,
        powerPreference: 'high-performance'
    });

    // Cap DPR a bit lower to avoid transition hitching on high-density displays (notably Retina Macs).
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
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
            new THREE.TorusKnotGeometry(
                1.8 + i * 0.25,
                0.055 + i * 0.01,
                knotTubularSegments,
                knotRadialSegments,
                2 + i,
                3
            ),
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
            new THREE.TorusGeometry(1.9 + i * 0.25, 0.02 + i * 0.01, knotRadialSegments, ringTubularSegments),
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
    let isCollapsing = false; // Prevent new expansions during collapse animation
    let bgLayer = null;
    const preExpandCanvasScale = 1.15;
    const preExpandScaleInMs = 480;
    const preExpandScaleOutMs = 430;
    const preExpandCancelBuffer = 64;
    const preExpandCancelDebounceMs = 130;
    let pendingOutsideSince = 0;

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
        canvas.style.transition = '';
        canvas.style.transform = '';
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

        // Core radius bands for stable collapse detection.
        // Use viewport-based values so desktop/mobile feel consistent.
        const viewportMin = Math.min(window.innerWidth, window.innerHeight);
        const coreEnterRadius = Math.max(120, viewportMin * 0.13);
        const coreExitRadius = Math.max(198, viewportMin * 0.225);
        let hasEnteredCore = false;
        const collapseArmTime = performance.now() + 360;

        // Track mouse movement on the DOCUMENT level
        const handleDocumentMouseMove = (e) => {
            if (!isExpanded) return; // Prevent repeated calls

            const sunCenter = getSunCenter();
            const dx = e.clientX - sunCenter.x;
            const dy = e.clientY - sunCenter.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const now = performance.now();

            if (distance <= coreEnterRadius) {
                hasEnteredCore = true;
            }

            if (now < collapseArmTime) return;

            if (hasEnteredCore && distance > coreExitRadius) {
                collapseExpanded();
            } else if (!hasEnteredCore && distance > coreExitRadius * 1.3) {
                collapseExpanded();
            }
        };

        // Escape key to collapse
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                console.log('[SolarForge] Escape pressed, collapsing');
                collapseExpanded();
            }
        };

        document.addEventListener('pointermove', handleDocumentMouseMove);
        document.addEventListener('keydown', handleKeyDown);

        // Store handler references for cleanup
        expandedContainer._docMoveHandler = handleDocumentMouseMove;
        expandedContainer._keyHandler = handleKeyDown;

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

    const ensureBgLayer = () => {
        if (!bgLayer) {
            bgLayer = document.getElementById('solar-bg-layer');
        }
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
        return bgLayer;
    };

    const startPreExpand = () => {
        if (isExpanded || isPendingExpand || isCollapsing) return;
        isPendingExpand = true;
        pendingOutsideSince = 0;
        hoverTarget = 1; // Start the 3D animation

        // Allow the sun to grow beyond container bounds
        container.style.overflow = 'visible';
        container.style.zIndex = '1000';
        canvas.style.transition = `transform ${preExpandScaleInMs}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        canvas.style.transform = `scale(${preExpandCanvasScale})`;

        const layer = ensureBgLayer();
        requestAnimationFrame(() => {
            layer.style.opacity = '1';
        });

        console.log('[SolarForge] Pre-expand phase started');
    };

    const cancelPreExpand = () => {
        if (!isPendingExpand || isExpanded) return;
        isPendingExpand = false;
        pendingOutsideSince = 0;
        hoverTarget = 0;

        canvas.style.transition = `transform ${preExpandScaleOutMs}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        canvas.style.transform = 'scale(1)';

        if (bgLayer) {
            bgLayer.style.transition = 'opacity 0.6s ease-out';
            bgLayer.style.opacity = '0';
            const layerToRemove = bgLayer;
            bgLayer = null;
            setTimeout(() => {
                if (layerToRemove.parentNode) {
                    layerToRemove.parentNode.removeChild(layerToRemove);
                }
            }, 650);
        }

        setTimeout(() => {
            if (!isPendingExpand && !isExpanded && !isCollapsing) {
                canvas.style.transition = '';
                canvas.style.transform = '';
                container.style.overflow = '';
                container.style.zIndex = '';
            }
        }, preExpandScaleOutMs);

        console.log('[SolarForge] Pre-expand cancelled');
    };

    const pointerWithinPreExpandVisual = (clientX, clientY, extraRadius = 0) => {
        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width * 0.5;
        const centerY = rect.top + rect.height * 0.5;
        const radius = (Math.max(rect.width, rect.height) * 0.5 * preExpandCanvasScale) + 22 + extraRadius;
        const dx = clientX - centerX;
        const dy = clientY - centerY;
        return (dx * dx + dy * dy) <= (radius * radius);
    };

    // Expand when hovering the sun.
    container.addEventListener('pointerenter', startPreExpand);
    container.addEventListener('pointermove', () => {
        if (!isExpanded && !isPendingExpand && !isCollapsing) {
            startPreExpand();
        }
    });
    document.addEventListener('pointermove', (event) => {
        if (!isPendingExpand || isExpanded || isCollapsing) return;
        if (pointerWithinPreExpandVisual(event.clientX, event.clientY, preExpandCancelBuffer)) {
            pendingOutsideSince = 0;
            return;
        }

        if (pendingOutsideSince === 0) {
            pendingOutsideSince = performance.now();
            return;
        }

        if ((performance.now() - pendingOutsideSince) >= preExpandCancelDebounceMs) {
            cancelPreExpand();
        }
    });

    // Function to collapse expanded view - immediate return with visible shrink
    const collapseExpanded = () => {
        if (!isExpanded || isCollapsing) return;

        console.log('[SolarForge] Collapse started - immediate return');
        isCollapsing = true;
        isPendingExpand = false;
        isExpanded = false; // Snap 3D logic back immediately to prevent drift
        hoverTarget = 0;
        pointerTarget.x = 0;
        pointerTarget.y = 0;

        // Move canvas back to original container immediately
        container.appendChild(canvas);

        // Allow sun to shrink beyond container bounds (visible)
        container.style.overflow = 'visible';
        container.style.zIndex = '1000';

        // Reset canvas styles to the stage defaults
        canvas.style.position = '';
        canvas.style.top = '';
        canvas.style.left = '';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '';
        canvas.style.pointerEvents = '';
        canvas.style.borderRadius = '50%';
        canvas.style.transition = 'none';
        canvas.style.transform = `scale(${preExpandCanvasScale})`;
        requestAnimationFrame(() => {
            canvas.style.transition = `transform ${preExpandScaleOutMs}ms cubic-bezier(0.4, 0, 0.2, 1)`;
            canvas.style.transform = 'scale(1)';
        });

        // Fade out background
        const layerToFade = bgLayer || document.getElementById('solar-bg-layer');
        if (layerToFade) {
            layerToFade.style.transition = 'opacity 0.8s ease-out';
            layerToFade.style.opacity = '0';
        }

        // Restore hero section visibility immediately 
        if (heroSection) {
            heroSection.style.visibility = '';
            heroSection.style.position = '';
            heroSection.style.zIndex = '';
            heroSection.style.background = '';
        }

        // Remove event listeners
        if (expandedContainer) {
            if (expandedContainer._docMoveHandler) {
                document.removeEventListener('pointermove', expandedContainer._docMoveHandler);
            }
            if (expandedContainer._keyHandler) {
                document.removeEventListener('keydown', expandedContainer._keyHandler);
            }
            if (expandedContainer._scrollHandler) {
                window.removeEventListener('scroll', expandedContainer._scrollHandler);
            }

            // Remove expanded container
            if (expandedContainer.parentNode) {
                expandedContainer.parentNode.removeChild(expandedContainer);
            }
            expandedContainer = null;
        }

        // Restore transparent renderer
        renderer.setClearColor(0x000000, 0);
        solarGroup.position.set(0, 0, 0);
        resize();

        // Final cleanup after animation completes
        setTimeout(() => {
            canvas.style.transition = '';
            canvas.style.transform = '';
            container.style.overflow = '';
            container.style.zIndex = '';

            if (layerToFade && layerToFade.parentNode) {
                layerToFade.parentNode.removeChild(layerToFade);
            }
            if (bgLayer === layerToFade) {
                bgLayer = null;
            }

            isCollapsing = false;
            console.log('[SolarForge] Collapse complete');
        }, 800);
    };

    container.addEventListener('pointerleave', () => {
        // No-op: pre-expand cancellation is handled by debounced document pointer tracking.
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
        const hoverLerp = 1 - Math.exp(-4.2 * delta);
        hover += (hoverTarget - hover) * hoverLerp;
        const easedHover = hover * hover * (3 - 2 * hover);

        // Enter fullscreen once the hover transition has ramped up.
        if (isPendingExpand && hover > 0.6) {
            isPendingExpand = false;
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
        camera.position.z = 4.6 + easedHover * 995.4;

        // Keep expanded core at a consistent on-screen diameter across OS/browser/viewport setups.
        const fov = camera.fov * Math.PI / 180;
        const viewportHeight = Math.max(1, renderer.domElement.clientHeight || window.innerHeight);
        const viewportWidth = Math.max(1, renderer.domElement.clientWidth || window.innerWidth);
        const viewportMin = Math.min(viewportWidth, viewportHeight);
        const stageBaseSize = Math.max(container.clientWidth, container.clientHeight, 320);
        const targetCoreDiameterPx = THREE.MathUtils.clamp(
            stageBaseSize * 1.12,
            360,
            viewportMin * 0.58
        );
        const targetCoreRadiusPx = targetCoreDiameterPx * 0.5;
        const focalLengthPx = (viewportHeight * 0.5) / Math.tan(fov * 0.5);
        const coreRadiusWorld = 0.9;
        const expandedSolarScale = (targetCoreRadiusPx * camera.position.z) / (coreRadiusWorld * focalLengthPx);
        const stableExpandedScale = Math.max(expandedSolarScale, 170);
        const compensatesScale = THREE.MathUtils.lerp(1, stableExpandedScale, easedHover);
        solarGroup.scale.setScalar(compensatesScale);

        // RINGS expand massively to fill viewport
        // 40x scale ensures they still feel tuff and expansive around the re-balanced core
        const ringScale = 1 + easedHover * 39;
        ringGroup.scale.setScalar(ringScale);

        // Everything else stays mostly the same size
        belt.scale.setScalar(1 + easedHover * 0.2);
        core.scale.setScalar(1 + easedHover * 0.03);
        ribbonGroup.scale.setScalar(1 + easedHover * 0.08);

        // Position the sun at its original screen location when expanded
        // This keeps the sun visually in place while rings extend across viewport
        if (isExpanded && easedHover > 0.01) {
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
