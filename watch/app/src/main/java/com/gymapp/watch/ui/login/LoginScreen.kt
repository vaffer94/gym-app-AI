package com.gymapp.watch.ui.login

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.Spacer
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.wear.compose.material.Chip
import androidx.wear.compose.material.ChipDefaults
import androidx.wear.compose.material.CircularProgressIndicator
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text

/** F0 — Accesso: prima apertura, login con Google (Credential Manager, standalone) */
@Composable
fun LoginScreen(onSignedIn: () -> Unit) {
    val viewModel: LoginViewModel = viewModel()
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) {
        if (viewModel.isAlreadySignedIn()) onSignedIn()
    }
    LaunchedEffect(state) {
        if (state is LoginUiState.Success) onSignedIn()
    }

    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                text = "Gym App",
                style = MaterialTheme.typography.title2,
                textAlign = TextAlign.Center,
            )
            Spacer(modifier = Modifier.size(8.dp))

            when (val s = state) {
                is LoginUiState.Loading -> CircularProgressIndicator(modifier = Modifier.size(28.dp))
                is LoginUiState.NoAccount -> Text(
                    text = "Aggiungi un account Google dalle Impostazioni del watch, poi riprova",
                    style = MaterialTheme.typography.caption2,
                    textAlign = TextAlign.Center,
                )
                is LoginUiState.Error -> Text(
                    text = "Login non riuscito: ${s.message.take(140)}",
                    style = MaterialTheme.typography.caption2,
                    textAlign = TextAlign.Center,
                )
                else -> {}
            }

            Spacer(modifier = Modifier.size(8.dp))

            Chip(
                onClick = { viewModel.signIn() },
                label = { Text("Accedi con Google") },
                colors = ChipDefaults.primaryChipColors(),
            )
        }
    }
}
