# Form — ASL motion playground

[Try the live experiment](https://form-asl-playground.vercel.app/).

Open http://localhost:4317/index.html while the local preview server is running.

This is a visual experiment with instant procedural animation, a limited ASL word vocabulary, and fingerspelling. It does not translate English grammar into ASL. Motion accuracy has not been reviewed by a fluent Deaf signer; some hand-to-face placements remain approximate after retargeting.

## Try it

- Click Hello, Thanks, Please, or another example.
- Type `Hello Zoe` to compare a word with a spelled name.
- Choose Fingerspelling only and type `JAZZ` to inspect moving letters and repeated letters.
- Pause, replay, scrub the timeline, change speed, rotate or zoom, and compare Clay with Original materials.

## Run locally

No package install or cloud service is required. From this folder:

```sh
python3 -m http.server 4317 --bind 127.0.0.1 --directory screens
```

The initial preview uses Codex's local prototype server, which may stop after inactivity. The command above restarts a standalone preview if needed. Stop the existing server first if port 4317 is occupied.

Validate the motion data with `node check-motion.mjs`.

## Vercel experiment

The `screens` directory is a self-contained static site and includes its Vercel configuration. The hosted experiment sends `X-Robots-Tag: noindex, nofollow`, has no backend or analytics, and processes entered text in the browser. Deploy it as a preview project until the signing has been reviewed by a fluent Deaf signer.

## Pipeline chosen

Text → three.ws procedural word or fingerspelling clips → skeleton retargeting → Three.js animation mixer → live 3D character.

This path avoids model training and per-request video generation. The small motion library can be replaced or refined independently of the visual presentation. The first milestone is a reviewable motion playground, not a finished translator.

Alternatives considered: [UPF Performs](https://github.com/upf-gti/performs) offers a broader signing renderer, but its bundled linguistic material does not establish an immediately usable ASL library. [DFKI MMS Player](https://github.com/DFKI-SignLanguage/MMS-Player) requires Blender and a substantial corpus, making it less suitable for this quick browser experiment. [Neural Sign Actors](https://arxiv.org/abs/2312.02702) is a research path rather than the shortest route to a controllable local demo.

## Sources and changes

- [three.ws](https://github.com/nirholas/three.ws), commit `20b1bd378da0e12c107737c5e1828b0807c50644`: Apache-2.0. Only the needed modules are included, with LICENSE and NOTICE retained. **Local change:** `sign-speech.js` now treats scalar facial-expression tracks as one value per keyframe when joining segments. Upstream treated them as three-component vectors, producing invalid tracks and hanging Three.js during playback. A focused regression check covers mixed sequences.
- **Motion corrections:** the playground now uses the engine's own reference skeleton instead of transferring rotations onto a differently proportioned character. The `HELLO` path clears the face and travels out from the temple; `PLEASE` circles over the chest rather than the throat.
- Three.js 0.184.0: MIT. Only the renderer, required loader/controls/helpers, and bundled Meshopt decoder are included. Decoder license is embedded in its source.
- three.ws reference avatar from `public/avatars/cz.glb` at the pinned commit. The engine authored its motions on this skeleton, so using it avoids the head intersections and malformed hand poses caused by retargeting onto the previous Ready Player Me character. The repository distributes it under Apache 2.0; specific commercial asset provenance should still be checked before shipping. See `screens/credits.html`.
- Original local work: interface, viewer, material study, playback controls, and animation-data guard.

## Validation

- Generated motion checks: 12 sequences, correct scalar/quaternion widths, finite values and ordered timing; mixed spelling fallback; J/Z/repeated letters; empty input.
- Actual avatar skeleton test: Hello, Thanks, Hello Zoe, and JAZZ mapped all signing bone tracks and reached a sampled pose without hanging after the fix.
- Browser: rendered in Chrome and Codex; Hello Zoe word/spelling playback, JAZZ spelling mode, pause/replay, 0.5x speed, sequence seeking, original/clay materials and alternate camera inspected. The corrected reference rig was checked at representative poses for all eight starting words; `HELLO` and `PLEASE` were tuned from the rendered result.

## Open decision

Does this level of procedural motion justify improving the character, or should the next iteration use captured signing motion? A better character alone will not correct approximate motion or prove comprehension.
