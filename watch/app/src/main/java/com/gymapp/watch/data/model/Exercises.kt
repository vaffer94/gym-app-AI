package com.gymapp.watch.data.model

import com.google.firebase.firestore.DocumentId
import kotlinx.serialization.Serializable

/**
 * Modelli dati che rispecchiano ESATTAMENTE i nomi dei campi usati dalla web app
 * (src/data/repo.js, src/workout/sessionEngine.js) cosi' i documenti Firestore
 * sono interoperabili tra web e watch senza conversioni.
 *
 * Nota Firestore/Kotlin: ogni proprieta' del costruttore ha un default -> Kotlin
 * genera un costruttore vuoto utilizzabile dal mapper POJO di Firestore
 * (vedi https://firebase.google.com/docs/firestore/data-model#kotlin_1).
 */

/** Catalogo globale `exercises/{exerciseId}` — sola lettura, importato da free-exercise-db */
@Serializable
data class ExerciseCatalogItem(
    @DocumentId var id: String = "",
    var name: String = "",
    var category: String = "",
    var equipment: String? = null,
    var level: String? = null,
    var muscles: List<String> = emptyList(),
    var secondary: List<String> = emptyList(),
    var instructions: String? = null,
    var image: String? = null,
)

/** `users/{uid}/customExercises/{exId}` */
@Serializable
data class CustomExercise(
    @DocumentId var id: String = "",
    var name: String = "",
    var category: String = "",
    var description: String? = null,
    /** dataURL WebP/JPEG compressa lato client (~50KB), base64 dentro al documento */
    var photo: String? = null,
    var createdAt: Long? = null,
)
