package com.gymapp.watch.sensors

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.health.services.client.ExerciseUpdateCallback
import androidx.health.services.client.HealthServices
import androidx.health.services.client.data.Availability
import androidx.health.services.client.data.DataType
import androidx.health.services.client.data.DataTypeAvailability
import androidx.health.services.client.data.ExerciseConfig
import androidx.health.services.client.data.ExerciseLapSummary
import androidx.health.services.client.data.ExerciseTrackedStatus
import androidx.health.services.client.data.ExerciseType
import androidx.health.services.client.data.ExerciseUpdate
import androidx.health.services.client.endExercise
import androidx.health.services.client.getCurrentExerciseInfo
import androidx.health.services.client.startExercise
import kotlin.math.roundToInt
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * HR continuo durante l'allenamento via Health Services **ExerciseClient**.
 *
 * Sostituisce il precedente HeartRateRecorder basato su MeasureClient: quello e'
 * documentato come "not intended for background capture or workout tracking" e infatti
 * smetteva di consegnare campioni appena l'app usciva dal primo piano (schermo spento,
 * polso abbassato) — motivo per cui gli allenamenti veri in palestra risultavano senza
 * battito, mentre le prove brevi col display acceso funzionavano.
 *
 * Attenzione all'esclusiva: Health Services ammette **un solo allenamento alla volta su
 * tutto il dispositivo**. Se un'altra app (es. Fitbit) ne sta registrando uno, avviare il
 * nostro lo interrompe: per questo [trackedStatus] va interrogato prima di partire, e
 * l'utente avvisato.
 *
 * E' un singleton di processo e non un oggetto del ViewModel: la registrazione deve
 * sopravvivere alla distruzione della Activity (schermo spento, app in background).
 */
object ExerciseRecorder {

    private const val TAG = "ExerciseRecorder"
    const val BUCKET_SEC = 5

    private val hrT = mutableListOf<Int>()
    private val hrBpm = mutableListOf<Int>()
    private var sessionStartMs = 0L
    private var bucketIdx = -1
    private var bucketSum = 0.0
    private var bucketCount = 0
    private var running = false

    private val _currentBpm = MutableStateFlow<Int?>(null)
    val currentBpm: StateFlow<Int?> = _currentBpm

    private fun client(context: Context) = HealthServices.getClient(context.applicationContext).exerciseClient

    private val callback = object : ExerciseUpdateCallback {
        override fun onRegistered() = Unit

        override fun onRegistrationFailed(throwable: Throwable) {
            Log.w(TAG, "registrazione callback fallita", throwable)
        }

        override fun onExerciseUpdateReceived(update: ExerciseUpdate) {
            update.latestMetrics.getData(DataType.HEART_RATE_BPM).forEach { sample ->
                // 0 o valori bassissimi = sensore che non ha ancora agganciato il battito
                if (sample.value >= 20.0) record(sample.value)
            }
        }

        override fun onLapSummaryReceived(lapSummary: ExerciseLapSummary) = Unit

        override fun onAvailabilityChanged(dataType: DataType<*, *>, availability: Availability) {
            // Sensore non al polso / in acquisizione: spegni il valore live
            if (availability is DataTypeAvailability && availability != DataTypeAvailability.AVAILABLE) {
                _currentBpm.value = null
            }
        }
    }

    fun hasPermission(context: Context): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.BODY_SENSORS) ==
            PackageManager.PERMISSION_GRANTED

    /**
     * Chi possiede l'allenamento in corso sul dispositivo: uno tra
     * [ExerciseTrackedStatus.NO_EXERCISE_IN_PROGRESS], [ExerciseTrackedStatus.OWNED_EXERCISE_IN_PROGRESS]
     * e [ExerciseTrackedStatus.OTHER_APP_IN_PROGRESS]. In caso di errore si risponde
     * "nessuno": meglio provare a partire che bloccare l'allenamento per un'incertezza.
     */
    suspend fun trackedStatus(context: Context): Int =
        runCatching { client(context).getCurrentExerciseInfo().exerciseTrackedStatus }
            .getOrElse {
                Log.w(TAG, "stato allenamento non leggibile", it)
                ExerciseTrackedStatus.NO_EXERCISE_IN_PROGRESS
            }

    /**
     * Avvia la registrazione. Idempotente. Se il permesso manca o Health Services rifiuta
     * (sensore assente, tipo non supportato) l'allenamento prosegue senza HR: il battito
     * e' un di piu', non deve poter impedire di allenarsi.
     */
    suspend fun start(context: Context, sessionStartMs: Long) {
        if (running || !hasPermission(context)) return
        this.sessionStartMs = sessionStartMs
        val config = ExerciseConfig.Builder(ExerciseType.WORKOUT)
            .setDataTypes(setOf(DataType.HEART_RATE_BPM))
            .setIsAutoPauseAndResumeEnabled(false)
            .setIsGpsEnabled(false)
            .build()
        runCatching {
            val c = client(context)
            c.setUpdateCallback(callback)
            c.startExercise(config)
        }.onSuccess {
            running = true
        }.onFailure {
            Log.w(TAG, "avvio allenamento Health Services fallito: si prosegue senza HR", it)
        }
    }

    @Synchronized
    fun seed(t: List<Int>, bpm: List<Int>) {
        if (hrT.isEmpty() && t.isNotEmpty()) {
            hrT.addAll(t)
            hrBpm.addAll(bpm)
        }
    }

    @Synchronized
    private fun record(bpm: Double) {
        _currentBpm.value = bpm.roundToInt()
        if (sessionStartMs <= 0L) return
        val offsetSec = ((System.currentTimeMillis() - sessionStartMs) / 1000L).toInt()
        if (offsetSec < 0) return
        val idx = offsetSec / BUCKET_SEC
        if (idx != bucketIdx) flushBucket()
        bucketIdx = idx
        bucketSum += bpm
        bucketCount++
    }

    /** Chiude il bucket corrente (usa bucketIdx corrente, chiamare PRIMA di aggiornarlo) */
    private fun flushBucket() {
        if (bucketCount == 0 || bucketIdx < 0) return
        hrT.add(bucketIdx * BUCKET_SEC)
        hrBpm.add((bucketSum / bucketCount).roundToInt())
        bucketSum = 0.0
        bucketCount = 0
    }

    /** Serie accumulata finora (per la persistenza periodica anti-crash) */
    @Synchronized
    fun snapshot(): Pair<List<Int>, List<Int>> = hrT.toList() to hrBpm.toList()

    /**
     * Serie completa da salvare nella sessione, bucket parziale incluso. Sincrona:
     * serve a fine allenamento, dove i dati vanno scritti subito nel documento.
     */
    @Synchronized
    fun flushAndSnapshot(): Pair<List<Int>, List<Int>> {
        flushBucket()
        return hrT.toList() to hrBpm.toList()
    }

    /**
     * Chiude l'allenamento su Health Services. Da chiamare SOLO a fine allenamento, mai
     * alla distruzione della Activity: la registrazione deve sopravvivere allo schermo
     * spento, ed e' proprio il motivo per cui esiste questa classe.
     */
    suspend fun stop(context: Context) {
        if (running) {
            runCatching { client(context).endExercise() }
                .onFailure { Log.w(TAG, "chiusura allenamento fallita", it) }
            running = false
        }
        _currentBpm.value = null
    }

    /** Pulizia per la sessione successiva */
    @Synchronized
    fun reset() {
        hrT.clear()
        hrBpm.clear()
        bucketIdx = -1
        bucketSum = 0.0
        bucketCount = 0
        sessionStartMs = 0L
    }
}
