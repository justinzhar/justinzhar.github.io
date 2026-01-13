// ============================================
// JUSTIN HARRIS PORTFOLIO - INTERACTIVE FEATURES
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all features
    initParticles();
    initTypingAnimation();
    initRoleRotation();
    initNavigation();
    initScrollAnimations();
    initCardTilt();
    initSkillBars();
    initCountUp();
    initContactForm();
});

// ============================================
// PARTICLE SYSTEM
// ============================================
function initParticles() {
    const container = document.getElementById('particles');
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
        createParticle(container);
    }
}

function createParticle(container) {
    const particle = document.createElement('div');
    particle.className = 'particle';

    // Random properties
    const size = Math.random() * 4 + 2;
    const left = Math.random() * 100;
    const delay = Math.random() * 8;
    const duration = Math.random() * 4 + 6;

    // Random color from accent palette - Warm Summer Colors
    const colors = ['#ff9f43', '#ff6b6b', '#feca57'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    particle.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${left}%;
        background: ${color};
        animation-delay: ${delay}s;
        animation-duration: ${duration}s;
        box-shadow: 0 0 ${size * 2}px ${color};
    `;

    container.appendChild(particle);
}

// ============================================
// TYPING ANIMATION
// ============================================
function initTypingAnimation() {
    const typingElement = document.getElementById('typingText');
    const commands = [
        './lock_in.sh',
        'config.txt',
        'ls projects/',
        './build_something_amazing.sh',
        'git push origin main'
    ];

    let commandIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 100;

    function type() {
        const currentCommand = commands[commandIndex];

        if (isDeleting) {
            typingElement.textContent = currentCommand.substring(0, charIndex - 1);
            charIndex--;
            typingSpeed = 50;
        } else {
            typingElement.textContent = currentCommand.substring(0, charIndex + 1);
            charIndex++;
            typingSpeed = 100;
        }

        if (!isDeleting && charIndex === currentCommand.length) {
            isDeleting = true;
            typingSpeed = 2000; // Pause before deleting
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            commandIndex = (commandIndex + 1) % commands.length;
            typingSpeed = 500; // Pause before typing new command
        }

        setTimeout(type, typingSpeed);
    }

    setTimeout(type, 1000);
}

// ============================================
// ROLE ROTATION
// ============================================
function initRoleRotation() {
    const roleElement = document.getElementById('roleText');
    const roles = [
        'Software Developer',
        'Full Stack Engineer',
        'Problem Solver',
        'Code Architect',
    ];

    let currentIndex = 0;

    function rotateRole() {
        roleElement.style.opacity = '0';
        roleElement.style.transform = 'translateY(20px)';

        setTimeout(() => {
            currentIndex = (currentIndex + 1) % roles.length;
            roleElement.textContent = roles[currentIndex];
            roleElement.style.opacity = '1';
            roleElement.style.transform = 'translateY(0)';
        }, 300);
    }

    // Add transition styles
    roleElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

    setInterval(rotateRole, 3000);
}

// ============================================
// NAVIGATION
// ============================================
function initNavigation() {
    const navbar = document.querySelector('.navbar');
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.querySelector('.nav-links');
    const links = document.querySelectorAll('.nav-link');

    // Mobile menu toggle
    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    // Close mobile menu on link click
    links.forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });

    // Navbar scroll effect
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;

        if (currentScroll > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        lastScroll = currentScroll;
    });

    // Active link highlighting
    const sections = document.querySelectorAll('section');

    window.addEventListener('scroll', () => {
        let current = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;

            if (scrollY >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });

        links.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });

    // Smooth scroll for nav links
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);

            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// ============================================
// SCROLL ANIMATIONS - ENHANCED WITH PIZZAZZ
// ============================================
function initScrollAnimations() {
    // Add scroll progress bar
    createScrollProgressBar();

    // Add parallax scroll effects
    initParallaxScroll();

    // Staggered reveal observer for elements
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');

                // Trigger skill bar animation when skills section is visible
                if (entry.target.classList.contains('skills')) {
                    animateSkillBars();
                }

                // Trigger count up animation when about section is visible
                if (entry.target.classList.contains('about')) {
                    animateCountUp();
                }
            }
        });
    }, observerOptions);

    // Observe sections
    document.querySelectorAll('.section').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(50px)';
        section.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        observer.observe(section);
    });

    // Staggered animation for project cards
    const cardObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                const card = entry.target;
                const delay = Array.from(document.querySelectorAll('.project-card')).indexOf(card) * 150;
                setTimeout(() => {
                    card.classList.add('card-reveal');
                }, delay);
            }
        });
    }, { threshold: 0.2 });

    document.querySelectorAll('.project-card').forEach(card => {
        cardObserver.observe(card);
    });

    // Staggered animation for skill items
    const skillObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const items = entry.target.querySelectorAll('.skill-item');
                items.forEach((item, index) => {
                    setTimeout(() => {
                        item.classList.add('skill-reveal');
                    }, index * 100);
                });
            }
        });
    }, { threshold: 0.3 });

    document.querySelectorAll('.skill-category').forEach(category => {
        skillObserver.observe(category);
    });

    // Text reveal animation for headings
    const textObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('text-reveal');
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.section-title, .contact-heading').forEach(text => {
        textObserver.observe(text);
    });

    // Add dynamic styles
    const style = document.createElement('style');
    style.textContent = `
        .animate-in {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
        
        .project-card {
            opacity: 0;
            transform: translateY(60px) scale(0.95);
        }
        
        .project-card.card-reveal {
            opacity: 1;
            transform: translateY(0) scale(1);
            transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), 
                        transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        .skill-item {
            opacity: 0;
            transform: translateX(-30px);
        }
        
        .skill-item.skill-reveal {
            opacity: 1;
            transform: translateX(0);
            transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        .section-title, .contact-heading {
            background-size: 200% 100%;
            background-position: 100% 0;
        }
        
        .section-title.text-reveal, .contact-heading.text-reveal {
            animation: textShine 0.8s ease forwards;
        }
        
        @keyframes textShine {
            0% {
                background-position: 100% 0;
                opacity: 0.5;
            }
            100% {
                background-position: 0% 0;
                opacity: 1;
            }
        }
        
        .scroll-progress {
            position: fixed;
            top: 0;
            left: 0;
            height: 3px;
            background: var(--accent-gradient);
            z-index: 10001;
            transform-origin: left;
            transition: transform 0.1s ease;
            box-shadow: 0 0 10px var(--accent-primary);
        }
        
        .floating-shapes {
            position: fixed;
            pointer-events: none;
            z-index: -1;
        }
        
        .floating-shape {
            position: absolute;
            border: 1px solid var(--accent-primary);
            opacity: 0.1;
            transition: transform 0.3s ease;
        }
    `;
    document.head.appendChild(style);
}

// Scroll Progress Bar
function createScrollProgressBar() {
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    document.body.appendChild(progressBar);

    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = scrollTop / docHeight;
        progressBar.style.transform = `scaleX(${scrollPercent})`;
    });
}

// Parallax Scroll Effects
function initParallaxScroll() {
    const heroVisual = document.querySelector('.hero-visual');
    const terminalWindow = document.querySelector('.terminal-window');
    const orbs = document.querySelectorAll('.orb');

    // Create floating geometric shapes
    createFloatingShapes();

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        const windowHeight = window.innerHeight;

        // Parallax for hero elements
        if (heroVisual && scrollY < windowHeight) {
            heroVisual.style.transform = `translateY(${scrollY * 0.3}px) rotate(${scrollY * 0.02}deg)`;
        }

        if (terminalWindow && scrollY < windowHeight) {
            terminalWindow.style.transform = `translateY(${scrollY * 0.15}px)`;
        }

        // Move orbs based on scroll
        orbs.forEach((orb, index) => {
            const speed = (index + 1) * 0.1;
            orb.style.transform = `translateY(${scrollY * speed}px)`;
        });

        // Update floating shapes
        updateFloatingShapes(scrollY);
    });
}

// Create floating geometric shapes for visual interest
function createFloatingShapes() {
    const container = document.createElement('div');
    container.className = 'floating-shapes';
    document.body.appendChild(container);

    const shapes = [];
    const shapeTypes = ['circle', 'square', 'triangle'];

    for (let i = 0; i < 8; i++) {
        const shape = document.createElement('div');
        shape.className = 'floating-shape';

        const size = Math.random() * 60 + 20;
        const type = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];

        shape.style.width = `${size}px`;
        shape.style.height = `${size}px`;
        shape.style.left = `${Math.random() * 100}vw`;
        shape.style.top = `${Math.random() * 300}vh`;

        if (type === 'circle') {
            shape.style.borderRadius = '50%';
        } else if (type === 'triangle') {
            shape.style.width = '0';
            shape.style.height = '0';
            shape.style.border = 'none';
            shape.style.borderLeft = `${size / 2}px solid transparent`;
            shape.style.borderRight = `${size / 2}px solid transparent`;
            shape.style.borderBottom = `${size}px solid rgba(255, 159, 67, 0.1)`;
        }

        shape.dataset.speed = (Math.random() * 0.5 + 0.1).toString();
        shape.dataset.originalTop = shape.style.top;

        container.appendChild(shape);
        shapes.push(shape);
    }

    window.floatingShapes = shapes;
}

function updateFloatingShapes(scrollY) {
    if (!window.floatingShapes) return;

    window.floatingShapes.forEach(shape => {
        const speed = parseFloat(shape.dataset.speed);
        const rotation = scrollY * speed * 0.5;
        shape.style.transform = `translateY(${-scrollY * speed}px) rotate(${rotation}deg)`;
    });
}

// ============================================
// 3D CARD TILT EFFECT
// ============================================
function initCardTilt() {
    const cards = document.querySelectorAll('[data-tilt]');

    cards.forEach(card => {
        // Enable GPU acceleration for smooth animations
        card.style.willChange = 'transform';
        card.style.transition = 'transform 0.15s ease-out, border-color 0.3s ease, box-shadow 0.3s ease';

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = (y - centerY) / 25;
            const rotateY = (centerX - x) / 25;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px) translateZ(0)`;

            // Update glow position
            const glowX = (x / rect.width) * 100;
            const glowY = (y / rect.height) * 100;
            card.style.setProperty('--mouse-x', `${glowX}%`);
            card.style.setProperty('--mouse-y', `${glowY}%`);
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0) translateZ(0)';
        });
    });
}

