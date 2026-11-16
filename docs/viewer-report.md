# Evidence image viewer

## Integration

Load `src/viewer.css` with the page's styles and import `initViewer` from `src/viewer.js` after the document exists. Call `initViewer(images)` with the complete flat image array and already-rebased `original`, `display`, and `thumb` paths. The viewer imports `viewer-math.js`; copy this sibling file alongside `viewer.js` in the generated assets.

`button[data-viewer="ea-001-01"]` opens that image. Click delegation also handles buttons added later. The returned controller exposes `open(imageId, triggerElement?)`, `close()`, and `destroy()`. A repeated initialisation destroys the previous instance. Unknown image IDs do nothing.

## Behaviour

The native modal dialog preserves browser focus containment, closes with Escape, restores its triggering button's focus, and locks document scrolling while open. Left/right keys navigate only images belonging to the selected entity, with primary first and subsequent IDs in natural order. Navigation stops at either end. All paths and metadata come from the supplied image records.

If navigation disables its focused control at an image boundary, focus moves to the focusable image stage. Viewer shortcuts are captured at the document only while the dialog is open, so they remain available when a browser blurs a disabled button to `body`. Handled shortcuts prevent their default action and stop further propagation; closed viewers leave background keyboard events untouched. Native modal handling still owns Tab focus containment.

Images fit uncropped inside the stage using their actual natural aspect ratio. Zoom ranges from 1× to 8×, anchors wheel zoom to the cursor, and supports pointer drag plus simultaneous mobile pinch and pan. Buttons provide zoom, reset, and four-direction pan alternatives. `+`, `-`, and `0` also control zoom and reset. Double-click resets the image. Zoom is relative to the fit-to-window image size.

The original-file link opens the intact original in a new tab. Initial loading and load failure have separate states; failure includes retry and original-file actions. Fullscreen requests the document root because [the Fullscreen Standard excludes dialog elements](https://fullscreen.spec.whatwg.org/#dom-element-requestfullscreen). The viewer tracks whether its own request entered fullscreen. It preserves pre-existing fullscreen on either the root or another element, reports unsupported/rejected requests, and exits during close only when its owned target is still the current fullscreen element. Button labels follow ownership and current fullscreen state. Pending requests retain their opening-session identity so a result from a closed session is cleaned up.

Native dialog close events are asynchronous. The close listener checks that the dialog is still closed before cleanup, preventing a queued event from an earlier opening from unlocking the document or invalidating a newly loading image after rapid close/reopen.

## Visual and accessibility details

Charcoal stage, gray-white text, fine borders, muted-red focus indication, and a restrained glass footer follow the approved archive direction. No controls cover the image. Controls have at least 44×44px touch targets and Chinese accessible names. The mobile toolbar wraps within 375px; directional pan controls appear on mobile when zoomed. Landscape layouts reduce metadata height. Loading motion and control transitions respect reduced-motion preference. Token fallbacks are provided for `--ink`, `--muted`, `--line`, and `--accent`.

## Verification

`node --check src/viewer.js` passed. `node --test tests/viewer.test.mjs` passed 10/10. Geometry tests were run failing before implementation, then passed after implementation. Tests cover portrait fit/aspect ratio, cursor-anchor stability, zoom/pan limits, combined pinch and translation, collapsed pinch, and entity-scoped navigation/order without mutating the input.

Three lifecycle regression tests exercise the actual viewer controller through a minimal simulated DOM/platform boundary. They cover root fullscreen acquisition plus owned cleanup and button label, preservation of pre-existing root/video fullscreen, and a queued close followed by immediate reopen with the new image still able to finish loading and document scrolling still locked. The root-target and queued-close regressions both failed against the prior code before the fixes; all nine tests passed after the fixes. These platform simulations supplement the required real-browser fullscreen check.

A fourth controller regression uses a two-image entity: clicking Next at the final image must move focus from the newly disabled button to the stage; a subsequent document/body ArrowLeft must navigate back, prevent default behaviour, and stop propagation. After close, ArrowRight must do nothing and remain unconsumed. Both the focus-target and body-key assertions were observed failing before their respective fixes; all ten viewer tests passed afterward. Real-browser keyboard confirmation remains part of integration QA.

Browser verification belongs to the integration pass: open from a real trigger, check focus return and keyboard containment, wheel/drag/reset, fullscreen, image failure/retry, and 375px/desktop layouts. Physical two-finger touch should also be checked on a touchscreen; Node geometry tests do not emulate browser gesture dispatch.

## Owned files

- `src/viewer.js`: modal lifecycle, image loading, controls, and gestures.
- `src/viewer.css`: isolated viewer presentation and responsive styles.
- `src/viewer-math.js`: pure fit, zoom, pinch, bounds, and image grouping.
- `tests/viewer.test.mjs`: six geometry/navigation tests and four fullscreen/dialog/keyboard lifecycle regression tests.
- `docs/viewer-report.md`: integration and validation record.
