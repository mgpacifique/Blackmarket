document.addEventListener('DOMContentLoaded', () => {
  const items = document.querySelectorAll('.coverflow-item');
  if(items.length === 0) return;

  let currentIndex = 0;
  const totalItems = items.length;
  const itemWidth = 120; // approximate width for spacing

  const updateCoverflow = () => {
    items.forEach((item, i) => {
      const offset = i - currentIndex;
      const absOffset = Math.abs(offset);
      
      let x = offset * itemWidth;
      let z = -absOffset * 100;
      let rotY = offset === 0 ? 0 : (offset > 0 ? -45 : 45);
      let scale = offset === 0 ? 1 : 0.8;
      let zIndex = totalItems - absOffset;

      const wrapper = item.querySelector('.coverflow-scale-wrapper');
      if (wrapper) {
        wrapper.style.setProperty('--x', `${x}px`);
        wrapper.style.setProperty('--z', `${z}px`);
        wrapper.style.setProperty('--rotY', `${rotY}deg`);
        wrapper.style.setProperty('--scale', scale);
        item.style.zIndex = zIndex;
      }
    });
  };

  // Initial layout
  updateCoverflow();

  // Listen to iPod Wheel scrolling
  window.addEventListener('ipodScroll', (e) => {
    const dir = e.detail.direction; // 1 or -1
    // Throttle scrolling slightly
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

  // Optional: Click on items to select them
  items.forEach((item, i) => {
    item.addEventListener('click', () => {
      if (currentIndex !== i) {
        currentIndex = i;
        updateCoverflow();
      }
    });
  });
});
