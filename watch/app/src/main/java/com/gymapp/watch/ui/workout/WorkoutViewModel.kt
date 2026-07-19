package com.gymapp.watch.ui.workout

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.gymapp.watch.data.SessionsRepository
import com.gymapp.watch.data.local.ActiveSessionStore
import com.gymapp.watch.data.model.WorkoutPlan
import com.gymapp.watch.data.model.WorkoutSession
import com.gymapp.watch.data.remote.FirebaseModule
import com.gymapp.watch.engine.SessionEngine
import com.gymapp.watch.sensors.HeartRateRecorder
import com.gymapp.watch.sync.SessionSyncWorker
import com.gymapp.watch.util.vibrate
import kotlin.math.roundToInt
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class RestState {
    data object None : RestState()
    data class Counting(
        val remainingSec: Int,
        val targetSec: Int,
        val exerciseKey: String,
        val serieIdx: Int,
    ) : RestState()
}

enum class UploadState { IDLE, UPLOADING, UPLOADED, BUFFERED }

/**
 * ViewModel condiviso da ExerciseScreen / RestScreen / SummaryScreen (scope Activity,
 * vedi AppNavHost). Tiene la WorkoutSession corrente, applica SessionEngine (logica pura)
 * e persiste ogni cambiamento in ActiveSessionStore per la ripresa automatica (F2.2).
 */
class WorkoutViewModel(application: Application) : AndroidViewModel(application) {

    private val activeStore = ActiveSessionStore(application)

    private val _session = MutableStateFlow<WorkoutSession?>(null)
    val session: StateFlow<WorkoutSession?> = _session

    private val _restState = MutableStateFlow<RestState>(RestState.None)
    val restState: StateFlow<RestState> = _restState

    private val _uploadState = MutableStateFlow(UploadState.IDLE)
    val uploadState: StateFlow<UploadState> = _uploadState

    private var restJob: Job? = null
    private var restStartedAtMs: Long = 0L

    // --- HR continuo (step 6) ---
    private val hrRecorder = HeartRateRecorder(application)
    val currentBpm = hrRecorder.currentBpm
    private var hrPersistJob: Job? = null

    /**
     * Da chiamare all'avvio app: se c'era un allenamento a meta', lo ripristina —
     * a meno che non risulti "dimenticato aperto" (vedi shouldAutoClose): in quel caso
     * lo chiude retrodatando la fine all'ultima attivita' e lo carica, senza riprenderlo.
     */
    suspend fun tryResumeActiveSession(): WorkoutSession? {
        val s = activeStore.load()
        if (s != null && s.status == "active") {
            if (shouldAutoClose(s, s.hrT, s.hrBpm)) {
                autoCloseForgotten(s)
                return null
            }
            _session.value = s
            hrRecorder.seed(s.hrT, s.hrBpm)
            startHeartRate()
            startStaleWatchdog()
        }
        return _session.value
    }

    private fun startHeartRate() {
        val s = _session.value ?: return
        hrRecorder.start(s.startedAt)
        // Persistenza periodica: se l'app muore a meta' allenamento, l'HR raccolto
        // fin li' sopravvive nel DataStore insieme alla sessione
        hrPersistJob?.cancel()
        hrPersistJob = viewModelScope.launch {
            while (true) {
                delay(30_000)
                val (t, bpm) = hrRecorder.snapshot()
                val current = _session.value ?: continue
                if (t.size > current.hrT.size) persist(current.copy(hrT = t, hrBpm = bpm))
            }
        }
    }

    suspend fun getRestDefaultSec(): Int = activeStore.getRestDefaultSec()

    fun setRestDefaultSec(sec: Int) {
        viewModelScope.launch { activeStore.setRestDefaultSec(sec) }
    }

    fun startSession(plan: WorkoutPlan, restDefaultSec: Int) {
        hrRecorder.reset()
        persist(SessionEngine.createSession(plan, restDefaultSec))
        startHeartRate()
        startStaleWatchdog()
    }

    // --- Watchdog anti-dimenticanza (decisione 19/07/2026) ---

