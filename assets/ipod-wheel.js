document.addEventListener('DOMContentLoaded', () => {
  const wheel = document.querySelector('.ipod-wheel-draggable');
  const menuBtn = document.querySelector('.ipod-menu-btn button');
  const menuWrapper = document.querySelector('.ipod-menu');
  const menuWrapperParent = document.querySelector('.ipod-menu-wrapper');
  const centerBtn = document.querySelector('.ipod-center-btn') || document.querySelector('.ipod-center-over');
  const leftBtn = document.querySelector('.ipod-left');
  const rightBtn = document.querySelector('.ipod-right-btn');
  const cursorCenter = document.querySelector('.ipod-center');
  const cartToggleBtn = document.querySelector('.ipod-menu button') || document.querySelector('.ipod-cart-toggle-btn');
  
  // Track active index states
  let currentIndex = 0;
  let maxIndex = 5; // Default fallback, will be synced dynamically from Coverflow
  let minIndex = 0;
  
  // Web Audio Context click sound synthesis
  let audioCtx = null;
  const playClickSound = () => {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.02);
      
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.02);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.02);
    } catch (e) {
      console.warn("AudioContext clicker skipped:", e);
    }
  };

  // Menu toggling
  let menuOpen = false;
  if (menuBtn && menuWrapper) {
    menuBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      menuOpen = !menuOpen;
      if (menuOpen) {
        menuWrapper.style.transform = 'translateY(0)';
        menuWrapper.classList.add('is-active');
        if (menuWrapperParent) menuWrapperParent.classList.add('is-active');
        menuBtn.textContent = '✕';
      } else {
        menuWrapper.style.transform = 'translateY(80px)';
        menuWrapper.classList.remove('is-active');
        if (menuWrapperParent) menuWrapperParent.classList.remove('is-active');
        menuBtn.textContent = 'menu';
      }
      playClickSound();
    });
  }

  // Cart Drawer toggling
  if (cartToggleBtn) {
    cartToggleBtn.classList.add('ipod-cart-toggle-btn');
    cartToggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.body.classList.toggle('cart-drawer-open');
      playClickSound();
    });
  }

  // Trigonometric Helpers matching the original Damso Next.js bundle
  const getAngleDegrees = (dx, dy) => {
    // 180 / Math.PI * (Math.atan2(-(n - t), -(r - e)) + Math.PI)
    // where r=0, n=0 -> Math.atan2(dy, dx) + Math.PI
    return (180 / Math.PI) * (Math.atan2(dy, dx) + Math.PI);
  };

  const normalizeAngle = (angle) => {
    let t = angle % 360;
    while (t < 0) t += 360;
    return t;
  };

  const getShortestAngleDiff = (a, b) => {
    let diff = Math.abs(a - b) % 360;
    return diff > 180 ? 360 - diff : diff;
  };

  const isClockwise = (a, b) => {
    // (!(e < 30) || !(t > 330)) && (e > 330 && t < 30 || e < t)
    return (!(a < 30) || !(b > 330)) && ((a > 330 && b < 30) || (a < b));
  };

  // Wheel Dragging & Rotation Mechanics
  if (wheel) {
    let isWheelDragging = false;
    let startAngle = null;
    let accumulatedDelta = 0;
    let wheelCenter = { x: 0, y: 0 };
    let initialIndex = 0;

    const updateWheelCenter = () => {
      const rect = wheel.getBoundingClientRect();
      wheelCenter.x = rect.left + rect.width / 2;
      wheelCenter.y = rect.top + rect.height / 2;
    };

    const handleStart = (e) => {
      isWheelDragging = true;
      updateWheelCenter();
      
      const clientX = (e.touches ? e.touches[0] : e).clientX;
      const clientY = (e.touches ? e.touches[0] : e).clientY;
      const dx = clientX - wheelCenter.x;
      const dy = clientY - wheelCenter.y;
      
      startAngle = getAngleDegrees(dx, dy);
      accumulatedDelta = 0;
      initialIndex = currentIndex;

      // Show cursor finger pointer
      if (cursorCenter) {
        cursorCenter.style.opacity = '1';
        gsap.set(cursorCenter, { rotation: startAngle + 90 });
      }
    };

    const handleMove = (e) => {
      if (!isWheelDragging) return;
      
      const clientX = (e.touches ? e.touches[0] : e).clientX;
      const clientY = (e.touches ? e.touches[0] : e).clientY;
      const dx = clientX - wheelCenter.x;
      const dy = clientY - wheelCenter.y;
      
      const currentAngle = getAngleDegrees(dx, dy);
      
      let normStart = normalizeAngle(startAngle);
      let normCurrent = normalizeAngle(currentAngle);
      let diff = getShortestAngleDiff(normStart, normCurrent);
      
      const cw = isClockwise(normStart, normCurrent);
      const stepDelta = cw ? diff : -diff;

      // Update total rotation tracking
      accumulatedDelta += stepDelta;
      startAngle = currentAngle;

      // Rotate the finger cursor element smoothly
      if (cursorCenter) {
        gsap.set(cursorCenter, { rotation: currentAngle + 90 });
      }

      // 36 degrees of rotation triggers index changes
      const indexShift = Math.round(accumulatedDelta / 36);
      let targetIndex = initialIndex + indexShift;

      if (targetIndex !== currentIndex) {
        currentIndex = targetIndex;
        playClickSound();

        // Dispatch updated index to Coverflow
        window.dispatchEvent(new CustomEvent('ipodIndexChanged', {
          detail: { index: currentIndex }
        }));
      }
    };

    const handleEnd = () => {
      if (!isWheelDragging) return;
      isWheelDragging = false;
      
      // Hide finger cursor
      if (cursorCenter) {
        cursorCenter.style.opacity = '0';
      }
    };

    wheel.addEventListener('mousedown', handleStart);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);

    wheel.addEventListener('touchstart', handleStart, { passive: true });
    window.addEventListener('touchmove', handleMove, { passive: true });
    window.addEventListener('touchend', handleEnd);
  }

  // Left & Right arrow nav buttons
  if (leftBtn) {
    leftBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      currentIndex--;
      playClickSound();
      window.dispatchEvent(new CustomEvent('ipodIndexChanged', {
        detail: { index: currentIndex }
      }));
    });
  }

  if (rightBtn) {
    rightBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      currentIndex++;
      playClickSound();
      window.dispatchEvent(new CustomEvent('ipodIndexChanged', {
        detail: { index: currentIndex }
      }));
    });
  }

  // Click on active center wheel button
  if (centerBtn) {
    centerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      playClickSound();
      window.dispatchEvent(new CustomEvent('ipodCenterPressed'));
    });
  }

  // Receive updates from Coverflow scrolling
  window.addEventListener('coverflowIndexChanged', (e) => {
    currentIndex = e.detail.index;
  });

  // Keep track of total slides
  const container = document.querySelector('#coverflow-container');
  if (container) {
    const slideCount = container.querySelectorAll('.coverflow-item').length;
    if (slideCount > 0) {
      maxIndex = slideCount - 1;
    }
  }

  // Minimizing/sliding the iPod wheel down on hashchange
  const ipodContainer = document.getElementById('ipod-nav-container');
  const updateIpodState = () => {
    const hasHash = window.location.hash && window.location.hash.length > 1;
    
    let tl = gsap.timeline({defaults: {duration: 1.0, ease: 'expo.inOut', overwrite: 'auto'}});
    
    if (hasHash) {
      // Minimized state (Modal Open)
      tl.to('.ipod-menu-back', {width: '13.125rem', height: '4.1875rem'}, 0);
      tl.to('.ipod-menu-wrapper', {y: '4rem'}, 0);
      tl.to('.ipod-menu-btn', {autoAlpha: 0, y: '4rem'}, 0);
      tl.to('.ipod-left-arrow', {x: '-200%'}, 0);
      tl.to('.ipod-right-arrow', {x: '200%'}, 0);
      
      // Target elements inside the center button
      gsap.set('.ipod-center-close', {visibility: 'visible'});
      tl.to('.ipod-center-close', {autoAlpha: 1, rotation: 0, y: 0}, 0);
      
      // Translate the entire iPod nav container slightly down
      tl.to('.ipod-nav', {y: '3.3rem'}, 0);
      
      // Disable circular touch tracking click select
      const centerBtn = document.querySelector('.ipod-center-btn');
      if (centerBtn) centerBtn.style.pointerEvents = 'none';
      
      // Enable close btn pointer events
      const centerCloseBtn = document.querySelector('.ipod-center-close-btn');
      if (centerCloseBtn) centerCloseBtn.style.pointerEvents = 'auto';
      
    } else {
      // Default state (Modal Closed)
      tl.to('.ipod-menu-back', {width: '11.25rem', height: '11.25rem'}, 0);
      tl.to('.ipod-menu-wrapper', {y: '0'}, 0);
      tl.to('.ipod-menu-btn', {autoAlpha: 1, y: '0'}, 0);
      tl.to('.ipod-left-arrow', {x: '0'}, 0);
      tl.to('.ipod-right-arrow', {x: '0'}, 0);
      
      tl.to('.ipod-center-close', {
        autoAlpha: 0, 
        rotation: 90, 
        y: '-200%',
        onComplete: () => {
          gsap.set('.ipod-center-close', {visibility: 'hidden'});
        }
      }, 0);
      
      tl.to('.ipod-nav', {y: '0'}, 0);
      
      const centerBtn = document.querySelector('.ipod-center-btn');
      if (centerBtn) centerBtn.style.pointerEvents = 'auto';
      
      const centerCloseBtn = document.querySelector('.ipod-center-close-btn');
      if (centerCloseBtn) centerCloseBtn.style.pointerEvents = 'none';
    }
  };

  const centerCloseBtn = document.querySelector('.ipod-center-close-btn');
  if (centerCloseBtn) {
    centerCloseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.location.hash = '#';
      playClickSound();
    });
  }

  window.addEventListener('hashchange', updateIpodState);
  updateIpodState();
});
