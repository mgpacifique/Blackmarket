document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('#coverflow-container');
  if (!container) return;

  const items = Array.from(container.querySelectorAll('.coverflow-item'));
  if (items.length === 0) return;

  // Setup initial posId for each item to match its initial index
  items.forEach((item, index) => {
    item.posId = index;
    // Set standard absolute positioning
    item.style.position = 'absolute';
    item.style.top = '0';
    item.style.left = '0';
  });

  const p = { current: 0 }; // Current scroll position index (float)
  const titleEl = document.getElementById('product-display-title');
  
  // Physics and sizing coefficients matching the original scraped reference
  let w = 335; // Mobile: 110, Desktop: 335
  let b = 397; // Mobile: 221, Desktop: 397
  let g = 124; // Mobile: 160/222, Desktop: 124
  let j = 3;   // Mobile: 2, Desktop: 3
  let mockupWidth = 1440; // Mobile: 430, Desktop: 1440

  const updateBreakpoints = () => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      w = 110;
      b = 221;
      g = 160;
      j = 2;
      mockupWidth = 430;
    } else {
      w = 335;
      b = 397;
      g = 124;
      j = 3;
      mockupWidth = 1440;
    }
  };

  updateBreakpoints();

  // Helper to normalize the index to boundaries [0, items.length - 1]
  const getNormalizedIndex = (index) => {
    const len = items.length;
    return ((Math.round(index) % len) + len) % len;
  };

  // Update product title in the header
  const updateProductTitle = () => {
    if (!titleEl) return;
    const activeIdx = getNormalizedIndex(p.current);
    const activeItem = items[activeIdx];
    if (activeItem) {
      titleEl.textContent = activeItem.dataset.title || '';
    }
  };

  // Render/Update Coverflow layouts
  const renderCoverflow = () => {
    const len = items.length;
    const halfLen = len * 0.5;
    const ratio = window.innerWidth / mockupWidth;

    const n = w * ratio; // Spacing compression factor
    const l = b * ratio; // Neighbor spacing factor

    for (let r = 0; r < len; r++) {
      const item = items[r];
      let i = item.posId - p.current;

      // Wrap posId around for infinite circular list
      if (i < -halfLen) {
        item.posId += len;
        i = item.posId - p.current;
      } else if (i > halfLen) {
        item.posId -= len;
        i = item.posId - p.current;
      }

      const sign = i === 0 ? 0 : Math.sign(i);
      // Spacing: active is at 0, neighbors at l, outer ones compressed at n
      const xTranslate = Math.abs(i) > 1 ? i * n + (l - n) * sign : i * l;

      // Scale calculations
      let scale = 1;
      if (i > -1 && i < 1) {
        scale = (100 + (1 - Math.abs(i)) * g) / 100;
      }

      // Apply styles to wrapper
      const scaleWrapper = item.querySelector('.coverflow-scale-wrapper');
      if (scaleWrapper) {
        scaleWrapper.style.setProperty('--scale', scale);
      }

      // Visibility and translate
      if (i > -j && i < j) {
        gsap.set(item, {
          x: xTranslate,
          visibility: 'visible',
          zIndex: Math.floor(20 - Math.abs(i))
        });
      } else {
        gsap.set(item, { visibility: 'hidden' });
      }
    }

    updateProductTitle();
  };

  // Drag state variables
  let isDragging = false;
  let startX = 0;
  let mCurrent = 0;
  let lastP = 0;
  let velocity = 0;

  // Touch and mouse start
  const handleStart = (e) => {
    if (isDragging) return;
    isDragging = true;
    startX = (e.touches ? e.touches[0] : e).clientX;
    mCurrent = p.current;
    lastP = p.current;
    velocity = 0;
    gsap.killTweensOf(p);
    document.body.classList.add('global-grabbing');
    window.dispatchEvent(new CustomEvent('coverflowDragStart'));
  };

  // Touch and mouse move
  const handleMove = (e) => {
    if (!isDragging) return;
    const clientX = (e.touches ? e.touches[0] : e).clientX;
    const dx = startX - clientX;

    // 300px drag equals 1 slide index transition
    p.current = mCurrent + dx / 300;
    velocity = p.current - lastP;
    lastP = p.current;

    // Dispatch index to keep wheel in sync
    window.dispatchEvent(new CustomEvent('coverflowIndexChanged', {
      detail: { index: Math.round(p.current) }
    }));

    renderCoverflow();
  };

  // Touch and mouse end
  const handleEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    document.body.classList.remove('global-grabbing');

    // Calculate snap target based on velocity
    let targetIndex;
    if (Math.abs(velocity) < 0.005) {
      targetIndex = Math.round(p.current);
    } else {
      targetIndex = velocity < 0 ? Math.floor(p.current) : Math.ceil(p.current);
    }

    // Animate snap to integer index using GSAP matching next.js ease
    gsap.to(p, {
      current: targetIndex,
      duration: 0.8,
      ease: 'expo.out',
      onUpdate: renderCoverflow,
      onComplete: () => {
        window.dispatchEvent(new CustomEvent('coverflowDragEnd'));
      }
    });

    // Notify iPod wheel of final index
    window.dispatchEvent(new CustomEvent('coverflowIndexChanged', {
      detail: { index: targetIndex }
    }));
  };

  // Event listeners for dragging on screen
  const dragTrigger = container.querySelector('.coverflow-drag') || container;
  dragTrigger.addEventListener('mousedown', handleStart);
  window.addEventListener('mousemove', handleMove);
  window.addEventListener('mouseup', handleEnd);

  dragTrigger.addEventListener('touchstart', handleStart, { passive: true });
  window.addEventListener('touchmove', handleMove, { passive: true });
  window.addEventListener('touchend', handleEnd);

  // Click on item to center it
  items.forEach((item, index) => {
    item.addEventListener('click', () => {
      // Find actual wrapped position to prevent jumping
      let targetIndex = item.posId;
      gsap.to(p, {
        current: targetIndex,
        duration: 0.8,
        ease: 'expo.out',
        onUpdate: renderCoverflow,
        onComplete: () => {
          window.dispatchEvent(new CustomEvent('coverflowIndexChanged', {
            detail: { index: targetIndex }
          }));
        }
      });
    });
  });

  // Listen for navigation wheel spin events
  window.addEventListener('ipodIndexChanged', (e) => {
    if (isDragging) return;
    gsap.killTweensOf(p);
    gsap.to(p, {
      current: e.detail.index,
      duration: 0.8,
      ease: 'expo.out',
      onUpdate: renderCoverflow
    });
  });

  // Center navigation action (pressing center key on wheel)
  window.addEventListener('ipodCenterPressed', () => {
    const activeIdx = getNormalizedIndex(p.current);
    const activeItem = items[activeIdx];
    if (activeItem && activeItem.dataset.url) {
      window.location.href = activeItem.dataset.url;
    }
  });

  // Window resize handler
  window.addEventListener('resize', () => {
    updateBreakpoints();
    renderCoverflow();
  });

  // Initialize
  renderCoverflow();
});