    private var staleJob: Job? = null

    /** Ogni minuto controlla se l'allenamento e' stato dimenticato aperto */
    private fun startStaleWatchdog() {
        staleJob?.cancel()
        staleJob = viewModelScope.launch {
            while (true) {
                delay(60_000)
                val s = _session.value ?: continue
                if (s.status != "active") continue
                val (t, bpm) = hrRecorder.snapshot()
                if (shouldAutoClose(s, t, bpm)) {
                    doFinish(endAt = lastActivityAt(s), auto = true)
                    break
                }
            }
        }
    }

    /** Ultimo segno di vita dell'allenamento: l'ultima serie completata (o l'inizio) */
    private fun lastActivityAt(s: WorkoutSession): Long =
        (s.exercises.flatMap { e -> e.series.mapNotNull { it.doneAt } } + s.startedAt).max()

    /**
     * "Dimenticato aperto" = dura da piu' di 2h E nessuna serie completata da 45min
     * E l'HR recente e' da riposo (<100 bpm) o assente (watch tolto dal polso).
     * La sessione NON viene eliminata: chi si e' allenato ha dati validi — viene chiusa
     * con endedAt = ultima attivita' e marcata autoClosed per la web app.
     */
    private fun shouldAutoClose(
        s: WorkoutSession,
        hrT: List<Int>,
        hrBpm: List<Int>,
        now: Long = System.currentTimeMillis(),
    ): Boolean {
        if (now - s.startedAt < AUTO_CLOSE_MIN_DURATION_MS) return false
        if (now - lastActivityAt(s) < AUTO_CLOSE_INACTIVITY_MS) return false
        val recentFromSec = ((now - s.startedAt) / 1000L).toInt() - RECENT_HR_WINDOW_SEC
        val recent = hrT.indices.filter { hrT[it] >= recentFromSec }.map { hrBpm[it] }
        val recentAvg = recent.takeIf { it.isNotEmpty() }?.average()
        return recentAvg == null || recentAvg < ACTIVE_HR_THRESHOLD_BPM
    }

    /** Chiusura della sessione trovata "dimenticata" alla riapertura dell'app */
    private fun autoCloseForgotten(s: WorkoutSession) {
        val closed = SessionEngine.finishSession(s, at = lastActivityAt(s)).copy(
            hrAvg = s.hrBpm.takeIf { it.isNotEmpty() }?.average()?.roundToInt(),
            hrMax = s.hrBpm.maxOrNull(),
            autoClosed = true,
        )
        viewModelScope.launch {
            activeStore.clear()
            val uid = FirebaseModule.currentUid() ?: return@launch
            val ok = SessionsRepository(getApplication<Application>(), uid).finishAndUpload(closed)
            if (!ok) SessionSyncWorker.enqueue(getApplication<Application>())
        }
    }

    private fun persist(updated: WorkoutSession) {
        _session.value = updated
        viewModelScope.launch { activeStore.save(updated) }
    }

    fun completeSerie(key: String, serieIdx: Int, actualReps: Int?, actualWeightKg: Double?, weightProvided: Boolean) {
        val s = _session.value ?: return
        val updated = SessionEngine.markSerieDone(s, key, serieIdx, actualReps, actualWeightKg, weightProvided)
        persist(updated)
        startRest(key, serieIdx, updated.restDefaultSec)
    }

    fun updateSerieActuals(key: String, serieIdx: Int, actualReps: Int?, actualWeightKg: Double?, weightProvided: Boolean) {
        val s = _session.value ?: return
        persist(SessionEngine.updateSerieActuals(s, key, serieIdx, actualReps, actualWeightKg, weightProvided))
    }

    fun postpone() {
        _session.value?.let { persist(SessionEngine.postponeCurrent(it)) }
    }

    fun skipExercise() {
        _session.value?.let { persist(SessionEngine.skipCurrent(it)) }
    }

    fun jumpTo(key: String) {
        _session.value?.let { persist(SessionEngine.jumpTo(it, key)) }
    }

