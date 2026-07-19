package com.gymapp.watch.auth

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.GoogleAuthProvider
import com.gymapp.watch.R
import com.gymapp.watch.data.remote.FirebaseModule
import kotlinx.coroutines.tasks.await

/**
 * Login Google standalone sul watch via Credential Manager (nessuna app companion sul
 * telefono richiesta — coerente con l'architettura "standalone" del piano di sviluppo).
 *
 * Rischio noto (annotato nel piano, step 5): la UX di questo flusso va verificata sul
 * Pixel Watch fisico. Richiede che sul watch sia gia' presente un account Google
 * (Impostazioni > Account) — se manca, offriamo il fallback assistito (vedi
 * `needsAssistedSetup`) che rimanda l'utente alle Impostazioni del watch.
 *
 * `R.string.default_web_client_id` viene generato automaticamente dal plugin
 * google-services a partire da google-services.json, una volta che nel progetto
 * Firebase e' abilitato il provider Google in Authentication > Sign-in method
 * (vedi watch/README.md).
 */
class AuthManager(private val context: Context) {

    private val credentialManager by lazy { CredentialManager.create(context) }

    sealed class SignInOutcome {
        data class Success(val user: FirebaseUser) : SignInOutcome()
        data class NoCredentialAvailable(val message: String) : SignInOutcome()
        data object Cancelled : SignInOutcome()
        data class Error(val throwable: Throwable) : SignInOutcome()
    }

    suspend fun signInWithGoogle(): SignInOutcome {
        val webClientId = context.getString(R.string.default_web_client_id)

        val googleIdOption = GetGoogleIdOption.Builder()
            .setFilterByAuthorizedAccounts(false)
            .setServerClientId(webClientId)
            .build()

        val request = GetCredentialRequest.Builder()
            .addCredentialOption(googleIdOption)
            .build()

        return try {
            val result = credentialManager.getCredential(context, request)
            val googleIdCredential = GoogleIdTokenCredential.createFrom(result.credential.data)
            val firebaseCredential = GoogleAuthProvider.getCredential(googleIdCredential.idToken, null)
            val authResult = FirebaseModule.auth.signInWithCredential(firebaseCredential).await()
            val user = authResult.user
            if (user != null) SignInOutcome.Success(user)
            else SignInOutcome.Error(IllegalStateException("Login riuscito ma FirebaseUser nullo"))
        } catch (e: GetCredentialCancellationException) {
            // L'utente ha chiuso il selettore account: non e' un errore
            SignInOutcome.Cancelled
        } catch (e: NoCredentialException) {
            // Davvero nessun account Google configurato sul watch
            SignInOutcome.NoCredentialAvailable(e.message ?: "Nessuna credenziale disponibile")
        } catch (e: Exception) {
            // Include gli errori di configurazione (es. SHA-1 non registrato in Firebase):
            // vanno mostrati col messaggio reale, non confusi con "manca l'account"
            SignInOutcome.Error(e)
        }
    }

    fun signOut() {
        FirebaseModule.auth.signOut()
    }

    fun currentUser(): FirebaseUser? = FirebaseModule.auth.currentUser
}
