package com.gymapp.watch.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Cache locale delle schede scaricate da Firestore (Room, come richiesto dal piano di
 * sviluppo per l'esecuzione offline in palestra). Il payload della scheda e' salvato
 * come JSON in `json` per evitare TypeConverter per ogni campo nidificato; `name` e
 * `updatedAt` restano colonne dirette solo per poter ordinare/filtrare senza deserializzare.
 */
@Entity(tableName = "plan_cache")
data class PlanCacheEntity(
    @PrimaryKey val id: String,
    val name: String,
    val updatedAt: Long,
    val json: String,
    val cachedAt: Long,
)
