package sk.organista.texty

import android.content.Context
import java.io.File

/**
 * Úložisko piesní, zbierok, setov a nastavení.
 *
 * Dáta sú v súkromnom priečinku aplikácie (`/data/data/sk.organista.texty/files`),
 * kam sa iná aplikácia nedostane. Zápis je dvojfázový: najprv do dočasného
 * súboru, potom premenovanie. Predchádzajúca verzia zostáva ako záloha, takže
 * ani výpadok batérie uprostred ukladania knižnicu nezničí.
 */
class Storage(context: Context) {

    private val dir = File(context.filesDir, "data").apply { mkdirs() }
    private val pending = HashMap<String, StringBuilder>()

    private fun target(name: String): File {
        val clean = name.filter { it.isLetterOrDigit() || it == '-' || it == '_' }
        require(clean.isNotEmpty()) { "neplatný názov úložiska" }
        return File(dir, "$clean.json")
    }

    fun read(name: String): String {
        val file = target(name)
        if (file.exists()) {
            val text = runCatching { file.readText() }.getOrNull()
            if (!text.isNullOrBlank()) return text
        }
        val backup = File(file.parentFile, "${file.nameWithoutExtension}.bak")
        if (backup.exists()) {
            val text = runCatching { backup.readText() }.getOrNull()
            if (!text.isNullOrBlank()) return text
        }
        return "[]"
    }

    /** Začiatok zápisu – obsah sa posiela po častiach, aby zvládol aj veľké knižnice. */
    fun begin(name: String) {
        pending[name] = StringBuilder()
    }

    fun append(name: String, chunk: String) {
        pending.getOrPut(name) { StringBuilder() }.append(chunk)
    }

    fun commit(name: String): Boolean {
        val content = pending.remove(name)?.toString() ?: return false
        return runCatching {
            val file = target(name)
            val tmp = File(file.parentFile, "${file.nameWithoutExtension}.tmp")
            tmp.writeText(content)
            if (file.exists()) {
                val backup = File(file.parentFile, "${file.nameWithoutExtension}.bak")
                if (backup.exists()) backup.delete()
                file.renameTo(backup)
            }
            tmp.renameTo(file)
        }.getOrDefault(false)
    }

    fun cancel(name: String) {
        pending.remove(name)
    }
}
