package com.gymapp.watch.ui.workout

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material.Chip
import androidx.wear.compose.material.ChipDefaults
import androidx.wear.compose.material.Icon
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.PositionIndicator
import androidx.wear.compose.material.Scaffold
import androidx.wear.compose.material.Text
import com.gymapp.watch.engine.SessionEngine
import com.gymapp.watch.ui.theme.Ink
import com.gymapp.watch.ui.theme.planColor

/** F2.4 — Fine allenamento: riepilogo statistiche di sessione + upload (buffer se offline) */
@Composable
fun SummaryScreen(
    viewModel: WorkoutViewModel,
    onDone: () -> Unit,
) {
    val session by viewModel.session.collectAsState()
    val uploadState by viewModel.uploadState.collectAsState()
    val listState = rememberScalingLazyListState()

    LaunchedEffect(Unit) {
        // Se lo schermo si apre e la sessione e' ancora "active", finalizza ora
        if (session?.status == "active") viewModel.finish()
    }

    val s = session ?: return
    val stats = SessionEngine.computeStats(s)
    val accent = planColor(s.planColor)

    Scaffold(positionIndicator = { PositionIndicator(scalingLazyListState = listState) }) {
        ScalingLazyColumn(
            state = listState,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp),
        ) {
            item { Text(text = "Allenamento finito", style = MaterialTheme.typography.title3, color = accent) }
            item { Text(text = "Durata: ${stats.durationSec / 60} min", style = MaterialTheme.typography.body1) }
            item { Text(text = "Serie: ${stats.doneSeries}/${stats.totalSeries}", style = MaterialTheme.typography.body1) }
            item { Text(text = "Esercizi: ${stats.doneExercises}/${stats.totalExercises}", style = MaterialTheme.typography.body1) }
            if (stats.volumeKg > 0) {
                item { Text(text = "Volume: ${stats.volumeKg} kg", style = MaterialTheme.typography.body1) }
            }
            item {
                Text(
                    text = when (uploadState) {
                        UploadState.UPLOADING -> "Salvataggio…"
                        UploadState.UPLOADED -> "Sincronizzato ✓"
                        UploadState.BUFFERED -> "Salvato sul watch, sync quando torna la rete"
                        UploadState.IDLE -> ""
                    },
                    style = MaterialTheme.typography.caption2,
                )
            }
            item {
                Chip(
                    onClick = {
                        viewModel.clearSession()
                        onDone()
                    },
                    icon = { Icon(imageVector = Icons.Rounded.Check, contentDescription = null, tint = Ink) },
                    label = { Text("Fine") },
                    colors = ChipDefaults.chipColors(backgroundColor = accent, contentColor = Ink, iconColor = Ink),
                    enabled = uploadState == UploadState.UPLOADED || uploadState == UploadState.BUFFERED,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}