// ============================================
// SKILL BARS ANIMATION
// ============================================
function initSkillBars() {
    // Skills will be animated when section comes into view
}

function animateSkillBars() {
    const skillBars = document.querySelectorAll('.skill-progress');

    skillBars.forEach((bar, index) => {
        const progress = bar.getAttribute('data-progress');

        setTimeout(() => {
            bar.style.width = `${progress}%`;
        }, index * 100);
    });
}

// ============================================
// COUNT UP ANIMATION
// ============================================
function initCountUp() {
    // Count up will be animated when section comes into view
}

let countUpAnimated = false;

function animateCountUp() {
    if (countUpAnimated) return;
    countUpAnimated = true;

    const counters = document.querySelectorAll('.stat-number');

    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-count'));
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;

        const updateCounter = () => {
            current += step;
            if (current < target) {
                counter.textContent = Math.floor(current);
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target;
            }
        };

        updateCounter();
    });
}

// ============================================
// CONTACT FORM
// ============================================
function initContactForm() {
    const form = document.getElementById('contactForm');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = form.querySelector('.btn-submit');
            const originalText = submitBtn.querySelector('.btn-text').textContent;

            // Show loading state
            submitBtn.querySelector('.btn-text').textContent = 'Sending...';
            submitBtn.disabled = true;

            // Simulate form submission (replace with actual form handling)
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Show success state
            submitBtn.querySelector('.btn-text').textContent = 'Message Sent!';
            submitBtn.style.background = 'linear-gradient(135deg, #27ca40 0%, #00f5d4 100%)';

            // Reset form
            form.reset();

            // Reset button after delay
            setTimeout(() => {
                submitBtn.querySelector('.btn-text').textContent = originalText;
                submitBtn.style.background = '';
                submitBtn.disabled = false;
            }, 3000);
        });

        // Add input focus effects
        const inputs = form.querySelectorAll('.form-input');

        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                input.parentElement.classList.add('focused');
            });

            input.addEventListener('blur', () => {
                input.parentElement.classList.remove('focused');
            });
        });
    }
}

