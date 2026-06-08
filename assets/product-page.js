/**
 * Product Page JS — Blackmarket / damso.com PRD
 * Sections 7.4, 8.2 — VariantPicker, ProductForm, Gallery
 */

/* ---- Variant Picker (PRD 7.4 — Dropdown) ---- */
class VariantPicker {
  constructor(container) {
    this.container = container;
    this.selects = container.querySelectorAll('.variant-picker__select');
    this.selectedOptions = Array.from(this.selects).map(s => s.value);
    this.bindEvents();
  }

  bindEvents() {
    this.selects.forEach(select => {
      select.addEventListener('change', (e) => this.onSelectChange(e.currentTarget));
    });
  }

  onSelectChange(select) {
    const index = parseInt(select.dataset.optionIndex);
    this.selectedOptions[index] = select.value;

    const variant = this.findVariant();
    this.updateVariantInput(variant);
    this.updatePrice(variant);
    this.updateATCButton(variant);
    this.updateURL(variant);
    if (variant) {
      scrollToVariantImage(variant.id);
      document.dispatchEvent(new CustomEvent('variant:changed', { detail: variant }));
    }
  }

  findVariant() {
    if (!window.__productVariants) return null;
    return window.__productVariants.find(v =>
      v.options.every((opt, i) => opt === this.selectedOptions[i])
    ) || null;
  }

  updateVariantInput(variant) {
    const input = document.getElementById('ProductVariantId');
    if (input && variant) input.value = variant.id;
  }

  updatePrice(variant) {
    if (!variant) return;
    const wrapper = document.querySelector('[data-price-wrapper]');
    if (!wrapper) return;
    const formatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
    const price = formatter.format(variant.price / 100);
    const compare = variant.compare_at_price
      ? formatter.format(variant.compare_at_price / 100)
      : null;
    wrapper.innerHTML = compare
      ? `<span class="product-price__sale">${price}</span>
         <span class="product-price__compare">${compare}</span>
         <span class="product-price__badge">SALE</span>`
      : `<span class="product-price__regular">${price}</span>`;
  }

  updateATCButton(variant) {
    const btn = document.querySelector('[data-atc-button]');
    if (!btn) return;
    if (!variant || !variant.available) {
      btn.disabled = true;
      btn.textContent = 'Épuisé';
    } else {
      btn.disabled = false;
      const formatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
      btn.textContent = `Ajouter au panier — ${formatter.format(variant.price / 100)}`;
    }
  }

  updateURL(variant) {
    if (!variant) return;
    const url = new URL(window.location.href);
    url.searchParams.set('variant', variant.id);
    window.history.replaceState({}, '', url.toString());
  }
}

/* ---- Variant Image Switching (PRD 5.3) ---- */
function scrollToVariantImage(variantId) {
  if (!window.__productVariants) return;
  const variant = window.__productVariants.find(v => v.id === variantId);
  if (!variant || !variant.featured_image) return;
  const target = document.querySelector(`[data-media-id="${variant.featured_image.id}"]`);
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---- AJAX Add-to-Cart (PRD 8.2) ---- */
class ProductForm {
  constructor(form) {
    this.form = form;
    this.btn = form.querySelector('[data-atc-button]');
    this.form.addEventListener('submit', (e) => this.onSubmit(e));
  }

  async onSubmit(e) {
    e.preventDefault();
    if (this.btn.disabled) return;

    const variantId = document.getElementById('ProductVariantId').value;
    const quantity = parseInt(document.getElementById('Quantity').value) || 1;

    this.setLoading(true);

    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: parseInt(variantId), quantity })
      });

      if (!response.ok) throw new Error('Cart add failed');

      const item = await response.json();
      this.onSuccess(item);
      await this.updateCartCount();

    } catch (err) {
      console.error(err);
      this.onError();
    } finally {
      this.setLoading(false);
    }
  }

  setLoading(loading) {
    this.btn.classList.toggle('is-loading', loading);
    this.btn.disabled = loading;
    if (loading) {
      this.btn.dataset.originalText = this.btn.textContent;
      this.btn.textContent = '...';
    } else {
      this.btn.textContent = this.btn.dataset.originalText || 'Ajouter au panier';
      this.btn.disabled = false;
    }
  }

  onSuccess(item) {
    // Dispatch custom event for cart drawer
    document.dispatchEvent(new CustomEvent('cart:item-added', { detail: item }));
    // Briefly confirm on button
    this.btn.textContent = '✓ Ajouté';
    setTimeout(() => {
      this.btn.textContent = this.btn.dataset.originalText || 'Ajouter au panier';
    }, 1800);
  }

  onError() {
    this.btn.textContent = 'Erreur – réessayer';
    setTimeout(() => {
      this.btn.textContent = this.btn.dataset.originalText || 'Ajouter au panier';
    }, 2000);
  }

  async updateCartCount() {
    try {
      const res = await fetch('/cart.js');
      const cart = await res.json();
      document.querySelectorAll('[data-cart-count]').forEach(el => {
        el.textContent = cart.item_count;
        el.classList.toggle('is-hidden', cart.item_count === 0);
      });
    } catch (e) {
      console.error('Failed to update cart count', e);
    }
  }
}

/* ---- Quantity Buttons ---- */
function initQuantityButtons() {
  document.querySelectorAll('[data-qty-decrease]').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.product-quantity').querySelector('input');
      const val = parseInt(input.value) || 1;
      if (val > 1) input.value = val - 1;
    });
  });
  document.querySelectorAll('[data-qty-increase]').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.product-quantity').querySelector('input');
      const val = parseInt(input.value) || 1;
      input.value = val + 1;
    });
  });
}

/* ---- Gallery Scroll-Snap Dots (Mobile) ---- */
function initGalleryDots() {
  const gallery = document.querySelector('[data-gallery]');
  const dotsContainer = document.querySelector('[data-gallery-dots]');
  if (!gallery || !dotsContainer) return;

  const dots = dotsContainer.querySelectorAll('.gallery-dot');
  const items = gallery.querySelectorAll('.product-gallery__item');

  // Dot click -> scroll to image
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      items[i]?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    });
  });

  // IntersectionObserver to update active dot
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const index = Array.from(items).indexOf(entry.target);
        dots.forEach((d, i) => d.classList.toggle('is-active', i === index));
      }
    });
  }, { root: gallery, threshold: 0.6 });

  items.forEach(item => observer.observe(item));
}

/* ---- Initialize Everything ---- */
document.addEventListener('DOMContentLoaded', () => {
  const picker = document.querySelector('[data-variant-picker]');
  if (picker) new VariantPicker(picker);

  const form = document.getElementById('ProductForm');
  if (form) new ProductForm(form);

  initQuantityButtons();
  initGalleryDots();
});
