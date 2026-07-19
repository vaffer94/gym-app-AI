package com.gymapp.watch.data.remote

import com.gymapp.watch.data.model.WorkoutSession
import kotlinx.coroutines.tasks.await

/**
 * Scrive su `users/{uid}/sessions` — stessa collezione della web app.
 * `set()` con l'id esplicito e' un upsert idempotente: se il retry del buffer offline
 * scrive due volte la stessa sessione non crea doppioni.
 * Il campo `id` non finisce nel documento grazie a @DocumentId sul model.
 */
class SessionsRemoteSource(private val uid: String) {

    private val col get() = FirebaseModule.firestore.collection("users").document(uid).collection("sessions")

    suspend fun uploadSession(session: WorkoutSession) {
        col.document(session.id).set(session).await()
    }
}