// ============================================
// MAGNETIC BUTTONS
// ============================================
document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('mousemove', (e) => {
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        button.style.transform = `translate(${x * 0.1}px, ${y * 0.1}px)`;
    });

    button.addEventListener('mouseleave', () => {
        button.style.transform = '';
    });
});

// ============================================
// MOUSE TRAILER EFFECT
// ============================================
const trailer = document.createElement('div');
trailer.className = 'mouse-trailer';
trailer.style.cssText = `
    position: fixed;
    width: 20px;
    height: 20px;
    border: 2px solid var(--accent-primary);
    border-radius: 50%;
    pointer-events: none;
    z-index: 9999;
    transition: transform 0.1s ease, opacity 0.3s ease;
    opacity: 0;
`;
document.body.appendChild(trailer);

let mouseX = 0, mouseY = 0;
let trailerX = 0, trailerY = 0;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    trailer.style.opacity = '1';
});

document.addEventListener('mouseleave', () => {
    trailer.style.opacity = '0';
});

function animateTrailer() {
    trailerX += (mouseX - trailerX) * 0.15;
    trailerY += (mouseY - trailerY) * 0.15;

    trailer.style.left = `${trailerX - 10}px`;
    trailer.style.top = `${trailerY - 10}px`;

    requestAnimationFrame(animateTrailer);
}

