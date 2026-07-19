package com.gymapp.watch.ui.theme

import androidx.compose.ui.graphics.Color

/**
 * Colore della scheda scelto nella web app (palette pastello di src/data/planColors.js,
 * hex "#RRGGBB" salvato in plan.color / session.planColor). I pastelli chiari sul nero
 * OLED del watch funzionano bene sia come sfondo dei pulsanti (testo Ink) sia come
 * colore del testo su sfondo nero.
 */
fun planColor(hex: String?, fallback: Color = PrimaryOrange): Color {
    val h = hex?.trim().orEmpty()
    if (!Regex("^#[0-9a-fA-F]{6}$").matches(h)) return fallback
    return Color(0xFF000000 or h.substring(1).toLong(16))
}
