package com.gymapp.watch.ui.workout

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Remove
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material.icons.rounded.SkipNext
import androidx.compose.material.icons.rounded.Stop
import androidx.compose.material.icons.rounded.Timer
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material.Button
import androidx.wear.compose.material.ButtonDefaults
import androidx.wear.compose.material.Chip
import androidx.wear.compose.material.ChipDefaults
import androidx.wear.compose.material.Icon
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.PositionIndicator
import androidx.wear.compose.material.Scaffold
import androidx.wear.compose.material.Text
import com.gymapp.watch.data.model.SessionExercise
import com.gymapp.watch.engine.SessionEngine
import com.gymapp.watch.ui.theme.Ink
import com.gymapp.watch.ui.theme.PrimaryOrange
import com.gymapp.watch.ui.theme.exerciseColor
import kotlinx.coroutines.delay

/**
 * F2.2 — Esecuzione: in alto la coppia "serie in corso" (timer che pulsa, selezionato)
 * / "fatta" (spunta, da premere a serie finita — senza scroll). Sotto: nome esercizio,
 * conteggio serie, reps/peso precompilati col target e modificabili con +/-.
 * Posticipa/Salta secondo F2.3; Termina con conferma anti-tocco involontario.
 */
@Composable
fun ExerciseScreen(
    viewModel: WorkoutViewModel,
    onResting: () -> Unit,
    onFinished: () -> Unit,
) {
    val session by viewModel.session.collectAsState()
    val listState = rememberScalingLazyListState()

    val exercise = session?.let { SessionEngine.currentExercise(it) }

    LaunchedEffect(session) {
        val s = session ?: return@LaunchedEffect
        // Coda vuota (tutto fatto) o sessione non piu' attiva (Termina / watchdog
        // anti-dimenticanza): si passa al riepilogo
        if (exercise == null || s.status != "active") onFinished()
    }

    if (session == null || exercise == null || session?.status != "active") return

    val ex: SessionExercise = exercise
    val nextIdx = SessionEngine.nextUndoneSerie(ex)
    // Colore caratterizzante dell'esercizio (per posizione nella scheda): fa percepire
    // subito il passaggio all'esercizio successivo
    val accent = exerciseColor(session?.exercises?.indexOfFirst { it.key == ex.key } ?: 0)

    // Stato dell'editor reps/peso, in alto perche' "Fatta" ora sta in cima alla schermata
    val serie = if (nextIdx >= 0) ex.series[nextIdx] else null
    var reps by remember(ex.key, nextIdx) { mutableIntStateOf(serie?.actualReps ?: ex.reps ?: 0) }
    var weight by remember(ex.key, nextIdx) { mutableDoubleStateOf(serie?.actualWeightKg ?: ex.weightKg ?: 0.0) }

    Box(modifier = Modifier.fillMaxSize()) {
        Scaffold(positionIndicator = { PositionIndicator(scalingLazyListState = listState) }) {
            ScalingLazyColumn(
                state = listState,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp),
            ) {
                item {
                    SerieStatusRow(
                        accent = accent,
                        enabled = nextIdx >= 0,
                        onDone = {
                            viewModel.completeSerie(
                                ex.key,
                                nextIdx,
                                if (ex.mode == "duration") null else reps,
                                if (ex.hasWeight) weight else null,
                                ex.hasWeight,
                            )
                            onResting()
                        },
                    )
                }
                item {
                    // Sui quadranti rotondi il bordo mangia i lati in alto: padding largo + ellissi
                    Text(
                        text = ex.name,
                        style = MaterialTheme.typography.title3,
                        color = accent,
                        textAlign = TextAlign.Center,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp),
                    )
                }
                item {
                    Text(
                        text = "Serie ${ex.series.count { it.done } + if (nextIdx >= 0) 1 else 0}/${ex.sets}",
                        style = MaterialTheme.typography.caption1,
                    )
                }
                item {
                    LiveHeartRate(viewModel)
                }

                if (nextIdx >= 0) {
                    if (ex.mode == "duration") {
                        item {
                            Text(text = "A tempo: ${(ex.durationSec ?: 0) / 60} min", style = MaterialTheme.typography.body1)
                        }
                    } else {
                        item {
                            StepperRow(
                                value = "$reps rip",
                                borderColor = accent,
                                onMinus = { reps = (reps - 1).coerceAtLeast(0) },
                                onPlus = { reps += 1 },
                                minusDescription = "Meno ripetizioni",
                                plusDescription = "Piu' ripetizioni",
                            )
                        }
                        if (ex.hasWeight) {
                            item {
                                StepperRow(
                                    value = "$weight kg",
                                    borderColor = accent,
                                    onMinus = { weight = (weight - 1.0).coerceAtLeast(0.0) },
                                    onPlus = { weight += 1.0 },
                                    minusDescription = "Meno peso",
                                    plusDescription = "Piu' peso",
                                )
                            }
                        }
                    }
                }

                item {
                    ActionChip(
                        icon = Icons.Rounded.Schedule,
                        text = "Posticipa",
                        onClick = { viewModel.postpone() },
                    )
                }
                item {
                    ActionChip(
                        icon = Icons.Rounded.SkipNext,
                        text = "Salta esercizio",
                        onClick = { viewModel.skipExercise() },
                    )
                }
                item {
                    val paused = session?.pauseStartedAt != null
                    ActionChip(
                        icon = if (paused) Icons.Rounded.PlayArrow else Icons.Rounded.Pause,
                        text = if (paused) "Riprendi" else "Pausa",
                        onClick = { viewModel.togglePause() },
                    )
                }
                item {
                    // finish() cambia lo status -> la navigazione al riepilogo passa
                    // dall'effetto qui sopra (unica via, condivisa col watchdog)
                    TerminaChip(onConfirm = { viewModel.finish() })
                }
            }
        }
        // Il tempo scorre anche mentre fai la serie: orologio dei secondi sul bordo
        SecondsEdgeClock()
    }
}