animateTrailer();

// Expand trailer on hoverable elements
document.querySelectorAll('a, button, .project-card').forEach(el => {
    el.addEventListener('mouseenter', () => {
        trailer.style.transform = 'scale(2)';
        trailer.style.borderColor = 'var(--accent-tertiary)';
    });

    el.addEventListener('mouseleave', () => {
        trailer.style.transform = 'scale(1)';
        trailer.style.borderColor = 'var(--accent-primary)';
    });
});

// ============================================
// PARALLAX EFFECT FOR ORBS
// ============================================
document.addEventListener('mousemove', (e) => {
    const orbs = document.querySelectorAll('.orb');
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;

    orbs.forEach((orb, index) => {
        const speed = (index + 1) * 15;
        orb.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
    });
});

// ============================================
// EASTER EGG - KONAMI CODE
// ============================================
const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiIndex = 0;

document.addEventListener('keydown', (e) => {
    if (e.key === konamiCode[konamiIndex]) {
        konamiIndex++;

        if (konamiIndex === konamiCode.length) {
            activateEasterEgg();
            konamiIndex = 0;
        }
    } else {
        konamiIndex = 0;
    }
});

function activateEasterEgg() {
    document.body.style.animation = 'rainbow 2s linear infinite';

    const style = document.createElement('style');
    style.textContent = `
        @keyframes rainbow {
            0% { filter: hue-rotate(0deg); }
            100% { filter: hue-rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    // Create confetti
    for (let i = 0; i < 100; i++) {
        createConfetti();
    }

    setTimeout(() => {
        document.body.style.animation = '';
    }, 5000);
}

function createConfetti() {
    const confetti = document.createElement('div');
    const colors = ['#ff9f43', '#ff6b6b', '#feca57', '#ffad5a', '#ff8787'];

    confetti.style.cssText = `
        position: fixed;
        width: 10px;
        height: 10px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        left: ${Math.random() * 100}vw;
        top: -20px;
        z-index: 10000;
        pointer-events: none;
        animation: confettiFall ${Math.random() * 2 + 2}s linear forwards;
        transform: rotate(${Math.random() * 360}deg);
    `;

    document.body.appendChild(confetti);

    // Add animation keyframes if not exists
    if (!document.querySelector('#confetti-style')) {
        const style = document.createElement('style');
        style.id = 'confetti-style';
        style.textContent = `
            @keyframes confettiFall {
                to {
                    top: 100vh;
                    transform: rotate(${Math.random() * 720}deg);
                }
            }
        `;
        document.head.appendChild(style);
    }

    setTimeout(() => confetti.remove(), 4000);
}

// ============================================
// CONSOLE EASTER EGG
// ============================================
console.log(`
%c╔═══════════════════════════════════════╗
║                                       ║
║    👋 Hey there, curious developer!   ║
║                                       ║
║    Looking for something?             ║
║    Try the Konami Code! 🎮            ║
║                                       ║
║    ↑ ↑ ↓ ↓ ← → ← → B A                ║
║                                       ║
╚═══════════════════════════════════════╝
`, 'color: #00f5d4; font-family: monospace; font-size: 12px;');