    fun setNote(key: String, note: String) {
        _session.value?.let { persist(SessionEngine.setNote(it, key, note)) }
    }

    fun togglePause() {
        _session.value?.let { persist(SessionEngine.togglePause(it)) }
    }

    // --- Recupero (F2.2): countdown con vibrazione, +1 min, salta pausa ---

    private fun startRest(key: String, serieIdx: Int, seconds: Int) {
        restJob?.cancel()
        restStartedAtMs = System.currentTimeMillis()
        restJob = viewModelScope.launch {
            var remaining = seconds
            _restState.value = RestState.Counting(remaining, seconds, key, serieIdx)
            while (remaining > 0) {
                delay(1000)
                remaining -= 1
                _restState.value = RestState.Counting(remaining, seconds, key, serieIdx)
            }
            vibrate(getApplication<Application>())
            finishRest()
        }
    }

    fun addMinuteToRest() {
        val current = _restState.value as? RestState.Counting ?: return
        restJob?.cancel()
        restJob = viewModelScope.launch {
            var remaining = current.remainingSec + 60
            val target = current.targetSec + 60
            _restState.value = RestState.Counting(remaining, target, current.exerciseKey, current.serieIdx)
            while (remaining > 0) {
                delay(1000)
                remaining -= 1
                _restState.value = RestState.Counting(remaining, target, current.exerciseKey, current.serieIdx)
            }
            vibrate(getApplication<Application>())
            finishRest()
        }
    }

    fun skipRest() {
        restJob?.cancel()
        finishRest()
    }

    private fun finishRest() {
        val current = _restState.value as? RestState.Counting
        if (current != null) {
            val elapsedSec = ((System.currentTimeMillis() - restStartedAtMs) / 1000).toInt()
            _session.value?.let { persist(SessionEngine.recordRest(it, current.exerciseKey, current.serieIdx, elapsedSec)) }
        }
        _restState.value = RestState.None
    }

    // --- Fine allenamento (F2.4) ---

    fun finish() = doFinish(endAt = null, auto = false)

    private fun doFinish(endAt: Long?, auto: Boolean) {
        val s = _session.value ?: return
        restJob?.cancel()
        _restState.value = RestState.None
        hrPersistJob?.cancel()
        staleJob?.cancel()
        val (hrT, hrBpm) = hrRecorder.stop()
        val finished = SessionEngine.finishSession(s, at = endAt ?: System.currentTimeMillis()).copy(
            hrT = hrT,
            hrBpm = hrBpm,
            hrAvg = hrBpm.takeIf { it.isNotEmpty() }?.average()?.roundToInt(),
            hrMax = hrBpm.maxOrNull(),
            autoClosed = if (auto) true else null,
        )
        _session.value = finished
        viewModelScope.launch {
            activeStore.save(finished)
            _uploadState.value = UploadState.UPLOADING
            val uid = FirebaseModule.currentUid()
            if (uid == null) {
                _uploadState.value = UploadState.BUFFERED
                return@launch
            }
            val ok = SessionsRepository(getApplication<Application>(), uid).finishAndUpload(finished)
            _uploadState.value = if (ok) UploadState.UPLOADED else UploadState.BUFFERED
            activeStore.clear()
            if (!ok) SessionSyncWorker.enqueue(getApplication<Application>())
        }
    }

    /** Chiamata quando si lascia la schermata di riepilogo: pronta per una nuova sessione */
    fun clearSession() {
        _session.value = null
        _restState.value = RestState.None
        _uploadState.value = UploadState.IDLE
        hrRecorder.reset()
    }

    override fun onCleared() {
        hrRecorder.stop()
        super.onCleared()
    }

    companion object {
        private const val AUTO_CLOSE_MIN_DURATION_MS = 2L * 60 * 60 * 1000
        private const val AUTO_CLOSE_INACTIVITY_MS = 45L * 60 * 1000
        private const val RECENT_HR_WINDOW_SEC = 15 * 60
        private const val ACTIVE_HR_THRESHOLD_BPM = 100.0
    }
}
