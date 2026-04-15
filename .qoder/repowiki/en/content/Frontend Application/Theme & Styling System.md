# Theme & Styling System

<cite>
**Referenced Files in This Document**
- [diss-launch-kit website styles.css](file://diss-launch-kit/website/styles.css)
- [dissensus-engine styles.css](file://dissensus-engine/public/css/styles.css)
- [dissensus-hostinger styles.css](file://dissensus-hostinger/styles.css)
- [webpage styles.css](file://webpage/styles.css)
- [forum styles.css](file://forum/styles.css)
- [diss-launch-kit index.html](file://diss-launch-kit/website/index.html)
- [dissensus-engine index.html](file://dissensus-engine/public/index.html)
- [dissensus-hostinger index.html](file://dissensus-hostinger/index.html)
- [webpage index.html](file://webpage/index.html)
- [forum index.html](file://forum/index.html)
- [dissensus-engine app.js](file://dissensus-engine/public/js/app.js)
- [forum engine.js](file://forum/engine.js)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document provides comprehensive documentation for the theme and styling system across the Dissensus project. It explains the CSS architecture built on custom properties for theming, agent-specific color schemes (CIPHER blue, NOVA orange, PRISM purple), responsive design patterns, component styling approaches, animation systems for loading states and transitions, and accessibility features. It also covers customization options, examples for creating custom themes, implementing dark/light mode switching, adding new visual effects, maintaining consistency across components, browser compatibility, performance considerations for animations, and responsive breakpoints used throughout the interface.

## Project Structure
The styling system is distributed across multiple landing pages and the debate engine application, each with its own CSS file and associated HTML. The core theme variables and agent-specific palettes are centralized in each stylesheet, enabling consistent theming across components.

```mermaid
graph TB
subgraph "Landing Pages"
DLK["diss-launch-kit<br/>website/styles.css"]
DH["dissensus-hostinger<br/>styles.css"]
WP["webpage<br/>styles.css"]
end
subgraph "Engine Application"
DE["dissensus-engine<br/>public/css/styles.css"]
end
subgraph "Forum"
F["forum<br/>styles.css"]
end
DLK --> |"uses custom properties"| DLK
DH --> |"uses custom properties"| DH
WP --> |"uses custom properties"| WP
DE --> |"uses custom properties"| DE
F --> |"uses custom properties"| F
```

**Diagram sources**
- [diss-launch-kit website styles.css:12-33](file://diss-launch-kit/website/styles.css#L12-L33)
- [dissensus-hostinger styles.css:12-33](file://dissensus-hostinger/styles.css#L12-L33)
- [webpage styles.css:12-33](file://webpage/styles.css#L12-L33)
- [dissensus-engine styles.css:7-27](file://dissensus-engine/public/css/styles.css#L7-L27)
- [forum styles.css:5-50](file://forum/styles.css#L5-L50)

**Section sources**
- [diss-launch-kit website styles.css:1-120](file://diss-launch-kit/website/styles.css#L1-L120)
- [dissensus-engine styles.css:1-60](file://dissensus-engine/public/css/styles.css#L1-L60)
- [dissensus-hostinger styles.css:1-120](file://dissensus-hostinger/styles.css#L1-L120)
- [webpage styles.css:1-120](file://webpage/styles.css#L1-L120)
- [forum styles.css:1-60](file://forum/styles.css#L1-L60)

## Core Components
The theme system centers on CSS custom properties defined in each stylesheet’s `:root` block. These variables define:
- Color palette: primary backgrounds, secondary backgrounds, card backgrounds, borders, and accent colors
- Agent-specific colors: CIPHER (red), NOVA (green), PRISM (blue), and consensus accents
- Typography: primary and monospace fonts
- Spacing and radius tokens
- Shadow and transition durations

These variables are consumed by component classes to maintain visual consistency across sections such as navigation, hero, cards, buttons, and agent columns.

Examples of variable usage appear in navigation, buttons, agent cards, and progress indicators across the stylesheets.

**Section sources**
- [diss-launch-kit website styles.css:12-33](file://diss-launch-kit/website/styles.css#L12-L33)
- [dissensus-engine styles.css:7-27](file://dissensus-engine/public/css/styles.css#L7-L27)
- [dissensus-hostinger styles.css:12-33](file://dissensus-hostinger/styles.css#L12-L33)
- [webpage styles.css:12-33](file://webpage/styles.css#L12-L33)
- [forum styles.css:5-50](file://forum/styles.css#L5-L50)

## Architecture Overview
The theme architecture follows a modular CSS pattern with:
- Centralized custom properties in `:root`
- Component-specific selectors that consume variables
- Animation keyframes for interactive states
- Responsive grids and media queries for adaptivity
- Accessibility-focused focus styles and contrast considerations

```mermaid
graph TB
Root[":root custom properties"] --> Nav[".nav styles"]
Root --> Buttons[".btn-* styles"]
Root --> Cards[".agent-card, .what-card, .phase-card"]
Root --> Animations["@keyframes spin, pulse, typing-bounce"]
Root --> Responsive["Grids + Media Queries"]
Nav --> HTML1["index.html (landing)"]
Buttons --> HTML2["index.html (engine)"]
Cards --> HTML3["index.html (forum)"]
Animations --> JS1["app.js (engine)"]
Animations --> JS2["engine.js (forum)"]
Responsive --> HTML1
Responsive --> HTML2
Responsive --> HTML3
```

**Diagram sources**
- [diss-launch-kit website styles.css:12-120](file://diss-launch-kit/website/styles.css#L12-L120)
- [dissensus-engine styles.css:7-120](file://dissensus-engine/public/css/styles.css#L7-L120)
- [forum styles.css:5-120](file://forum/styles.css#L5-L120)
- [dissensus-engine app.js:171-193](file://dissensus-engine/public/js/app.js#L171-L193)
- [forum engine.js:277-283](file://forum/engine.js#L277-L283)

## Detailed Component Analysis

### Custom Properties and Theming System
The theming system relies on CSS custom properties defined in `:root`. These include:
- Backgrounds: `--bg-primary`, `--bg-secondary`, `--bg-card`, `--bg-card-hover`
- Accents: `--red`, `--green`, `--cyan`, `--purple`, `--white`, `--gray-*`
- Typography: `--font-main`, `--font-mono`
- Agent-specific tokens: `--cipher-*`, `--nova-*`, `--prism-*`, `--consensus-*`
- UI tokens: `--radius-*`, `--shadow-*`, `--transition-*`

These variables are referenced throughout component classes to ensure consistent theming.

**Section sources**
- [diss-launch-kit website styles.css:12-33](file://diss-launch-kit/website/styles.css#L12-L33)
- [dissensus-engine styles.css:7-27](file://dissensus-engine/public/css/styles.css#L7-L27)
- [dissensus-hostinger styles.css:12-33](file://dissensus-hostinger/styles.css#L12-L33)
- [webpage styles.css:12-33](file://webpage/styles.css#L12-L33)
- [forum styles.css:5-50](file://forum/styles.css#L5-L50)

### Agent-Specific Color Schemes
Each agent has dedicated color tokens and hover/focus states:
- CIPHER: red palette (`--red`, `--red-glow`)
- NOVA: green palette (`--green`, `--green-glow`)
- PRISM: cyan/blue palette (`--cyan`, `--cyan-glow`)
- Consensus: purple palette (`--consensus-*`)

These are applied to badges, chips, borders, avatars, and content blocks to visually distinguish agent contributions.

**Section sources**
- [diss-launch-kit website styles.css:413-447](file://diss-launch-kit/website/styles.css#L413-L447)
- [dissensus-engine styles.css:506-512](file://dissensus-engine/public/css/styles.css#L506-L512)
- [forum styles.css:18-37](file://forum/styles.css#L18-L37)

### Navigation and Header Styling
Navigation bars use backdrop filters, gradient borders, and agent-specific accent colors. Links and buttons adopt theme-aware hover states and transitions.

**Section sources**
- [diss-launch-kit website styles.css:108-121](file://diss-launch-kit/website/styles.css#L108-L121)
- [dissensus-hostinger styles.css:79-92](file://dissensus-hostinger/styles.css#L79-L92)
- [webpage styles.css:98-115](file://webpage/styles.css#L98-L115)
- [dissensus-engine styles.css:54-67](file://dissensus-engine/public/css/styles.css#L54-L67)

### Buttons and Interactive Elements
Buttons leverage gradient backgrounds and agent-specific color schemes. Hover states include elevation, glow, and shadow effects. Disabled states and active presses are handled consistently.

**Section sources**
- [diss-launch-kit website styles.css:202-240](file://diss-launch-kit/website/styles.css#L202-L240)
- [dissensus-engine styles.css:363-390](file://dissensus-engine/public/css/styles.css#L363-L390)
- [forum styles.css:230-261](file://forum/styles.css#L230-L261)

### Hero and Section Styling
Hero sections use animated glows, gradient overlays, and staggered fade-in animations. Sections apply consistent spacing, typography scaling via `clamp()`, and responsive grids.

**Section sources**
- [diss-launch-kit website styles.css:273-352](file://diss-launch-kit/website/styles.css#L273-L352)
- [dissensus-hostinger styles.css:247-292](file://dissensus-hostinger/styles.css#L247-L292)
- [webpage styles.css:247-292](file://webpage/styles.css#L247-L292)

### Agent Cards and Content Areas
Agent cards use agent-specific borders, hover elevations, and avatar glow effects. Content areas include scrollbars, typography, and markdown-like rendering with agent-specific accents.

**Section sources**
- [diss-launch-kit website styles.css:598-743](file://diss-launch-kit/website/styles.css#L598-L743)
- [dissensus-engine styles.css:490-642](file://dissensus-engine/public/css/styles.css#L490-L642)
- [forum styles.css:285-544](file://forum/styles.css#L285-L544)

### Progress Indicators and Loading States
Progress bars, phase steps, and loading spinners use theme-aware colors and transitions. Typing indicators employ bounce animations synchronized with agent activity.

**Section sources**
- [dissensus-engine styles.css:405-458](file://dissensus-engine/public/css/styles.css#L405-L458)
- [forum styles.css:669-700](file://forum/styles.css#L669-L700)
- [forum engine.js:277-283](file://forum/engine.js#L277-L283)

### Responsive Design Patterns
Responsive grids utilize CSS Grid with `auto-fit/minmax` and `repeat()` for adaptive layouts. Media queries adjust font sizes, layout stacking, and component widths for smaller screens.

**Section sources**
- [diss-launch-kit website styles.css:538-543](file://diss-launch-kit/website/styles.css#L538-L543)
- [dissensus-engine styles.css:491-496](file://dissensus-engine/public/css/styles.css#L491-L496)
- [forum styles.css:726-759](file://forum/styles.css#L726-L759)

### Animation Systems
Animations include:
- Grid movement and gradient mesh overlays
- Pulse and glow effects for badges and buttons
- Typing indicators with bounce animations
- Fade-in and staggered entrance animations
- Smooth scrolling and header background transitions

**Section sources**
- [diss-launch-kit website styles.css:61-105](file://diss-launch-kit/website/styles.css#L61-L105)
- [dissensus-engine app.js:171-193](file://dissensus-engine/public/js/app.js#L171-L193)
- [forum engine.js:57-61](file://forum/engine.js#L57-L61)

### Accessibility Features
Accessibility is addressed through:
- Focus-visible outlines for interactive elements
- Sufficient color contrast for text and backgrounds
- Semantic HTML and ARIA attributes in navigation
- Reduced motion considerations via CSS custom properties

**Section sources**
- [diss-launch-kit website styles.css:58-61](file://diss-launch-kit/website/styles.css#L58-L61)
- [dissensus-hostinger index.html:102-104](file://dissensus-hostinger/index.html#L102-L104)
- [webpage index.html:102-104](file://webpage/index.html#L102-L104)

### Browser Compatibility and Performance
- CSS Grid and Flexbox are widely supported; fallbacks are implicit via semantic markup.
- Animations use hardware-accelerated properties (`transform`, `opacity`) and are scoped to avoid heavy repaints.
- Font loading uses preconnect and external CDN resources.

**Section sources**
- [dissensus-engine index.html:23-26](file://dissensus-engine/public/index.html#L23-L26)
- [diss-launch-kit website styles.css:61-76](file://diss-launch-kit/website/styles.css#L61-L76)

## Dependency Analysis
The styling system exhibits low coupling and high cohesion:
- Each stylesheet defines its own `:root` variables and component styles
- Components reference shared variables rather than duplicating values
- JavaScript toggles classes that modify visual states (e.g., agent speaking, progress steps)

```mermaid
graph LR
RootVars["Custom Properties (:root)"] --> Components["Component Classes"]
Components --> HTMLPages["HTML Pages"]
Components --> JSInteraction["JavaScript Class Toggles"]
JSInteraction --> Components
```

**Diagram sources**
- [dissensus-engine app.js:162-193](file://dissensus-engine/public/js/app.js#L162-L193)
- [forum engine.js:250-283](file://forum/engine.js#L250-L283)

**Section sources**
- [dissensus-engine app.js:162-200](file://dissensus-engine/public/js/app.js#L162-L200)
- [forum engine.js:250-283](file://forum/engine.js#L250-L283)

## Performance Considerations
- Prefer `transform` and `opacity` for animations to leverage GPU acceleration
- Use CSS custom properties to minimize repeated color and sizing declarations
- Keep animations scoped and avoid excessive reflows
- Lazy-load images and defer non-critical resources

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- Missing fonts: Ensure preconnect and external font URLs are reachable
- Animation stutter: Verify hardware acceleration properties are used and avoid animating layout-affecting properties
- Contrast problems: Adjust `--gray-*` values to meet WCAG contrast guidelines
- Responsive layout shifts: Confirm grid templates and media queries are properly scoped

**Section sources**
- [dissensus-engine index.html:23-26](file://dissensus-engine/public/index.html#L23-L26)
- [diss-launch-kit website styles.css:61-76](file://diss-launch-kit/website/styles.css#L61-L76)

## Conclusion
The Dissensus theme and styling system leverages a robust, modular CSS architecture centered on custom properties and agent-specific color tokens. It integrates responsive design, rich animations, and accessibility best practices across landing pages and the debate engine. By centralizing theme variables and applying consistent component patterns, the system supports easy customization, maintainability, and scalability.