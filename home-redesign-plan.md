# Home Page Redesign Plan: "Classic Modern Critical Fantastic"

## 1. Aesthetic Goal
- **Classic Modern**: Clean, timeless typography (sans-serif, large weights), abundant whitespace, structured grid layouts.
- **Critical**: High contrast (black, white, distinct bold accent colors), sharp edges mixed with subtle curves, brutalist but refined.
- **Fantastic**: Engaging, smooth, high-quality CSS/SVG animations that make the page feel alive and interactive.

## 2. Content Structure
The current `HomeShowcase.tsx` will be completely overhauled.

### A. Hero Section
- **Visual**: A bold, large-typography headline.
- **Interactive**: An animated background or "orbit" that dynamically highlights the suite of tools.

### B. App Showcases (The "Explanation & Videos" Section)
Instead of a simple grid, each app will get a dedicated, full-width section with alternating layouts (text on left, visual on right, and vice-versa).
Each section will include:
- **Title & Tagline**: Bold, clear explanation.
- **Detailed Explanation**: What it does and why it's critical.
- **Visual / "Quick Video"**: Since we don't have actual `.mp4` files, we will build **CSS/SVG animated mockups** that simulate a "video" of the app in use (e.g., a typing animation for TaskMaster, a waveform animation for VoiceNotes, a ticking dial for the Timer, and a scanning effect for Shield Gen). If you have actual video files (`.mp4`), we will use `video` tags with autoplay/looping.

### C. The Apps to Include
1. **TaskMaster**: Fast task planning.
2. **VoiceNotes**: Voice-to-text capture.
3. **Shield Gen**: Password security & extension.
4. **Apple Timer**: Focus workflow.
5. **Meet Summarizer** (Coming Soon): Highlighting future AI capabilities.
6. **AI Assistant**: Context-aware help.

## 3. Implementation Steps
1. **Create CSS/Styling**: Completely rewrite `HomeShowcase.css` to implement the "Classic Modern Critical Fantastic" aesthetic. Add keyframes for the mock "videos".
2. **Update Component Structure**: Refactor `HomeShowcase.tsx` to map through the enhanced app list and render the alternating sections.
3. **Build Mock Animations**: Create embedded SVG/CSS animations for each app's visual preview to simulate "quick videos of using it".
4. **Validation**: Test responsiveness and ensure the page performs well without jank.

## Questions for User
- Do you have actual `.mp4` or `.gif` files for the "quick videos", or should I proceed with building CSS/SVG animated mockups that simulate the apps in action?
- Is there a specific color palette you want for the "critical fantastic" look, or should I stick to a high-contrast monochrome with bright neon accents?