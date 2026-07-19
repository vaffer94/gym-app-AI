package com.gymapp.watch.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface PlanCacheDao {

    @Query("SELECT * FROM plan_cache ORDER BY updatedAt DESC")
    fun observeAll(): Flow<List<PlanCacheEntity>>

    @Query("SELECT * FROM plan_cache WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): PlanCacheEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(plans: List<PlanCacheEntity>)

    @Query("DELETE FROM plan_cache WHERE id NOT IN (:keepIds)")
    suspend fun deleteMissing(keepIds: List<String>)
}
