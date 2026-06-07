document.addEventListener('DOMContentLoaded', () => {
  const wheel = document.querySelector('.ipod-wheel-draggable');
  const menuBtn = document.querySelector('.ipod-menu-btn button');
  const menuWrapper = document.querySelector('.ipod-menu');
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
      } else {
        menuWrapper.style.transform = 'translateY(4.4rem)';
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

      // Clamp targetIndex between min/max bounds
      if (targetIndex < minIndex) {
        targetIndex = minIndex;
        accumulatedDelta = (minIndex - initialIndex) * 36; // Clamp accumulated delta
      } else if (targetIndex > maxIndex) {
        targetIndex = maxIndex;
        accumulatedDelta = (maxIndex - initialIndex) * 36;
      }

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
      if (currentIndex > minIndex) {
        currentIndex--;
        playClickSound();
        window.dispatchEvent(new CustomEvent('ipodIndexChanged', {
          detail: { index: currentIndex }
        }));
      }
    });
  }

  if (rightBtn) {
    rightBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (currentIndex < maxIndex) {
        currentIndex++;
        playClickSound();
        window.dispatchEvent(new CustomEvent('ipodIndexChanged', {
          detail: { index: currentIndex }
        }));
      }
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
});
