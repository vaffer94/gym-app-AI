package com.gymapp.watch.data.model

import com.google.firebase.firestore.DocumentId
import kotlinx.serialization.Serializable

/** Una singola serie dentro un esercizio della sessione */
@Serializable
data class SerieEntry(
    var done: Boolean = false,
    var startedAt: Long? = null,
    var doneAt: Long? = null,
    /** reps effettive, precompilate col target, modificabile con la rotellina/tap */
    var actualReps: Int? = null,
    /** peso effettivo in kg, precompilato col target */
    var actualWeightKg: Double? = null,
    /** recupero effettivo dopo questa serie, per il confronto con la soglia target */
    var restSec: Int? = null,
)

/** Snapshot di un esercizio dentro la sessione (copia dei dati della scheda + stato runtime) */
@Serializable
data class SessionExercise(
    var key: String = "",
    var refType: String = "catalog",
    var refId: String = "",
    var name: String = "",
    var category: String = "",
    var image: String? = null,
    var description: String = "",
    var mode: String = "reps",
    var durationSec: Long? = null,
    var sets: Int = 0,
    var reps: Int? = null,
    var hasWeight: Boolean = false,
    var weightKg: Double? = null,
    var postponeCount: Int = 0,
    var skipped: Boolean = false,
    var startedAt: Long? = null,
    var endedAt: Long? = null,
    var note: String = "",
    var series: List<SerieEntry> = emptyList(),
)

/**
 * `users/{uid}/sessions/{sessionId}` — sessione di allenamento (snapshot scheda + esecuzione).
 * `origine` = "watch" per le sessioni create da questa app (vs "web").
 */
@Serializable
data class WorkoutSession(
    @DocumentId var id: String = "",
    var planId: String = "",
    var planName: String = "",
    var planColor: String? = null,
    var origine: String = "watch",
    var restDefaultSec: Int = 60,
    var startedAt: Long = 0L,
    var endedAt: Long? = null,
    /** "active" | "completed" | "aborted" */
    var status: String = "active",
    var pausedMs: Long = 0L,
    var pauseStartedAt: Long? = null,
    var exercises: List<SessionExercise> = emptyList(),
    /** chiavi degli esercizi ancora da fare, nell'ordine di esecuzione corrente */
    var queue: List<String> = emptyList(),
    var completedFully: Boolean? = null,
    /** risposta rapida "come ti senti?" — campo previsto dallo step 7, non ancora usato */
    var feeling: String? = null,
    /**
     * Serie temporale HR della sessione (step 6): due array paralleli — offset in secondi
     * dall'inizio sessione e bpm medio su finestre di ~5s. Array paralleli e non coppie
     * perche' Firestore non supporta array annidati; ~1400 punti per 2h, ben sotto il
     * limite di 1MB per documento.
     */
    var hrT: List<Int> = emptyList(),
    var hrBpm: List<Int> = emptyList(),
    /**
     * Aggregati HR calcolati a fine sessione: sopravvivono anche quando (policy
     * retention) le curve grezze hrT/hrBpm verranno rimosse dalle sessioni piu'
     * vecchie di 30 allenamenti.
     */
    var hrAvg: Int? = null,
    var hrMax: Int? = null,
    /**
     * true se la sessione e' stata chiusa dal watchdog anti-dimenticanza (>2h, nessuna
     * serie da 45min, HR normale o assente), con endedAt retrodatato all'ultima attivita'.
     */
    var autoClosed: Boolean? = null,
)
