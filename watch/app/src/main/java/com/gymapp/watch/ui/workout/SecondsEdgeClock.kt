package com.gymapp.watch.ui.workout

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.dp
import com.gymapp.watch.ui.theme.Paper
import kotlin.math.cos
import kotlin.math.sin
import kotlinx.coroutines.delay

/**
 * Orologio dei secondi sul bordo dello schermo, da sovrapporre alle schermate di
 * allenamento: 60 tacche come i minuti di un quadrante, quella del secondo corrente
 * si accende col colore della scheda e avanza ogni secondo. Serve a comunicare che
 * il tempo scorre anche quando non c'e' un timer a schermo (es. durante una serie).
 *
 * Gestisce sia schermi rotondi (tacche radiali) sia rettangolari (tacche lungo il
 * perimetro, partendo dal centro del lato alto in senso orario).
 *
 * Tiene anche lo schermo acceso finche' e' visibile (equivalente del Wake Lock della
 * web app durante l'allenamento): l'ambient mode a basso consumo arrivera' con lo step 6.
 */
@Composable
fun SecondsEdgeClock(accent: Color, modifier: Modifier = Modifier) {
    val view = LocalView.current
    DisposableEffect(Unit) {
        view.keepScreenOn = true
        onDispose { view.keepScreenOn = false }
    }

    var second by remember { mutableIntStateOf(((System.currentTimeMillis() / 1000) % 60).toInt()) }
    LaunchedEffect(Unit) {
        while (true) {
            val now = System.currentTimeMillis()
            second = ((now / 1000) % 60).toInt()
            delay(1000 - now % 1000)
        }
    }

    val isRound = LocalConfiguration.current.isScreenRound
    val base = Paper.copy(alpha = 0.25f)

    Canvas(modifier = modifier.fillMaxSize()) {
        val tickShort = 4.dp.toPx()
        val tickLong = 7.dp.toPx()
        val edgeInset = 2.dp.toPx()

        for (i in 0 until 60) {
            val isNow = i == second
            val len = (if (i % 5 == 0) tickLong else tickShort) * (if (isNow) 1.6f else 1f)
            val color = if (isNow) accent else base
            val stroke = (if (isNow) 3.dp else 1.5.dp).toPx()

            if (isRound) {
                val c = center
                val rOuter = size.minDimension / 2f - edgeInset
                val angle = Math.toRadians(i * 6.0 - 90.0)
                val dirX = cos(angle).toFloat()
                val dirY = sin(angle).toFloat()
                drawLine(
                    color = color,
                    start = Offset(c.x + dirX * (rOuter - len), c.y + dirY * (rOuter - len)),
                    end = Offset(c.x + dirX * rOuter, c.y + dirY * rOuter),
                    strokeWidth = stroke,
                    cap = StrokeCap.Round,
                )
            } else {
                // Perimetro del rettangolo percorso in senso orario dal centro del lato alto
                val w = size.width - edgeInset * 2
                val h = size.height - edgeInset * 2
                val perimeter = 2 * (w + h)
                val d = ((i / 60f) * perimeter + w / 2f) % perimeter
                // Punto sul bordo + normale verso l'interno
                val px: Float
                val py: Float
                val inX: Float
                val inY: Float
                when {
                    d < w -> { px = edgeInset + d; py = edgeInset; inX = 0f; inY = 1f }
                    d < w + h -> { px = edgeInset + w; py = edgeInset + (d - w); inX = -1f; inY = 0f }
                    d < 2 * w + h -> { px = edgeInset + w - (d - w - h); py = edgeInset + h; inX = 0f; inY = -1f }
                    else -> { px = edgeInset; py = edgeInset + h - (d - 2 * w - h); inX = 1f; inY = 0f }
                }
                drawLine(
                    color = color,
                    start = Offset(px + inX * len, py + inY * len),
                    end = Offset(px, py),
                    strokeWidth = stroke,
                    cap = StrokeCap.Round,
                )
            }
        }
    }
}
