# Code Editor Project

## Overview

This is a small front-end project with two pages:

- `index.html`: a simple landing page with a button that opens the editor.
- `editor.html`: the main editor UI with a file tab bar, code input area, line numbers, a draggable divider, and an output panel placeholder.

The project is currently built with plain HTML, CSS, and JavaScript only. There is no build step, package manager, or framework.

## Current File Structure

- `index.html`: homepage / entry page
- `editor.html`: editor page
- `style.css`: shared styles used by the homepage and loaded by the editor page
- `editor.css`: editor-page-specific styles
- `script.js`: editor interactions
- `assets/terminal.png`: logo image

## Current Behavior

### `index.html`

- Shows a basic heading and a `CODE` button.
- The button links to `editor.html`.

### `editor.html`

- Navigation bar with a clickable `.company` link that returns to `index.html`.
- File buttons for `index.html`, `style.css`, and `script.js`.
- `Run` button is present in the UI, but it does not yet execute code.
- Editor layout is split into:
  - left panel: line numbers + textarea
  - middle divider: draggable resize handle
  - right panel: output placeholder

### `script.js`

Implements:

- line number generation based on textarea content
- current-line highlight using a background gradient on the textarea
- line-number scroll syncing with the textarea
- draggable resize for the editor/input and output panels

## Important Notes For Future AI Assistance

- This project is in an early UI/prototype stage.
- Keep the stack simple unless the user explicitly asks for a framework or tooling upgrade.
- Prefer small, understandable changes over large rewrites.
- Preserve the current plain HTML/CSS/JS approach unless asked otherwise.
- Do not assume the `Run` button already has execution logic; it is only visual right now.
- Be careful when changing layout heights because the editor currently uses `100vh` and also has top navigation above it.
- If improving accessibility, prioritize:
  - adding better button/textarea labels
  - improving image `alt` text
  - keeping keyboard navigation intact

## Known Gaps / Limitations

- No real code execution yet
- No file switching logic yet
- No saved editor content
- No tests
- No modular JavaScript structure yet
- Line numbers are rebuilt on every input event
- Resize behavior is functional but still basic

## Suggested Direction

If this project continues growing, a good next step is:

1. Clean up structure and semantics in HTML.
2. Separate editor behaviors into small JS functions or modules.
3. Make the editor layout more robust for different screen sizes.
4. Add real output execution logic in a safe way.
5. Add basic testing for editor interactions.

## How To Run

Open `index.html` or `editor.html` directly in a browser.

Because this is a static front-end project, no installation is currently required.
