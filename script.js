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
        vrToggle: document.getElementById('vr-toggle'),
        mobileVrHint: document.getElementById('mobile-vr-hint'),
        lookLeftBtn: document.getElementById('look-left-btn'),
        lookRightBtn: document.getElementById('look-right-btn'),
        recenterBtn: document.getElementById('recenter-btn')
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
        isInVRView: false,
        touchStartX: 0,
        touchStartY: 0,
        touchStartRotation: { x: 0, y: 0 },
        isWebXRSupported: false,
        vrSession: null,
        isMouseDown: false
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
                        
                        // Force control panel to be visible after image loads
                        setTimeout(() => {
                            forceControlPanelVisible();
                        }, 100);
                        
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
    
    // Check WebXR support
    function checkWebXRSupport() {
        if ('xr' in navigator) {
            navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
                state.isWebXRSupported = supported;
                console.log('WebXR VR support:', supported);
                if (supported) {
                    // Add VR indicator to button
                    elements.vrToggle.setAttribute('title', 'Click for VR headset mode');
                }
            }).catch(() => {
                state.isWebXRSupported = false;
                console.log('WebXR not supported');
            });
        } else {
            state.isWebXRSupported = false;
            console.log('WebXR not available');
        }
    }

    // Enhanced VR toggle function with WebXR support
    function toggleVRMode() {
        // Only allow VR toggle when already in VR view
        if (!state.isInVRView) {
            showNotification('Please select an image first to enable VR mode');
            return;
        }
        
        if (!state.isVRMode) {
            state.isVRMode = true;
            elements.vrToggle.classList.add('active');
            
            // Try to enter WebXR VR mode for headsets
            if (state.isWebXRSupported && navigator.xr) {
                const scene = document.querySelector('a-scene');
                if (scene) {
                    // A-Frame handles WebXR automatically, just trigger enter VR
                    scene.enterVR().then(() => {
                        showNotification('<i class="fas fa-vr-cardboard"></i> VR headset mode activated!');
                        enableAdvancedVRControls();
                    }).catch((error) => {
                        console.log('WebXR VR mode failed, using fallback:', error);
                        enableWindowedVRControls();
                        showNotification('<i class="fas fa-vr-cardboard"></i> VR mode enabled - Use mouse/touch to look around');
                    });
                } else {
                    enableWindowedVRControls();
                    showNotification('<i class="fas fa-vr-cardboard"></i> VR mode enabled');
                }
            } else {
                enableWindowedVRControls();
                showNotification('<i class="fas fa-vr-cardboard"></i> VR mode enabled - Use mouse/touch to look around');
            }
        } else {
            state.isVRMode = false;
            elements.vrToggle.classList.remove('active');
            
            // Exit VR mode
            const scene = document.querySelector('a-scene');
            if (scene && scene.is('vr-mode')) {
                scene.exitVR();
            }
            
            // Only exit fullscreen if we're actually in fullscreen
            if (document.fullscreenElement) {
                exitFullscreenMode();
            }
            
            disableVRControls();
            showNotification('<i class="fas fa-compress"></i> VR mode disabled');
        }
    }

    // Enable advanced VR controls for headsets
    function enableAdvancedVRControls() {
        const camera = elements.mainCamera;
        if (camera) {
            // Enhanced controls for VR headsets
            camera.setAttribute('look-controls', {
                'reverseMouseDrag': false,
                'touchEnabled': true,
                'magicWindowTrackingEnabled': true,
                'pointerLockEnabled': false,
                'mouseSensitivity': 0.8,
                'touchSensitivity': 0.8
            });
            
            // Add hand tracking support if available
            camera.setAttribute('tracked-controls', 'controller: 0');
        }
        
        // Enable hand controllers if available
        enableHandControllers();
        
        showVRInstructions();
    }

    // Enable hand controllers for VR headsets
    function enableHandControllers() {
        const scene = document.querySelector('a-scene');
        if (scene) {
            // Add left hand controller
            const leftHand = document.createElement('a-entity');
            leftHand.setAttribute('id', 'leftHand');
            leftHand.setAttribute('laser-controls', 'hand: left');
            leftHand.setAttribute('raycaster', 'objects: .clickable');
            scene.appendChild(leftHand);
            
            // Add right hand controller
            const rightHand = document.createElement('a-entity');
            rightHand.setAttribute('id', 'rightHand');
            rightHand.setAttribute('laser-controls', 'hand: right');
            rightHand.setAttribute('raycaster', 'objects: .clickable');
            scene.appendChild(rightHand);
        }
    }

    // Enhanced mobile controls with touch gestures
    function enableWindowedVRControls() {
        const camera = elements.mainCamera;
        if (camera) {
            // Enable enhanced look controls for mobile
            camera.setAttribute('look-controls', {
                'reverseMouseDrag': false,
                'touchEnabled': true,
                'magicWindowTrackingEnabled': true,
                'pointerLockEnabled': false,
                'mouseSensitivity': 1.2,
                'touchSensitivity': 1.2
            });
        }
        
        // Add touch gesture support
        setupTouchControls();
        
        // Enable device orientation for mobile
        setupDeviceOrientation();
        
        showVRInstructions();
    }

    // Setup advanced touch controls for mobile
    function setupTouchControls() {
        const vrContainer = elements.vrContainer;
        
        // Touch rotation controls
        vrContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
        vrContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
        vrContainer.addEventListener('touchend', handleTouchEnd, { passive: false });
        
        // Mouse controls for desktop
        vrContainer.addEventListener('mousedown', handleMouseStart);
        vrContainer.addEventListener('mousemove', handleMouseMove);
        vrContainer.addEventListener('mouseup', handleMouseEnd);
        
        // Prevent context menu
        vrContainer.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    // Touch/Mouse event handlers
    function handleTouchStart(e) {
        if (e.touches.length === 1) {
            state.touchStartX = e.touches[0].clientX;
            state.touchStartY = e.touches[0].clientY;
            state.touchStartRotation = { ...state.cameraRotation };
            e.preventDefault();
        }
    }

    function handleTouchMove(e) {
        if (e.touches.length === 1 && state.skyImageLoaded) {
            const deltaX = e.touches[0].clientX - state.touchStartX;
            const deltaY = e.touches[0].clientY - state.touchStartY;
            
            // Horizontal rotation (left/right)
            state.cameraRotation.y = state.touchStartRotation.y + (deltaX * 0.5);
            
            // Vertical rotation (up/down)
            state.cameraRotation.x = Math.max(-80, Math.min(80, 
                state.touchStartRotation.x - (deltaY * 0.3)
            ));
            
            updateCameraRotation();
            e.preventDefault();
        }
    }

    function handleTouchEnd(e) {
        // Reset touch state
        state.touchStartX = 0;
        state.touchStartY = 0;
    }

    function handleMouseStart(e) {
        if (e.button === 0) { // Left mouse button
            state.isMouseDown = true;
            state.touchStartX = e.clientX;
            state.touchStartY = e.clientY;
            state.touchStartRotation = { ...state.cameraRotation };
            elements.vrContainer.style.cursor = 'grabbing';
        }
    }

    function handleMouseMove(e) {
        if (state.isMouseDown && state.skyImageLoaded) {
            const deltaX = e.clientX - state.touchStartX;
            const deltaY = e.clientY - state.touchStartY;
            
            // Horizontal rotation
            state.cameraRotation.y = state.touchStartRotation.y + (deltaX * 0.3);
            
            // Vertical rotation
            state.cameraRotation.x = Math.max(-80, Math.min(80, 
                state.touchStartRotation.x - (deltaY * 0.2)
            ));
            
            updateCameraRotation();
        }
    }

    function handleMouseEnd(e) {
        state.isMouseDown = false;
        state.touchStartX = 0;
        state.touchStartY = 0;
        elements.vrContainer.style.cursor = 'grab';
    }

    // Setup device orientation for mobile VR
    function setupDeviceOrientation() {
        if (window.DeviceOrientationEvent) {
            // Request permission for iOS 13+
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                DeviceOrientationEvent.requestPermission()
                    .then(permissionState => {
                        if (permissionState === 'granted') {
                            window.addEventListener('deviceorientation', handleDeviceOrientation);
                            showNotification('<i class="fas fa-mobile-alt"></i> Device orientation enabled - Move your phone to look around!', 3000);
                        }
                    })
                    .catch(console.error);
            } else {
                // Non-iOS devices
                window.addEventListener('deviceorientation', handleDeviceOrientation);
                showNotification('<i class="fas fa-mobile-alt"></i> Device orientation enabled - Move your phone to look around!', 3000);
            }
        }
    }

    function handleDeviceOrientation(e) {
        if (state.skyImageLoaded && state.isVRMode) {
            // Convert device orientation to camera rotation
            // Note: This is a simplified implementation
            const alpha = e.alpha || 0; // Z axis
            const beta = e.beta || 0;   // X axis
            const gamma = e.gamma || 0; // Y axis
            
            // Apply orientation to camera (adjust sensitivity as needed)
            state.cameraRotation.y = -alpha;
            state.cameraRotation.x = Math.max(-80, Math.min(80, beta - 90));
            
            updateCameraRotation();
        }
    }

    // Update camera rotation
    function updateCameraRotation() {
        if (elements.mainCamera) {
            elements.mainCamera.setAttribute('rotation', 
                `${state.cameraRotation.x} ${state.cameraRotation.y} ${state.cameraRotation.z}`
            );
        }
    }

    // Disable VR controls
    function disableVRControls() {
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
        
        // Remove hand controllers
        const leftHand = document.getElementById('leftHand');
        const rightHand = document.getElementById('rightHand');
        if (leftHand) leftHand.remove();
        if (rightHand) rightHand.remove();
        
        // Remove touch event listeners
        const vrContainer = elements.vrContainer;
        vrContainer.removeEventListener('touchstart', handleTouchStart);
        vrContainer.removeEventListener('touchmove', handleTouchMove);
        vrContainer.removeEventListener('touchend', handleTouchEnd);
        vrContainer.removeEventListener('mousedown', handleMouseStart);
        vrContainer.removeEventListener('mousemove', handleMouseMove);
        vrContainer.removeEventListener('mouseup', handleMouseEnd);
        
        vrContainer.style.cursor = 'default';
    }

    // Show enhanced VR instructions
    function showVRInstructions() {
        let instructions = '<i class="fas fa-info-circle"></i> ';
        
        if (state.isWebXRSupported && state.isVRMode) {
            instructions += 'VR Headset Ready! Put on your headset or use touch/mouse controls.';
        } else if (window.DeviceOrientationEvent && 'ontouchstart' in window) {
            instructions += 'Mobile VR: Move your device to look around. Swipe to navigate. Use next/prev buttons to change views.';
        } else {
            instructions += 'Desktop VR: Click and drag to look around. Use arrow keys, next/prev buttons, or WASD to navigate.';
        }
        
        showNotification(instructions, 8000);
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
                    
                    // Force control panel to be visible
                    elements.controlPanel.style.display = 'flex';
                    elements.controlPanel.style.opacity = '1';
                    elements.controlPanel.style.visibility = 'visible';
                    elements.controlPanel.classList.add('visible');
                    elements.controlPanel.classList.add('show');
                    
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
                                
                                // Force control panel visibility after loading
                                setTimeout(() => {
                                    console.log('Forcing control panel visibility...');
                                    elements.controlPanel.style.display = 'flex';
                                    elements.controlPanel.style.opacity = '1';
                                    elements.controlPanel.style.visibility = 'visible';
                                    elements.controlPanel.style.position = 'fixed';
                                    elements.controlPanel.style.bottom = '20px';
                                    elements.controlPanel.style.left = '50%';
                                    elements.controlPanel.style.transform = 'translateX(-50%)';
                                    elements.controlPanel.style.zIndex = '9999';
                                    
                                    // Also ensure buttons are visible
                                    [elements.prevBtn, elements.nextBtn, elements.vrToggle, elements.fullscreenBtn].forEach(btn => {
                                        if (btn) {
                                            btn.style.display = 'flex';
                                            btn.style.opacity = '1';
                                            btn.style.visibility = 'visible';
                                        }
                                    });
                                    
                                    console.log('Control panel forced visible:', elements.controlPanel.style.display);
                                }, 500);
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
            disableVRControls();
        }

        if (state.isFullscreen) {
            state.isFullscreen = false;
            elements.fullscreenBtn.classList.remove('active');
            elements.fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            exitFullscreenMode();
        }
        
        elements.vrContainer.style.opacity = '0';
        elements.backToHome.style.opacity = '0';
        
        // Hide control panel
        elements.controlPanel.style.opacity = '0';
        elements.controlPanel.style.visibility = 'hidden';
        elements.controlPanel.classList.remove('visible');
        elements.controlPanel.classList.remove('show');
        
        elements.vrNavControls.style.opacity = '0';
        
        setTimeout(() => {
            elements.homePage.style.display = 'block';
            elements.vrContainer.style.display = 'none';
            elements.backToHome.style.display = 'none';
            
            // Ensure control panel is hidden
            elements.controlPanel.style.display = 'none';
            
            elements.vrNavControls.style.display = 'none';
            elements.mediaInfo.classList.remove('visible');
            elements.loadingMessage.style.display = 'none';
            
            state.isInVRView = false; // Reset VR view state
            
            setTimeout(() => {
                elements.homePage.style.opacity = '1';
                elements.vrContainer.style.opacity = '1';
                elements.backToHome.style.opacity = '1';
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
    
    // Navigation controls setup with enhanced functionality
    function setupNavigationControls() {
        // Previous button with enhanced feedback
        if (elements.prevBtn) {
            elements.prevBtn.addEventListener('click', function() {
                if (!state.skyImageLoaded || state.isTransitioning) return;
                
                this.style.transform = 'scale(0.85)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 150);
                
                const categoryItems = Array.from(document.querySelectorAll(`.image-item[data-category="${state.currentCategory}"]`));
                
                if (state.currentMediaIndex > 0) {
                    state.currentMediaIndex--;
                    const prevImage = categoryItems[state.currentMediaIndex];
                    const imgSrc = prevImage.getAttribute('data-src');
                    const mediaName = prevImage.querySelector('.image-caption').textContent;
                    
                    loadSkyTexture(imgSrc, mediaName);
                    
                    // Update button states
                    updateNavigationButtonStates(categoryItems.length);
                } else {
                    this.classList.add('disabled');
                    
                    setTimeout(() => {
                        this.classList.remove('disabled');
                    }, 1000);
                    
                    showNotification('<i class="fas fa-info-circle"></i> First item in this category');
                }
            });
        }
        
        // Next button with enhanced feedback
        if (elements.nextBtn) {
            elements.nextBtn.addEventListener('click', function() {
                if (!state.skyImageLoaded || state.isTransitioning) return;
                
                this.style.transform = 'scale(0.85)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 150);
                
                const categoryItems = Array.from(document.querySelectorAll(`.image-item[data-category="${state.currentCategory}"]`));
                
                if (state.currentMediaIndex < categoryItems.length - 1) {
                    state.currentMediaIndex++;
                    const nextImage = categoryItems[state.currentMediaIndex];
                    const imgSrc = nextImage.getAttribute('data-src');
                    const mediaName = nextImage.querySelector('.image-caption').textContent;
                    
                    loadSkyTexture(imgSrc, mediaName);
                    
                    // Update button states
                    updateNavigationButtonStates(categoryItems.length);
                } else {
                    this.classList.add('disabled');
                    
                    setTimeout(() => {
                        this.classList.remove('disabled');
                    }, 1000);
                    
                    showNotification('<i class="fas fa-info-circle"></i> Last item in this category');
                }
            });
        }
        
        // VR toggle button with enhanced functionality
        if (elements.vrToggle) {
            elements.vrToggle.addEventListener('click', function() {
                this.style.transform = 'scale(0.85)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 150);
                
                toggleVRMode();
            });
        }

        // Fullscreen toggle button
        if (elements.fullscreenBtn) {
            elements.fullscreenBtn.addEventListener('click', function() {
                this.style.transform = 'scale(0.85)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 150);
                
                toggleFullscreen();
            });
        }
        
        // Enhanced vertical navigation controls
        if (elements.lookUpBtn) {
            elements.lookUpBtn.addEventListener('click', function() {
                this.style.transform = 'scale(0.9)';
                setTimeout(() => this.style.transform = '', 150);
                lookUp();
            });
        }
        
        if (elements.lookDownBtn) {
            elements.lookDownBtn.addEventListener('click', function() {
                this.style.transform = 'scale(0.9)';
                setTimeout(() => this.style.transform = '', 150);
                lookDown();
            });
        }
        
        // Setup horizontal controls for mobile
        setupMobileControls();
    }

    // Setup mobile horizontal and vertical controls
    function setupMobileControls() {
        const lookLeftBtn = elements.lookLeftBtn;
        const lookRightBtn = elements.lookRightBtn;
        const recenterBtn = elements.recenterBtn;
        
        if (lookLeftBtn) {
            lookLeftBtn.addEventListener('click', function() {
                if (!state.skyImageLoaded || state.isTransitioning) return;
                
                state.cameraRotation.y -= state.ROTATION_STEP * 2;
                updateCameraRotation();
                
                this.style.transform = 'scale(0.9)';
                setTimeout(() => this.style.transform = '', 200);
            });
        }
        
        if (lookRightBtn) {
            lookRightBtn.addEventListener('click', function() {
                if (!state.skyImageLoaded || state.isTransitioning) return;
                
                state.cameraRotation.y += state.ROTATION_STEP * 2;
                updateCameraRotation();
                
                this.style.transform = 'scale(0.9)';
                setTimeout(() => this.style.transform = '', 200);
            });
        }
        
        if (recenterBtn) {
            recenterBtn.addEventListener('click', function() {
                if (!state.skyImageLoaded || state.isTransitioning) return;
                
                // Reset camera to default position
                state.cameraRotation = { x: 0, y: -90, z: 0 };
                updateCameraRotation();
                
                this.style.transform = 'scale(0.9)';
                setTimeout(() => this.style.transform = '', 200);
                
                showNotification('<i class="fas fa-crosshairs"></i> View recentered');
            });
        }
    }

    // Update navigation button states
    function updateNavigationButtonStates(totalItems) {
        if (elements.prevBtn && elements.nextBtn) {
            // Update previous button
            if (state.currentMediaIndex <= 0) {
                elements.prevBtn.style.opacity = '0.5';
            } else {
                elements.prevBtn.style.opacity = '1';
            }
            
            // Update next button
            if (state.currentMediaIndex >= totalItems - 1) {
                elements.nextBtn.style.opacity = '0.5';
            } else {
                elements.nextBtn.style.opacity = '1';
            }
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
                switch(e.key) {
                    case 'ArrowLeft':
                        elements.prevBtn.click();
                        break;
                    case 'ArrowRight':
                        elements.nextBtn.click();
                        break;
                    case 'ArrowUp':
                        lookUp();
                        break;
                    case 'ArrowDown':
                        lookDown();
                        break;
                    case 'a':
                    case 'A':
                        // Look left
                        state.cameraRotation.y -= state.ROTATION_STEP;
                        updateCameraRotation();
                        break;
                    case 'd':
                    case 'D':
                        // Look right
                        state.cameraRotation.y += state.ROTATION_STEP;
                        updateCameraRotation();
                        break;
                    case 'w':
                    case 'W':
                        // Look up
                        lookUp();
                        break;
                    case 's':
                    case 'S':
                        // Look down
                        lookDown();
                        break;
                    case 'r':
                    case 'R':
                        // Recenter view
                        state.cameraRotation = { x: 0, y: -90, z: 0 };
                        updateCameraRotation();
                        showNotification('<i class="fas fa-crosshairs"></i> View recentered');
                        break;
                    case 'Escape':
                        elements.backToHome.click();
                        break;
                    case 'v':
                    case 'V':
                        elements.vrToggle.click();
                        break;
                    case 'f':
                    case 'F':
                        elements.fullscreenBtn.click();
                        break;
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

    // Show mobile VR hint
    function showMobileVRHint() {
        if ('ontouchstart' in window && state.isInVRView) {
            const hint = elements.mobileVrHint;
            if (hint) {
                hint.style.display = 'block';
                setTimeout(() => {
                    hint.style.opacity = '1';
                }, 100);
                
                // Hide after 5 seconds
                setTimeout(() => {
                    hint.style.opacity = '0';
                    setTimeout(() => {
                        hint.style.display = 'none';
                    }, 500);
                }, 5000);
            }
        }
    }

    // Setup VR mode indicator
    function setupVRModeIndicator() {
        const indicator = document.getElementById('vr-mode-indicator');
        if (indicator) {
            // Show/hide based on VR mode state
            if (state.isVRMode) {
                indicator.style.display = 'flex';
                setTimeout(() => {
                    indicator.style.opacity = '1';
                }, 100);
            } else {
                indicator.style.opacity = '0';
                setTimeout(() => {
                    indicator.style.display = 'none';
                }, 500);
            }
        }
    }

    // Debug function to check element visibility
    function debugControlPanel() {
        console.log('=== Control Panel Debug ===');
        console.log('Control Panel Element:', elements.controlPanel);
        console.log('Control Panel Display:', elements.controlPanel ? elements.controlPanel.style.display : 'NOT FOUND');
        console.log('Control Panel Opacity:', elements.controlPanel ? elements.controlPanel.style.opacity : 'NOT FOUND');
        console.log('Control Panel Classes:', elements.controlPanel ? elements.controlPanel.className : 'NOT FOUND');
        console.log('Prev Button:', elements.prevBtn);
        console.log('Next Button:', elements.nextBtn);
        console.log('VR Toggle:', elements.vrToggle);
        console.log('Fullscreen Button:', elements.fullscreenBtn);
        console.log('VR Container Display:', elements.vrContainer ? elements.vrContainer.style.display : 'NOT FOUND');
        console.log('=== End Debug ===');
    }

    // Force control panel visibility function
    function forceControlPanelVisible() {
        if (elements.controlPanel) {
            elements.controlPanel.style.display = 'flex';
            elements.controlPanel.style.opacity = '1';
            elements.controlPanel.style.visibility = 'visible';
            elements.controlPanel.style.position = 'fixed';
            elements.controlPanel.style.bottom = '20px';
            elements.controlPanel.style.left = '50%';
            elements.controlPanel.style.transform = 'translateX(-50%)';
            elements.controlPanel.style.zIndex = '9999';
            elements.controlPanel.style.background = 'rgba(255, 255, 255, 0.95)';
            elements.controlPanel.style.padding = '10px 20px';
            elements.controlPanel.style.borderRadius = '50px';
            elements.controlPanel.style.gap = '15px';
            elements.controlPanel.classList.add('visible', 'show');
            
            console.log('Control panel forced visible');
            debugControlPanel();
        } else {
            console.error('Control panel element not found!');
        }
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
        
        // Check for WebXR support
        checkWebXRSupport();
        
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
            
            // Add VR mode change listeners
            scene.addEventListener('enter-vr', function() {
                console.log('Entered VR mode');
                state.isVRMode = true;
                elements.vrToggle.classList.add('active');
                setupVRModeIndicator();
                showNotification('<i class="fas fa-vr-cardboard"></i> VR headset mode active!');
            });
            
            scene.addEventListener('exit-vr', function() {
                console.log('Exited VR mode');
                state.isVRMode = false;
                elements.vrToggle.classList.remove('active');
                setupVRModeIndicator();
                showNotification('<i class="fas fa-desktop"></i> Returned to desktop mode');
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
        
        // Setup mobile VR hint element
        const mobileHint = document.getElementById('mobile-vr-hint');
        if (mobileHint && 'ontouchstart' in window) {
            console.log('Mobile device detected - VR hints enabled');
        }
        
        // Setup all other components
        setupImageItemClicks();
        setupNavigationControls();
        setupScrollHandling();
        setupNavigationLinks();
        setupDepartmentTabs();
        setupKeyboardControls();
        setupFullscreenEvents();
        
        // Debug control panel on initialization
        console.log('Initializing - checking control panel...');
        debugControlPanel();
        
        // Set up a global click handler to debug when images are clicked
        document.addEventListener('click', function(e) {
            if (e.target.closest('.image-item')) {
                console.log('Image item clicked, should show control panel...');
                setTimeout(() => {
                    debugControlPanel();
                    forceControlPanelVisible();
                }, 1000);
            }
        });
        
        // Error handling for A-Frame
        window.addEventListener('error', function(e) {
            if (e.message && e.message.includes('A-Frame')) {
                console.warn('A-Frame error caught:', e.message);
                // Continue execution despite A-Frame warnings
            }
        });

        // Ensure proper cleanup on page unload
        window.addEventListener('beforeunload', function() {
            // Exit VR mode if active
            if (state.isVRMode) {
                const scene = document.querySelector('a-scene');
                if (scene && scene.exitVR) {
                    scene.exitVR();
                }
            }
            
            // Exit fullscreen if active
            if (state.isFullscreen && document.exitFullscreen) {
                document.exitFullscreen();
            }
        });

        // Performance optimization for mobile
        if ('ontouchstart' in window) {
            // Reduce texture quality for better performance
            const scene = document.querySelector('a-scene');
            if (scene) {
                scene.setAttribute('renderer', {
                    antialias: false,
                    maxCanvasWidth: 1920,
                    maxCanvasHeight: 1920,
                    powerPreference: 'high-performance'
                });
            }
        }
        
        console.log('Application initialized successfully!');
        
        // Show initial instructions
        setTimeout(() => {
            if (window.DeviceOrientationEvent && 'ontouchstart' in window) {
                showNotification('<i class="fas fa-mobile-alt"></i> Mobile VR ready! Click any image to start your 360° journey', 4000);
            } else if (state.isWebXRSupported) {
                showNotification('<i class="fas fa-vr-cardboard"></i> VR headset detected! Click any image to start your immersive tour', 4000);
            }
        }, 2000);
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
    // Trigger DOMContentLoaded event manually
    window.dispatchEvent(new Event('DOMContentLoaded'));
}
