package com.gymapp.watch.ui.home

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.gymapp.watch.data.PlansRepository
import com.gymapp.watch.data.model.WorkoutPlan
import com.gymapp.watch.data.remote.FirebaseModule
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/** F0/F2.1 — Home: elenco schede (cache Room, aggiornate da Firestore appena c'e' rete) */
class HomeViewModel(application: Application) : AndroidViewModel(application) {

    private val uid = FirebaseModule.currentUid()
    private val repo = uid?.let { PlansRepository(application, it) }

    val plans: StateFlow<List<WorkoutPlan>> =
        repo?.observePlans()?.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList<WorkoutPlan>())
            ?: MutableStateFlow(emptyList())

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing

    private val _refreshError = MutableStateFlow<String?>(null)
    val refreshError: StateFlow<String?> = _refreshError

    init {
        refresh()
    }

    fun refresh() {
        val r = repo ?: return
        viewModelScope.launch {
            _isRefreshing.value = true
            r.refresh()
                .onFailure { _refreshError.value = it.message }
                .onSuccess { _refreshError.value = null }
            _isRefreshing.value = false
        }
    }
}
