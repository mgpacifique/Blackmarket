# Antigravity Storefront — Merchant Onboarding Guide

Welcome to your new Damso.com-inspired Shopify storefront! This guide explains how to manage the custom features built into your theme.

## 1. Homepage Carousel & Collections

The homepage is now a dynamic, immersive carousel instead of a traditional scrolling page.

### Setting the Default Collection
By default, the carousel looks for a collection with the handle `featured-drop`.
If you don't have this collection, or if it is empty, it will fall back to displaying *all* products in your store.

**To change the default collection:**
1. Go to **Online Store > Themes** and click **Customize** on your active theme.
2. In the left-hand sidebar, click on the **Carousel Homepage** section.
3. Use the **Featured Collection (Default)** setting to select which collection should load when customers first land on the site.

### The MENU Overlay
The "MENU" button on the navigation wheel opens a full-screen list of your collections. Customers can select any collection to instantly load those products into the carousel without leaving the page.

To reorder these collections or hide specific ones, you should manage your collections in the Shopify Admin. (Currently, it lists all active collections).

## 2. Product Labels (Top Right Corner)

The large text in the top-right corner of the screen updates automatically as the user browses the carousel. By default, it displays the Product Title.

### Customizing the Label
You can set a custom, shorter label for the carousel display using Metafields. This is useful if your actual product titles are long but you want a punchy, editorial label on the homepage.

1. Go to **Settings > Custom Data** in your Shopify Admin.
2. Select **Products**.
3. Create a new definition:
   - **Name:** Carousel Label
   - **Namespace and key:** `antigravity.carousel_label`
   - **Type:** Single line text
4. Now, when editing any product, scroll to the bottom to find the **Metafields** section. Enter your custom label in the "Carousel Label" field.

## 3. Phase 3 Extensions: Editorial Pages & Countdowns

### Editorial / World-Building Pages
You can create rich, story-driven pages for major drops.
1. Go to **Online Store > Pages** and create a new page.
2. In the right-hand column, change the **Theme template** from `Default page` to `editorial-world`.
3. Save the page, then click **Customize** (or open the Theme Editor and navigate to this new page).
4. You can now use the Theme Editor to add full-bleed images, text, and video backgrounds to this specific page.

### Drop Countdown Timer
When setting up an Editorial Page, you can add a "Drop Countdown" block.
1. In the Theme Editor for your editorial page, add the **Countdown Timer** section/block.
2. Set the target date and time using the provided settings fields. The timer will automatically tick down to your launch!

## 4. Best Practices for Images

Because the design relies on "floating" products on a pure white canvas:
- **Backgrounds:** Ensure your product photography is shot on a pure white background (`#FFFFFF`) or use transparent PNGs.
- **Padding:** Leave generous padding around the product so it doesn't touch the edges of the screen.
- **Resolution:** Upload high-resolution images (at least 2000x2000px). The theme will automatically optimize them for mobile and desktop devices.
- **No baked-in shadows:** Avoid baking heavy drop shadows into the images. Let the clean, minimalist aesthetic breathe.
