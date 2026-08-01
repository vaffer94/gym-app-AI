package com.gymapp.watch.ui.workout

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.material.Button
import androidx.wear.compose.material.ButtonDefaults
import androidx.wear.compose.material.Chip
import androidx.wear.compose.material.ChipDefaults
import androidx.wear.compose.material.Icon
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text
import androidx.core.content.ContextCompat
import com.gymapp.watch.data.model.WorkoutPlan
import com.gymapp.watch.ui.theme.Ink
import com.gymapp.watch.ui.theme.planColor
import kotlinx.coroutines.launch

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
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        restSec = viewModel.getRestDefaultSec()
    }

    val scope = rememberCoroutineScope()
    // Health Services ammette un solo allenamento per dispositivo: se ce l'ha un'altra
    // app, partire interromperebbe la sua registrazione. Si chiede prima.
    var askOverride by remember { mutableStateOf(false) }

    fun begin() {
        viewModel.setRestDefaultSec(restSec)
        viewModel.startSession(plan, restSec)
        onStarted()
    }

    fun beginUnlessConflict() {
        scope.launch {
            if (viewModel.isOtherAppTrackingExercise()) askOverride = true else begin()
        }
    }

    // HR continuo: al primo START chiede BODY_SENSORS; se negato l'allenamento
    // parte comunque, semplicemente senza battito
    val sensorPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { beginUnlessConflict() }

    if (askOverride) {
        OtherAppWarning(
            accent = accent,
            onContinue = { askOverride = false; begin() },
            onCancel = { askOverride = false },
        )
        return
    }

    // Layout ancorato in alto con top padding calcolato per i quadranti rotondi:
    // a 22dp dal bordo la corda del cerchio e' larga ~137dp, quindi il titolo
    // (larghezza 192-32-32 = 128dp) non viene piu' tagliato agli angoli.
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(top = 22.dp, start = 16.dp, end = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = plan.name,
            style = MaterialTheme.typography.title3,
            color = accent,
            textAlign = TextAlign.Center,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(horizontal = 16.dp),
        )
        Spacer(modifier = Modifier.size(6.dp))
        Text(
            text = "Imposta recupero tra serie:",
            style = MaterialTheme.typography.caption2,
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.size(6.dp))

        // Pulsanti piccoli: sui 192dp di un quadrante rotondo la colonna intera deve stare
        // senza scroll (titolo 2 righe + recupero + START)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Button(
                onClick = { restSec = (restSec - 15).coerceAtLeast(15) },
                colors = ButtonDefaults.secondaryButtonColors(),
                modifier = Modifier.size(ButtonDefaults.SmallButtonSize),
            ) {
                Icon(imageVector = Icons.Rounded.Remove, contentDescription = "Meno recupero")
            }
            Spacer(modifier = Modifier.size(12.dp))
            Text(text = "${restSec / 60}:${(restSec % 60).toString().padStart(2, '0')}", style = MaterialTheme.typography.title2)
            Spacer(modifier = Modifier.size(12.dp))
            Button(
                onClick = { restSec += 15 },
                colors = ButtonDefaults.secondaryButtonColors(),
                modifier = Modifier.size(ButtonDefaults.SmallButtonSize),
            ) {
                Icon(imageVector = Icons.Rounded.Add, contentDescription = "Piu' recupero")
            }
        }

        Spacer(modifier = Modifier.size(10.dp))

        Chip(
            onClick = {
                val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.BODY_SENSORS) ==
                    PackageManager.PERMISSION_GRANTED
                if (granted) beginUnlessConflict() else sensorPermissionLauncher.launch(Manifest.permission.BODY_SENSORS)
            },
            icon = { Icon(imageVector = Icons.Rounded.PlayArrow, contentDescription = null, tint = Ink) },
            label = { Text("START") },
            colors = ChipDefaults.chipColors(backgroundColor = accent, contentColor = Ink, iconColor = Ink),
        )
    }
}

/**
 * Avviso di conflitto: un'altra app possiede l'allenamento in corso su Health Services.
 * Continuare significa interrompere la sua registrazione, quindi la scelta e' esplicita
 * e il pulsante distruttivo non e' quello preselezionato per posizione.
 */
@Composable
private fun OtherAppWarning(
    accent: Color,
    onContinue: () -> Unit,
    onCancel: () -> Unit,
) {
    ScalingLazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        item {
            Text(
                text = "Un'altra app sta registrando",
                style = MaterialTheme.typography.title3,
                color = accent,
                textAlign = TextAlign.Center,
            )
        }
        item {
            Text(
                text = "Se continui, il suo allenamento viene interrotto e il battito lo registriamo noi.",
                style = MaterialTheme.typography.caption2,
                textAlign = TextAlign.Center,
            )
        }
        item {
            Chip(
                onClick = onCancel,
                label = { Text("Annulla") },
                colors = ChipDefaults.secondaryChipColors(),
                modifier = Modifier.fillMaxWidth(),
            )
        }
        item {
            Chip(
                onClick = onContinue,
                label = { Text("Continua") },
                colors = ChipDefaults.chipColors(backgroundColor = accent, contentColor = Ink),
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
