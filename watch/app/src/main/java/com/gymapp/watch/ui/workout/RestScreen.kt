package com.gymapp.watch.ui.workout

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.SkipNext
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.wear.compose.material.Button
import androidx.wear.compose.material.ButtonDefaults
import androidx.wear.compose.material.Icon
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text
import com.gymapp.watch.ui.theme.Ink
import com.gymapp.watch.ui.theme.planColor

/**
 * F2.2 — Recupero: stessa logica tra serie ed esercizi. Countdown della soglia
 * configurata, +1 min (ripetibile), Salta pausa. Vibrazione al termine (WorkoutViewModel).
 */
@Composable
fun RestScreen(
    viewModel: WorkoutViewModel,
    onRestDone: () -> Unit,
) {
    val restState by viewModel.restState.collectAsState()
    val session by viewModel.session.collectAsState()

    LaunchedEffect(restState) {
        if (restState is RestState.None) onRestDone()
    }

    val counting = restState as? RestState.Counting ?: return
    val accent = planColor(session?.planColor)

    Box(modifier = Modifier.fillMaxSize()) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(text = "Recupero", style = MaterialTheme.typography.caption1)
        Spacer(modifier = Modifier.size(4.dp))
        Text(
            text = "${counting.remainingSec / 60}:${(counting.remainingSec % 60).toString().padStart(2, '0')}",
            style = MaterialTheme.typography.display1,
            color = accent,
        )
        Spacer(modifier = Modifier.size(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            Button(onClick = { viewModel.addMinuteToRest() }, colors = ButtonDefaults.secondaryButtonColors()) {
                Icon(imageVector = Icons.Rounded.Add, contentDescription = "Aggiungi 1 minuto")
            }
            Button(
                onClick = { viewModel.skipRest() },
                colors = ButtonDefaults.buttonColors(backgroundColor = accent, contentColor = Ink),
            ) {
                Icon(imageVector = Icons.Rounded.SkipNext, contentDescription = "Salta il recupero")
            }
        }
        Spacer(modifier = Modifier.size(4.dp))
        Text(text = "+1 min          salta", style = MaterialTheme.typography.caption2)
        Spacer(modifier = Modifier.size(4.dp))
        LiveHeartRate(viewModel)
    }
    SecondsEdgeClock()
    }
}
