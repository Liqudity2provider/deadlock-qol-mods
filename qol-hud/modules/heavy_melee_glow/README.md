# Red heavy melee glow

Every hero's heavy melee wind-up plays `particles/abilities/melee/melee_heavy_activate_charge.vpcf` on the left palm;
its child `melee_heavy_activate_charge_outer` is a soft orange glow sprite (alpha 0.25, radius 15). This module ships a
patched copy: red (255,20,20), opaque (alpha 1.0), overbright 4, radius 70 and it no longer shrinks (end scale 1.0),
so you see who is charging a heavy at you. It affects every heavy melee, yours and your allies' too.

Rebuild after a game update (the file is taken from the game, numbers patched in place):

    python3 tools/kv3patch.py set <game>/particles/abilities/melee/melee_heavy_activate_charge_outer.vpcf_c \
      assets/particles/abilities/melee/melee_heavy_activate_charge_outer.vpcf_c \
      m_ConstantColor/0=255 m_ConstantColor/1=20 m_ConstantColor/2=20 \
      m_Initializers/1/m_InputValue/m_flLiteralValue=70 m_Operators/6/m_flEndScale=1.0 \
      m_Renderers/0/m_flAlphaScale/m_flLiteralValue=1.0 m_Renderers/0/m_flOverbrightFactor/m_flLiteralValue=4
