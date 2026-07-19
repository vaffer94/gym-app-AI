# Regole ProGuard/R8 (minifyEnabled = true in release).

# Modelli mappati da Firestore per riflessione + serializzati in JSON (Room buffer /
# DataStore sessione attiva): niente rinomina/rimozione di campi e costruttori.
-keep class com.gymapp.watch.data.model.** { *; }

# kotlinx-serialization (regole ufficiali: mantiene i serializer generati)
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-if @kotlinx.serialization.Serializable class **
-keepclassmembers class <1> {
    static <1>$Companion Companion;
}
-if @kotlinx.serialization.Serializable class ** {
    static **$* *;
}
-keepclassmembers class <2>$<3> {
    kotlinx.serialization.KSerializer serializer(...);
}
-if @kotlinx.serialization.Serializable class ** {
    public static ** INSTANCE;
}
-keepclassmembers class <1> {
    public static <1> INSTANCE;
    kotlinx.serialization.KSerializer serializer(...);
}
