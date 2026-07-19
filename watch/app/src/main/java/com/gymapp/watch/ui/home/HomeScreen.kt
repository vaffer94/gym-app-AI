package com.gymapp.watch.ui.home

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.FitnessCenter
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.items
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material.Chip
import androidx.wear.compose.material.ChipDefaults
import androidx.wear.compose.material.Icon
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.PositionIndicator
import androidx.wear.compose.material.Scaffold
import androidx.wear.compose.material.Text
import com.gymapp.watch.data.model.WorkoutPlan
import com.gymapp.watch.ui.theme.Ink
import com.gymapp.watch.ui.theme.planColor

/** F2.1 — Setup: elenco schede, tap per scegliere quella da avviare */
@Composable
fun HomeScreen(onPlanSelected: (WorkoutPlan) -> Unit) {
    val viewModel: HomeViewModel = viewModel()
    val plans by viewModel.plans.collectAsState()
    val listState = rememberScalingLazyListState()

    Scaffold(
        positionIndicator = { PositionIndicator(scalingLazyListState = listState) },
    ) {
        if (plans.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(
                    text = "Nessuna scheda.\nCreala dalla web app.",
                    style = MaterialTheme.typography.caption1,
                    textAlign = TextAlign.Center,
                )
            }
        } else {
            ScalingLazyColumn(
                state = listState,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 8.dp),
            ) {
                item {
                    Text(text = "Le tue schede", style = MaterialTheme.typography.title3)
                }
                items(plans) { plan ->
                    // Stesso colore pastello della scheda nella web app, testo Ink come sul web
                    val bg = planColor(plan.color)
                    Chip(
                        onClick = { onPlanSelected(plan) },
                        icon = {
                            Icon(
                                imageVector = Icons.Rounded.FitnessCenter,
                                contentDescription = null,
                                tint = Ink,
                            )
                        },
                        label = { Text(plan.name) },
                        secondaryLabel = { Text("${plan.exercises.size} esercizi") },
                        colors = ChipDefaults.chipColors(
                            backgroundColor = bg,
                            contentColor = Ink,
                            secondaryContentColor = Ink.copy(alpha = 0.7f),
                            iconColor = Ink,
                        ),
                    )
                }
            }
        }
    }
}
