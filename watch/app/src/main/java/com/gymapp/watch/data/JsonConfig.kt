package com.gymapp.watch.data

import kotlinx.serialization.json.Json

/** Istanza condivisa di kotlinx.serialization usata per il cache/buffer Room (JSON in colonna testo) */
val AppJson = Json {
    ignoreUnknownKeys = true
    encodeDefaults = true
}
