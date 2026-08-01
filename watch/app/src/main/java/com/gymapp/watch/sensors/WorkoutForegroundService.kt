package com.gymapp.watch.sensors

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.gymapp.watch.MainActivity
import com.gymapp.watch.R

/**
 * Servizio in primo piano attivo per tutta la durata dell'allenamento.
 *
 * Non registra nulla di suo: la raccolta HR sta in [ExerciseRecorder], che e' un
 * singleton di processo. Questo servizio serve a tenere **vivo il processo** mentre
 * l'allenamento e' in corso, cosi' i callback di Health Services continuano ad arrivare
 * anche con lo schermo spento o l'app in background — la condizione in cui prima si
 * perdeva il battito.
 *
 * Su Wear OS la notifica diventa anche l'indicatore di "attivita' in corso", quindi
 * l'utente vede che l'app sta registrando e puo' tornarci con un tocco.
 */
class WorkoutForegroundService : Service() {

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        createChannel()
        startForeground(NOTIFICATION_ID, buildNotification())
        // START_STICKY: se il sistema uccide il processo per memoria, il servizio
        // riparte; la sessione viene poi ripresa dal DataStore all'apertura dell'app.
        return START_STICKY
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(NotificationManager::class.java) ?: return
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_ID, "Allenamento in corso", NotificationManager.IMPORTANCE_LOW).apply {
                description = "Mostra che l'allenamento e' in registrazione"
                setShowBadge(false)
            },
        )
    }

    private fun buildNotification() = NotificationCompat.Builder(this, CHANNEL_ID)
        .setContentTitle("Allenamento in corso")
        .setContentText("Battito in registrazione")
        .setSmallIcon(R.mipmap.ic_launcher)
        .setOngoing(true)
        .setContentIntent(
            PendingIntent.getActivity(
                this,
                0,
                Intent(this, MainActivity::class.java),
                PendingIntent.FLAG_IMMUTABLE,
            ),
        )
        .build()

    companion object {
        private const val CHANNEL_ID = "workout_ongoing"
        private const val NOTIFICATION_ID = 1

        fun start(context: Context) {
            val intent = Intent(context, WorkoutForegroundService::class.java)
            context.startForegroundService(intent)
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, WorkoutForegroundService::class.java))
        }
    }
}
