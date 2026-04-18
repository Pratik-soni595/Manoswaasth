# Manoswaasth — Design System

> Serene, nature-inspired Ayurvedic wellness aesthetic. Every element should feel like a calm breath — warm, grounded, and alive.

---

## 1. Visual Theme & Atmosphere

The Manoswaasth design language draws from the earth tones of Ayurveda — warm sands, sage greens, and gold accents reminiscent of ancient manuscripts and herbal gardens. The interface should feel like a luxury wellness retreat: spacious, intentional, and deeply calming, while still being modern and interactive.

**Keywords:** Serene · Earthy · Premium · Alive · Trustworthy

---

## 2. Color Palette

### Core Colors
| Role | Name | Hex | Usage |
|------|------|-----|-------|
| **Primary** | Deep Sage | `#2C5F4E` | Headers, primary buttons, key accents |
| **Primary Light** | Sage Tint | `#3A7D66` | Hover states, secondary emphasis |
| **Primary Dark** | Forest | `#1E4538` | Active states, pressed buttons |
| **Secondary** | Warm Gold | `#D4AF37` | Badges, highlights, progress bars |
| **Secondary Light** | Light Gold | `#E8CD6E` | Hover gold, subtle highlights |
| **Background** | Warm Sand | `#F4F1EA` | Page background |
| **Surface** | White | `#FFFFFF` | Cards, modals, input backgrounds |
| **Text Primary** | Charcoal | `#2D3748` | Body text, headings |
| **Text Secondary** | Slate | `#718096` | Captions, labels, muted text |
| **Text Tertiary** | Light Gray | `#A0AEC0` | Placeholders, disabled text |
| **Border** | Sand Border | `#E2D9CC` | Card borders, dividers |
| **Success** | Herb Green | `#38A169` | Success states, positive feedback |
| **Error** | Warm Red | `#E53E3E` | Errors, destructive actions |

### Dosha-Specific Colors
| Dosha | Color | Hex | Element |
|-------|-------|-----|---------|
| **Vata** | Ethereal Purple | `#7B68EE` | Space & Air |
| **Pitta** | Flame Orange | `#FF6B35` | Fire & Water |
| **Kapha** | Earth Green | `#2E8B57` | Earth & Water |

### Gradient Presets
```css
--gradient-hero: linear-gradient(135deg, #F4F1EA 0%, #E8E2D6 100%);
--gradient-cta: linear-gradient(135deg, #2C5F4E 0%, #3A7D66 100%);
--gradient-gold: linear-gradient(90deg, #D4AF37 0%, #E8CD6E 100%);
--gradient-progress: linear-gradient(90deg, #2C5F4E 0%, #D4AF37 100%);
--gradient-vata: linear-gradient(135deg, #7B68EE22 0%, #7B68EE08 100%);
--gradient-pitta: linear-gradient(135deg, #FF6B3522 0%, #FF6B3508 100%);
--gradient-kapha: linear-gradient(135deg, #2E8B5722 0%, #2E8B5708 100%);
```

---

## 3. Typography

**Font Family:** `'Outfit', sans-serif` — via Google Fonts

| Element | Weight | Size | Line Height | Letter Spacing |
|---------|--------|------|-------------|----------------|
| **Display** (hero heading) | 700 | 3.5rem (56px) | 1.1 | -0.02em |
| **H1** (page title) | 700 | 2.5rem (40px) | 1.2 | -0.01em |
| **H2** (section title) | 600 | 1.75rem (28px) | 1.3 | -0.01em |
| **H3** (card title) | 600 | 1.25rem (20px) | 1.4 | 0 |
| **Body** (paragraphs) | 400 | 1rem (16px) | 1.6 | 0 |
| **Body Small** | 400 | 0.875rem (14px) | 1.5 | 0 |
| **Caption** | 300 | 0.75rem (12px) | 1.4 | 0.02em |
| **Button** | 500 | 0.875rem (14px) | 1 | 0.02em |
| **Badge** | 500 | 0.75rem (12px) | 1 | 0.04em |

---

## 4. Spacing & Layout

**Base unit:** 8px  
**Max content width:** 1200px  
**Page padding:** 2rem (32px) horizontal, 4rem (64px) between sections

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | 4px | Tight inner padding |
| `--space-sm` | 8px | Badge padding, gaps |
| `--space-md` | 16px | Card inner padding, component gaps |
| `--space-lg` | 24px | Section margins, card padding |
| `--space-xl` | 32px | Page-level horizontal padding |
| `--space-2xl` | 48px | Inter-section spacing |
| `--space-3xl` | 64px | Major section gaps |
| `--space-4xl` | 96px | Hero section spacing |

### Responsive Breakpoints
| Breakpoint | Width | Behavior |
|-----------|-------|----------|
| **Desktop** | ≥ 1024px | Full grid, sidebar layouts |
| **Tablet** | 768–1023px | 2-column → stacked, smaller text |
| **Mobile** | < 768px | Single column, full-width cards |

---

## 5. Component Patterns

### Buttons

**Primary Button:**
- Background: `var(--primary)` → `var(--gradient-cta)` on hover
- Text: White, 500 weight, 0.875rem
- Padding: 12px 28px
- Border radius: 50px (pill shape)
- Shadow: `0 2px 8px rgba(44, 95, 78, 0.25)`
- Hover: Scale 1.03, shadow deepens, subtle glow

**Secondary/Outlined Button:**
- Background: Transparent
- Border: 2px solid `var(--primary)`
- Text: `var(--primary)`, 500 weight
- Hover: Background fills to `var(--primary)` at 8% opacity

