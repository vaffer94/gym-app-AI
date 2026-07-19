package com.gymapp.watch.data.model

import com.google.firebase.firestore.DocumentId
import kotlinx.serialization.Serializable

/**
 * Voce esercizio dentro una scheda (`plan.exercises[]`), stesso shape creato da
 * ExercisePicker.jsx / ConfigStep sul web: key, refType (catalog|custom), refId,
 * dati denormalizzati (nome/categoria/immagine/descrizione) + target (sets/reps/peso/durata).
 */
@Serializable
data class PlanExerciseEntry(
    var key: String = "",
    var refType: String = "catalog", // "catalog" | "custom"
    var refId: String = "",
    var name: String = "",
    var category: String = "",
    var image: String? = null,
    var description: String = "",
    var mode: String = "reps", // "reps" | "duration"
    var durationSec: Long? = null,
    var sets: Int = 0,
    var reps: Int? = null,
    var hasWeight: Boolean = false,
    var weightKg: Double? = null,
)

/** `users/{uid}/workoutPlans/{planId}` — scheda (template), separata dalla sessione */
@Serializable
data class WorkoutPlan(
    @DocumentId var id: String = "",
    var name: String = "",
    var labels: List<String> = emptyList(),
    var exercises: List<PlanExerciseEntry> = emptyList(),
    var color: String? = null,
    var createdAt: Long? = null,
    var updatedAt: Long? = null,
)
