package com.gymapp.watch.data.remote

import com.google.firebase.firestore.toObject
import com.gymapp.watch.data.model.WorkoutPlan
import kotlinx.coroutines.tasks.await

/** Legge le schede da `users/{uid}/workoutPlans` — stessa collezione scritta dalla web app */
class PlansRemoteSource(private val uid: String) {

    private val col get() = FirebaseModule.firestore.collection("users").document(uid).collection("workoutPlans")

    suspend fun listPlans(): List<WorkoutPlan> {
        val snap = col.get().await()
        return snap.documents.mapNotNull { doc -> doc.toObject<WorkoutPlan>()?.also { it.id = doc.id } }
            .sortedByDescending { it.updatedAt ?: 0L }
    }

    suspend fun getPlan(id: String): WorkoutPlan? {
        val doc = col.document(id).get().await()
        return if (doc.exists()) doc.toObject<WorkoutPlan>()?.also { it.id = doc.id } else null
    }
}
