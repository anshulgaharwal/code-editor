# Code Editor

A lightweight browser-based code editor prototype built with plain HTML, CSS, and JavaScript.

## Overview

This project includes:

- a simple landing page in `index.html`
- an editor screen in `editor.html`
- custom styling split across `style.css` and `editor.css`
- client-side editor interactions in `script.js`

The project does not use a framework, package manager, or build step. You can run it directly in the browser.

## Features

- Landing page with a button that opens the editor
- Editor header with branding and project title
- File tab area with a default `note.txt` tab
- Add-file dropdown that currently supports creating `.cpp` tabs
- Line number generation that updates as you type
- Current-line highlight inside the editor textarea
- Scroll syncing between the editor and line number column
- Draggable divider for resizing the editor and output panels
- Output panel placeholder for future execution support

## Project Structure

- `index.html` - entry page
- `editor.html` - main editor interface
- `style.css` - global styles and font import
- `editor.css` - editor layout and component styling
- `script.js` - line numbers, highlighting, resizing, and tab creation logic
- `assets/terminal.png` - logo used in the editor header

## Current Behavior

### Landing page

`index.html` shows a minimal "Code online" screen with a `CODE` button that links to `editor.html`.

### Editor page

`editor.html` includes:

- a top navigation area with the logo and "Compiler" heading
- a file tab section with an add button
- a centered project label showing "Code Editor"
- a `Run` button
- a split main area with code input on the left and output on the right

### JavaScript interactions

`script.js` currently handles:

- generating line numbers from textarea content
- highlighting the active line based on cursor position
- syncing line-number scroll with the textarea
- resizing the editor/output panels with pointer events
- toggling the add-file dropdown
- creating new file tabs from a prompted filename and selected extension

## Limitations

- The `Run` button is present but has no execution logic yet
- New tabs are visual only and do not switch file content
- File content is not saved
- The output panel is a placeholder
- The add-file menu currently offers only one extension option: `.cpp`
- There are no tests yet

## How to Run

Open `index.html` in a browser.

You can also open `editor.html` directly if you want to skip the landing page.

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript

## Next Improvements

- connect the `Run` button to safe code execution or preview behavior
- add real file switching between tabs
- improve accessibility labels for the editor controls
- make the layout more robust on smaller screens
- replace `prompt()`-based file creation with an in-page form or modal
