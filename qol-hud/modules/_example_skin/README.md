# Skin module template (folder starts with `_`, so it is skipped by the build)

A skin is a file replacement like a sound: compiled `materials/…/*.vtex_c` / `*.vmat_c` (textures, recolors) or
`models/…/*.vmdl_c` (meshes) at the **same path** as the original. Workflow:

1. Source 2 Viewer → `pak01_dir.vpk` → `materials/models/heroes/<hero>/` → export the texture as PNG.
2. Edit in Photoshop/Krita (recolor, pattern, logo). Keep resolution and channels.
3. Reduced CSDK 12 → addon → put the PNG + the `.vmat` at the original path → Full recompile → `.vtex_c`/`.vmat_c`.
4. Copy the compiled files into `assets/` here, keeping paths. Rename the folder (drop the `_`) and run `../../build.sh`.

Skins are visible only to you. Hero models with new geometry need Blender + the CSDK model compiler; start with textures.
