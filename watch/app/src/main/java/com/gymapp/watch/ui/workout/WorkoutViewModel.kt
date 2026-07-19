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
import com.gymapp.watch.sync.SessionSyncWorker
import com.gymapp.watch.util.vibrate
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

    /** Da chiamare all'avvio app: se c'era un allenamento a meta', lo ripristina. */
    suspend fun tryResumeActiveSession(): WorkoutSession? {
        val s = activeStore.load()
        if (s != null && s.status == "active") _session.value = s
        return _session.value
    }

    suspend fun getRestDefaultSec(): Int = activeStore.getRestDefaultSec()

    fun setRestDefaultSec(sec: Int) {
        viewModelScope.launch { activeStore.setRestDefaultSec(sec) }
    }

    fun startSession(plan: WorkoutPlan, restDefaultSec: Int) {
        persist(SessionEngine.createSession(plan, restDefaultSec))
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

    fun finish() {
        val s = _session.value ?: return
        restJob?.cancel()
        _restState.value = RestState.None
        val finished = SessionEngine.finishSession(s)
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
    }
}
