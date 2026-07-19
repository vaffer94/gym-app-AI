package com.gymapp.watch.ui.login

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.gymapp.watch.auth.AuthManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class LoginUiState {
    data object Idle : LoginUiState()
    data object Loading : LoginUiState()
    data object Success : LoginUiState()
    data class NoAccount(val message: String) : LoginUiState()
    data class Error(val message: String) : LoginUiState()
}

class LoginViewModel(application: Application) : AndroidViewModel(application) {

    private val authManager = AuthManager(application)

    private val _uiState = MutableStateFlow<LoginUiState>(LoginUiState.Idle)
    val uiState: StateFlow<LoginUiState> = _uiState

    fun isAlreadySignedIn(): Boolean = authManager.currentUser() != null

    fun signIn() {
        _uiState.value = LoginUiState.Loading
        viewModelScope.launch {
            when (val outcome = authManager.signInWithGoogle()) {
                is AuthManager.SignInOutcome.Success -> _uiState.value = LoginUiState.Success
                is AuthManager.SignInOutcome.NoCredentialAvailable ->
                    _uiState.value = LoginUiState.NoAccount(outcome.message)
                is AuthManager.SignInOutcome.Cancelled -> _uiState.value = LoginUiState.Idle
                is AuthManager.SignInOutcome.Error ->
                    _uiState.value = LoginUiState.Error(outcome.throwable.message ?: "Errore di login")
            }
        }
    }
}
