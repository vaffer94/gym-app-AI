package com.gymapp.watch.ui.theme

import androidx.compose.runtime.Composable
import androidx.wear.compose.material.Colors
import androidx.wear.compose.material.MaterialTheme

private val GymWatchColors = Colors(
    primary = PrimaryOrange,
    primaryVariant = PrimaryOrange,
    secondary = Teal,
    secondaryVariant = Teal,
    error = PrimaryOrange,
    onPrimary = Ink,
    onSecondary = Ink,
    onError = Paper,
    background = Background,
    onBackground = Paper,
    surface = Ink,
    onSurface = Paper,
)

@Composable
fun GymWatchTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colors = GymWatchColors,
        content = content,
    )
}
