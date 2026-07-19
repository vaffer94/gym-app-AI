package com.gymapp.watch.sync

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.gymapp.watch.data.SessionsRepository
import com.gymapp.watch.data.remote.FirebaseModule

/**
 * Svuota il buffer Room delle sessioni non ancora caricate, appena c'e' connettivita'.
 * Innescato da SessionsRepository dopo un fallimento di upload immediato, e da
 * GymWatchApp all'avvio (nel caso siano rimaste sessioni in coda dalla sessione precedente).
 */
class SessionSyncWorker(appContext: Context, params: WorkerParameters) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val uid = FirebaseModule.currentUid() ?: return Result.success() // non loggato: niente da sincronizzare
        val repo = SessionsRepository(applicationContext, uid)
        return try {
            repo.syncAllPending()
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }

    companion object {
        private const val UNIQUE_WORK_NAME = "session-sync"

        fun enqueue(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val request = OneTimeWorkRequestBuilder<SessionSyncWorker>()
                .setConstraints(constraints)
                .build()
            WorkManager.getInstance(context)
                .enqueueUniqueWork(UNIQUE_WORK_NAME, ExistingWorkPolicy.REPLACE, request)
        }
    }
}
