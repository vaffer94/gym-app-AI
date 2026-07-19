package com.gymapp.watch.data.remote

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreSettings
import com.google.firebase.firestore.PersistentCacheSettings

/**
 * Init Firebase (stessi servizi della web app: Auth Google + Firestore).
 * Nessuna dependency injection framework per tenere il progetto semplice in questo step:
 * singleton "a mano", inizializzato pigro dopo che GymWatchApp ha chiamato Firebase.initializeApp.
 */
object FirebaseModule {

    val auth: FirebaseAuth by lazy { FirebaseAuth.getInstance() }

    val firestore: FirebaseFirestore by lazy {
        FirebaseFirestore.getInstance().apply {
            // Cache offline persistente: la scheda scaricata resta disponibile senza rete,
            // e le scritture (sessione) partono in coda e sincronizzano da sole al ritorno online.
            // In aggiunta al buffer esplicito Room per le sessioni (richiesto dal piano di sviluppo),
            // cosi' l'app resta robusta anche se il buffer Room viene svuotato prima del sync.
            firestoreSettings = FirebaseFirestoreSettings.Builder()
                .setLocalCacheSettings(PersistentCacheSettings.newBuilder().build())
                .build()
        }
    }

    /** true se l'utente ha fatto login */
    fun isSignedIn(): Boolean = auth.currentUser != null

    fun currentUid(): String? = auth.currentUser?.uid
}
