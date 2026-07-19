package com.gymapp.watch.ui.workout

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.Spacer
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Remove
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material.icons.rounded.SkipNext
import androidx.compose.material.icons.rounded.Stop
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
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
import com.gymapp.watch.ui.theme.planColor

/**
 * F2.2 — Esecuzione: esercizio corrente, serie con reps/peso precompilati col target
 * (modificabili con +/-), Done -> parte il recupero. Posticipa/Salta secondo F2.3.
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
        if (session != null && exercise == null) onFinished() // coda vuota -> allenamento finito
    }

    if (session == null || exercise == null) return

    val ex: SessionExercise = exercise
    val nextIdx = SessionEngine.nextUndoneSerie(ex)
    val accent = planColor(session?.planColor)

    Box(modifier = Modifier.fillMaxSize()) {
        Scaffold(positionIndicator = { PositionIndicator(scalingLazyListState = listState) }) {
            ScalingLazyColumn(
            state = listState,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp),
        ) {
            item {
                Text(text = ex.name, style = MaterialTheme.typography.title3, color = accent)
            }
            item {
                Text(
                    text = "Serie ${ex.series.count { it.done } + if (nextIdx >= 0) 1 else 0}/${ex.sets}",
                    style = MaterialTheme.typography.caption1,
                )
            }

            if (nextIdx >= 0) {
                item {
                    SerieEditor(
                        exercise = ex,
                        serieIdx = nextIdx,
                        accent = accent,
                        onDone = { reps, weight, weightProvided ->
                            viewModel.completeSerie(ex.key, nextIdx, reps, weight, weightProvided)
                            onResting()
                        },
                    )
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
                // F2.4: pulsante Termina sempre disponibile -> sessione salvata come parziale
                ActionChip(
                    icon = Icons.Rounded.Stop,
                    text = "Termina allenamento",
                    onClick = onFinished,
                )
            }
            }
        }
        // Il tempo scorre anche mentre fai la serie: orologio dei secondi sul bordo
        SecondsEdgeClock(accent = accent)
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

@Composable
private fun SerieEditor(
    exercise: SessionExercise,
    serieIdx: Int,
    accent: Color,
    onDone: (reps: Int?, weight: Double?, weightProvided: Boolean) -> Unit,
) {
    val serie = exercise.series[serieIdx]
    var reps by remember(serieIdx) { mutableIntStateOf(serie.actualReps ?: exercise.reps ?: 0) }
    var weight by remember(serieIdx) { mutableDoubleStateOf(serie.actualWeightKg ?: exercise.weightKg ?: 0.0) }

    Column {
        if (exercise.mode == "duration") {
            Text(text = "A tempo: ${(exercise.durationSec ?: 0) / 60} min", style = MaterialTheme.typography.body1)
        } else {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
                Button(onClick = { reps = (reps - 1).coerceAtLeast(0) }, colors = ButtonDefaults.secondaryButtonColors()) {
                    Icon(imageVector = Icons.Rounded.Remove, contentDescription = "Meno ripetizioni")
                }
                Spacer(modifier = Modifier.size(8.dp))
                Text(text = "$reps rip", style = MaterialTheme.typography.body1)
                Spacer(modifier = Modifier.size(8.dp))
                Button(onClick = { reps += 1 }, colors = ButtonDefaults.secondaryButtonColors()) {
                    Icon(imageVector = Icons.Rounded.Add, contentDescription = "Piu' ripetizioni")
                }
            }
            if (exercise.hasWeight) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
                    Button(onClick = { weight = (weight - 1.0).coerceAtLeast(0.0) }, colors = ButtonDefaults.secondaryButtonColors()) {
                        Icon(imageVector = Icons.Rounded.Remove, contentDescription = "Meno peso")
                    }
                    Spacer(modifier = Modifier.size(8.dp))
                    Text(text = "$weight kg", style = MaterialTheme.typography.body1)
                    Spacer(modifier = Modifier.size(8.dp))
                    Button(onClick = { weight += 1.0 }, colors = ButtonDefaults.secondaryButtonColors()) {
                        Icon(imageVector = Icons.Rounded.Add, contentDescription = "Piu' peso")
                    }
                }
            }
        }
        Spacer(modifier = Modifier.size(8.dp))
        Chip(
            onClick = { onDone(reps, if (exercise.hasWeight) weight else null, exercise.hasWeight) },
            icon = { Icon(imageVector = Icons.Rounded.Check, contentDescription = null, tint = Ink) },
            label = { Text("Fatta") },
            colors = ChipDefaults.chipColors(backgroundColor = accent, contentColor = Ink, iconColor = Ink),
            modifier = Modifier.fillMaxWidth(),
        )
    }
}
