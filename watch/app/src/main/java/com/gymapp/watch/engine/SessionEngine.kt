package com.gymapp.watch.engine

import com.gymapp.watch.data.model.PlanExerciseEntry
import com.gymapp.watch.data.model.SerieEntry
import com.gymapp.watch.data.model.SessionExercise
import com.gymapp.watch.data.model.WorkoutPlan
import com.gymapp.watch.data.model.WorkoutSession
import java.util.UUID
import kotlin.math.roundToLong

/**
 * Porting 1:1 di src/workout/sessionEngine.js. Stessa logica di ordinamento e
 * posticipa richiesta esplicitamente dal documento dei flussi utente (F2.3):
 * "Stessa logica da replicare sull'app watch".
 *
 * Stile funzionale: ogni funzione riceve una WorkoutSession e ne ritorna una nuova
 * (nessuna mutazione in place), cosi' la UI (StateFlow) puo' confrontare vecchio/nuovo
 * stato con equals() strutturale delle data class.
 */
object SessionEngine {

    private fun now(): Long = System.currentTimeMillis()

    /** Ordine iniziale: raggruppa per categoria mantenendo l'ordine di prima apparizione nella scheda */
    fun buildOrder(exercises: List<PlanExerciseEntry>): List<String> {
        val catOrder = mutableListOf<String>()
        for (e in exercises) if (e.category !in catOrder) catOrder.add(e.category)
        val order = mutableListOf<String>()
        for (cat in catOrder) {
            for (e in exercises) if (e.category == cat) order.add(e.key)
        }
        return order
    }

    /** Crea la sessione: snapshot della scheda + stato di esecuzione iniziale */
    fun createSession(plan: WorkoutPlan, restDefaultSec: Int): WorkoutSession {
        val exercises = plan.exercises.map { e ->
            SessionExercise(
                key = e.key,
                refType = e.refType,
                refId = e.refId,
                name = e.name,
                category = e.category,
                image = e.image,
                description = e.description,
                mode = e.mode,
                durationSec = e.durationSec,
                sets = e.sets,
                reps = e.reps,
                hasWeight = e.hasWeight,
                weightKg = e.weightKg,
                postponeCount = 0,
                skipped = false,
                startedAt = null,
                endedAt = null,
                note = "",
                series = List(e.sets) {
                    SerieEntry(
                        done = false,
                        startedAt = null,
                        doneAt = null,
                        actualReps = e.reps,
                        actualWeightKg = if (e.hasWeight) e.weightKg else null,
                        restSec = null,
                    )
                },
            )
        }
        return WorkoutSession(
            id = "s-${now()}-${UUID.randomUUID().toString().take(6)}",
            planId = plan.id,
            planName = plan.name,
            planColor = plan.color,
            origine = "watch",
            restDefaultSec = restDefaultSec,
            startedAt = now(),
            endedAt = null,
            status = "active",
            pausedMs = 0,
            pauseStartedAt = null,
            exercises = exercises,
            queue = buildOrder(plan.exercises),
        )
    }

    fun getExercise(session: WorkoutSession, key: String): SessionExercise? =
        session.exercises.find { it.key == key }

    fun currentExercise(session: WorkoutSession): SessionExercise? =
        session.queue.firstOrNull()?.let { getExercise(session, it) }

    /** Indice della prossima serie non fatta, o -1 */
    fun nextUndoneSerie(exercise: SessionExercise): Int =
        exercise.series.indexOfFirst { !it.done }

    private fun WorkoutSession.updateExercise(key: String, transform: (SessionExercise) -> SessionExercise): WorkoutSession =
        copy(exercises = exercises.map { if (it.key == key) transform(it) else it })

    private fun SessionExercise.updateSerie(idx: Int, transform: (SerieEntry) -> SerieEntry): SessionExercise =
        copy(series = series.mapIndexed { i, s -> if (i == idx) transform(s) else s })

    /** Avvia una serie (stato "in corso") */
    fun startSerie(session: WorkoutSession, key: String, serieIdx: Int): WorkoutSession =
        session.updateExercise(key) { ex ->
            ex.copy(
                startedAt = ex.startedAt ?: now(),
            ).updateSerie(serieIdx) { it.copy(startedAt = now()) }
        }

    /** Serie fatta: registra effettivi e timestamp. */
    fun markSerieDone(
        session: WorkoutSession,
        key: String,
        serieIdx: Int,
        actualReps: Int? = null,
        actualWeightKg: Double? = null,
        weightProvided: Boolean = false,
    ): WorkoutSession = session.updateExercise(key) { ex ->
        val withStart = if (ex.startedAt == null) ex.copy(startedAt = now()) else ex
        val updated = withStart.updateSerie(serieIdx) { serie ->
            serie.copy(
                done = true,
                doneAt = now(),
                actualReps = actualReps ?: serie.actualReps,
                actualWeightKg = if (weightProvided) actualWeightKg else serie.actualWeightKg,
            )
        }
        if (updated.series.all { it.done }) updated.copy(endedAt = now()) else updated
    }.let { s ->
        val ex = getExercise(s, key)!!
        if (ex.series.all { it.done }) s.copy(queue = s.queue.filterNot { it == key }) else s
    }

    /** Correzione a posteriori di reps/peso di una serie */
    fun updateSerieActuals(
        session: WorkoutSession,
        key: String,
        serieIdx: Int,
        actualReps: Int? = null,
        actualWeightKg: Double? = null,
        weightProvided: Boolean = false,
    ): WorkoutSession = session.updateExercise(key) { ex ->
        ex.updateSerie(serieIdx) { serie ->
            serie.copy(
                actualReps = actualReps ?: serie.actualReps,
                actualWeightKg = if (weightProvided) actualWeightKg else serie.actualWeightKg,
            )
        }
    }

