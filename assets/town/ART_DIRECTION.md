# Vaultbound town artwork

Generated with the built-in image generation tool in one call on 2026-10-18.

- `buildings-master.png` is the unmodified, transparent generated sheet.
- `buildings-atlas.webp` is the web-ready atlas: nine 512px cells, 1536×1536 overall, approximately 600 KB. It preserves transparency and gives every building safe padding.
- Atlas order: Barracks, Thieves' Guild, Bard College / Temple, Fighting Pit, Hunter's Lodge / Mage Guild, Alchemist, Tavern.
- Each building has one illustration, reused at all five levels. CSS shows a subdued outline and gradually reveals the finished artwork from its foundation upward. The highest level restores the complete silhouette and color.
- `src/town-view.js` supplies the accessible HTML interface. `town.css` supplies layout, atlas positioning, and reveal masks. No new runtime dependencies or game engine are required.

To repeat the one-time packaging step:

```sh
node scripts/prepare-town-art.mjs assets/town/buildings-master.png assets/town/buildings-atlas.webp
```

The packaging script identifies the nine opaque sprite cores, restores their soft alpha edges, and packs them with consistent padding. It does not create new building artwork or paint level variants.

## Generation prompt

Use case: stylized-concept
Asset type: ONE production sprite atlas for the nine town buildings in the dark-fantasy browser game Vaultbound.
Primary request: a single square 3 by 3 sprite sheet of nine DIFFERENT full buildings, all created together in one cohesive painterly isometric game-art style. Real transparent background. Exactly nine equally sized square cells, no borders or labels. This will be cropped into sprites using an exact regular grid.
Composition: uniform orthographic three-quarter isometric view from above, all buildings face lower left, same scale and light direction. Each building and its small cobblestone foundation fully contained within its own cell, centered with at least 9% transparent padding on all four sides. No building crosses into any other cell. No continuous town scene or roads connecting cells.
Exact order, left to right, top to bottom:
ROW 1: (1) Knight BARRACKS: compact fortified stone gatehouse, squat square turret, blue pennants, shields and training yard; (2) THIEVES GUILD: shadowy timber and slate-roof guildhall with secret side entrance, small attic tower, subtle coin/chest motif; (3) BARD COLLEGE: graceful timber-and-stone music hall with burgundy canopy, lute emblem and tiny courtyard stage.
ROW 2: (4) CLERIC TEMPLE: warm ivory stone chapel with gold sun emblem, bell tower, candlelit arched doorway; (5) BARBARIAN FIGHTING PIT: rugged circular stone arena with timber palisades, red banners, horned gate, glowing braziers; (6) RANGER HUNTERS LODGE: forest-green gabled timber lodge with antlers, bow targets, small tree and lookout platform.
ROW 3: (7) MAGE GUILD: slender arcane stone tower with indigo roofs, glowing violet crystal, attached library wing; (8) ALCHEMIST: cozy crooked green-roof apothecary with brass chimney, glowing teal potion bottles and little glasshouse; (9) TAVERN: welcoming half-timber inn with red-brown tiled roofs, warm amber windows, lanterns and hanging tankard sign.
Art direction: premium illustrated strategy-game miniatures, tactile carved stone and aged timber, hand-painted brushwork, readable strong silhouettes, controlled detail at small size. Consistent navy shadows, weathered gray stone, bronze trim, jewel-toned roofs, amber window light; inviting settlement in a dark fantasy world. Match realistic painterly fantasy hero portraits without photorealism. All buildings fully developed with a small central structure and a few architectural extensions, roof details and flags. The assets will be progressively revealed from foundations to roofs as buildings level up, so keep clearly readable lower stone foundations and interesting upper silhouettes.
Constraints: no text, no letters, no UI, no people, no decorative frame, no white or checkerboard background; actual alpha transparency. Precisely aligned regular 3x3 atlas. Highest useful square resolution, ideally 3072x3072.
