Fathomlight – Character Animation Polish, Session B: walking animation

Read DESIGN.md and PROGRESS.md first (especially "Character animation, session A"). Then inspect src/actors/walker.ts, src/interior/interior.ts (physics, jump, ladders, grapple) and the swimming rig in src/actors/diver.ts before proposing changes.

Session A polished the swimming diver. This session does the same for the on-foot explorer in src/actors/walker.ts, used in the Corvina and the walkable base. Same person, same suit: it should feel like one character in two environments.

Keep the architecture: procedurally drawn, articulated, joint-based. No spritesheets, skeletal animation libraries or external assets. Preserve all gameplay, physics, controls and the rendering architecture. Restrained and realistic, a real person in a fairly heavy exploration suit, never cartoonish.

1. Audit first. Note how walker.ts draws (it currently clears and redraws one Graphics every frame from joint angles; the diver instead rotates prebuilt pieces). Measure its CPU cost in the animation lab before changing anything, and decide whether moving it to prebuilt joint pieces like the diver is worth it on the iPhone. Do not duplicate animation logic unnecessarily: shared helpers (damped springs, smoothed blends, the breathing cycle, glance and blink timing) can move to a small shared module if both characters use them.

2. Walking gait: proper alternating legs, hip and knee articulation, real foot contact (no sliding: the planted foot stays put while the body passes over it), heel-to-toe roll where the drawing supports it, opposing arm swing, a little torso rotation, a small rise and fall with each step and a visible weight shift from leg to leg. Stride and cadence follow speed.

3. Starting, stopping and turning: ease into the walk over the first step or two, slow down over the last step into a balanced standing pose (feet settle under the hips, no snapping), and turn around with a weight shift rather than an instant flip.

4. Other states: standing (breathing, small weight shifts, occasional head movement and blink, like the diver's), jumping (crouch-and-push take-off where physics allows, tuck in the air), falling, hanging from grapple points and ladders, landing (absorb through the knees and settle, scaled by fall speed). Make every transition coherent.

5. Personality and secondary motion: subtle head movement, breathing, tanks, hose and dive bag responding to steps and landings. Restrained.

6. Consistency with the diver: same proportions, colours, equipment and details; check side by side with the diver at gameplay scale. Make the hand-off between swimming and walking (entering and leaving the base and the Corvina) feel intentional.

7. Performance: the game must stay responsive on iPhone and iPad (aim for 60 fps). Colin's 28 fps reading in the grotto was GPU-bound (frame 35.9 ms, game code 1.7 ms), so do not blame animation without measuring. No per-frame object creation, no expensive effects. Report CPU cost before and after, and draw calls in the base interior (?bench&scene=6).

8. Testing: extend the animation lab (animlab.html, src/dev/animlab.ts) with a walker mode and a scripted timeline (stand, slow walk, walk, stop, turn, jump, fall, land, hang, climb). Take frame strips with window.__lab.step as in session A, and screenshots in the real game in both the Corvina and the walkable base at 844 x 390 (iPhone landscape), at gameplay scale, not just close up.

9. Update PROGRESS.md, commit and push to the session branch.

At the end, summarise: what changed, which behaviours improved, files modified, performance impact, how Colin should test walking on his iPhone, and anything left over.
