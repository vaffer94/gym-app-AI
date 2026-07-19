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

/**
 * Colore "caratterizzante" di ogni esercizio della sessione (per posizione nella
 * scheda): stessa palette pastello delle schede web. Serve a far percepire il cambio
 * esercizio a colpo d'occhio — e sara' la stessa mappa colore->esercizio del futuro
 * grafico HR nello storico (step 6).
 */
private val ExercisePalette = listOf(
    Color(0xFFFFE1D3), // pesca
    Color(0xFFD5F4F1), // acqua
    Color(0xFFFFF3C7), // limone
    Color(0xFFE4D9FF), // lilla
    Color(0xFFFFD9EC), // rosa
    Color(0xFFDDF3D5), // menta
    Color(0xFFD9E9FF), // cielo
    Color(0xFFF3E3C9), // sabbia
)

fun exerciseColor(index: Int): Color =
    ExercisePalette[((index % ExercisePalette.size) + ExercisePalette.size) % ExercisePalette.size]
