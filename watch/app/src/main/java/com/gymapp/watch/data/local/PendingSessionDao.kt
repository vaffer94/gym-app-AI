package com.gymapp.watch.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface PendingSessionDao {

    @Query("SELECT * FROM pending_sessions ORDER BY createdAt ASC")
    suspend fun getAll(): List<PendingSessionEntity>

    @Query("SELECT COUNT(*) FROM pending_sessions")
    fun observeCount(): Flow<Int>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: PendingSessionEntity)

    @Query("DELETE FROM pending_sessions WHERE id = :id")
    suspend fun delete(id: String)

    @Query("UPDATE pending_sessions SET attempts = attempts + 1 WHERE id = :id")
    suspend fun incrementAttempts(id: String)
}
