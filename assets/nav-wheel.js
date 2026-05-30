document.addEventListener('DOMContentLoaded', () => {
  const nextBtn = document.querySelector('.nav-wheel-next');
  const prevBtn = document.querySelector('.nav-wheel-prev');
  const centerBtn = document.querySelector('.nav-wheel-center');
  const menuBtn = document.querySelector('.nav-wheel-menu');
  const menuOverlay = document.getElementById('MenuOverlay');
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('wheel-next'));
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('wheel-prev'));
    });
  }

  if (centerBtn) {
    centerBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('wheel-center'));
    });
  }

  if (menuBtn && menuOverlay) {
    const openMenu = () => {
      menuOverlay.hidden = false;
      const firstLink = menuOverlay.querySelector('a, button');
      if (firstLink) firstLink.focus();
    };

    const closeMenu = () => {
      menuOverlay.hidden = true;
      menuBtn.focus();
    };

    menuBtn.addEventListener('click', () => {
      if (menuOverlay.hidden) openMenu(); else closeMenu();
    });

    const closeBtn = menuOverlay.querySelector('.menu-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        closeMenu();
      });
    }

    // click outside
    menuOverlay.addEventListener('click', (e) => {
      if (e.target === menuOverlay) {
        closeMenu();
      }
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !menuOverlay.hidden) {
        closeMenu();
      }
    });
  }
});