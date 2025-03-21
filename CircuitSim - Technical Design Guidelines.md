### **Technical Design Guidelines for Product Designer**

**🎨 Colors**

* **Primary:** `#4C72F4` (Electric Blue)  
* **Secondary:** `#F4C95D` (Warm Amber)  
* **Accent:** `#FF6E6E` (Alert Coral)  
* **Background:** `#FFFFFF` (Pure White)  
* **Neutral Grey:** `#ECEFF4` (Soft Grey)  
* **Text Colors:**  
  * Headings: `#2E3440` (Dark Navy)  
  * Body: `#4C566A` (Slate Grey)  
  * Disabled/Placeholder: `#D8DEE9` (Light Neutral)

**🖊️ Typography**

* **Primary Font:** `Inter` (Google Fonts)  
  * Headings: Bold (`700`)  
  * Body text: Regular (`400`), Medium (`500`)  
  * Sizes:  
    * Large Heading: 32px  
    * Subheading: 24px  
    * Body: 16px  
    * Small (captions/buttons): 14px

**📐 Spacing & Layout**

* **Grid System:** 8px increments.  
* **Margins/Padding:**  
  * Small padding: 8px  
  * Regular padding: 16px  
  * Large padding: 24px  
* **Minimum Touch Target:** 48px (mobile-friendly).

**🖼 Shadows & Elevations**

* Small element shadow (buttons/cards): `0px 2px 6px rgba(0,0,0,0.05)`  
* Modal/Popup shadow: `0px 10px 30px rgba(0,0,0,0.1)`

**🔄 Animations & Effects**

* Micro-interactions: Duration `200ms`, easing `ease-in-out`.  
* Component highlights (hover state):  
  * Brightening component border or subtle glow.  
* Transitions between screens:  
  * Crossfade, duration `300ms`.

**🖱 Interactive Elements**

* **Buttons:**  
  * Rounded corners: radius `4px`  
  * Interactive feedback: slight scale (1.02 on click)  
* **Inputs/Forms:**  
  * Subtle border (`#D8DEE9`), accent color border on focus.  
* **Tooltips & Popovers:**  
  * Instant appearance (`100ms` fade-in), pointer arrow.

**📱 Responsive & Mobile-Friendly Design**

* Prioritize responsive layout, stacking vertically on small screens.  
* Menus/navigation: mobile-friendly collapsible navigation for smaller viewports.

**🚨 Alerts & Notifications**

* Error messages: use accent color (`#FF6E6E`) background, white text.  
* Success messages: subtle green (`#A3BE8C`) highlights.