    /** Registra la durata effettiva del recupero dopo una serie */
    fun recordRest(session: WorkoutSession, key: String, serieIdx: Int, restSec: Int): WorkoutSession =
        session.updateExercise(key) { ex -> ex.updateSerie(serieIdx) { it.copy(restSec = restSec) } }

    /**
     * Posticipa l'esercizio corrente (F2.3):
     * 1a volta -> in coda alla propria categoria
     * 2a volta -> in fondo a tutto l'allenamento
     * 3a volta -> marcato saltato per questa sessione
     */
    fun postponeCurrent(session: WorkoutSession): WorkoutSession {
        val key = session.queue.firstOrNull() ?: return session
        val ex = getExercise(session, key) ?: return session
        val newPostponeCount = ex.postponeCount + 1
        var newQueue = session.queue.drop(1)
        var skipped = false

        when (newPostponeCount) {
            1 -> {
                var insertAt = newQueue.size
                for (i in newQueue.indices.reversed()) {
                    val other = getExercise(session, newQueue[i])
                    if (other?.category == ex.category) {
                        insertAt = i + 1
                        break
                    }
                }
                newQueue = newQueue.toMutableList().apply { add(insertAt, key) }
            }
            2 -> {
                newQueue = newQueue + key
            }
            else -> {
                skipped = true
            }
        }

        return session
            .copy(queue = newQueue)
            .updateExercise(key) { it.copy(postponeCount = newPostponeCount, skipped = skipped || it.skipped) }
    }

    /** Salta definitivamente l'esercizio corrente */
    fun skipCurrent(session: WorkoutSession): WorkoutSession {
        val key = session.queue.firstOrNull() ?: return session
        return session
            .copy(queue = session.queue.drop(1))
            .updateExercise(key) { it.copy(skipped = true) }
    }

    /** Sposta un esercizio scelto manualmente in testa alla coda */
    fun jumpTo(session: WorkoutSession, key: String): WorkoutSession {
        if (key !in session.queue) return session
        return session.copy(queue = listOf(key) + session.queue.filterNot { it == key })
    }

    fun setNote(session: WorkoutSession, key: String, note: String): WorkoutSession =
        session.updateExercise(key) { it.copy(note = note) }

    fun togglePause(session: WorkoutSession): WorkoutSession =
        if (session.pauseStartedAt != null) {
            session.copy(
                pausedMs = session.pausedMs + (now() - session.pauseStartedAt!!),
                pauseStartedAt = null,
            )
        } else {
            session.copy(pauseStartedAt = now())
        }

    /** [at] permette di retrodatare la chiusura (watchdog anti-dimenticanza) */
    fun finishSession(session: WorkoutSession, at: Long = now()): WorkoutSession {
        var s = session
        if (s.pauseStartedAt != null) {
            s = s.copy(pausedMs = s.pausedMs + (at - s.pauseStartedAt!!).coerceAtLeast(0L), pauseStartedAt = null)
        }
        s = s.copy(endedAt = at)
        val allDone = s.exercises.all { it.skipped || it.series.all { serie -> serie.done } }
        val anyDone = s.exercises.any { it.series.any { serie -> serie.done } }
        s = s.copy(
            status = if (allDone || anyDone) "completed" else "aborted",
            completedFully = allDone,
        )
        return s
    }

    /** Durata attiva in ms (esclude le pause) */
    fun activeDuration(s: WorkoutSession, at: Long = now()): Long {
        val end = s.endedAt ?: at
        var paused = s.pausedMs
        if (s.pauseStartedAt != null) paused += end - s.pauseStartedAt!!
        return maxOf(0L, end - s.startedAt - paused)
    }

    data class SessionStats(
        val durationSec: Long,
        val totalSeries: Int,
        val doneSeries: Int,
        val doneExercises: Int,
        val totalExercises: Int,
        val skipped: Int,
        val volumeKg: Long,
        val avgRestSec: Int?,
        val restTargetSec: Int,
    )

    /** Statistiche di riepilogo, versione compatta per lo schermo del watch */
    fun computeStats(s: WorkoutSession): SessionStats {
        val totalSeries = s.exercises.sumOf { it.sets }
        val doneSeries = s.exercises.sumOf { e -> e.series.count { it.done } }
        val doneExercises = s.exercises.count { e -> e.series.all { it.done } }
        val skipped = s.exercises.count { it.skipped }

        val volumeKg = s.exercises.sumOf { e ->
            e.series.filter { it.done && it.actualWeightKg != null }
                .sumOf { (it.actualReps ?: 0) * (it.actualWeightKg ?: 0.0) }
        }

        val allRests = s.exercises.flatMap { e -> e.series.mapNotNull { it.restSec } }
        val avgRestSec = if (allRests.isNotEmpty()) (allRests.sum().toDouble() / allRests.size).roundToLong().toInt() else null

        return SessionStats(
            durationSec = activeDuration(s) / 1000,
            totalSeries = totalSeries,
            doneSeries = doneSeries,
            doneExercises = doneExercises,
            totalExercises = s.exercises.size,
            skipped = skipped,
            volumeKg = volumeKg.roundToLong(),
            avgRestSec = avgRestSec,
            restTargetSec = s.restDefaultSec,
        )
    }
}
