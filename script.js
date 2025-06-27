// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing VR Tour...');
    
    // Cache DOM elements
    const elements = {
        welcomeScreen: document.getElementById('welcome-screen'),
        enterButton: document.getElementById('enter-button'),
        homePage: document.getElementById('home-page'),
        backToHome: document.getElementById('back-to-home'),
        mediaInfo: document.getElementById('media-info'),
        currentMediaName: document.getElementById('current-media-name'),
        prevBtn: document.getElementById('prev-btn'),
        nextBtn: document.getElementById('next-btn'),
        fullscreenBtn: document.getElementById('fullscreen-btn'),
        vrContainer: document.getElementById('vr-container'),
        controlPanel: document.getElementById('control-panel'),
        loadingMessage: document.getElementById('loading-message'),
        backToTop: document.getElementById('back-to-top'),
        navItems: document.querySelectorAll('.nav-item'),
        sections: document.querySelectorAll('.section'),
        vrNavControls: document.getElementById('vr-nav-controls'),
        lookUpBtn: document.getElementById('look-up-btn'),
        lookDownBtn: document.getElementById('look-down-btn'),
        mainCamera: document.getElementById('main-camera'),
        imageItems: document.querySelectorAll('.image-item'),
        mainSky: document.querySelector('#main-sky'),
        assets: document.querySelector('a-assets'),
        vrToggle: document.getElementById('vr-toggle')
    };
    
    // Check if essential elements exist
    if (!elements.enterButton) {
        console.error('Enter button not found!');
        return;
    }
    
    console.log('Enter button found:', elements.enterButton);
    
    // Global state
    const state = {
        currentMediaIndex: -1,
        currentCategory: 'campus',
        isVRMode: false,
        isFullscreen: false,
        skyImageLoaded: false,
        cameraRotation: { x: 0, y: -90, z: 0 },
        isTransitioning: false,
        ROTATION_STEP: 15,
        isInVRView: false // Track if we're in VR view
    };
    
    // Setup lazy loading
    function setupLazyLoading() {
        const lazyImages = document.querySelectorAll('.lazy-image');
        
        if ('IntersectionObserver' in window) {
            const lazyImageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const pictureElement = img.closest('picture');
                        if (pictureElement) {
                            // Remove the placeholder once the image is loaded
                            const parent = img.closest('.image-item');
                            if (parent) {
                                const placeholder = parent.querySelector('.image-placeholder');
                                if (placeholder) {
                                    placeholder.style.opacity = '0';
                                    setTimeout(() => placeholder.remove(), 300);
                                }
                                setTimeout(() => {
                                    parent.classList.add('loaded');
                                }, 100);
                            }
                        }
                        lazyImageObserver.unobserve(img);
                    }
                });
            }, {
                rootMargin: '100px 0px',
                threshold: 0.01
            });
            
            lazyImages.forEach(img => {
                lazyImageObserver.observe(img);
            });
        } else {
            // Fallback for browsers without IntersectionObserver
            lazyImages.forEach(img => {
                const pictureElement = img.closest('picture');
                if (pictureElement) {
                    const parent = img.closest('.image-item');
                    if (parent) {
                        const placeholder = parent.querySelector('.image-placeholder');
                        if (placeholder) {
                            placeholder.style.opacity = '0';
                            setTimeout(() => placeholder.remove(), 300);
                        }
                        setTimeout(() => {
                            parent.classList.add('loaded');
                        }, 100);
                    }
                }
            });
        }
    }
    
    // Animate sections
    function setupSectionAnimation() {
        if ('IntersectionObserver' in window) {
            const sectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const section = entry.target;
                        section.classList.add('visible');
                    }
                });
            }, {
                rootMargin: '0px 0px -20% 0px',
                threshold: 0.1
            });
            
            elements.sections.forEach(section => {
                sectionObserver.observe(section);
            });
        } else {
            elements.sections.forEach(section => {
                section.classList.add('visible');
            });
        }
    }
    
    // Check if A-Frame scene is ready
    function waitForAFrameScene() {
        return new Promise((resolve) => {
            const scene = document.querySelector('a-scene');
            if (scene && scene.hasLoaded) {
                resolve();
            } else {
                const checkInterval = setInterval(() => {
                    if (scene && scene.hasLoaded) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
                
                // Fallback timeout
                setTimeout(() => {
                    clearInterval(checkInterval);
                    resolve();
                }, 3000);
            }
        });
    }
    
    // Load 360° image with proper A-Frame initialization
    function loadSkyTexture(imgSrc, mediaName, autoFullscreen = true) {
        if (state.isTransitioning) return;
        state.isTransitioning = true;
        state.skyImageLoaded = false;
        
        elements.loadingMessage.style.display = 'block';
        elements.loadingMessage.style.opacity = '1';
        elements.loadingMessage.innerHTML = 'Loading 360° view...<div class="loading-spinner"></div>';
        
        // Reset camera rotation
        state.cameraRotation = { x: 0, y: -90, z: 0 };
        if (elements.mainCamera) {
            elements.mainCamera.setAttribute('rotation', `${state.cameraRotation.x} ${state.cameraRotation.y} ${state.cameraRotation.z}`);
        }
        
        // Wait for A-Frame scene to be ready, then load the image
        waitForAFrameScene().then(() => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = function() {
                // Remove old image if it exists
                const oldImage = document.getElementById('current-sky-image');
                if (oldImage) {
                    elements.assets.removeChild(oldImage);
                }
                
                // Create new image element
                const newImage = document.createElement('img');
                newImage.id = 'current-sky-image';
                newImage.src = imgSrc;
                newImage.setAttribute('crossorigin', 'anonymous');
                
                // Add to assets and update sky
                elements.assets.appendChild(newImage);
                
                // Force A-Frame to recognize the new asset
                setTimeout(() => {
                    elements.mainSky.setAttribute('src', '#current-sky-image');
                    
                    // Force scene refresh if needed
                    const scene = document.querySelector('a-scene');
                    if (scene && scene.renderer) {
                        scene.renderer.render(scene.object3D, scene.camera);
                    }
                    
                    setTimeout(() => {
                        elements.loadingMessage.style.opacity = '0';
                        setTimeout(() => {
                            elements.loadingMessage.style.display = 'none';
                        }, 500);
                        
                        elements.currentMediaName.textContent = mediaName;
                        elements.mediaInfo.innerHTML = `Currently viewing: <strong>${mediaName}</strong>`;
                        elements.mediaInfo.classList.add('visible');
                        elements.vrNavControls.style.display = 'flex';
                        
                        setTimeout(() => {
                            elements.mediaInfo.classList.remove('visible');
                        }, 4000);
                        
                        state.skyImageLoaded = true;
                        state.isTransitioning = false;
                        
                        if (!state.isVRMode && !state.isFullscreen) {
                            setTimeout(() => {
                                showNotification('<i class="fas fa-info-circle"></i> Tip: Click VR button for enhanced experience, or fullscreen for immersive view', 5000);
                            }, 1000);
                        }
                    }, 200);
                }, 100);
            };
            
            img.onerror = function(e) {
                console.error('Error loading 360° image:', imgSrc, e);
                elements.loadingMessage.innerHTML = 'Error loading image. Please try another view.<div class="loading-spinner" style="border-top-color: #ff5252;"></div>';
                
                setTimeout(() => {
                    elements.backToHome.click();
                    state.isTransitioning = false;
                }, 3000);
            };
            
            img.src = imgSrc;
        });
    }
    
    // VR toggle function - Works in both windowed and fullscreen
    function toggleVRMode() {
        // Only allow VR toggle when already in VR view
        if (!state.isInVRView) {
            showNotification('Please select an image first to enable VR mode');
            return;
        }
        
        if (!state.isVRMode) {
            state.isVRMode = true;
            elements.vrToggle.classList.add('active');
            
            // Enable VR mode without forcing fullscreen
            const scene = document.querySelector('a-scene');
            if (scene) {
                // Check if WebXR is supported for true VR headsets
                if (navigator.xr) {
                    navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
                        if (supported) {
                            showNotification('<i class="fas fa-vr-cardboard"></i> VR mode enabled - Use VR headset or double-tap for fullscreen');
                        } else {
                            showNotification('<i class="fas fa-vr-cardboard"></i> VR mode enabled - Double-tap for fullscreen experience');
                        }
                    }).catch(() => {
                        showNotification('<i class="fas fa-vr-cardboard"></i> VR mode enabled - Double-tap for fullscreen experience');
                    });
                } else {
                    showNotification('<i class="fas fa-vr-cardboard"></i> VR mode enabled - Double-tap for fullscreen experience');
                }
                
                // Enable enhanced controls for windowed VR
                enableWindowedVRControls();
            }
        } else {
            state.isVRMode = false;
            elements.vrToggle.classList.remove('active');
            
            // Only exit fullscreen if we're actually in fullscreen
            if (document.fullscreenElement) {
                exitFullscreenMode();
            }
            
            disableWindowedVRControls();
            showNotification('<i class="fas fa-compress"></i> VR mode disabled');
        }
    }

    // Enable enhanced controls for windowed VR mode
    function enableWindowedVRControls() {
        // Add enhanced mouse/touch controls for VR-like experience
        const camera = elements.mainCamera;
        if (camera) {
            // Enable more sensitive look controls for VR mode
            camera.setAttribute('look-controls', {
                'reverseMouseDrag': false,
                'touchEnabled': true,
                'magicWindowTrackingEnabled': true,
                'pointerLockEnabled': true,
                'mouseSensitivity': 0.5,
                'touchSensitivity': 0.5
            });
        }
        
        // Show VR-specific instructions
        showVRInstructions();
    }

    // Disable windowed VR controls
    function disableWindowedVRControls() {
        const camera = elements.mainCamera;
        if (camera) {
            // Reset to normal look controls
            camera.setAttribute('look-controls', {
                'reverseMouseDrag': false,
                'touchEnabled': true,
                'magicWindowTrackingEnabled': true,
                'pointerLockEnabled': false,
                'mouseSensitivity': 1,
                'touchSensitivity': 1
            });
        }
    }

    // Show VR instructions
    function showVRInstructions() {
        let instructions = '<i class="fas fa-info-circle"></i> ';
        if (window.DeviceOrientationEvent && 'ontouchstart' in window) {
            instructions += 'Move your device to look around. Tap buttons or use arrows to navigate.';
        } else {
            instructions += 'Click and drag to look around. Use arrow keys to navigate or V for VR mode, F for fullscreen.';
        }
        showNotification(instructions, 6000);
    }

    // Fullscreen toggle function
    function toggleFullscreen() {
        if (!state.isInVRView) {
            showNotification('Please select an image first');
            return;
        }
        
        if (!state.isFullscreen) {
            state.isFullscreen = true;
            elements.fullscreenBtn.classList.add('active');
            elements.fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
            enterFullscreenMode();
        } else {
            state.isFullscreen = false;
            elements.fullscreenBtn.classList.remove('active');
            elements.fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            exitFullscreenMode();
        }
    }
    
   // Enter fullscreen mode
    function enterFullscreenMode() {
        const vrContainerElement = elements.vrContainer;
        if (vrContainerElement.requestFullscreen) {
            vrContainerElement.requestFullscreen();
        } else if (vrContainerElement.mozRequestFullScreen) {
            vrContainerElement.mozRequestFullScreen();
        } else if (vrContainerElement.webkitRequestFullscreen) {
            vrContainerElement.webkitRequestFullscreen();
        } else if (vrContainerElement.msRequestFullscreen) {
            vrContainerElement.msRequestFullscreen();
        }
        showNotification('<i class="fas fa-expand"></i> Fullscreen mode enabled');
    }
    
    // Exit fullscreen mode
    function exitFullscreenMode() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
    
    // Handle fullscreen change events
    function handleFullscreenChange() {
        const isCurrentlyFullscreen = !!(document.fullscreenElement || 
                                        document.mozFullScreenElement || 
                                        document.webkitFullscreenElement || 
                                        document.msFullscreenElement);
        
        if (!isCurrentlyFullscreen && state.isFullscreen) {
            // User exited fullscreen (e.g., pressed Escape)
            state.isFullscreen = false;
            elements.fullscreenBtn.classList.remove('active');
            elements.fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            showNotification('<i class="fas fa-compress"></i> Exited fullscreen mode');
        }
    }

    // Show notification
    function showNotification(message, duration = 2000) {
        elements.mediaInfo.innerHTML = message;
        elements.mediaInfo.classList.add('visible');
        
        setTimeout(() => {
            elements.mediaInfo.classList.remove('visible');
        }, duration);
    }
    
    // Look up function
    function lookUp() {
        if (!state.skyImageLoaded || state.isTransitioning) return;
        
        state.cameraRotation.x = Math.max(state.cameraRotation.x - state.ROTATION_STEP, -80);
        elements.mainCamera.setAttribute('rotation', `${state.cameraRotation.x} ${state.cameraRotation.y} ${state.cameraRotation.z}`);
        
        elements.lookUpBtn.style.transform = 'scale(0.9)';
        setTimeout(() => elements.lookUpBtn.style.transform = '', 200);
    }
    
    // Look down function
    function lookDown() {
        if (!state.skyImageLoaded || state.isTransitioning) return;
        
        state.cameraRotation.x = Math.min(state.cameraRotation.x + state.ROTATION_STEP, 80);
        elements.mainCamera.setAttribute('rotation', `${state.cameraRotation.x} ${state.cameraRotation.y} ${state.cameraRotation.z}`);
        
        elements.lookDownBtn.style.transform = 'scale(0.9)';
        setTimeout(() => elements.lookDownBtn.style.transform = '', 200);
    }
    
    // Handle image item click with improved A-Frame initialization
    function setupImageItemClicks() {
        elements.imageItems.forEach(item => {
            item.addEventListener('click', function() {
                if (state.isTransitioning) return;
                
                // Get the data-src from the image-item for the 360 view
                const imgSrc = this.getAttribute('data-src');
                if (!imgSrc || imgSrc === '') {
                    showNotification('<i class="fas fa-exclamation-triangle"></i> Image not available');
                    return;
                }
                
                const mediaName = this.querySelector('.image-caption').textContent;
                const category = this.getAttribute('data-category');
                
                elements.homePage.style.opacity = '0';
                
                setTimeout(() => {
                    elements.homePage.style.display = 'none';
                    elements.vrContainer.style.display = 'block';
                    elements.backToHome.style.display = 'block';
                    elements.controlPanel.style.display = 'flex';
                    elements.vrNavControls.style.display = 'flex';
                    
                    state.currentCategory = category;
                    state.isInVRView = true; // Set VR view state
                    const categoryItems = Array.from(document.querySelectorAll(`.image-item[data-category="${category}"]`));
                    state.currentMediaIndex = categoryItems.indexOf(this);
                    
                    // Give A-Frame more time to initialize the scene when it becomes visible
                    setTimeout(() => {
                        // Force A-Frame scene to resize and refresh
                        const scene = document.querySelector('a-scene');
                        if (scene) {
                            // Trigger resize to ensure proper initialization
                            window.dispatchEvent(new Event('resize'));
                            
                            // Wait a bit more for the scene to be ready
                            setTimeout(() => {
                                loadSkyTexture(imgSrc, mediaName);
                            }, 300);
                        } else {
                            loadSkyTexture(imgSrc, mediaName);
                        }
                    }, 200);
                }, 500);
            });
        });
    }
    
    // Back to home function
    function backToHomePage() {
        if (state.isTransitioning) return;
        state.isTransitioning = true;
        
        console.log('Returning to home page...');
        
        // Reset all VR states
        if (state.isVRMode) {
            state.isVRMode = false;
            elements.vrToggle.classList.remove('active');
            disableWindowedVRControls();
        }

        if (state.isFullscreen) {
            state.isFullscreen = false;
            elements.fullscreenBtn.classList.remove('active');
            elements.fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            exitFullscreenMode();
        }
        
        elements.vrContainer.style.opacity = '0';
        elements.backToHome.style.opacity = '0';
        elements.controlPanel.style.opacity = '0';
        elements.vrNavControls.style.opacity = '0';
        
        setTimeout(() => {
            elements.homePage.style.display = 'block';
            elements.vrContainer.style.display = 'none';
            elements.backToHome.style.display = 'none';
            elements.controlPanel.style.display = 'none';
            elements.vrNavControls.style.display = 'none';
            elements.mediaInfo.classList.remove('visible');
            elements.loadingMessage.style.display = 'none';
            
            state.isInVRView = false; // Reset VR view state
            
            setTimeout(() => {
                elements.homePage.style.opacity = '1';
                elements.vrContainer.style.opacity = '1';
                elements.backToHome.style.opacity = '1';
                elements.controlPanel.style.opacity = '1';
                elements.vrNavControls.style.opacity = '1';
                state.isTransitioning = false;
            }, 50);
        }, 300);
    }
    
    // Show home page function
    function showHomePage() {
        console.log('Showing home page...');
        
        elements.welcomeScreen.style.opacity = '0';
        elements.welcomeScreen.style.transform = 'scale(1.1)';
        
        setTimeout(() => {
            elements.welcomeScreen.style.display = 'none';
            elements.homePage.style.display = 'block';
            
            setTimeout(() => {
                elements.homePage.style.opacity = '1';
                setupSectionAnimation();
                setupLazyLoading();
                console.log('Home page displayed successfully');
            }, 50);
        }, 800);
    }
    
    // Navigation controls setup
    function setupNavigationControls() {
        // Previous button
        if (elements.prevBtn) {
            elements.prevBtn.addEventListener('click', function() {
                if (!state.skyImageLoaded || state.isTransitioning) return;
                
                this.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 200);
                
                const categoryItems = Array.from(document.querySelectorAll(`.image-item[data-category="${state.currentCategory}"]`));
                
                if (state.currentMediaIndex > 0) {
                    state.currentMediaIndex--;
                    const prevImage = categoryItems[state.currentMediaIndex];
                    const imgSrc = prevImage.getAttribute('data-src');
                    const mediaName = prevImage.querySelector('.image-caption').textContent;
                    
                    loadSkyTexture(imgSrc, mediaName);
                } else {
                    this.classList.add('disabled');
                    
                    setTimeout(() => {
                        this.classList.remove('disabled');
                    }, 500);
                    
                    showNotification('<i class="fas fa-info-circle"></i> First item in this category');
                }
            });
        }
        
        // Next button
        if (elements.nextBtn) {
            elements.nextBtn.addEventListener('click', function() {
                if (!state.skyImageLoaded || state.isTransitioning) return;
                
                this.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 200);
                
                const categoryItems = Array.from(document.querySelectorAll(`.image-item[data-category="${state.currentCategory}"]`));
                
                if (state.currentMediaIndex < categoryItems.length - 1) {
                    state.currentMediaIndex++;
                    const nextImage = categoryItems[state.currentMediaIndex];
                    const imgSrc = nextImage.getAttribute('data-src');
                    const mediaName = nextImage.querySelector('.image-caption').textContent;
                    
                    loadSkyTexture(imgSrc, mediaName);
                } else {
                    this.classList.add('disabled');
                    
                    setTimeout(() => {
                        this.classList.remove('disabled');
                    }, 500);
                    
                    showNotification('<i class="fas fa-info-circle"></i> Last item in this category');
                }
            });
        }
        
        // VR toggle button
        if (elements.vrToggle) {
            elements.vrToggle.addEventListener('click', function() {
                this.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 200);
                
                toggleVRMode();
            });
        }

        // Fullscreen toggle button
        if (elements.fullscreenBtn) {
            elements.fullscreenBtn.addEventListener('click', function() {
                this.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 200);
                
                toggleFullscreen();
            });
        }
        
        // Vertical navigation controls
        if (elements.lookUpBtn) {
            elements.lookUpBtn.addEventListener('click', lookUp);
        }
        if (elements.lookDownBtn) {
            elements.lookDownBtn.addEventListener('click', lookDown);
        }
    }
    
    // Back to top visibility
    function setupScrollHandling() {
        window.addEventListener('scroll', throttle(function() {
            if (window.scrollY > 300) {
                elements.backToTop.classList.add('visible');
            } else {
                elements.backToTop.classList.remove('visible');
            }
            updateActiveNavItem();
        }, 100));
        
        // Back to top functionality
        if (elements.backToTop) {
            elements.backToTop.addEventListener('click', function() {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        }
    }
    
    // Update active navigation
    function updateActiveNavItem() {
        let current = '';
        let minDistance = Infinity;
        
        elements.sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            const distance = Math.abs(rect.top - 200);
            
            if (distance < minDistance) {
                minDistance = distance;
                current = section.getAttribute('id');
            }
        });
        
        if (current) {
            elements.navItems.forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('href').substring(1) === current) {
                    item.classList.add('active');
                }
            });
            
            const engDepartments = document.getElementById('engineering-departments');
            if (engDepartments) {
                if (current === 'engineering') {
                    engDepartments.classList.add('active');
                } else {
                    engDepartments.classList.remove('active');
                }
            }
        }
    }
    
    // Navigation links setup
    function setupNavigationLinks() {
        elements.navItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                
                elements.navItems.forEach(navItem => navItem.classList.remove('active'));
                this.classList.add('active');
                
                const targetId = this.getAttribute('href');
                const targetSection = document.querySelector(targetId);
                
                if (targetSection) {
                    window.scrollTo({
                        top: targetSection.offsetTop - 180,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }
    
    // Department tabs setup
    function setupDepartmentTabs() {
        const departmentTabs = document.querySelectorAll('.sub-nav-item');
        const departmentContents = document.querySelectorAll('.department-content');
        
        departmentTabs.forEach(tab => {
            tab.addEventListener('click', function(e) {
                e.preventDefault();
                
                departmentTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                const targetId = this.getAttribute('data-target');
                departmentContents.forEach(content => {
                    content.classList.remove('active');
                });
                
                const targetContent = document.getElementById(targetId);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
    }
    
    // Keyboard support
    function setupKeyboardControls() {
        document.addEventListener('keydown', function(e) {
            if (elements.vrContainer.style.display === 'block' && state.skyImageLoaded && !state.isTransitioning) {
                if (e.key === 'ArrowLeft') {
                    elements.prevBtn.click();
                } else if (e.key === 'ArrowRight') {
                    elements.nextBtn.click();
                } else if (e.key === 'Escape') {
                    elements.backToHome.click();
                } else if (e.key === 'v' || e.key === 'V') {
                    elements.vrToggle.click();
                } else if (e.key === 'f' || e.key === 'F') {
                    elements.fullscreenBtn.click();
                } else if (e.key === 'ArrowUp') {
                    lookUp();
                } else if (e.key === 'ArrowDown') {
                    lookDown();
                }
            }
        });
    }
    
    // Setup fullscreen change event listeners
    function setupFullscreenEvents() {
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('msfullscreenchange', handleFullscreenChange);
    }

    // Performance optimization - throttle function
    function throttle(callback, delay) {
        let lastCall = 0;
        return function(...args) {
            const now = new Date().getTime();
            if (now - lastCall < delay) {
                return;
            }
            lastCall = now;
            callback(...args);
        };
    }
    
    // Initialize everything
    function initialize() {
        console.log('Initializing application...');
        
        // Setup A-Frame scene loading event
        const scene = document.querySelector('a-scene');
        if (scene) {
            scene.addEventListener('loaded', function() {
                console.log('A-Frame scene loaded and ready');
            });
            
            // Also listen for when assets are loaded
            scene.addEventListener('materialized', function() {
                console.log('A-Frame scene materialized');
            });
        }
        
        // Setup event listeners
        
        // Welcome screen - Enter button (Fixed)
        if (elements.enterButton) {
            console.log('Setting up enter button event listener...');
            elements.enterButton.addEventListener('click', function(e) {
                console.log('Enter button clicked!');
                e.preventDefault();
                showHomePage();
            });
            
            // Also add a backup event listener with a slight delay
            setTimeout(() => {
                if (elements.enterButton && !elements.enterButton.hasAttribute('data-listener-added')) {
                    elements.enterButton.setAttribute('data-listener-added', 'true');
                    elements.enterButton.onclick = function(e) {
                        console.log('Enter button clicked (backup handler)!');
                        e.preventDefault();
                        showHomePage();
                    };
                }
            }, 100);
        } else {
            console.error('Enter button not found during initialization!');
        }
        
        // Back to home button
        if (elements.backToHome) {
            elements.backToHome.addEventListener('click', backToHomePage);
        }
        
        // Setup all other components
        setupImageItemClicks();
        setupNavigationControls();
        setupScrollHandling();
        setupNavigationLinks();
        setupDepartmentTabs();
        setupKeyboardControls();
        setupFullscreenEvents();
        
        console.log('Application initialized successfully!');
    }
    
    // Start the application
    initialize();
});

// Additional safety measure - if DOM is already loaded
if (document.readyState === 'loading') {
    // DOM is still loading, wait for DOMContentLoaded
    console.log('DOM is still loading...');
} else {
    // DOM is already loaded
    console.log('DOM already loaded, running initialization...');
}