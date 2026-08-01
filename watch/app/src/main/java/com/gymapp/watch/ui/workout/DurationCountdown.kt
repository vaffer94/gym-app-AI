package com.gymapp.watch.ui.workout

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import kotlin.math.ceil
import kotlinx.coroutines.delay

/**
 * Conto alla rovescia degli esercizi a tempo.
 *
 * L'origine e' `serie.startedAt` persistito nella sessione, non un timer in memoria:
 * cosi' il conto sopravvive all'uscita dall'app e alla riapertura (a differenza del
 * recupero, che e' un job del ViewModel perche' dura poche decine di secondi).
 */

/** Un anello con troppe tacche diventa illeggibile: sotto i 3 minuti si scende a 15s */
fun segmentSec(totalSec: Long): Int = if (totalSec >= 180) 60 else 15

/**
 * Secondi mancanti, aggiornati ogni secondo. Puo' andare sotto zero: chi chiama decide
 * cosa fare allo scadere. La pausa in corso non consuma tempo (quella gia' conclusa e'
 * stata tolta spostando startedAt, vedi SessionEngine.togglePause).
 */
@Composable
fun rememberRemainingSec(startedAt: Long?, durationSec: Long, pauseStartedAt: Long?): Int? {
    if (startedAt == null) return null
    var nowMs by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) {
        while (true) {
            val now = System.currentTimeMillis()
            nowMs = now
            delay(1000 - now % 1000)
        }
    }
    val ongoingPause = pauseStartedAt?.let { (nowMs - it).coerceAtLeast(0L) } ?: 0L
    val elapsedSec = ((nowMs - startedAt - ongoingPause) / 1000L).coerceAtLeast(0L)
    return (durationSec - elapsedSec).toInt()
}

/** mm:ss, col segno + quando si e' sforato */
fun formatCountdown(sec: Int): String {
    val a = kotlin.math.abs(sec)
    val s = "${a / 60}:${(a % 60).toString().padStart(2, '0')}"
    return if (sec < 0) "+$s" else s
}

/**
 * Anello del tempo rimanente: parte sempre da un cerchio completo, diviso in tante
 * tacche quanti sono i minuti della durata (15 secondi sotto i 3 minuti). Ogni volta
 * che ne scade una la tacca sparisce, in senso antiorario a partire dalle 12.
 *
 * Sta sul bordo esterno, fuori dal quadrante dell'EdgeClock (che quando questo anello
 * e' visibile rientra verso il centro): i due anelli restano concentrici e separati.
 */
@Composable
fun DurationRing(
    remainingSec: Int,
    totalSec: Long,
    color: Color,
    modifier: Modifier = Modifier,
) {
    if (totalSec <= 0) return
    val segSec = segmentSec(totalSec)
    val total = ceil(totalSec / segSec.toDouble()).toInt().coerceAtLeast(1)
    val left = ceil(remainingSec.coerceAtLeast(0) / segSec.toDouble()).toInt().coerceIn(0, total)

    Canvas(modifier = modifier.fillMaxSize()) {
        val strokeW = 5.dp.toPx()
        // Appoggiato al bordo dello schermo: l'EdgeClock rientra per fargli posto
        val inset = 1.dp.toPx() + strokeW / 2f
        val d = size.minDimension - inset * 2f
        if (d <= 0f) return@Canvas
        val topLeft = Offset((size.width - d) / 2f, (size.height - d) / 2f)
        val arcSize = Size(d, d)

        val step = 360f / total
        // Con molte tacche il distacco deve rimpicciolirsi, se no le mangia tutte
        val gap = minOf(3f, step * 0.25f)

        // Si disegnano solo le tacche rimaste, dalle 12 in senso orario: quella che
        // sparisce e' sempre l'ultima, cioe' quella subito prima delle 12 -> l'anello
        // si consuma in senso antiorario.
        for (i in 0 until left) {
            drawArc(
                color = color,
                startAngle = -90f + i * step + gap / 2f,
                sweepAngle = step - gap,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = strokeW, cap = StrokeCap.Butt),
            )
        }
    }
}
