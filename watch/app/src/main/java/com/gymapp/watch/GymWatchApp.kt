package com.gymapp.watch

import android.app.Application
import com.google.firebase.FirebaseApp
import com.gymapp.watch.sync.SessionSyncWorker

class GymWatchApp : Application() {
    override fun onCreate() {
        super.onCreate()
        FirebaseApp.initializeApp(this)
        // Se erano rimaste sessioni in buffer dall'ultima esecuzione (app chiusa offline
        // a fine allenamento), riprova a caricarle appena c'e' rete.
        SessionSyncWorker.enqueue(this)
    }
}
