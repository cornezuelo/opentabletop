# Dice that feel physical

Built on autopilot (2026-11-14) after the author's "el tirar dados quiero que sea como en Baldur's Gate 3, que se siente súper físico"; **to review with the author**.

## What there is

1. **A roll of the player's is thrown** (ui-kit's `DiceThrow`): **Roll** on a roll waiting for them (travel-ui's `YourRoll`) opens a table in the middle of the screen, the dice of the roll waiting in hand at its foot. Dragged and let go, they fly the way the hand moved (its speed over the last 90 ms, kept between a gentle and a hard throw); a click throws them by themselves. They fall onto the table, hop, bounce off its edges and off each other, spin, and slow down on the cloth until they stop; each time one goes over (a hop, a bounce, a quarter turn) its face changes, and it stops on the face the roll had. Then the total, large, and **Use it** (applied at once) or **Put away** (written in, not applied).
2. **The roll is made first** (`rollWith`, with its roll mode), the throw only shows it: what happens never depends on where the dice land on the screen, so nothing can be gamed and replays stay what they are.
3. **The physics** (`diceThrow.ts`) is plain numbers, a step at a time (`startThrow`, `stepThrow`, `playThrow`): position, speed, height (drawn as size and shadow), spin; gravity, friction on the cloth, bounces that keep some speed, dice pushing each other apart and trading speed. Pure, tested to the end of a throw.
4. **Sound** (`diceSound.ts`): each knock made on the spot by the browser (a burst of noise through a filter, louder and lower the harder), no files. **Dice knock on the table** in Preferences turns it off.
5. **Without motion** (the player's **Dice tumble as they're rolled** off, or the system's reduce motion), the dice show at once on the table, with the total.
6. **The computer's rolls** keep the dice tray (`DiceTray`): they tumble for 1.2 s, faces turning, the total once they settle. They're the trip's, not thrown by anyone.

## To decide with the author

1. Whether the computer's important rolls (a fight's turn, an important moment) should be thrown on the table too, without a hand: watched rather than played.
2. A roll against a number to beat (a check's target, a range of a table that matters), shown on the table as it settles (_needs 12_ → _Success_): the engine knows a table's ranges, not yet which matters most.
3. The Oracle's **Roll**: thrown the same way when the player asks for it.
4. A look closer to real dice (faces in perspective, a 3D die) is possible with WebGL; the table is plain SVG and CSS for now, light and with no dependency.
