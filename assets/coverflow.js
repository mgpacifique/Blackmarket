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

  // Click on item to center or open details modal
  items.forEach((item, index) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const activeIdx = getNormalizedIndex(p.current);
      if (activeIdx === index) {
        // Center card click opens details modal
        const url = item.dataset.url;
        const handle = url ? url.split('/').pop() : '';
        if (handle) {
          window.location.hash = '#' + handle;
        }
      } else {
        // Side card click centers it
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
      }
    });
  });

  // Listen for navigation wheel spin events
  window.addEventListener('ipodIndexChanged', (e) => {
    if (isDragging) return;
    gsap.killTweensOf(p);

    // Find the closest equivalent index to avoid massive spins on normalized inputs
    const len = items.length;
    const targetNormalized = ((e.detail.index % len) + len) % len;
    const currentNormalized = ((Math.round(p.current) % len) + len) % len;
    let diff = targetNormalized - currentNormalized;
    if (diff > len / 2) {
      diff -= len;
    } else if (diff < -len / 2) {
      diff += len;
    }
    const targetIndex = Math.round(p.current) + diff;

    // Notify iPod wheel of target index to prevent out-of-sync jumping
    window.dispatchEvent(new CustomEvent('coverflowIndexChanged', {
      detail: { index: targetIndex }
    }));

    gsap.to(p, {
      current: targetIndex,
      duration: 0.8,
      ease: 'expo.out',
      onUpdate: renderCoverflow
    });
  });

  // Center navigation action (pressing center key on wheel selects and opens modal)
  window.addEventListener('ipodCenterPressed', () => {
    const activeIdx = getNormalizedIndex(p.current);
    const activeItem = items[activeIdx];
    if (activeItem) {
      const url = activeItem.dataset.url;
      const handle = url ? url.split('/').pop() : '';
      if (handle) {
        window.location.hash = '#' + handle;
      }
    }
  });

  // Window resize handler
  window.addEventListener('resize', () => {
    updateBreakpoints();
    renderCoverflow();
  });

  // Premium Product Details Modal Management
  const modals = Array.from(document.querySelectorAll('.product-detail-modal'));
  
  const getProductIndexByHandle = (handle) => {
    return items.findIndex(item => {
      const url = item.dataset.url;
      const itemHandle = url ? url.split('/').pop() : '';
      return itemHandle === handle;
    });
  };

  const updateModalState = () => {
    const rawHash = window.location.hash;
    const handle = rawHash && rawHash.length > 1 ? rawHash.slice(1) : null;
    
    // Scale down and dim Coverflow container on modal active
    const coverflow = document.getElementById('coverflow-container');
    if (coverflow) {
      gsap.to(coverflow, {
        opacity: handle ? 0.35 : 1,
        scale: handle ? 0.9 : 1,
        duration: 0.8,
        ease: 'expo.inOut',
        overwrite: 'auto'
      });
    }

    if (handle) {
      // Sync Coverflow index with open product modal
      const activeIdx = getProductIndexByHandle(handle);
      if (activeIdx !== -1) {
        window.dispatchEvent(new CustomEvent('ipodIndexChanged', {
          detail: { index: activeIdx }
        }));
      }

      modals.forEach(modal => {
        if (modal.dataset.handle === handle) {
          modal.classList.remove('hidden');
          modal.classList.add('flex');
          modal.style.pointerEvents = 'auto';

          const bg = modal.querySelector('.modal-bg-color');
          const content = modal.querySelector('.modal-content');

          if (bg && content) {
            gsap.killTweensOf([bg, content]);
            gsap.fromTo(bg, { opacity: 0 }, { opacity: 1, duration: 1.0, ease: 'expo.inOut' });
            gsap.fromTo(content, { y: '100%' }, { y: '0%', duration: 1.0, ease: 'expo.inOut' });
          }
        } else {
          modal.classList.add('hidden');
          modal.classList.remove('flex');
          modal.style.pointerEvents = 'none';
        }
      });
    } else {
      modals.forEach(modal => {
        if (!modal.classList.contains('hidden')) {
          const bg = modal.querySelector('.modal-bg-color');
          const content = modal.querySelector('.modal-content');

          if (bg && content) {
            gsap.killTweensOf([bg, content]);
            gsap.to(bg, { opacity: 0, duration: 1.0, ease: 'expo.inOut' });
            gsap.to(content, {
              y: '100%',
              duration: 1.0,
              ease: 'expo.inOut',
              onComplete: () => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                modal.style.pointerEvents = 'none';
              }
            });
          } else {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            modal.style.pointerEvents = 'none';
          }
        }
      });
    }
  };

  window.addEventListener('hashchange', updateModalState);
  updateModalState(); // Initial check

  // Bind click logic inside each product detail card
  modals.forEach(modal => {
    const handle = modal.dataset.handle;
    
    // Close button
    const closeBtn = modal.querySelector('.mini-ipod-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.location.hash = '#';
      });
    }

    // Previous button
    const prevBtn = modal.querySelector('.mini-ipod-left');
    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const activeIdx = getProductIndexByHandle(handle);
        if (activeIdx !== -1) {
          const prevIdx = (activeIdx - 1 + items.length) % items.length;
          const prevItem = items[prevIdx];
          const prevUrl = prevItem.dataset.url;
          const prevHandle = prevUrl ? prevUrl.split('/').pop() : '';
          if (prevHandle) window.location.hash = '#' + prevHandle;
        }
      });
    }

    // Next button
    const nextBtn = modal.querySelector('.mini-ipod-right');
    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const activeIdx = getProductIndexByHandle(handle);
        if (activeIdx !== -1) {
          const nextIdx = (activeIdx + 1) % items.length;
          const nextItem = items[nextIdx];
          const nextUrl = nextItem.dataset.url;
          const nextHandle = nextUrl ? nextUrl.split('/').pop() : '';
          if (nextHandle) window.location.hash = '#' + nextHandle;
        }
      });
    }

    // Plus d'infos drawer toggle
    const plusBtn = modal.querySelector('.plus-infos-btn');
    const overlay = modal.querySelector('.plus-infos-overlay');
    if (plusBtn && overlay) {
      let overlayOpen = false;
      plusBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        overlayOpen = !overlayOpen;
        const textLabel = plusBtn.querySelector('.pt-1');
        const pathEl = plusBtn.querySelector('path');
        if (overlayOpen) {
          overlay.classList.remove('invisible', 'translate-y-24');
          overlay.classList.add('visible', 'translate-y-0');
          if (textLabel) textLabel.textContent = 'fermer';
          if (pathEl) pathEl.setAttribute('d', 'M17.331 12.75H6.668');
        } else {
          overlay.classList.add('invisible', 'translate-y-24');
          overlay.classList.remove('visible', 'translate-y-0');
          if (textLabel) textLabel.textContent = "plus d'infos";
          if (pathEl) pathEl.setAttribute('d', 'M17.331 12.084H6.668M11.916 17.331V6.669');
        }
      });
    }

    // AJAX Form Add-to-Cart Submission
    const form = modal.querySelector('form[data-shopify-mini-cart-form="true"]');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;
        
        const formData = new FormData(form);
        
        // Query Dawn cart element to fetch required rendering sections
        const cartNotification = document.querySelector('cart-notification');
        const cartDrawer = document.querySelector('cart-drawer');
        const cart = cartNotification || cartDrawer;
        if (cart && typeof cart.getSectionsToRender === 'function') {
          formData.append(
            'sections',
            cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append('sections_url', window.location.pathname);
          if (typeof cart.setActiveElement === 'function') {
            cart.setActiveElement(document.activeElement);
          }
        }

        fetch('/cart/add.js', {
          method: 'POST',
          body: formData
        })
        .then(response => response.json())
        .then(data => {
          // Open the cart drawer
          document.body.classList.add('cart-drawer-open');
          
          // Dawn theme standard custom elements support
          if (cartNotification && typeof cartNotification.renderContents === 'function') {
            cartNotification.renderContents(data);
          } else if (cartDrawer && typeof cartDrawer.renderContents === 'function') {
            cartDrawer.renderContents(data);
          } else {
            // Manual fallback: update page header bubble count
            const bubbleIcon = document.querySelector('.cart-count-bubble, [id^="cart-icon-bubble"]');
            if (bubbleIcon) {
              fetch('/cart.js')
              .then(res => res.json())
              .then(cart => {
                const span = bubbleIcon.querySelector('span:not(.visually-hidden)');
                if (span) span.textContent = cart.item_count;
                else bubbleIcon.textContent = cart.item_count;
              });
            }
          }
        })
        .catch(error => {
          console.error('Error adding variant to cart:', error);
        })
        .finally(() => {
          if (submitBtn) submitBtn.disabled = false;
        });
      });
    }
  });

  // Initialize
  renderCoverflow();
});
