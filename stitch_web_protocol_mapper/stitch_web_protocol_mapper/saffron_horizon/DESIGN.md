# Design System Document: The Warm Editorial Social

## 1. Overview & Creative North Star: "The Digital Concierge"
This design system moves away from the sterile, modular look of traditional social networks. Our Creative North Star is **"The Digital Concierge"**—an editorial-first approach that treats travel content like a premium lifestyle magazine rather than a data-heavy feed. 

To break the "template" look, we utilize **intentional asymmetry** and **tonal layering**. We avoid the rigid 12-column grid in favor of breathing room and overlapping elements. By using high-contrast typography scales (pairing the geometric elegance of *Plus Jakarta Sans* with the functional clarity of *Inter*), we create a sense of curated discovery. The goal is to make every travel post feel like a featured story, not just another entry in a database.

---

## 2. Colors: Tonal Depth & Vibrancy
We utilize a Material-inspired palette that leans into the warmth of the Vietnamese sun and the cleanliness of modern hospitality.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section off content. Boundaries must be defined solely through background color shifts. For example, a `surface-container-low` (#ffedeb) card should sit on a `surface` (#fff4f3) background. The transition of color is the boundary.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers, similar to stacked fine paper.
- **Base Layer:** `surface` (#fff4f3)
- **Secondary Sectioning:** `surface-container-low` (#ffedeb)
- **Primary Content Cards:** `surface-container-lowest` (#ffffff) for maximum "pop."
- **Interactive Overlays:** `surface-container-highest` (#ffd2d0) for elements that require immediate attention.

### The "Glass & Gradient" Rule
To add visual "soul," use subtle gradients.
- **Signature CTA Gradient:** Transition from `primary` (#ab2d00) to `primary-container` (#ff7851) at a 135-degree angle. This prevents the orange from feeling "flat" or "cheap."
- **Editorial Glass:** For floating navigation or image captions, use `surface-container-lowest` at 70% opacity with a `24px` backdrop blur to allow the vibrant travel photography to bleed through the UI.

---

## 3. Typography: The Editorial Voice
Our typography balances the "vibrant community" with "high-end travel."

*   **Display & Headlines (Plus Jakarta Sans):** These are our "Editorial Moments." Use `display-lg` (3.5rem) for hero destination titles. The generous x-height and geometric curves of Plus Jakarta Sans convey a modern, premium feel.
*   **Body & Labels (Inter):** Inter is our functional workhorse. Use `body-md` (0.875rem) for user-generated content to ensure maximum readability across all devices.
*   **Contrast as Hierarchy:** Pair a `headline-sm` (1.5rem, Bold) with a `label-sm` (0.6875rem, All Caps, 10% Letter Spacing) to create a sophisticated, high-end metadata aesthetic.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are often a crutch for poor layout. In this system, we prioritize **Tonal Layering.**

*   **The Layering Principle:** Instead of shadows, stack `surface-container-lowest` on top of `surface-container`. The subtle shift from a warm off-white to a pure white creates a soft, natural lift.
*   **Ambient Shadows:** If an element must float (e.g., a Floating Action Button), use an extra-diffused shadow: `box-shadow: 0 12px 40px rgba(78, 33, 32, 0.06)`. Note the use of `on-surface` (#4e2120) as the shadow tint rather than pure black; this keeps the shadows "warm" and integrated.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use the `outline-variant` (#e09c99) at **15% opacity**. Never use a 100% opaque border.

---

## 5. Components

### Cards & Feed Items
*   **Styling:** Use `lg` (1rem) or `xl` (1.5rem) corner radii. 
*   **Layout:** No divider lines. Use `24px` or `32px` of vertical white space to separate the user header, the image, and the caption. 
*   **Interaction:** On hover, a card should shift from `surface-container-low` to `surface-container-lowest` rather than growing in size.

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary-container`), `full` (pill) roundedness, and `on-primary` (#ffefeb) text.
*   **Secondary:** `surface-container-high` background with `primary` text. No border.
*   **Tertiary:** Ghost style using `primary` text and no background.

### Input Fields
*   **State:** Default state uses `surface-container-highest` with no border. 
*   **Focus State:** A 2px "Ghost Border" using `primary` at 40% opacity. This creates a "glow" rather than a harsh line.

### Travel-Specific Components
*   **Destination Chips:** Use `secondary-container` (#ffc3c0) with `on-secondary-container` (#852327) text. These should feel like organic tags rather than rigid buttons.
*   **Progressive Image Blurs:** When images are loading, use a solid fill of `primary-fixed-dim` (#ff5d2b) to maintain the "warm" aesthetic even during latency.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use asymmetrical margins (e.g., more padding on the left than the right in editorial headers) to create a custom feel.
*   **Do** use the `primary` orange sparingly as an accent—it is a "spice," not the main course.
*   **Do** overlap elements. Allow a user avatar to slightly overlap the bottom edge of a hero image to create depth.

### Don't
*   **Don't** use pure black (#000000) for text. Always use `on-surface` (#4e2120) to maintain the warm, community-driven tone.
*   **Don't** use 1px horizontal rules. Use a `8px` tall bar of `surface-container-low` if you need a hard break between sections.
*   **Don't** use sharp corners. Every interactive element must have at least a `md` (0.75rem) radius to stay friendly and approachable.