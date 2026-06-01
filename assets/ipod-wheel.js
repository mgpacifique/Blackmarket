document.addEventListener('DOMContentLoaded', () => {
  const wheel = document.querySelector('.ipod-wheel-draggable');
  const menuBtn = document.querySelector('.ipod-menu-btn button');
  const menuWrapper = document.querySelector('.ipod-menu');
  const centerBtn = document.querySelector('.ipod-center-btn');
  const leftBtn = document.querySelector('.ipod-left');
  const rightBtn = document.querySelector('.ipod-right-btn');
  
  let menuOpen = false;

  // Menu toggling
  if(menuBtn && menuWrapper) {
    menuBtn.addEventListener('click', (e) => {
      e.preventDefault();
      menuOpen = !menuOpen;
      if(menuOpen) {
        menuWrapper.style.transform = 'translateY(0)';
      } else {
        menuWrapper.style.transform = 'translateY(4.4rem)';
      }
    });
  }

  // Wheel Dragging logic
  if(wheel) {
    let isDragging = false;
    let startAngle = 0;
    
    const getAngle = (e, el) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let x, y;
      if (e.touches && e.touches.length > 0) {
        x = e.touches[0].clientX;
        y = e.touches[0].clientY;
      } else {
        x = e.clientX;
        y = e.clientY;
      }
      return Math.atan2(y - cy, x - cx) * (180 / Math.PI);
    };

    const handleStart = (e) => {
      isDragging = true;
      startAngle = getAngle(e, wheel);
    };

    const handleMove = (e) => {
      if (!isDragging) return;
      const currentAngle = getAngle(e, wheel);
      let deltaAngle = currentAngle - startAngle;
      
      // Normalize delta
      if (deltaAngle > 180) deltaAngle -= 360;
      if (deltaAngle < -180) deltaAngle += 360;

      if (Math.abs(deltaAngle) > 5) {
        // Dispatch custom scroll event
        window.dispatchEvent(new CustomEvent('ipodScroll', {
          detail: { direction: deltaAngle > 0 ? 1 : -1, delta: deltaAngle }
        }));
        startAngle = currentAngle;
      }
    };

    const handleEnd = () => {
      isDragging = false;
    };

    wheel.addEventListener('mousedown', handleStart);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);

    wheel.addEventListener('touchstart', handleStart, {passive: true});
    window.addEventListener('touchmove', handleMove, {passive: true});
    window.addEventListener('touchend', handleEnd);
  }
  
  // Arrows
  if(leftBtn) {
    leftBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('ipodScroll', { detail: { direction: -1, delta: -20 }}));
    });
  }
  if(rightBtn) {
    rightBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('ipodScroll', { detail: { direction: 1, delta: 20 }}));
    });
  }
});
