package com.gymapp.watch.sensors

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import androidx.health.services.client.HealthServices
import androidx.health.services.client.MeasureCallback
import androidx.health.services.client.data.Availability
import androidx.health.services.client.data.DataPointContainer
import androidx.health.services.client.data.DataType
import androidx.health.services.client.data.DataTypeAvailability
import androidx.health.services.client.data.DeltaDataType
import kotlin.math.roundToInt
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * HR continuo durante l'allenamento (step 6) via Health Services MeasureClient.
 *
 * I campioni (~1/s) vengono mediati su finestre di [BUCKET_SEC] secondi e accumulati
 * come coppie (offset-in-secondi-dall'inizio-sessione, bpm) nei due array paralleli
 * che finiscono in WorkoutSession.hrT / hrBpm. `currentBpm` espone l'ultimo valore
 * per la UI live. Se il permesso BODY_SENSORS manca, start() e' un no-op silenzioso:
 * l'allenamento funziona comunque, solo senza HR.
 *
 * Decisione 19/07/2026: niente accelerometro (era nel piano originale dello step 6) —
 * l'intensita' la da' l'HR e la segmentazione temporale arriva gia' dai timestamp
 * delle serie; l'accelerometro al polso in sala pesi e' solo rumore e batteria.
 */
class HeartRateRecorder(context: Context) {

    private val appContext = context.applicationContext
    private val measureClient = HealthServices.getClient(appContext).measureClient

    private val hrT = mutableListOf<Int>()
    private val hrBpm = mutableListOf<Int>()
    private var sessionStartMs = 0L
    private var bucketIdx = -1
    private var bucketSum = 0.0
    private var bucketCount = 0
    private var registered = false

    private val _currentBpm = MutableStateFlow<Int?>(null)
    val currentBpm: StateFlow<Int?> = _currentBpm

    private val callback = object : MeasureCallback {
        override fun onAvailabilityChanged(dataType: DeltaDataType<*, *>, availability: Availability) {
            // Sensore non al polso / in acquisizione: spegni il valore live
            if (availability is DataTypeAvailability && availability != DataTypeAvailability.AVAILABLE) {
                _currentBpm.value = null
            }
        }

        override fun onDataReceived(data: DataPointContainer) {
            data.getData(DataType.HEART_RATE_BPM).forEach { sample ->
                // 0 o valori bassissimi = sensore che non ha ancora agganciato il battito
                if (sample.value >= 20.0) record(sample.value)
            }
        }
    }

    fun hasPermission(): Boolean =
        ContextCompat.checkSelfPermission(appContext, Manifest.permission.BODY_SENSORS) ==
            PackageManager.PERMISSION_GRANTED

    /** Avvia la registrazione (no-op senza permesso). Idempotente. */
    fun start(sessionStartMs: Long) {
        if (registered || !hasPermission()) return
        this.sessionStartMs = sessionStartMs
        measureClient.registerMeasureCallback(DataType.HEART_RATE_BPM, callback)
        registered = true
    }

    /**
     * Riparte da una sessione ripristinata: reinserisce i campioni gia' persistiti
     * cosi' snapshot()/stop() restituiscono sempre la serie completa.
     */
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

    /** Ferma il sensore e restituisce la serie completa da salvare nella sessione */
    fun stop(): Pair<List<Int>, List<Int>> {
        synchronized(this) { flushBucket() }
        if (registered) {
            measureClient.unregisterMeasureCallbackAsync(DataType.HEART_RATE_BPM, callback)
            registered = false
        }
        _currentBpm.value = null
        return snapshot()
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

    companion object {
        const val BUCKET_SEC = 5
    }
}
