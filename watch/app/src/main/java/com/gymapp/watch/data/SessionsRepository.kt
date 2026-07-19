package com.gymapp.watch.data

import android.content.Context
import com.gymapp.watch.data.local.AppDatabase
import com.gymapp.watch.data.local.PendingSessionEntity
import com.gymapp.watch.data.model.WorkoutSession
import com.gymapp.watch.data.remote.SessionsRemoteSource
import kotlinx.coroutines.flow.Flow

/**
 * A fine allenamento la sessione viene SEMPRE scritta prima nel buffer Room (mai perdere
 * un allenamento fatto in palestra per un problema di rete), poi si tenta subito l'upload
 * su Firestore. Se fallisce (offline), resta nel buffer finche' SessionSyncWorker (o un
 * nuovo avvio dell'app) non riesce a sincronizzarla.
 */
class SessionsRepository(context: Context, private val uid: String) {

    private val remote = SessionsRemoteSource(uid)
    private val dao = AppDatabase.get(context).pendingSessionDao()

    fun observePendingCount(): Flow<Int> = dao.observeCount()

    /** Chiamata a fine allenamento: buffer locale + tentativo immediato di upload */
    suspend fun finishAndUpload(session: WorkoutSession): Boolean {
        dao.upsert(
            PendingSessionEntity(
                id = session.id,
                json = AppJson.encodeToString(WorkoutSession.serializer(), session),
                createdAt = System.currentTimeMillis(),
            ),
        )
        return syncOne(session.id)
    }

    private suspend fun syncOne(id: String): Boolean {
        val entity = dao.getAll().find { it.id == id } ?: return true // gia' sincronizzata
        return try {
            val session = AppJson.decodeFromString(WorkoutSession.serializer(), entity.json)
            remote.uploadSession(session)
            dao.delete(id)
            true
        } catch (e: Exception) {
            dao.incrementAttempts(id)
            false
        }
    }

    /** Riprova tutte le sessioni in buffer (chiamata al ritorno online / da WorkManager) */
    suspend fun syncAllPending(): Int {
        var success = 0
        for (entity in dao.getAll()) {
            try {
                val session = AppJson.decodeFromString(WorkoutSession.serializer(), entity.json)
                remote.uploadSession(session)
                dao.delete(entity.id)
                success++
            } catch (e: Exception) {
                dao.incrementAttempts(entity.id)
            }
        }
        return success
    }
}
