

## Plan: Apply Uploaded UI Design System Across the App

### Design Analysis (from uploaded images)

The design uses:
- **Primary buttons**: Sky blue (`#6BC5E8`), fully rounded pill shape (`rounded-full`), bold white text, no shadow
- **Secondary/outline buttons**: White fill with subtle peach/salmon border (`~#E8C5B4`), fully rounded pill shape
- **Map backgrounds**: Soft illustrative green blob style on light gray (`#F0F0F0`)
- Overall feel: Rounded, soft, friendly — less corporate than current teal/green theme

### Changes Required

**1. Update CSS Variables (`src/index.css`)**
- Change `--primary` from teal (`152 68% 40%`) to sky blue (`~197 72% 67%` ≈ `#6BC5E8`)
- Change `--accent` to a warm peach tone for secondary styling
- Keep background, foreground, and muted colors as-is (already light/clean)

**2. Update Button Component (`src/components/ui/button.tsx`)**
- Change default border-radius from `rounded-md` to `rounded-full` (pill shape)
- Increase default height slightly for the prominent CTA feel
- Add an `outline` variant override with peach/salmon border styling

**3. Update All Pages — Button Styling**
- Replace `rounded-xl` overrides on buttons across Auth, Index, CustomerDashboard, RiderDashboard with the new default pill style (which will come from the component change)
- Remove redundant `rounded-xl` classes since `rounded-full` will be the default

**4. Update Input Fields**
- Change input `rounded-xl` to `rounded-full` for consistency with the soft rounded aesthetic

**5. Landing Page (`src/pages/Index.tsx`)**
- Update CTA buttons to match the sky-blue pill style from the design
- Adjust feature cards to use softer rounded corners (`rounded-3xl`)

**6. Auth Page (`src/pages/Auth.tsx`)**
- Update "Sign In" / "Create Account" button to sky-blue pill
- Update "Sign Up" outline variant to use the peach border style

**7. Dashboard Layout (`src/components/layout/DashboardLayout.tsx`)**
- Update header and tab bar styling to use the new primary color (sky blue active states)

### Files to Modify
- `src/index.css` — color variables
- `src/components/ui/button.tsx` — default shape
- `src/components/ui/input.tsx` — rounded-full
- `src/pages/Index.tsx` — landing buttons
- `src/pages/Auth.tsx` — auth buttons
- `src/components/layout/DashboardLayout.tsx` — nav active color
- `src/pages/customer/CustomerDashboard.tsx` — booking button
- `src/pages/rider/RiderDashboard.tsx` — action buttons

