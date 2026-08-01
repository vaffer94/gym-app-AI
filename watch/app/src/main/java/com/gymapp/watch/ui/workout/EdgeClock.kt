package com.gymapp.watch.ui.workout

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
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
import com.gymapp.watch.ui.theme.PrimaryOrange
import com.gymapp.watch.ui.theme.Teal
import com.gymapp.watch.ui.theme.Yellow
import java.time.Instant
import java.time.ZoneId
import kotlin.math.cos
import kotlin.math.sin
import kotlinx.coroutines.delay

/**
 * Quadrante sul bordo dello schermo, da sovrapporre alle schermate di allenamento.
 * Sulle 60 tacche (i minuti di un orologio) mostra tre indicatori:
 *
 *  - secondi: tacca gialla corta che avanza ogni secondo — comunica che il tempo
 *    scorre anche quando non c'e' un timer a schermo (es. durante una serie)
 *  - minuti: tacca turchese, piu' lunga e spessa
 *  - ore: tacca arancione, la piu' lunga e spessa, in posizione da orologio
 *    analogico a 12 ore (avanza dentro l'ora come una lancetta vera)
 *
 * I tre non si distinguono solo per colore ma anche per lunghezza e spessore: se
 * due cadono sulla stessa tacca restano leggibili lo stesso, perche' la piu' corta
 * si disegna sopra e ne copre solo la punta esterna.
 *
 * Gestisce sia schermi rotondi (tacche radiali) sia rettangolari (tacche lungo il
 * perimetro, partendo dal centro del lato alto in senso orario).
 *
 * Tiene anche lo schermo acceso finche' e' visibile (equivalente del Wake Lock della
 * web app durante l'allenamento): l'ambient mode a basso consumo arrivera' con lo step 6.
 */
@Composable
fun EdgeClock(modifier: Modifier = Modifier, activeColor: Color = Yellow) {
    val view = LocalView.current
    DisposableEffect(Unit) {
        view.keepScreenOn = true
        onDispose { view.keepScreenOn = false }
    }

    var nowMs by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) {
        while (true) {
            val now = System.currentTimeMillis()
            nowMs = now
            delay(1000 - now % 1000)
        }
    }

    // I secondi si ricaverebbero dall'epoch, ore e minuti no: dipendono dal fuso
    // orario, quindi si passa comunque dal calendario di sistema.
    val time = remember(nowMs) { Instant.ofEpochMilli(nowMs).atZone(ZoneId.systemDefault()) }
    val second = time.second
    val minute = time.minute
    // Posizione da lancetta: dentro l'ora la tacca avanza di un passo ogni 12 minuti
    val hourTickIdx = (time.hour % 12) * 5 + minute / 12

    val isRound = LocalConfiguration.current.isScreenRound
    val base = Paper.copy(alpha = 0.25f)

    Canvas(modifier = modifier.fillMaxSize()) {
        val edgeInset = 2.dp.toPx()

        /** Disegna la tacca [i] (0..59) lunga [len] verso l'interno del bordo */
        fun tick(i: Int, len: Float, color: Color, stroke: Float) {
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

        val tickShort = 4.dp.toPx()
        val tickLong = 7.dp.toPx()

        // Quadrante di fondo
        for (i in 0 until 60) {
            tick(i, if (i % 5 == 0) tickLong else tickShort, base, 1.5.dp.toPx())
        }

        // Dal piu' lungo al piu' corto: chi si disegna dopo copre solo la punta esterna
        // dell'altro, cosi' due indicatori sovrapposti restano entrambi riconoscibili.
        tick(hourTickIdx, 14.dp.toPx(), PrimaryOrange, 5.dp.toPx())
        tick(minute, 10.dp.toPx(), Teal, 3.5.dp.toPx())
        // Giallo paglierino della web app: non si confonde coi colori pastello dei pulsanti
        tick(second, (if (second % 5 == 0) tickLong else tickShort) * 1.6f, activeColor, 3.dp.toPx())
    }
}
