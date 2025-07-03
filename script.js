// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing VR Tour...');
    
    // Performance optimization - cache frequently used selectors
    const selectors = {
        welcomeScreen: '#welcome-screen',
        enterButton: '#enter-button',
        homePage: '#home-page',
        backToHome: '#back-to-home',
        mediaInfo: '#media-info',
        currentMediaName: '#current-media-name',
        prevBtn: '#prev-btn',
        nextBtn: '#next-btn',
        fullscreenBtn: '#fullscreen-btn',
        vrContainer: '#vr-container',
        controlPanel: '#control-panel',
        loadingMessage: '#loading-message',
        backToTop: '#back-to-top',
        navItems: '.nav-item',
        sections: '.section',
        vrNavControls: '#vr-nav-controls',
        lookUpBtn: '#look-up-btn',
        lookDownBtn: '#look-down-btn',
        mainCamera: '#main-camera',
        imageItems: '.image-item',
        mainSky: '#main-sky',
        assets: 'a-assets',
        vrToggle: '#vr-toggle',
        mobileVrHint: '#mobile-vr-hint',
        lookLeftBtn: '#look-left-btn',
        lookRightBtn: '#look-right-btn',
        recenterBtn: '#recenter-btn'
    };
    
    // Cache DOM elements with performance optimization
    const elements = {};
    Object.keys(selectors).forEach(key => {
        if (selectors[key].startsWith('.')) {
            elements[key] = document.querySelectorAll(selectors[key]);
        } else {
            elements[key] = document.querySelector(selectors[key]);
        }
    });
    
    // Check if essential elements exist
    if (!elements.enterButton) {
        console.error('Enter button not found!');
        return;
    }
    
    console.log('Enter button found:', elements.enterButton);
    
    // Global state with performance optimizations
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
        isMouseDown: false,
        imageCache: new Map(),
        preloadedImages: new Set(),
        loadingQueue: []
    };
    
    // Image preloading and caching system
    const ImageLoader = {
        cache: new Map(),
        loadingPromises: new Map(),
        
        // Preload critical images
        preloadCritical: function() {
            const criticalImages = [
                'https://res.cloudinary.com/dugxrvrs5/image/upload/f_auto,q_auto,w_1024/v1743753190/20250404_131710_587_formphotoeditor.com_wjfmhk.jpg',
                'https://res.cloudinary.com/dugxrvrs5/image/upload/v1750315076/entrance_jgbfdn.jpg',
                'https://res.cloudinary.com/dugxrvrs5/image/upload/v1750315079/kovil_xj0psx.jpg',
                'https://res.cloudinary.com/dugxrvrs5/image/upload/v1750315074/central_library_oxukdy.jpg'
            ];
            
            criticalImages.forEach(url => this.preload(url));
        },
        
        // Preload image with promise caching
        preload: function(url) {
            if (this.cache.has(url)) {
                return Promise.resolve(this.cache.get(url));
            }
            
            if (this.loadingPromises.has(url)) {
                return this.loadingPromises.get(url);
            }
            
            const promise = new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                
                img.onload = () => {
                    this.cache.set(url, img);
                    this.loadingPromises.delete(url);
                    resolve(img);
                };
                
                img.onerror = (error) => {
                    this.loadingPromises.delete(url);
                    reject(error);
                };
                
                img.src = url;
            });
            
            this.loadingPromises.set(url, promise);
            return promise;
        },
        
        // Get cached image or load
        get: function(url) {
            if (this.cache.has(url)) {
                return Promise.resolve(this.cache.get(url));
            }
            return this.preload(url);
        },
        
        // Preload images in viewport
        preloadVisible: function() {
            const visibleItems = Array.from(elements.imageItems).filter(item => {
                const rect = item.getBoundingClientRect();
                return rect.top < window.innerHeight + 200 && rect.bottom > -200;
            });
            
            visibleItems.forEach(item => {
                const imgSrc = item.getAttribute('data-src');
                if (imgSrc && !this.cache.has(imgSrc)) {
                    this.preload(imgSrc);
                }
            });
        }
    };
    
    // Setup optimized lazy loading with intersection observer
    function setupLazyLoading() {
        const lazyImages = document.querySelectorAll('.lazy-image');
        
        if ('IntersectionObserver' in window) {
            const lazyImageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const pictureElement = img.closest('picture');
                        
                        if (pictureElement) {
                            // Use optimized loading
                            img.setAttribute('data-loaded', 'true');
                            
                            const parent = img.closest('.image-item');
                            if (parent) {
                                const placeholder = parent.querySelector('.image-placeholder');
                                if (placeholder) {
                                    placeholder.style.opacity = '0';
                                    setTimeout(() => placeholder.remove(), 300);
                                }
                                
                                // Use requestAnimationFrame for smoother animation
                                requestAnimationFrame(() => {
                                    parent.classList.add('loaded');
                                });
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
            // Fallback with performance optimization
            lazyImages.forEach(img => {
                img.setAttribute('data-loaded', 'true');
                const parent = img.closest('.image-item');
                if (parent) {
                    const placeholder = parent.querySelector('.image-placeholder');
                    if (placeholder) {
                        placeholder.style.opacity = '0';
                        setTimeout(() => placeholder.remove(), 300);
                    }
                    requestAnimationFrame(() => {
                        parent.classList.add('loaded');
                    });
                }
            });
        }
    }
    
    // Animate sections with performance optimization
    function setupSectionAnimation() {
        if ('IntersectionObserver' in window) {
            const sectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const section = entry.target;
                        requestAnimationFrame(() => {
                            section.classList.add('visible');
                        });
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
    
    // Optimized A-Frame scene checker with timeout
    function waitForAFrameScene() {
        return new Promise((resolve) => {
            const scene = document.querySelector('a-scene');
            if (scene && scene.hasLoaded) {
                resolve();
                return;
            }
            
            let attempts = 0;
            const maxAttempts = 30; // 3 seconds max
            
            const checkInterval = setInterval(() => {
                attempts++;
                if ((scene && scene.hasLoaded) || attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        });
    }
    
    // Optimized 360° image loading with caching
    function loadSkyTexture(imgSrc, mediaName) {
        if (state.isTransitioning) return;
        state.isTransitioning = true;
        state.skyImageLoaded = false;
        
        // Show loading immediately
        elements.loadingMessage.style.display = 'block';
        elements.loadingMessage.style.opacity = '1';
        elements.loadingMessage.innerHTML = 'Loading 360° view...<div class="loading-spinner"></div>';
        
        // Reset camera rotation
        state.cameraRotation = { x: 0, y: -90, z: 0 };
        if (elements.mainCamera) {
            elements.mainCamera.setAttribute('rotation', `${state.cameraRotation.x} ${state.cameraRotation.y} ${state.cameraRotation.z}`);
        }
        
        // Use cached image loading for faster performance
        ImageLoader.get(imgSrc).then(img => {
            return waitForAFrameScene().then(() => {
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
                
                // Force A-Frame to recognize the new asset with minimal delay
                requestAnimationFrame(() => {
                    elements.mainSky.setAttribute('src', '#current-sky-image');
                    
                    // Force scene refresh if needed
                    const scene = document.querySelector('a-scene');
                    if (scene && scene.renderer) {
                        scene.renderer.render(scene.object3D, scene.camera);
                    }
                    
                    // Faster hiding of loading message
                    requestAnimationFrame(() => {
                        elements.loadingMessage.style.opacity = '0';
                        setTimeout(() => {
                            elements.loadingMessage.style.display = 'none';
                        }, 300);
                        
                        elements.currentMediaName.textContent = mediaName;
                        elements.mediaInfo.innerHTML = `Currently viewing: <strong>${mediaName}</strong>`;
                        elements.mediaInfo.classList.add('visible');
                        elements.vrNavControls.style.display = 'flex';
                        
                        setTimeout(() => {
                            elements.mediaInfo.classList.remove('visible');
                        }, 4000);
                        
                        state.skyImageLoaded = true;
                        state.isTransitioning = false;
                        
                        // Force control panel to be visible
                        requestAnimationFrame(() => {
                            forceControlPanelVisible();
                        });
                        
                        if (!state.isVRMode && !state.isFullscreen) {
                            setTimeout(() => {
                                showNotification('<i class="fas fa-info-circle"></i> Tip: Click VR button for enhanced experience, or fullscreen for immersive view', 5000);
                            }, 1000);
                        }
                    });
                });
            });
        }).catch(error => {
            console.error('Error loading 360° image:', imgSrc, error);
            elements.loadingMessage.innerHTML = 'Error loading image. Please try another view.<div class="loading-spinner" style="border-top-color: #ff5252;"></div>';
            
            setTimeout(() => {
                elements.backToHome.click();
                state.isTransitioning = false;
            }, 3000);
        });
    }
    
    // Optimized WebXR support check
    function checkWebXRSupport() {
        if ('xr' in navigator) {
            navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
                state.isWebXRSupported = supported;
                console.log('WebXR VR support:', supported);
                if (supported) {
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
        if (!state.isInVRView) {
            showNotification('Please select an image first to enable VR mode');
            return;
        }
        
        if (!state.isVRMode) {
            state.isVRMode = true;
            elements.vrToggle.classList.add('active');
            
            if (state.isWebXRSupported && navigator.xr) {
                const scene = document.querySelector('a-scene');
                if (scene) {
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
            
            const scene = document.querySelector('a-scene');
            if (scene && scene.is('vr-mode')) {
                scene.exitVR();
            }
            
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
            camera.setAttribute('look-controls', {
                'reverseMouseDrag': false,
                'touchEnabled': true,
                'magicWindowTrackingEnabled': true,
                'pointerLockEnabled': false,
                'mouseSensitivity': 0.8,
                'touchSensitivity': 0.8
            });
            
            camera.setAttribute('tracked-controls', 'controller: 0');
        }
        
        enableHandControllers();
        showVRInstructions();
    }

    // Enable hand controllers for VR headsets
    function enableHandControllers() {
        const scene = document.querySelector('a-scene');
        if (scene) {
            const leftHand = document.createElement('a-entity');
            leftHand.setAttribute('id', 'leftHand');
            leftHand.setAttribute('laser-controls', 'hand: left');
            leftHand.setAttribute('raycaster', 'objects: .clickable');
            scene.appendChild(leftHand);
            
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
            camera.setAttribute('look-controls', {
                'reverseMouseDrag': false,
                'touchEnabled': true,
                'magicWindowTrackingEnabled': true,
                'pointerLockEnabled': false,
                'mouseSensitivity': 1.2,
                'touchSensitivity': 1.2
            });
        }
        
        setupTouchControls();
        setupDeviceOrientation();
        showVRInstructions();
    }

    // Setup optimized touch controls for mobile
    function setupTouchControls() {
        const vrContainer = elements.vrContainer;
        
        // Use passive event listeners for better performance
        vrContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
        vrContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
        vrContainer.addEventListener('touchend', handleTouchEnd, { passive: true });
        
        vrContainer.addEventListener('mousedown', handleMouseStart, { passive: true });
        vrContainer.addEventListener('mousemove', handleMouseMove, { passive: true });
        vrContainer.addEventListener('mouseup', handleMouseEnd, { passive: true });
        
        vrContainer.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    // Optimized touch/mouse event handlers
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
            
            state.cameraRotation.y = state.touchStartRotation.y + (deltaX * 0.5);
            state.cameraRotation.x = Math.max(-80, Math.min(80, 
                state.touchStartRotation.x - (deltaY * 0.3)
            ));
            
            updateCameraRotation();
            e.preventDefault();
        }
    }

    function handleTouchEnd(e) {
        state.touchStartX = 0;
        state.touchStartY = 0;
    }

    function handleMouseStart(e) {
        if (e.button === 0) {
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
            
            state.cameraRotation.y = state.touchStartRotation.y + (deltaX * 0.3);
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
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                DeviceOrientationEvent.requestPermission()
                    .then(permissionState => {
                        if (permissionState === 'granted') {
                            window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true });
                            showNotification('<i class="fas fa-mobile-alt"></i> Device orientation enabled - Move your phone to look around!', 3000);
                        }
                    })
                    .catch(console.error);
            } else {
                window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true });
                showNotification('<i class="fas fa-mobile-alt"></i> Device orientation enabled - Move your phone to look around!', 3000);
            }
        }
    }

    function handleDeviceOrientation(e) {
        if (state.skyImageLoaded && state.isVRMode) {
            const alpha = e.alpha || 0;
            const beta = e.beta || 0;
            const gamma = e.gamma || 0;
            
            state.cameraRotation.y = -alpha;
            state.cameraRotation.x = Math.max(-80, Math.min(80, beta - 90));
            
            updateCameraRotation();
        }
    }

    // Optimized camera rotation update
    function updateCameraRotation() {
        if (elements.mainCamera) {
            requestAnimationFrame(() => {
                elements.mainCamera.setAttribute('rotation', 
                    `${state.cameraRotation.x} ${state.cameraRotation.y} ${state.cameraRotation.z}`
                );
            });
        }
    }

    // Disable VR controls
    function disableVRControls() {
        const camera = elements.mainCamera;
        if (camera) {
            camera.setAttribute('look-controls', {
                'reverseMouseDrag': false,
                'touchEnabled': true,
                'magicWindowTrackingEnabled': true,
                'pointerLockEnabled': false,
                'mouseSensitivity': 1,
                'touchSensitivity': 1
            });
        }
        
        const leftHand = document.getElementById('leftHand');
        const rightHand = document.getElementById('rightHand');
        if (leftHand) leftHand.remove();
        if (rightHand) rightHand.remove();
        
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

    // Optimized fullscreen toggle function
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
        const requestFullscreen = vrContainerElement.requestFullscreen ||
                                 vrContainerElement.mozRequestFullScreen ||
                                 vrContainerElement.webkitRequestFullscreen ||
                                 vrContainerElement.msRequestFullscreen;
        
        if (requestFullscreen) {
            requestFullscreen.call(vrContainerElement);
        }
        showNotification('<i class="fas fa-expand"></i> Fullscreen mode enabled');
    }
    
    // Exit fullscreen mode
    function exitFullscreenMode() {
        const exitFullscreen = document.exitFullscreen ||
                              document.mozCancelFullScreen ||
                              document.webkitExitFullscreen ||
                              document.msExitFullscreen;
        
        if (exitFullscreen) {
            exitFullscreen.call(document);
        }
    }
    
    // Handle fullscreen change events
    function handleFullscreenChange() {
        const isCurrentlyFullscreen = !!(document.fullscreenElement || 
                                        document.mozFullScreenElement || 
                                        document.webkitFullscreenElement || 
                                        document.msFullscreenElement);
        
        if (!isCurrentlyFullscreen && state.isFullscreen) {
            state.isFullscreen = false;
            elements.fullscreenBtn.classList.remove('active');
            elements.fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            showNotification('<i class="fas fa-compress"></i> Exited fullscreen mode');
        }
    }

    // Optimized notification system
    function showNotification(message, duration = 2000) {
        elements.mediaInfo.innerHTML = message;
        elements.mediaInfo.classList.add('visible');
        
        clearTimeout(state.notificationTimeout);
        state.notificationTimeout = setTimeout(() => {
            elements.mediaInfo.classList.remove('visible');
        }, duration);
    }
    
    // Look up function
    function lookUp() {
        if (!state.skyImageLoaded || state.isTransitioning) return;
        
        state.cameraRotation.x = Math.max(state.cameraRotation.x - state.ROTATION_STEP, -80);
        updateCameraRotation();
        
        elements.lookUpBtn.style.transform = 'scale(0.9)';
        setTimeout(() => elements.lookUpBtn.style.transform = '', 200);
    }
    
    // Look down function
    function lookDown() {
        if (!state.skyImageLoaded || state.isTransitioning) return;
        
        state.cameraRotation.x = Math.min(state.cameraRotation.x + state.ROTATION_STEP, 80);
        updateCameraRotation();
        
        elements.lookDownBtn.style.transform = 'scale(0.9)';
        setTimeout(() => elements.lookDownBtn.style.transform = '', 200);
    }
    
    // Optimized image item click handling
    function setupImageItemClicks() {
        elements.imageItems.forEach(item => {
            item.addEventListener('click', function() {
                if (state.isTransitioning) return;
                
                const imgSrc = this.getAttribute('data-src');
                if (!imgSrc || imgSrc === '') {
                    showNotification('<i class="fas fa-exclamation-triangle"></i> Image not available');
                    return;
                }
                
                const mediaName = this.querySelector('.image-caption').textContent;
                const category = this.getAttribute('data-category');
                
                // Preload the image before transitioning
                ImageLoader.preload(imgSrc).then(() => {
                    elements.homePage.style.opacity = '0';
                    
                    setTimeout(() => {
                        elements.homePage.style.display = 'none';
                        elements.vrContainer.style.display = 'block';
                        elements.backToHome.style.display = 'block';
                        
                        forceControlPanelVisible();
                        elements.vrNavControls.style.display = 'flex';
                        
                        state.currentCategory = category;
                        state.isInVRView = true;
                        const categoryItems = Array.from(document.querySelectorAll(`.image-item[data-category="${category}"]`));
                        state.currentMediaIndex = categoryItems.indexOf(this);
                        
                        setTimeout(() => {
                            const scene = document.querySelector('a-scene');
                            if (scene) {
                                window.dispatchEvent(new Event('resize'));
                                
                                setTimeout(() => {
                                    loadSkyTexture(imgSrc, mediaName);
                                    
                                    setTimeout(() => {
                                        forceControlPanelVisible();
                                    }, 300);
                                }, 200);
                            } else {
                                loadSkyTexture(imgSrc, mediaName);
                            }
                        }, 100);
                    }, 400);
                }).catch(error => {
                    console.error('Failed to preload image:', error);
                    showNotification('<i class="fas fa-exclamation-triangle"></i> Failed to load image');
                });
            });
        });
    }
    
    // Optimized back to home function
    function backToHomePage() {
        if (state.isTransitioning) return;
        state.isTransitioning = true;
        
        console.log('Returning to home page...');
        
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
        elements.controlPanel.style.opacity = '0';
        elements.controlPanel.style.visibility = 'hidden';
        elements.vrNavControls.style.opacity = '0';
        
        setTimeout(() => {
            elements.homePage.style.display = 'block';
            elements.vrContainer.style.display = 'none';
            elements.backToHome.style.display = 'none';
            elements.controlPanel.style.display = 'none';
            elements.vrNavControls.style.display = 'none';
            elements.mediaInfo.classList.remove('visible');
            elements.loadingMessage.style.display = 'none';
            
            state.isInVRView = false;
            
            requestAnimationFrame(() => {
                elements.homePage.style.opacity = '1';
                elements.vrContainer.style.opacity = '1';
                elements.backToHome.style.opacity = '1';
                elements.vrNavControls.style.opacity = '1';
                state.isTransitioning = false;
            });
        }, 300);
    }
    
    // Optimized show home page function
    function showHomePage() {
        console.log('Showing home page...');
        
        elements.welcomeScreen.style.opacity = '0';
        elements.welcomeScreen.style.transform = 'scale(1.1)';
        
        setTimeout(() => {
            elements.welcomeScreen.style.display = 'none';
            elements.homePage.style.display = 'block';
            
            requestAnimationFrame(() => {
                elements.homePage.style.opacity = '1';
                setupSectionAnimation();
                setupLazyLoading();
                
                // Preload visible images
                setTimeout(() => {
                    ImageLoader.preloadVisible();
                }, 1000);
                
                console.log('Home page displayed successfully');
            });
        }, 600);
    }
    // Navigation controls setup with optimizations
    function setupNavigationControls() {
        // Previous button with debouncing
        if (elements.prevBtn) {
            let prevBtnTimeout;
            elements.prevBtn.addEventListener('click', function() {
                if (!state.skyImageLoaded || state.isTransitioning || prevBtnTimeout) return;
                
                prevBtnTimeout = setTimeout(() => {
                    prevBtnTimeout = null;
                }, 300);
                
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
                    
                    // Preload before loading
                    ImageLoader.preload(imgSrc).then(() => {
                        loadSkyTexture(imgSrc, mediaName);
                        updateNavigationButtonStates(categoryItems.length);
                    });
                } else {
                    this.classList.add('disabled');
                    setTimeout(() => {
                        this.classList.remove('disabled');
                    }, 1000);
                    showNotification('<i class="fas fa-info-circle"></i> First item in this category');
                }
            });
        }
        
        // Next button with debouncing
        if (elements.nextBtn) {
            let nextBtnTimeout;
            elements.nextBtn.addEventListener('click', function() {
                if (!state.skyImageLoaded || state.isTransitioning || nextBtnTimeout) return;
                
                nextBtnTimeout = setTimeout(() => {
                    nextBtnTimeout = null;
                }, 300);
                
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
                    
                    // Preload before loading
                    ImageLoader.preload(imgSrc).then(() => {
                        loadSkyTexture(imgSrc, mediaName);
                        updateNavigationButtonStates(categoryItems.length);
                    });
                } else {
                    this.classList.add('disabled');
                    setTimeout(() => {
                        this.classList.remove('disabled');
                    }, 1000);
                    showNotification('<i class="fas fa-info-circle"></i> Last item in this category');
                }
            });
        }
        
        // VR toggle button
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
            elements.prevBtn.style.opacity = state.currentMediaIndex <= 0 ? '0.5' : '1';
            elements.nextBtn.style.opacity = state.currentMediaIndex >= totalItems - 1 ? '0.5' : '1';
        }
    }
    
    // Optimized scroll handling with throttling
    function setupScrollHandling() {
        let scrollTimeout;
        window.addEventListener('scroll', function() {
            if (scrollTimeout) return;
            
            scrollTimeout = setTimeout(() => {
                if (window.scrollY > 300) {
                    elements.backToTop.classList.add('visible');
                } else {
                    elements.backToTop.classList.remove('visible');
                }
                updateActiveNavItem();
                
                // Preload visible images on scroll
                ImageLoader.preloadVisible();
                
                scrollTimeout = null;
            }, 16); // ~60fps
        }, { passive: true });
        
        if (elements.backToTop) {
            elements.backToTop.addEventListener('click', function() {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        }
        }
    
    // Optimized active navigation update
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
    
    // Navigation links setup with performance optimization
    function setupNavigationLinks() {
        elements.navItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                
                elements.navItems.forEach(navItem => navItem.classList.remove('active'));
                this.classList.add('active');
                
                const targetId = this.getAttribute('href');
                const targetSection = document.querySelector(targetId);
                
                if (targetSection) {
                    const targetPosition = targetSection.offsetTop - 180;
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                    
                    // Preload images in target section
                    setTimeout(() => {
                        const sectionImages = targetSection.querySelectorAll('.image-item[data-src]');
                        sectionImages.forEach(item => {
                            const imgSrc = item.getAttribute('data-src');
                            if (imgSrc) {
                                ImageLoader.preload(imgSrc);
                            }
                        });
                    }, 500);
                }
            });
        });
    }
    
    // Department tabs setup with lazy loading
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
                    
                    // Preload images in the active department
                    setTimeout(() => {
                        const deptImages = targetContent.querySelectorAll('.image-item[data-src]');
                        deptImages.forEach(item => {
                            const imgSrc = item.getAttribute('data-src');
                            if (imgSrc) {
                                ImageLoader.preload(imgSrc);
                            }
                        });
                    }, 300);
                }
            });
        });
    }
    
    // Optimized keyboard support with event delegation
    function setupKeyboardControls() {
        const keyHandler = function(e) {
            if (elements.vrContainer.style.display === 'block' && state.skyImageLoaded && !state.isTransitioning) {
                switch(e.key) {
                    case 'ArrowLeft':
                        e.preventDefault();
                        elements.prevBtn.click();
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        elements.nextBtn.click();
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        lookUp();
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        lookDown();
                        break;
                    case 'a':
                    case 'A':
                        state.cameraRotation.y -= state.ROTATION_STEP;
                        updateCameraRotation();
                        break;
                    case 'd':
                    case 'D':
                        state.cameraRotation.y += state.ROTATION_STEP;
                        updateCameraRotation();
                        break;
                    case 'w':
                    case 'W':
                        lookUp();
                        break;
                    case 's':
                    case 'S':
                        lookDown();
                        break;
                    case 'r':
                    case 'R':
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
        };
        
        document.addEventListener('keydown', keyHandler, { passive: false });
    }
    
    // Setup fullscreen change event listeners
    function setupFullscreenEvents() {
        const events = ['fullscreenchange', 'mozfullscreenchange', 'webkitfullscreenchange', 'msfullscreenchange'];
        events.forEach(event => {
            document.addEventListener(event, handleFullscreenChange, { passive: true });
        });
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

    // Optimized control panel visibility
    function forceControlPanelVisible() {
        if (elements.controlPanel) {
            requestAnimationFrame(() => {
                elements.controlPanel.style.display = 'flex';
                elements.controlPanel.style.opacity = '1';
                elements.controlPanel.style.visibility = 'visible';
                elements.controlPanel.style.position = 'fixed';
                elements.controlPanel.style.bottom = '20px';
                elements.controlPanel.style.left = '50%';
                elements.controlPanel.style.transform = 'translateX(-50%)';
                elements.controlPanel.style.zIndex = '9999';
                elements.controlPanel.classList.add('visible', 'show');
                
                console.log('Control panel forced visible');
            });
        } else {
            console.error('Control panel element not found!');
        }
    }
    
    // Performance optimization - throttle function
    function throttle(callback, delay) {
        let lastCall = 0;
        return function(...args) {
            const now = Date.now();
            if (now - lastCall < delay) {
                return;
            }
            lastCall = now;
            callback(...args);
        };
    }
    
    // Performance optimization - debounce function
    function debounce(callback, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => callback.apply(this, args), delay);
        };
    }
    
    // Initialize everything with performance optimizations
    function initialize() {
        console.log('Initializing application...');
        
        // Check for WebXR support
        checkWebXRSupport();
        
        // Preload critical images immediately
        ImageLoader.preloadCritical();
        
        // Setup A-Frame scene loading event with performance optimization
        const scene = document.querySelector('a-scene');
        if (scene) {
            scene.addEventListener('loaded', function() {
                console.log('A-Frame scene loaded and ready');
            }, { once: true });
            
            scene.addEventListener('materialized', function() {
                console.log('A-Frame scene materialized');
            }, { once: true });
            
            scene.addEventListener('enter-vr', function() {
                console.log('Entered VR mode');
                state.isVRMode = true;
                elements.vrToggle.classList.add('active');
                setupVRModeIndicator();
                showNotification('<i class="fas fa-vr-cardboard"></i> VR headset mode active!');
            }, { passive: true });
            
            scene.addEventListener('exit-vr', function() {
                console.log('Exited VR mode');
                state.isVRMode = false;
                elements.vrToggle.classList.remove('active');
                setupVRModeIndicator();
                showNotification('<i class="fas fa-desktop"></i> Returned to desktop mode');
            }, { passive: true });
        }
        
        // Setup event listeners with performance optimizations
        if (elements.enterButton) {
            console.log('Setting up enter button event listener...');
            elements.enterButton.addEventListener('click', function(e) {
                console.log('Enter button clicked!');
                e.preventDefault();
                showHomePage();
            }, { once: true });
            
            // Backup event listener
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
            elements.backToHome.addEventListener('click', backToHomePage, { passive: true });
        }
        
        // Setup all other components
        setupImageItemClicks();
        setupNavigationControls();
        setupScrollHandling();
        setupNavigationLinks();
        setupDepartmentTabs();
        setupKeyboardControls();
        setupFullscreenEvents();
        
        // Visibility optimization on scroll
        const visibilityObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const imgSrc = entry.target.getAttribute('data-src');
                    if (imgSrc) {
                        ImageLoader.preload(imgSrc);
                    }
                }
            });
        }, {
            rootMargin: '200px 0px',
            threshold: 0.01
        });
        
        elements.imageItems.forEach(item => {
            visibilityObserver.observe(item);
        });
        
        // Error handling for A-Frame with better recovery
        window.addEventListener('error', function(e) {
            if (e.message && e.message.includes('A-Frame')) {
                console.warn('A-Frame error caught:', e.message);
                // Continue execution despite A-Frame warnings
            }
        }, { passive: true });

        // Cleanup on page unload
        window.addEventListener('beforeunload', function() {
            if (state.isVRMode) {
                const scene = document.querySelector('a-scene');
                if (scene && scene.exitVR) {
                    scene.exitVR();
                }
            }
            
            if (state.isFullscreen && document.exitFullscreen) {
                document.exitFullscreen();
            }
        }, { passive: true });

        // Performance optimization for mobile
        if ('ontouchstart' in window) {
            const scene = document.querySelector('a-scene');
            if (scene) {
                scene.setAttribute('renderer', {
                    antialias: false,
                    maxCanvasWidth: 1920,
                    maxCanvasHeight: 1920,
                    powerPreference: 'high-performance',
                    precision: 'mediump'
                });
            }
        }
        
        console.log('Application initialized successfully!');
        
        // Show initial instructions with device detection
        setTimeout(() => {
            if (window.DeviceOrientationEvent && 'ontouchstart' in window) {
                showNotification('<i class="fas fa-mobile-alt"></i> Mobile VR ready! Click any image to start your 360° journey', 4000);
            } else if (state.isWebXRSupported) {
                showNotification('<i class="fas fa-vr-cardboard"></i> VR headset detected! Click any image to start your immersive tour', 4000);
            }
        }, 2000);
        
        // Additional performance optimizations
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                // Preload additional images during idle time
                const allImages = Array.from(elements.imageItems).slice(4, 12);
                allImages.forEach(item => {
                    const imgSrc = item.getAttribute('data-src');
                    if (imgSrc) {
                        ImageLoader.preload(imgSrc);
                    }
                });
            });
        }
    }
    
    // Start the application with performance monitoring
    console.time('App Initialization');
    initialize();
    console.timeEnd('App Initialization');
});

// Additional safety measure - if DOM is already loaded
if (document.readyState === 'loading') {
    console.log('DOM is still loading...');
} else {
    console.log('DOM already loaded, running initialization...');
    window.dispatchEvent(new Event('DOMContentLoaded'));
}

// Service Worker registration for caching (optional performance boost)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        // Register service worker for caching if available
        // This would require a separate service-worker.js file
        console.log('Service Worker support detected');
    });
}

// WebP detection for better image format support
function detectWebPSupport() {
    const webP = new Image();
    webP.onload = webP.onerror = function () {
        if (webP.height === 2) {
            document.documentElement.classList.add('webp');
        } else {
            document.documentElement.classList.add('no-webp');
        }
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
}

// Run WebP detection
detectWebPSupport();
