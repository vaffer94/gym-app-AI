package com.gymapp.watch.data

import android.content.Context
import com.gymapp.watch.data.local.AppDatabase
import com.gymapp.watch.data.local.PlanCacheEntity
import com.gymapp.watch.data.model.WorkoutPlan
import com.gymapp.watch.data.remote.PlansRemoteSource
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Offline-first: la UI legge sempre dalla cache Room (`observePlans`); `refresh()` scarica
 * le schede aggiornate da Firestore e le scrive in cache. Cosi' la Home mostra qualcosa
 * anche a freddo/offline, e si aggiorna appena torna la rete.
 */
class PlansRepository(context: Context, private val uid: String) {

    private val remote = PlansRemoteSource(uid)
    private val dao = AppDatabase.get(context).planCacheDao()

    fun observePlans(): Flow<List<WorkoutPlan>> =
        dao.observeAll().map { rows -> rows.map { AppJson.decodeFromString(WorkoutPlan.serializer(), it.json) } }

    suspend fun refresh(): Result<Unit> = try {
        val plans = remote.listPlans()
        dao.upsertAll(
            plans.map { plan ->
                PlanCacheEntity(
                    id = plan.id,
                    name = plan.name,
                    updatedAt = plan.updatedAt ?: 0L,
                    json = AppJson.encodeToString(WorkoutPlan.serializer(), plan),
                    cachedAt = System.currentTimeMillis(),
                )
            },
        )
        dao.deleteMissing(plans.map { it.id })
        Result.success(Unit)
    } catch (e: Exception) {
        Result.failure(e)
    }

    /** Scheda per id: cache prima, poi rete come fallback (es. dopo un deep-link/notifica) */
    suspend fun getPlan(id: String): WorkoutPlan? {
        dao.getById(id)?.let { return AppJson.decodeFromString(WorkoutPlan.serializer(), it.json) }
        return remote.getPlan(id)
    }
}
