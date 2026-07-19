plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("com.google.gms.google-services")
    id("com.google.devtools.ksp")
}

android {
    namespace = "com.gymapp.watch"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.gymapp.watch"
        // minSdk 30 = Wear OS 3, il minimo per SDK standalone moderno (Credential Manager, Health Services).
        // Copre Pixel Watch 1 in su.
        minSdk = 30
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0-step5"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            // R8 attivo: sul watch la differenza di fluidita' rispetto alla build debug
            // e' enorme (la debug gira senza ottimizzazioni e con i check runtime attivi).
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            // Firma debug per il sideload via ADB: per il Play Store (step 8) andra'
            // sostituita con un keystore di release (e registrato il suo SHA-1 su Firebase).
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }

    packaging {
        resources.excludes.add("/META-INF/{AL2.0,LGPL2.1}")
    }
}

dependencies {
    // --- Wear Compose ---
    implementation("androidx.wear.compose:compose-material:1.4.0")
    implementation("androidx.wear.compose:compose-foundation:1.4.0")
    implementation("androidx.wear.compose:compose-navigation:1.4.0")
    implementation("androidx.activity:activity-compose:1.9.2")
    implementation("androidx.compose.ui:ui:1.7.4")
    implementation("androidx.compose.ui:ui-tooling-preview:1.7.4")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.6")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.6")
    implementation("androidx.wear:wear-tooling-preview:1.0.0")
    // Icone Material per i pulsanti (R8 in release elimina quelle non usate)
    implementation("androidx.compose.material:material-icons-extended:1.7.8")
    debugImplementation("androidx.compose.ui:ui-tooling:1.7.4")

    // Splash / core
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("com.google.android.gms:play-services-wearable:18.2.0")

    // Health Services: HR continuo durante l'allenamento (step 6)
    implementation("androidx.health:health-services-client:1.0.0")
    // ListenableFuture usato dalle API async di Health Services. Serve guava completo:
    // Firestore porta il jar "vuoto" listenablefuture-9999.0 che vince sul singolo
    // artefatto listenablefuture, proprio perche' si aspetta guava vero sul classpath.
    implementation("androidx.concurrent:concurrent-futures-ktx:1.2.0")
    implementation("com.google.guava:guava:33.3.1-android")

    // --- Firebase (stessi servizi della web app: Auth + Firestore) ---
    implementation(platform("com.google.firebase:firebase-bom:33.4.0"))
    implementation("com.google.firebase:firebase-auth-ktx")
    implementation("com.google.firebase:firebase-firestore-ktx")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.8.1")

    // --- Login: Credential Manager (Google Sign-In diretto sul watch) ---
    implementation("androidx.credentials:credentials:1.3.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.3.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")

    // --- Cache locale / buffer offline ---
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")
    implementation("androidx.datastore:datastore-preferences:1.1.1")
    implementation("androidx.work:work-runtime-ktx:2.9.1")

    // Serializzazione (JSON per il buffer Room delle sessioni/schede)
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")

    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
}