### Cards
- Background: `var(--surface)` (#FFFFFF)
- Border: 1px solid `var(--border)`
- Border radius: 16px
- Padding: 24px
- Shadow: `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)`
- Hover: Shadow elevates to `0 10px 25px rgba(0,0,0,0.08)`, translateY(-2px)

### Input Fields
- Background: `var(--surface)`
- Border: 1.5px solid `var(--border)`
- Border radius: 12px
- Padding: 12px 16px
- Focus: Border color transitions to `var(--primary)`, subtle sage glow ring

### Badges / Pills
- Background: Color at 12% opacity
- Text: Full color
- Padding: 4px 12px
- Border radius: 50px
- Font: Badge scale (12px, 500 weight)

### Progress Bar
- Track: `var(--border)` background, 8px height, 50px radius
- Fill: `var(--gradient-progress)` (sage → gold), animated width
- Border radius: 50px

---

## 6. Shadows & Elevation

| Level | Shadow | Usage |
|-------|--------|-------|
| **None** | none | Flat elements, badges |
| **Low** | `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` | Default cards |
| **Medium** | `0 4px 12px rgba(0,0,0,0.08)` | Hovered cards, dropdowns |
| **High** | `0 10px 25px rgba(0,0,0,0.1)` | Modals, active elevated elements |
| **Glow (Sage)** | `0 0 20px rgba(44, 95, 78, 0.15)` | Focused inputs, button hover |
| **Glow (Gold)** | `0 0 20px rgba(212, 175, 55, 0.2)` | Gold accent glow |

---

## 7. Animation & Interaction

### Easing Curves
| Name | Value | Usage |
|------|-------|-------|
| **Standard** | `cubic-bezier(0.4, 0, 0.2, 1)` | General transitions |
| **Decelerate** | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering the viewport |
| **Accelerate** | `cubic-bezier(0.4, 0, 1, 1)` | Elements exiting |
| **Spring** | `type: "spring", stiffness: 300, damping: 24` | Framer Motion bouncy interactions |
| **Gentle Spring** | `type: "spring", stiffness: 120, damping: 20` | Page transitions, large movements |

### Transition Durations
| Token | Duration | Usage |
|-------|----------|-------|
| `--duration-micro` | 150ms | Color changes, opacity, small states |
| `--duration-standard` | 300ms | Card hover, button effects, general transitions |
| `--duration-emphasis` | 500ms | Progress bar fills, section reveals |
| `--duration-page` | 800ms | Page transitions, hero entrance |
| `--duration-slow` | 1200ms | Ambient floating animations |

### Hover Effects
| Element | Behavior |
|---------|----------|
| **Primary Button** | Scale to 1.03, shadow deepens, background shifts to gradient |
| **Card** | TranslateY(-3px), shadow elevates to Medium, border brightens |
| **Option Card (Quiz)** | Left-border widens, background tints with dosha color at 5% |
| **Nav Link** | Underline slides in from left, color shifts to primary |
| **Icon Button** | Scale to 1.1, glow ring appears |
| **Badge/Pill** | Subtle brightness increase (filter: brightness(1.05)) |

### Scroll-Triggered Behaviors
| Behavior | Config |
|----------|--------|
| **Fade Up** | Opacity 0→1, translateY(30px→0), duration 600ms, threshold 0.15 |
| **Stagger Children** | Each child delays by 100ms, same fade-up pattern |
| **Scale In** | Scale 0.95→1, opacity 0→1, duration 500ms |
| **Slide In Left** | TranslateX(-40px→0), opacity 0→1, duration 600ms |
| **Slide In Right** | TranslateX(40px→0), opacity 0→1, duration 600ms |

### Page Transitions (Framer Motion AnimatePresence)
```javascript
const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.3, ease: [0.4, 0, 1, 1] } },
};
```

### Micro-Interactions
| Interaction | Animation |
|-------------|-----------|
| **Button Press** | Scale down to 0.97 on tap/click, spring back |
| **Quiz Option Select** | Border color fill sweep (left to right), background tint fade-in |
| **Progress Bar Update** | Spring animation on width change |
| **Chat Message Appear** | Slide in from side + opacity, stagger 50ms |
| **Typing Indicator** | Three dots with sequential bounce (0.3s each, 0.15s stagger) |
| **Mood Emoji Select** | Pop scale (1→1.3→1) with spring |
| **Dosha Result Reveal** | Scale from 0.8, opacity fade, spring with overshoot |
| **Sattva Tree Growth** | Gentle bounce-scale on point increment |

### Ambient Animations
| Element | Animation |
|---------|-----------|
| **Floating Botanicals** | Gentle Y oscillation (±8px), 6-8s period, infinite |
| **Breathing Circle** | Scale pulse with CSS easing matching breath pattern |
| **Background Mandala** | Slow rotation (360° over 60s), very low opacity |
| **Gold Sparkle Badge** | Subtle shimmer sweep (background-position animation) |

---

## 8. Iconography

**Library:** Lucide React  
**Default size:** 20px  
**Stroke width:** 1.75  
**Color:** Inherits from parent text color or specific accent  

Key icons: `Compass` (dosha), `Sparkles` (AI), `Sun`/`Moon` (routines), `Heart` (wellness), `Wind` (breathing), `Leaf` (brand), `MessageCircle` (chat), `BarChart3` (mood), `BookOpen` (journal), `Apple` (food), `TreeDeciduous` (sattva)
