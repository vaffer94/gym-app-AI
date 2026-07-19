package com.gymapp.watch.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Buffer locale delle sessioni non ancora caricate su Firestore (allenamento finito
 * mentre il watch era offline). Ogni riga = una WorkoutSession serializzata in JSON.
 * Rimossa dal buffer solo dopo upload riuscito.
 */
@Entity(tableName = "pending_sessions")
data class PendingSessionEntity(
    @PrimaryKey val id: String,
    val json: String,
    val createdAt: Long,
    val attempts: Int = 0,
)