/** Battito live (HR continuo, step 6): visibile solo quando il sensore ha un valore */
@Composable
fun LiveHeartRate(viewModel: WorkoutViewModel) {
    val bpm by viewModel.currentBpm.collectAsState()
    if (bpm == null) return
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
        Icon(
            imageVector = Icons.Rounded.Favorite,
            contentDescription = "Battito cardiaco",
            tint = Color(0xFFE25858),
            modifier = Modifier.size(14.dp),
        )
        Spacer(modifier = Modifier.size(4.dp))
        Text(text = "$bpm bpm", style = MaterialTheme.typography.caption1)
    }
}

/**
 * Coppia di stato della serie: a sinistra "in corso" (timer col bordo che pulsa,
 * stile selezionato col colore della scheda), a destra la spunta "fatta"
 * (deselezionata): premendola la serie viene registrata e parte il recupero.
 */
@Composable
private fun SerieStatusRow(
    accent: Color,
    enabled: Boolean,
    onDone: () -> Unit,
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        PulsingTimerBadge(accent = accent)
        Button(
            onClick = onDone,
            enabled = enabled,
            colors = ButtonDefaults.secondaryButtonColors(),
            modifier = Modifier.border(2.dp, accent, CircleShape),
        ) {
            Icon(imageVector = Icons.Rounded.Check, contentDescription = "Serie fatta")
        }
    }
}

/** Timer "in corso": icona ferma, solo l'anello esterno pulsa */
@Composable
private fun PulsingTimerBadge(accent: Color) {
    val transition = rememberInfiniteTransition(label = "serie-in-corso")
    val progress by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(durationMillis = 1400), RepeatMode.Restart),
        label = "pulse",
    )
    Box(contentAlignment = Alignment.Center, modifier = Modifier.size(48.dp)) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            drawCircle(
                color = accent.copy(alpha = (1f - progress) * 0.8f),
                radius = (size.minDimension / 2f) * (0.68f + 0.32f * progress),
                style = Stroke(width = 2.5.dp.toPx()),
            )
        }
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(34.dp)
                .clip(CircleShape)
                .background(accent),
        ) {
            Icon(
                imageVector = Icons.Rounded.Timer,
                contentDescription = "Serie in corso",
                tint = Ink,
                modifier = Modifier.size(22.dp),
            )
        }
    }
}

@Composable
private fun StepperRow(
    value: String,
    borderColor: Color,
    onMinus: () -> Unit,
    onPlus: () -> Unit,
    minusDescription: String,
    plusDescription: String,
) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
        Button(
            onClick = onMinus,
            colors = ButtonDefaults.secondaryButtonColors(),
            modifier = Modifier.border(2.dp, borderColor, CircleShape),
        ) {
            Icon(imageVector = Icons.Rounded.Remove, contentDescription = minusDescription)
        }
        Spacer(modifier = Modifier.size(8.dp))
        Text(text = value, style = MaterialTheme.typography.body1)
        Spacer(modifier = Modifier.size(8.dp))
        Button(
            onClick = onPlus,
            colors = ButtonDefaults.secondaryButtonColors(),
            modifier = Modifier.border(2.dp, borderColor, CircleShape),
        ) {
            Icon(imageVector = Icons.Rounded.Add, contentDescription = plusDescription)
        }
    }
}

@Composable
private fun ActionChip(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    text: String,
    onClick: () -> Unit,
) {
    Chip(
        onClick = onClick,
        icon = { Icon(imageVector = icon, contentDescription = null) },
        label = { Text(text) },
        colors = ChipDefaults.secondaryChipColors(),
        modifier = Modifier.fillMaxWidth(),
    )
}

/**
 * F2.4 — Termina sempre disponibile, ma con conferma anti-tocco involontario:
 * il primo tap arma il pulsante ("Confermi?"), che si disarma da solo dopo 3 secondi.
 */
@Composable
private fun TerminaChip(onConfirm: () -> Unit) {
    var armed by remember { mutableStateOf(false) }
    LaunchedEffect(armed) {
        if (armed) {
            delay(3000)
            armed = false
        }
    }
    Chip(
        onClick = { if (armed) onConfirm() else armed = true },
        icon = { Icon(imageVector = Icons.Rounded.Stop, contentDescription = null) },
        label = { Text(if (armed) "Confermi?" else "Termina allenamento") },
        colors = if (armed) {
            ChipDefaults.chipColors(backgroundColor = PrimaryOrange, contentColor = Ink, iconColor = Ink)
        } else {
            ChipDefaults.secondaryChipColors()
        },
        modifier = Modifier.fillMaxWidth(),
    )
}
