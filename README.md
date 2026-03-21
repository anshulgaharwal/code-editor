# Code Editor

A lightweight browser-based code editor prototype built with plain HTML, CSS, and JavaScript.

## Overview

This project includes:

- a simple landing page in `index.html`
- an editor screen in `editor.html`
- global and editor-specific styles in `style.css` and `editor.css`
- editor behavior in `script.js`
- C++ autocomplete data and trie helpers in `cpp-keywords.js`

The project does not use a framework, package manager, or build step. You can open it directly in the browser.

## Features

- Landing page with a button that opens the editor
- Editor header with logo, title, file tabs, and a `Run` button
- Add-file dropdown for creating `.cpp` tabs
- Per-tab editor content with file switching support
- Saved tab content and active file state using `localStorage`
- Line number generation that updates as you type
- Current-line highlight inside the editor textarea
- Scroll syncing between the textarea and line numbers
- Draggable divider for resizing the editor and output panels
- Trie-based C++ autocomplete for fast prefix matching
- Symbol suggestions for user-declared variables, functions, classes, structs, enums, namespaces, and detected `std` identifiers
- Keyboard autocomplete controls with `ArrowUp`, `ArrowDown`, `Enter`, and `Escape`
- Suggestion labels that show the detected kind such as `variable`, `function`, or `keyword`
- Output panel placeholder for future execution support

## Project Structure

- `index.html` - entry page
- `editor.html` - main editor interface
- `style.css` - global styles and font import
- `editor.css` - editor layout, tabs, dropdown, and autocomplete styles
- `script.js` - tab state, editor behavior, symbol extraction, autocomplete integration, and resizing logic
- `cpp-keywords.js` - C++ words, primitive types, trie construction, and trie lookup helpers
- `assets/terminal.png` - logo used in the editor header

## Current Behavior

### Landing page

`index.html` shows a simple "Code online" screen with a `CODE` button that links to `editor.html`.

### Editor page

`editor.html` includes:

- a top navigation area with the logo and "Compiler" heading
- a file tab section with an add button
- a centered project label showing "Code Editor"
- a `Run` button
- a split main area with code input on the left and output on the right
- an autocomplete dropdown inside the editor area

### JavaScript interactions

`script.js` currently handles:

- generating line numbers from textarea content
- highlighting the active line based on cursor position
- syncing line-number scroll with the textarea
- resizing the editor and output panels with pointer events
- toggling the add-file dropdown
- creating `.cpp` tabs from a prompted filename
- saving separate editor content for each tab
- restoring saved files and the active tab from `localStorage`
- extracting simple C++ symbols from the active file with regex-based parsing
- building autocomplete suggestions from both trie-based keywords and file symbols
- inserting the selected autocomplete suggestion into the textarea

## Limitations

- The `Run` button is present but has no execution logic yet
- The add-file menu currently offers only one file type: `.cpp`
- Symbol extraction is regex-based, so it is helpful but not as accurate as a real parser
- Autocomplete is currently limited to C++ tabs
- Suggestions appear in a fixed dropdown area rather than directly at the caret position
- There is no close-tab, rename-tab, or delete-tab support yet
- The output panel is still a placeholder
- There are no tests yet

## How to Run

Open `index.html` in a browser.

You can also open `editor.html` directly if you want to skip the landing page.

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Browser `localStorage` for client-side persistence

## Next Improvements

- connect the `Run` button to safe code execution or preview behavior
- support more file types such as `.html`, `.css`, and `.js`
- move autocomplete positioning closer to the caret
- improve symbol parsing with better scope awareness
- add tab rename, close, and delete actions
- improve accessibility labels for editor controls
- make the layout more robust on smaller screens
