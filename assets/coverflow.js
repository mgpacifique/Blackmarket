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

    // If modal is active, update the hash to the new centered item's handle
    const hasHash = window.location.hash && window.location.hash.length > 1;
    if (hasHash) {
      const activeItem = items[targetNormalized];
      if (activeItem) {
        const url = activeItem.dataset.url;
        const targetHandle = url ? url.split('/').pop() : '';
        if (targetHandle && window.location.hash !== '#' + targetHandle) {
          window.location.hash = '#' + targetHandle;
        }
      }
    }

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

  let lastActiveHandle = null;
  let currentIndex = 0;

  let lastContentOffsetY = '0%';
  const updateModalState = () => {
    const rawHash = window.location.hash;
    const handle = rawHash && rawHash.length > 1 ? rawHash.slice(1) : null;
    const isCartOpen = document.body.classList.contains('cart-drawer-open');
    const cartDrawer = document.getElementById('CartDrawer');

    // Scale down and dim Coverflow container on modal active
    const coverflow = document.getElementById('coverflow-container');
    const activeModal = handle ? modals.find(modal => modal.dataset.handle === handle) : null;
    const lastModal = lastActiveHandle ? modals.find(modal => modal.dataset.handle === lastActiveHandle) : null;

    if (coverflow) {
      gsap.to(coverflow, {
        opacity: (handle || isCartOpen) ? 0.35 : 1,
        scale: (handle || isCartOpen) ? 0.9 : 1,
        duration: 0.8,
        ease: 'expo.inOut',
        overwrite: 'auto'
      });
    }

    if (handle) {
      // Sync Coverflow index with open product modal
      const activeIdx = getProductIndexByHandle(handle);
      if (activeIdx !== -1 && activeIdx !== currentIndex) {
        currentIndex = activeIdx;
        window.dispatchEvent(new CustomEvent('ipodIndexChanged', {
          detail: { index: activeIdx }
        }));
      }
    }

    // 1. Details Modals visibility and interactivity
    modals.forEach(modal => {
      if (modal === cartDrawer) return; // handled separately
      if (modal === activeModal || modal === lastModal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.style.pointerEvents = (modal === activeModal && !isCartOpen) ? 'auto' : 'none';
      } else {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.style.pointerEvents = 'none';
      }
    });

    // 2. Details Modals GSAP transition
    if (activeModal) {
      const bg = activeModal.querySelector('.modal-bg-color');
      const content = activeModal.querySelector('.modal-content');

      if (lastModal && lastModal !== activeModal && !isCartOpen) {
        // Horizontal transition between details cards
        let diff = 0;
        const activeIdx = getProductIndexByHandle(handle);
        const lastIdx = getProductIndexByHandle(lastActiveHandle);
        const len = items.length;
        if (activeIdx !== -1 && lastIdx !== -1) {
          diff = activeIdx - lastIdx;
          if (diff > len / 2) diff -= len;
          else if (diff < -len / 2) diff += len;
        }

        const lastContent = lastModal.querySelector('.modal-content');
        const lastBg = lastModal.querySelector('.modal-bg-color');

        if (content && lastContent) {
          gsap.killTweensOf([content, lastContent, bg, lastBg]);
          gsap.set(content, { y: diff > 0 ? '100%' : '-100%' });
          
          let tl = gsap.timeline({
            defaults: { duration: 1.0, ease: 'expo.inOut' },
            onComplete: () => {
              if (window.location.hash !== '#' + lastActiveHandle) {
                lastModal.classList.add('hidden');
                lastModal.classList.remove('flex');
              }
            }
          });
          
          tl.to(lastContent, { y: diff > 0 ? '-100%' : '100%' }, 0);
          tl.to(content, { y: '0%' }, 0);
          if (bg) gsap.set(bg, { opacity: 1 });
          if (lastBg) tl.to(lastBg, { opacity: 0 }, 0);
        }
      } else {
        // Single details card animation (slide up or cart slide-overlay state)
        if (bg && content) {
          gsap.killTweensOf([bg, content]);
          if (isCartOpen) {
            // Slide details card UP out of screen
            gsap.to(content, { y: '-100%', duration: 1.0, ease: 'expo.inOut' });
            gsap.to(bg, { opacity: 0, duration: 1.0, ease: 'expo.inOut' });
          } else {
            // Slide details card back DOWN into view
            const startY = (lastContentOffsetY === '-100%') ? '-100%' : '100%';
            gsap.fromTo(content, { y: content.style.transform ? content.style.transform : startY }, { y: '0%', duration: 1.0, ease: 'expo.inOut' });
            gsap.fromTo(bg, { opacity: bg.style.opacity ? parseFloat(bg.style.opacity) : 0 }, { opacity: 1, duration: 1.0, ease: 'expo.inOut' });
          }
        }
      }
    } else {
      // Close details card completely
      if (lastModal && !isCartOpen) {
        const bg = lastModal.querySelector('.modal-bg-color');
        const content = lastModal.querySelector('.modal-content');
        if (bg && content) {
          gsap.killTweensOf([bg, content]);
          gsap.to(bg, { opacity: 0, duration: 1.0, ease: 'expo.inOut' });
          gsap.to(content, {
            y: '100%',
            duration: 1.0,
            ease: 'expo.inOut',
            onComplete: () => {
              if (!window.location.hash) {
                lastModal.classList.add('hidden');
                lastModal.classList.remove('flex');
              }
            }
          });
        }
      }
    }

    // 3. Cart Drawer Modal GSAP transition
    if (cartDrawer) {
      const bg = cartDrawer.querySelector('.modal-bg-color');
      const content = cartDrawer.querySelector('.modal-content');

      if (isCartOpen) {
        cartDrawer.classList.remove('hidden');
        cartDrawer.classList.add('flex');
        cartDrawer.style.pointerEvents = 'auto';

        if (bg && content) {
          gsap.killTweensOf([bg, content]);
          gsap.fromTo(bg, { opacity: bg.style.opacity ? parseFloat(bg.style.opacity) : 0 }, { opacity: 1, duration: 1.0, ease: 'expo.inOut' });
          gsap.fromTo(content, { y: content.style.transform ? content.style.transform : '100%' }, { y: '0%', duration: 1.0, ease: 'expo.inOut' });
        }
      } else {
        cartDrawer.style.pointerEvents = 'none';
        if (bg && content) {
          gsap.killTweensOf([bg, content]);
          gsap.to(bg, { opacity: 0, duration: 1.0, ease: 'expo.inOut' });
          gsap.to(content, {
            y: '100%',
            duration: 1.0,
            ease: 'expo.inOut',
            onComplete: () => {
              if (!document.body.classList.contains('cart-drawer-open')) {
                cartDrawer.classList.add('hidden');
                cartDrawer.classList.remove('flex');
              }
            }
          });
        }
      }
    }

    lastActiveHandle = handle;
    lastContentOffsetY = isCartOpen ? '-100%' : '0%';
  };

  window.addEventListener('hashchange', updateModalState);
  
  // Observe body class changes to sync modal and cart drawer GSAP animations
  const bodyObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'class') {
        updateModalState();
      }
    });
  });
  bodyObserver.observe(document.body, { attributes: true });

  updateModalState(); // Initial check

  // Gallery item height calculation (matches damso.com's GSAP-based sizing)
  const sizeGalleryItems = () => {
    modals.forEach(modal => {
      const galleryWrapper = modal.querySelector('.gallery-wrapper');
      if (!galleryWrapper) return;
      const w = galleryWrapper.offsetWidth;
      const h = galleryWrapper.offsetHeight;
      if (w === 0 && h === 0) return;
      const itemHeight = Math.min(w, h);
      const galleryItems = modal.querySelectorAll('.gallery-item');
      galleryItems.forEach(item => {
        item.style.height = itemHeight + 'px';
      });
    });
  };

  // Run sizing after modal transitions complete and on resize
  window.addEventListener('resize', sizeGalleryItems);
  window.addEventListener('hashchange', () => {
    // Delay to allow GSAP animation to reveal the modal first
    setTimeout(sizeGalleryItems, 100);
    setTimeout(sizeGalleryItems, 1100);
  });
  sizeGalleryItems();

  // Bind click logic inside each product detail card
  modals.forEach(modal => {
    const handle = modal.dataset.handle;
    
    // Variant Selection Logic
    const variantSelects = Array.from(modal.querySelectorAll('.variant-select'));
    const variantsJsonTag = modal.querySelector('.product-variants-json');
    
    if (variantSelects.length > 0 && variantsJsonTag) {
      let variants = [];
      try {
        variants = JSON.parse(variantsJsonTag.textContent);
      } catch (err) {
        console.error('Failed to parse product variants JSON:', err);
      }

      const updateVariantState = () => {
        // Read active options in index order
        const selectedOptions = variantSelects.sort((a, b) => {
          return parseInt(a.dataset.index) - parseInt(b.dataset.index);
        }).map(select => select.value);

        // Find matching variant
        const matchingVariant = variants.find(variant => {
          // Match all selected options
          return selectedOptions.every((optVal, idx) => {
            return variant.options[idx] === optVal;
          });
        });

        if (matchingVariant) {
          // 1. Update form variant ID input
          const idInput = modal.querySelector('input[name="id"]');
          if (idInput) idInput.value = matchingVariant.id;

          // 2. Update Add-to-cart button price and disabled state
          const submitBtn = modal.querySelector('button[type="submit"]');
          const submitBtnText = modal.querySelector('.add-to-cart-text');
          
          if (submitBtn) {
            if (matchingVariant.available) {
              submitBtn.disabled = false;
              if (submitBtnText) {
                const formattedPrice = (matchingVariant.price / 100).toFixed(0);
                submitBtnText.textContent = `Ajouter au panier - ${formattedPrice} €`;
              }
            } else {
              submitBtn.disabled = true;
              if (submitBtnText) submitBtnText.textContent = 'En rupture de stock';
            }
          }

          // 3. Swap gallery featured image
          if (matchingVariant.featured_image && matchingVariant.featured_image.src) {
            const galleryImg = modal.querySelector('.gallery-wrapper img');
            if (galleryImg) {
              galleryImg.src = matchingVariant.featured_image.src;
            }
          }
        }
      };

      // Listen to option changes
      variantSelects.forEach(select => {
        select.addEventListener('change', updateVariantState);
      });
      
      // Initialize first check
      updateVariantState();
    }

    // Close button click listener
    const closeBtn = modal.querySelector('.product-detail-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = '#';
      });
    }

    // Plus d'infos drawer toggle
    const plusBtn = modal.querySelector('.plus-infos-btn');
    const overlay = modal.querySelector('.plus-infos-overlay');
    if (plusBtn && overlay) {
      let overlayOpen = false;
      const innerDiv = plusBtn.querySelector('div');
      const textLabel = plusBtn.querySelector('span, .pt-1');
      const pathEl = plusBtn.querySelector('path');
      
      plusBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        overlayOpen = !overlayOpen;
        
        // Check if card is dark (album)
        const isAlbum = modal.querySelector('.relative.h-full.w-full').classList.contains('bg-blur-bg');
        const bgClass = isAlbum ? 'bg-blur-bg' : 'bg-blur-bg-light';
        const borderClass = isAlbum ? 'border-white/10' : 'border-black/5';

        if (overlayOpen) {
          overlay.classList.remove('invisible', 'translate-y-24');
          overlay.classList.add('visible', 'translate-y-0');
          if (textLabel) textLabel.textContent = 'fermer';
          if (pathEl) pathEl.setAttribute('d', 'M17.331 12.75H6.668');
          
          plusBtn.classList.add('w-full');
          if (innerDiv) {
            innerDiv.classList.add('w-full');
            innerDiv.classList.remove(bgClass, 'backdrop-blur-[15px]', 'border', borderClass);
          }
        } else {
          overlay.classList.add('invisible', 'translate-y-24');
          overlay.classList.remove('visible', 'translate-y-0');
          if (textLabel) textLabel.textContent = "plus d'infos";
          if (pathEl) pathEl.setAttribute('d', 'M17.331 12.084H6.668M11.916 17.331V6.669');
          
          plusBtn.classList.remove('w-full');
          if (innerDiv) {
            innerDiv.classList.remove('w-full');
            innerDiv.classList.add(bgClass, 'backdrop-blur-[15px]', 'border', borderClass);
          }
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

        fetch('/cart/add.js', {
          method: 'POST',
          body: formData
        })
        .then(response => {
          if (!response.ok) {
            return response.json().then(errData => { throw errData; });
          }
          return response.json();
        })
        .then(data => {
          // 1. Show custom toast notification
          showToast(data.title || data.product_title, data.image || null, false);
          
          // 2. Fetch and refresh Cart Drawer contents
          updateCartDrawerDOM();

          // 3. Slide cart drawer into view after a slight delay
          setTimeout(() => {
            document.body.classList.add('cart-drawer-open');
          }, 600);
        })
        .catch(error => {
          console.error('Error adding variant to cart:', error);
          showToast(error.description || 'Erreur lors de l\'ajout', null, true);
        })
        .finally(() => {
          if (submitBtn) submitBtn.disabled = false;
        });
      });
    }
  });

  // Custom Toaster helper matching Damso.com style
  const showToast = (title, imageSrc, isError = false) => {
    let toaster = document.querySelector('[data-rht-toaster]');
    if (!toaster) {
      toaster = document.createElement('div');
      toaster.setAttribute('data-rht-toaster', '');
      toaster.className = 'fixed z-[9999] pointer-events-none';
      toaster.style.top = '16px';
      toaster.style.right = '16px';
      toaster.style.left = '16px';
      toaster.style.bottom = '16px';
      document.body.appendChild(toaster);
    }

    const toast = document.createElement('div');
    toast.className = 'span-w-5 md:span-w-4 pointer-events-auto rounded-lg bg-grey p-8 relative ml-auto mb-16 shadow-lg';
    toast.style.width = '320px';
    toast.style.maxWidth = 'calc(100vw - 32px)';
    toast.style.color = '#000';
    gsap.set(toast, { x: '105%' });

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'flex w-full items-center text-left bg-transparent border-none p-0 cursor-pointer';
    button.addEventListener('click', (e) => {
      e.preventDefault();
      gsap.to(toast, { x: '105%', duration: 0.5, ease: 'expo.in', onComplete: () => toast.remove() });
      document.body.classList.add('cart-drawer-open');
    });

    if (imageSrc) {
      const imgWrapper = document.createElement('div');
      imgWrapper.className = 'h-69 w-69 flex-shrink-0 overflow-clip rounded-xs bg-white border border-black/5 mr-16';
      const img = document.createElement('img');
      img.src = imageSrc;
      img.alt = '';
      img.className = 'h-full w-full object-contain';
      imgWrapper.appendChild(img);
      button.appendChild(imgWrapper);
    }

    const textWrapper = document.createElement('div');
    textWrapper.className = 'w-full text-left leading-none';

    const statusBadge = document.createElement('span');
    statusBadge.className = `mb-12 inline-flex items-center rounded px-8 py-2 font-medium text-10 uppercase ${isError ? 'bg-red text-white' : 'bg-grey-20 text-black'}`;
    statusBadge.textContent = isError ? 'Erreur' : 'Ajouté au panier';

    const titleEl = document.createElement('div');
    titleEl.className = `text-left text-12 font-bold uppercase truncate ${isError ? 'text-red' : 'text-black'}`;
    titleEl.style.width = '190px';
    titleEl.textContent = title;

    textWrapper.appendChild(statusBadge);
    textWrapper.appendChild(titleEl);
    button.appendChild(textWrapper);
    toast.appendChild(button);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'absolute top-8 right-8 cursor-pointer bg-transparent border-none p-4';
    closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#858585" viewBox="0 0 24 24" class="w-16 h-16"><path stroke-width="1.5" d="M18 6L6 18M6 6l12 12"></path></svg>';
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      gsap.to(toast, { x: '105%', duration: 0.5, ease: 'expo.in', onComplete: () => toast.remove() });
    });
    toast.appendChild(closeBtn);

    toaster.appendChild(toast);

    gsap.to(toast, { x: '0%', duration: 1.0, ease: 'expo.out' });

    setTimeout(() => {
      if (toast.parentElement) {
        gsap.to(toast, { x: '105%', duration: 0.5, ease: 'expo.in', onComplete: () => toast.remove() });
      }
    }, 4000);
  };

  // Cart DOM refreshing via section rendering API
  const updateCartDrawerDOM = () => {
    return fetch('/cart?section_id=cart-drawer')
      .then(res => res.text())
      .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const newBody = doc.getElementById('CartDrawer-Body');
        const currentBody = document.getElementById('CartDrawer-Body');
        if (newBody && currentBody) {
          currentBody.innerHTML = newBody.innerHTML;
        }

        const newTotal = doc.getElementById('CartDrawer-Total');
        const currentTotal = document.getElementById('CartDrawer-Total');
        if (newTotal && currentTotal) {
          currentTotal.textContent = newTotal.textContent;
        }

        const newFooter = doc.querySelector('.custom-cart-footer');
        const currentFooter = document.querySelector('.custom-cart-footer');
        if (newFooter && currentFooter) {
          currentFooter.innerHTML = newFooter.innerHTML;
        }

        bindCartDrawerEvents();

        // Update bubble counts
        fetch('/cart.js')
          .then(res => res.json())
          .then(cartData => {
            const countBubbles = document.querySelectorAll('.ipod-menu nav span, .ipod-cart-toggle-btn span, .cart-count-bubble');
            countBubbles.forEach(bubble => {
              bubble.textContent = cartData.item_count;
            });
          });
      })
      .catch(err => console.error('Error updating cart drawer DOM:', err));
  };

  // Steppers and removals binding for cart drawer
  const bindCartDrawerEvents = () => {
    const cartDrawer = document.getElementById('CartDrawer');
    if (!cartDrawer) return;

    const closeBtns = cartDrawer.querySelectorAll('.custom-cart-close');
    closeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        document.body.classList.remove('cart-drawer-open');
      });
    });

    const qtyBtns = cartDrawer.querySelectorAll('.cart-qty-minus, .cart-qty-plus');
    qtyBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const line = btn.dataset.line;
        const qty = btn.dataset.qty;
        updateCartItemQuantity(line, qty);
      });
    });

    const removeBtns = cartDrawer.querySelectorAll('.cart-remove-btn');
    removeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const line = btn.dataset.line;
        updateCartItemQuantity(line, 0);
      });
    });
  };

  const updateCartItemQuantity = (line, quantity) => {
    const data = {
      line: parseInt(line),
      quantity: parseInt(quantity)
    };

    fetch('/cart/change.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(cartData => {
      updateCartDrawerDOM();
    })
    .catch(err => {
      console.error('Error updating quantity:', err);
      showToast('Erreur lors de la modification', null, true);
    });
  };

  // Bind cart events initially
  bindCartDrawerEvents();

  // Initialize
  renderCoverflow();
});
