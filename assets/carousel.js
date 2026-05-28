document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.homepage-carousel-container');
  if (!container) return;

  const track = container.querySelector('.carousel-track');
  const slides = Array.from(track.querySelectorAll('.carousel-slide'));
  const activeLabel = document.getElementById('ActiveProductLabel');
  
  if (slides.length === 0) return;

  let currentIndex = 0;

  function updateCarousel() {
    // 60vw width for desktop, 80vw for mobile. Let's just measure the slide width.
    const slideWidth = slides[0].getBoundingClientRect().width;
    const centerOffset = (window.innerWidth - slideWidth) / 2;
    const translateX = -(currentIndex * slideWidth) + centerOffset;
    
    // respect prefers-reduced-motion in css, but set style here
    track.style.transform = `translateX(${translateX}px)`;
    
    const activeSlide = slides[currentIndex];
    const cardFloat = activeSlide.querySelector('.product-card-float');
    if (cardFloat) {
      activeLabel.textContent = cardFloat.getAttribute('data-label') || 'PRODUCT';
      activeLabel.style.opacity = 0;
      setTimeout(() => { activeLabel.style.opacity = 1; }, 150);
    }
  }

  function nextSlide() {
    currentIndex = (currentIndex + 1) % slides.length;
    updateCarousel();
  }

  function prevSlide() {
    currentIndex = (currentIndex - 1 + slides.length) % slides.length;
    updateCarousel();
  }

  function goToProduct() {
    const activeSlide = slides[currentIndex];
    const link = activeSlide.querySelector('.product-card-float-link');
    if (link) window.location.href = link.href;
  }

  // Bind to Navigation Wheel
  document.addEventListener('wheel-next', nextSlide);
  document.addEventListener('wheel-prev', prevSlide);
  document.addEventListener('wheel-center', goToProduct);
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') nextSlide();
    if (e.key === 'ArrowLeft') prevSlide();
    if (e.key === 'Enter') goToProduct();
  });

  // Touch Swipe
  let touchStartX = 0;
  container.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
  }, {passive: true});

  container.addEventListener('touchend', e => {
    const touchEndX = e.changedTouches[0].screenX;
    if (touchEndX < touchStartX - 40) nextSlide();
    if (touchEndX > touchStartX + 40) prevSlide();
  }, {passive: true});

  window.addEventListener('resize', updateCarousel);
  
  // Init
  updateCarousel();

  // Staggered reveal animation
  setTimeout(() => {
    slides.forEach((slide, index) => {
      setTimeout(() => {
        slide.classList.add('is-loaded');
      }, index * 100); // 100ms stagger between slides
    });
  }, 100);
});