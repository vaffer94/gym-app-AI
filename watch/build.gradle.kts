// Top-level build file: dichiara i plugin usati dai moduli, senza applicarli qui.
//
// Versioni verificate a mano (non c'e' un Gradle/Android SDK in questo ambiente per
// buildare davvero): se Android Studio segnala versioni piu' recenti disponibili al
// primo sync, accetta pure l'upgrade automatico. L'unica coppia che DEVE restare
// allineata e' Kotlin <-> KSP: la versione KSP e' sempre "<versione-kotlin>-<build>"
// (vedi https://github.com/google/ksp/releases per la build piu' recente per 2.0.21).
plugins {
    id("com.android.application") version "8.6.1" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.21" apply false
    id("org.jetbrains.kotlin.plugin.serialization") version "2.0.21" apply false
    id("com.google.gms.google-services") version "4.4.2" apply false
    id("com.google.devtools.ksp") version "2.0.21-1.0.28" apply false
}
