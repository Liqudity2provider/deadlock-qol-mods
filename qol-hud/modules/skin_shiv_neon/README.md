# Skins: Shiv Neon, Vindicta Frost, Rat King Gold

Texture recolors built with `tools/vtex.py` (BC7 decode -> HSV edit -> mip chain -> BC7 encode, no Valve tools).
Verified in-game (build 6821): Vindicta's coat is icy blue, Rat King's cloak gold with gilded armour, Shiv's jacket purple.
Shiv's red trousers are not changed yet: they come from a texture shared with his skin.

Rebuild from your game files: `python3 tools/make_skins.py "<Deadlock>/game/citadel/pak01_dir.vpk"`.
Recipes: `modules/skin_*/recipe.json`. Skins are visible only to you.
