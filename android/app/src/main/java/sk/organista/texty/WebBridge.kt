package sk.organista.texty

import android.webkit.JavascriptInterface

/**
 * Rozhranie, ktoré webová časť aplikácie vidí ako `window.OrganistaNative`.
 *
 * Metódy volá WebView z vlastného vlákna, preto sa všetko, čo sa dotýka
 * obrazovky, posiela do hlavného vlákna cez MainActivity.
 */
class WebBridge(private val activity: MainActivity) {

    @JavascriptInterface
    fun version(): String = BuildConfigCompat.versionName

    /** Stav (sloha, ktorá sa má premietať) pre druhú obrazovku. */
    @JavascriptInterface
    fun publish(stateJson: String) {
        activity.publishState(stateJson)
    }

    /** Názov pripojenej druhej obrazovky, alebo prázdny reťazec. */
    @JavascriptInterface
    fun displayName(): String = activity.currentDisplayName() ?: ""

    /** Otvorí systémové nastavenia zrkadlenia obrazovky. */
    @JavascriptInterface
    fun openDisplaySettings() {
        activity.openDisplaySettings()
    }

    // ------------------------------------------------------------ úložisko

    @JavascriptInterface
    fun read(name: String): String = activity.storage.read(name)

    @JavascriptInterface
    fun writeBegin(name: String) {
        activity.storage.begin(name)
    }

    @JavascriptInterface
    fun writeChunk(name: String, chunk: String) {
        activity.storage.append(name, chunk)
    }

    @JavascriptInterface
    fun writeCommit(name: String): Boolean = activity.storage.commit(name)

    // -------------------------------------------------------------- súbory

    /** Spustí výber priečinka s piesňami; výsledok príde do JS po častiach. */
    @JavascriptInterface
    fun importFolder() {
        activity.startFolderImport()
    }

    /**
     * Načíta piesne z priečinka Stiahnuté/Organista/piesne (tam sa dajú
     * nakopírovať z počítača). Prvýkrát si ho dá používateľ potvrdiť.
     */
    @JavascriptInterface
    fun importSongsFolder() {
        activity.importSongsFolder()
    }

    /** Cesta k priečinku s piesňami tak, ako ju vidno z počítača. */
    @JavascriptInterface
    fun songsFolder(): String = activity.songsFolderPath()

    /** Plná cesta k priečinku s piesňami (do nastavení). */
    @JavascriptInterface
    fun songsFolderFull(): String = activity.songsFolderFullPath()

    /** Má aplikácia povolený prístup k súborom v tablete? */
    @JavascriptInterface
    fun hasFileAccess(): Boolean = activity.hasFileAccess()

    /** Otvorí systémové nastavenie „Prístup ku všetkým súborom“. */
    @JavascriptInterface
    fun requestFileAccess() {
        activity.requestFileAccess()
    }

    /** Vyberie iný priečinok na piesne a presunie doň celý obsah. */
    @JavascriptInterface
    fun pickSongsFolder() {
        activity.pickSongsDir()
    }

    /** Je priečinok s piesňami už potvrdený? */
    @JavascriptInterface
    fun hasSongsFolder(): Boolean = activity.hasSongsFolder()

    /** Uloží pieseň do priečinka s piesňami (podpriečinok podľa zbierky). */
    @JavascriptInterface
    fun saveSongFile(folder: String, fileName: String, content: String): Boolean =
        activity.saveSongFile(folder, fileName, content)

    /** Zmaže súbor piesne z priečinka s piesňami. */
    @JavascriptInterface
    fun deleteSongFile(folder: String, fileName: String): Boolean =
        activity.deleteSongFile(folder, fileName)

    /** Uloží set ako .json vedľa priečinka s piesňami (len s povolením na súbory). */
    @JavascriptInterface
    fun saveSetFile(fileName: String, content: String): Boolean =
        activity.saveSetFile(fileName, content)

    /** Zmaže súbor setu spomedzi setov uložených vedľa piesní. */
    @JavascriptInterface
    fun deleteSetFile(fileName: String): Boolean =
        activity.deleteSetFile(fileName)

    /** Načíta všetky sety uložené vedľa priečinka s piesňami (pre spustenie appky). */
    @JavascriptInterface
    fun readSetsFolder(): String = activity.readSetsFolder()

    /**
     * Stiahne stránku liturgického kalendára (responzóriový žalm).
     * Výsledok príde do JS cez window.organistaLiturgy.
     */
    @JavascriptInterface
    fun fetchLiturgy(dayKey: String) {
        activity.fetchLiturgy(dayKey)
    }

    /**
     * Uloží súbor do priečinka Stiahnuté/Organista.
     * @param subFolder podpriečinok, napríklad „autosave“ (môže byť prázdny)
     */
    @JavascriptInterface
    fun exportFile(fileName: String, content: String): String =
        activity.exportFile(fileName, content, "")

    @JavascriptInterface
    fun exportFileTo(subFolder: String, fileName: String, content: String): String =
        activity.exportFile(fileName, content, subFolder)

    /** Načíta zálohu uloženú v Stiahnuté/Organista (napríklad z autosave). */
    @JavascriptInterface
    fun readExportedFile(subFolder: String, fileName: String): String =
        activity.readExportedFile(subFolder, fileName)

    /** Stiahne text z povolenej adresy (GitHub) – kontrola novej verzie. */
    @JavascriptInterface
    fun fetchText(url: String, callback: String) {
        activity.fetchText(url, callback)
    }

    /** Stiahne APK novej verzie a otvorí inštalátor Androidu. */
    @JavascriptInterface
    fun installUpdate(url: String, version: String) {
        activity.installUpdate(url, version)
    }
}

/** Verzia aplikácie bez potreby generovaného BuildConfig. */
object BuildConfigCompat {
    const val versionName: String = "a0.1.7"
}
