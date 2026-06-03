document.addEventListener('DOMContentLoaded', () => {
  const items = document.querySelectorAll('.coverflow-item');
  if (items.length === 0) return;

  let currentIndex = 0;
  const totalItems = items.length;
  const itemWidth = 260; // matches the 220px card + breathing room

  const titleEl = document.getElementById('product-display-title');

  const updateProductTitle = () => {
    if (!titleEl) return;
    const activeItem = items[currentIndex];
    const title = activeItem ? (activeItem.dataset.title || '') : '';
    titleEl.textContent = title;
  };

  const updateCoverflow = () => {
    items.forEach((item, i) => {
      const offset = i - currentIndex;
      const absOffset = Math.abs(offset);

      const x = offset * itemWidth;
      const z = -absOffset * 80;
      const rotY = offset === 0 ? 0 : (offset > 0 ? -40 : 40);
      const scale = offset === 0 ? 1 : Math.max(0.65, 0.85 - absOffset * 0.08);
      const zIndex = totalItems - absOffset;

      const wrapper = item.querySelector('.coverflow-scale-wrapper');
      if (wrapper) {
        wrapper.style.setProperty('--x', `${x}px`);
        wrapper.style.setProperty('--z', `${z}px`);
        wrapper.style.setProperty('--rotY', `${rotY}deg`);
        wrapper.style.setProperty('--scale', scale);
        item.style.zIndex = zIndex;
      }
    });
    updateProductTitle();
  };

  // Initial layout
  updateCoverflow();

  // Listen to iPod Wheel scrolling (from ipod-wheel.js)
  window.addEventListener('ipodScroll', (e) => {
    const dir = e.detail.direction; // 1 or -1
    if (Math.abs(e.detail.delta) > 10) {
      if (dir > 0 && currentIndex < totalItems - 1) {
        currentIndex++;
        updateCoverflow();
      } else if (dir < 0 && currentIndex > 0) {
        currentIndex--;
        updateCoverflow();
      }
    }
  });

  // Click on items to select them
  items.forEach((item, i) => {
    item.addEventListener('click', () => {
      if (currentIndex !== i) {
        currentIndex = i;
        updateCoverflow();
      }
    });
  });
});
