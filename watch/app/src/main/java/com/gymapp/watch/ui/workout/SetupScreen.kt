package com.gymapp.watch.ui.workout

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.Spacer
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Remove
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.wear.compose.material.Button
import androidx.wear.compose.material.ButtonDefaults
import androidx.wear.compose.material.Chip
import androidx.wear.compose.material.ChipDefaults
import androidx.wear.compose.material.Icon
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text
import com.gymapp.watch.data.model.WorkoutPlan
import com.gymapp.watch.ui.theme.Ink
import com.gymapp.watch.ui.theme.planColor

/**
 * F2.1 — Setup: soglia di recupero (default 1 min, vale tra serie ed esercizi) + START.
 */
@Composable
fun SetupScreen(
    plan: WorkoutPlan,
    viewModel: WorkoutViewModel,
    onStarted: () -> Unit,
) {
    var restSec by remember { mutableIntStateOf(60) }
    val accent = planColor(plan.color)

    LaunchedEffect(Unit) {
        restSec = viewModel.getRestDefaultSec()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = plan.name,
            style = MaterialTheme.typography.title3,
            color = accent,
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.size(8.dp))
        Text(text = "Recupero", style = MaterialTheme.typography.caption1)

        Row(verticalAlignment = Alignment.CenterVertically) {
            Button(onClick = { restSec = (restSec - 15).coerceAtLeast(15) }, colors = ButtonDefaults.secondaryButtonColors()) {
                Icon(imageVector = Icons.Rounded.Remove, contentDescription = "Meno recupero")
            }
            Spacer(modifier = Modifier.size(12.dp))
            Text(text = "${restSec / 60}:${(restSec % 60).toString().padStart(2, '0')}", style = MaterialTheme.typography.title2)
            Spacer(modifier = Modifier.size(12.dp))
            Button(onClick = { restSec += 15 }, colors = ButtonDefaults.secondaryButtonColors()) {
                Icon(imageVector = Icons.Rounded.Add, contentDescription = "Piu' recupero")
            }
        }

        Spacer(modifier = Modifier.size(12.dp))

        Chip(
            onClick = {
                viewModel.setRestDefaultSec(restSec)
                viewModel.startSession(plan, restSec)
                onStarted()
            },
            icon = { Icon(imageVector = Icons.Rounded.PlayArrow, contentDescription = null, tint = Ink) },
            label = { Text("START") },
            colors = ChipDefaults.chipColors(backgroundColor = accent, contentColor = Ink, iconColor = Ink),
        )
    }
}
