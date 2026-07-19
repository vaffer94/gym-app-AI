package com.gymapp.watch.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.gymapp.watch.data.AppJson
import com.gymapp.watch.data.model.WorkoutSession
import kotlinx.coroutines.flow.first

private val Context.dataStore by preferencesDataStore(name = "gym_watch_prefs")

/**
 * Persistenza continua della sessione attiva (equivalente di src/workout/activeSession.js
 * sul web): se il processo del watch viene ucciso a meta' allenamento, si riprende da dove
 * si era invece di perdere la sessione.
 */
class ActiveSessionStore(private val context: Context) {

    private object Keys {
        val ACTIVE_SESSION_JSON = stringPreferencesKey("active_session_json")
        val REST_DEFAULT_SEC = intPreferencesKey("rest_default_sec")
    }

    suspend fun save(session: WorkoutSession) {
        context.dataStore.edit { it[Keys.ACTIVE_SESSION_JSON] = AppJson.encodeToString(WorkoutSession.serializer(), session) }
    }

    suspend fun load(): WorkoutSession? {
        val raw = context.dataStore.data.first()[Keys.ACTIVE_SESSION_JSON] ?: return null
        return try {
            AppJson.decodeFromString(WorkoutSession.serializer(), raw)
        } catch (e: Exception) {
            null
        }
    }

    suspend fun clear() {
        context.dataStore.edit { it.remove(Keys.ACTIVE_SESSION_JSON) }
    }

    suspend fun getRestDefaultSec(): Int = context.dataStore.data.first()[Keys.REST_DEFAULT_SEC] ?: 60

    suspend fun setRestDefaultSec(sec: Int) {
        context.dataStore.edit { it[Keys.REST_DEFAULT_SEC] = sec }
    }
}
