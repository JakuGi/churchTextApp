package sk.organista.texty

import android.content.ActivityNotFoundException
import android.content.ContentUris
import android.content.ContentValues
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.DocumentsContract
import android.provider.MediaStore
import android.provider.Settings
import android.view.View
import android.view.WindowManager
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.FileProvider
import androidx.documentfile.provider.DocumentFile
import androidx.webkit.WebViewAssetLoader
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : ComponentActivity() {

    lateinit var storage: Storage
        private set

    private lateinit var webView: WebView
    private lateinit var assetLoader: WebViewAssetLoader
    private var presentations: PresentationController? = null
    private var fileChooser: ValueCallback<Array<Uri>>? = null

    private val pickFolder = registerForActivityResult(ActivityResultContracts.OpenDocumentTree()) { uri ->
        if (uri == null) {
            callJs("window.organistaImportDone", "0")
            return@registerForActivityResult
        }
        runCatching {
            contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            // Priečinok si zapamätáme, aby sa nabudúce piesne načítali na jedno ťuknutie.
            prefs.edit().putString(KEY_SONGS_TREE, uri.toString()).apply()
        }
        readFolder(uri)
    }

    private val pickFiles = registerForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { uris ->
        val callback = fileChooser
        fileChooser = null
        callback?.onReceiveValue(uris.toTypedArray())
    }

    private val prefs by lazy { getSharedPreferences("organista", MODE_PRIVATE) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        storage = Storage(this)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        // Priečinok na piesne z počítača nech existuje hneď po prvom spustení.
        Thread { ensureSongsFolder() }.start()

        assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#0f1216"))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.mediaPlaybackRequiresUserGesture = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.textZoom = 100
            isVerticalScrollBarEnabled = true
            addJavascriptInterface(WebBridge(this@MainActivity), "OrganistaNative")

            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest) =
                    assetLoader.shouldInterceptRequest(request.url)

                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    val url = request.url
                    if (url.host == "appassets.androidplatform.net") return false
                    // Odkazy mimo aplikácie otvorí prehliadač.
                    runCatching { startActivity(Intent(Intent.ACTION_VIEW, url)) }
                    return true
                }

                override fun onPageFinished(view: WebView, url: String) {
                    notifyDisplay(presentations?.displayName)
                }
            }

            webChromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(
                    view: WebView,
                    callback: ValueCallback<Array<Uri>>,
                    params: FileChooserParams,
                ): Boolean {
                    fileChooser?.onReceiveValue(null)
                    fileChooser = callback
                    return runCatching {
                        pickFiles.launch(arrayOf("text/xml", "application/xml", "*/*"))
                        true
                    }.getOrElse {
                        fileChooser = null
                        false
                    }
                }
            }
        }
        setContentView(webView)
        hideSystemBars()

        presentations = PresentationController(this, assetLoader) { name -> notifyDisplay(name) }
        webView.loadUrl("${WebApp.BASE_URL}index.html")

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else finish()
            }
        })
    }

    override fun onStart() {
        super.onStart()
        presentations?.start()
    }

    override fun onStop() {
        presentations?.stop()
        super.onStop()
    }

    override fun onDestroy() {
        presentations?.stop()
        webView.destroy()
        super.onDestroy()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemBars()
    }

    private fun hideSystemBars() {
        @Suppress("DEPRECATION")
        webView.systemUiVisibility = (View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY)
    }

    // ------------------------------------------------------- druhá obrazovka

    fun publishState(stateJson: String) {
        runOnUiThread { presentations?.publish(stateJson) }
    }

    fun currentDisplayName(): String? = presentations?.displayName

    fun openDisplaySettings() {
        runOnUiThread {
            val intents = listOf(
                Intent(Settings.ACTION_CAST_SETTINGS),
                Intent(Settings.ACTION_DISPLAY_SETTINGS),
                Intent(Settings.ACTION_SETTINGS),
            )
            for (intent in intents) {
                try {
                    startActivity(intent)
                    return@runOnUiThread
                } catch (error: ActivityNotFoundException) {
                    continue
                }
            }
            toast("Nastavenia zrkadlenia sa nepodarilo otvoriť.")
        }
    }

    private fun notifyDisplay(name: String?) {
        val payload = JSONObject().put("name", name ?: "").put("connected", name != null)
        callJs("window.organistaDisplayChanged", payload.toString())
    }

    private fun callJs(function: String, argument: String) {
        runOnUiThread {
            webView.evaluateJavascript("if (typeof $function === 'function') $function($argument);", null)
        }
    }

    // --------------------------------------------------------------- import

    fun startFolderImport() {
        runOnUiThread {
            runCatching { pickFolder.launch(songsFolderUri()) }
                .onFailure {
                    runCatching { pickFolder.launch(null) }
                        .onFailure { toast("Výber priečinka sa nepodarilo otvoriť.") }
                }
        }
    }

    /**
     * Načíta piesne z priečinka Stiahnuté/Organista/piesne, do ktorého sa dajú
     * súbory nakopírovať z počítača cez USB. Prvýkrát si ho dá používateľ
     * potvrdiť v systémovom okne (Android inak k cudzím súborom nepustí),
     * potom už stačí jedno ťuknutie.
     */
    fun importSongsFolder() {
        val saved = savedSongsTree()
        if (saved != null) {
            readFolder(saved)
            return
        }
        startFolderImport()
    }

    /** Má aplikácia potvrdený priečinok s piesňami? */
    fun hasSongsFolder(): Boolean = savedSongsTree() != null

    /** Cesta k priečinku s piesňami tak, ako ju vidno z počítača. */
    fun songsFolderPath(): String = "Stiahnuté/$SONGS_RELATIVE"

    private fun savedSongsTree(): Uri? {
        val saved = prefs.getString(KEY_SONGS_TREE, null) ?: return null
        val uri = runCatching { Uri.parse(saved) }.getOrNull() ?: return null
        val allowed = contentResolver.persistedUriPermissions.any { it.uri == uri && it.isReadPermission }
        return if (allowed) uri else null
    }

    /** Adresa priečinka pre systémové okno výberu, aby sa otvorilo rovno v ňom. */
    private fun songsFolderUri(): Uri? = runCatching {
        DocumentsContract.buildDocumentUri(
            "com.android.externalstorage.documents",
            "primary:${Environment.DIRECTORY_DOWNLOADS}/$SONGS_RELATIVE",
        )
    }.getOrNull()

    /**
     * Vytvorí priečinok Stiahnuté/Organista/piesne aj s návodom, aby ho bolo
     * z počítača kde nájsť ešte predtým, než doň niekto niečo nakopíruje.
     */
    fun ensureSongsFolder() {
        runCatching {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val path = "${Environment.DIRECTORY_DOWNLOADS}/$SONGS_RELATIVE"
                if (readExportedFile(SONGS_SUBFOLDER, SONGS_README).isNotBlank()) return@runCatching
                val values = ContentValues().apply {
                    put(MediaStore.Downloads.DISPLAY_NAME, SONGS_README)
                    put(MediaStore.Downloads.MIME_TYPE, "text/plain")
                    put(MediaStore.Downloads.RELATIVE_PATH, path)
                }
                val uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                    ?: return@runCatching
                contentResolver.openOutputStream(uri)?.use { it.write(SONGS_README_TEXT.toByteArray()) }
            } else {
                val dir = File(getExternalFilesDir(null), SONGS_RELATIVE).apply { mkdirs() }
                val file = File(dir, SONGS_README)
                if (!file.exists()) file.writeText(SONGS_README_TEXT)
            }
        }
    }

    private fun readFolder(root: Uri) {
        Thread {
            val tree = DocumentFile.fromTreeUri(this, root)
            if (tree == null) {
                callJs("window.organistaImportDone", "0")
                return@Thread
            }
            var total = 0
            var batch = JSONArray()

            fun flush() {
                if (batch.length() == 0) return
                callJs("window.organistaImportChunk", batch.toString())
                batch = JSONArray()
            }

            fun walk(dir: DocumentFile, folderName: String) {
                for (child in dir.listFiles()) {
                    val name = child.name ?: continue
                    if (child.isDirectory) {
                        walk(child, name)
                        continue
                    }
                    if (!name.endsWith(".xml", ignoreCase = true)) continue
                    val text = runCatching {
                        contentResolver.openInputStream(child.uri)?.bufferedReader()?.use { it.readText() }
                    }.getOrNull() ?: continue
                    batch.put(
                        JSONObject()
                            .put("folder", folderName)
                            .put("name", name)
                            .put("text", text),
                    )
                    total += 1
                    if (batch.length() >= 25) flush()
                }
            }

            walk(tree, tree.name ?: "Piesne")
            flush()
            callJs("window.organistaImportDone", total.toString())
        }.start()
    }

    // ----------------------------------------------- liturgický kalendár

    /**
     * Stiahne stránku lc.kbs.sk pre daný deň. Používa serverovú adresu
     * `?den=YYYYMMDD`, takže netreba spúšťať JavaScript stránky.
     */
    fun fetchLiturgy(dayKey: String) {
        val day = dayKey.filter { it.isDigit() }
        val target = if (day.length == 8) "https://lc.kbs.sk/?den=$day" else "https://lc.kbs.sk/"

        Thread {
            val result = JSONObject().put("day", day)
            try {
                val connection = (URL(target).openConnection() as HttpURLConnection).apply {
                    connectTimeout = 15000
                    readTimeout = 20000
                    instanceFollowRedirects = true
                    setRequestProperty("User-Agent", "Organista/${BuildConfigCompat.versionName} (Android)")
                    setRequestProperty("Accept-Charset", "UTF-8")
                }
                try {
                    val code = connection.responseCode
                    if (code in 200..299) {
                        val charset = connection.contentEncoding
                            ?: Regex("charset=([\\w-]+)").find(connection.contentType ?: "")?.groupValues?.get(1)
                            ?: "UTF-8"
                        val html = connection.inputStream.bufferedReader(charset(charset)).use { it.readText() }
                        result.put("ok", true).put("html", html)
                    } else {
                        result.put("ok", false).put("error", "Kalendár odpovedal $code.")
                    }
                } finally {
                    connection.disconnect()
                }
            } catch (error: Exception) {
                result.put("ok", false).put("error", "Kalendár sa nepodarilo načítať. Skontroluj pripojenie na internet.")
            }
            callJs("window.organistaLiturgy", result.toString())
        }.start()
    }

    // ---------------------------------------------------------------- export

    /**
     * Uloží súbor do Stiahnuté/Organista, prípadne do podpriečinka.
     * Súbor s rovnakým názvom sa prepíše – využíva to automatická záloha.
     *
     * @return popis miesta, kam sa súbor uložil (pre hlásenie v aplikácii)
     */
    fun exportFile(fileName: String, content: String, subFolder: String): String {
        val safeName = fileName.ifBlank { "piesen.xml" }
        val folder = subFolder.filter { it.isLetterOrDigit() || it == '-' || it == '_' }
        val relative = if (folder.isEmpty()) "Organista" else "Organista/$folder"

        return runCatching {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val path = "${Environment.DIRECTORY_DOWNLOADS}/$relative"
                replaceInDownloads(safeName, path)
                val values = ContentValues().apply {
                    put(MediaStore.Downloads.DISPLAY_NAME, safeName)
                    put(MediaStore.Downloads.MIME_TYPE, "application/xml")
                    put(MediaStore.Downloads.RELATIVE_PATH, path)
                }
                val uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                    ?: return@runCatching ""
                contentResolver.openOutputStream(uri)?.use { it.write(content.toByteArray()) }
                "Stiahnuté/$relative/$safeName"
            } else {
                val dir = File(getExternalFilesDir(null), relative).apply { mkdirs() }
                File(dir, safeName).writeText(content)
                "$relative/$safeName"
            }
        }.getOrDefault("")
    }

    /**
     * Načíta súbor uložený v Stiahnuté/Organista (prípadne v podpriečinku).
     * Používa sa na automatickú obnovu knižnice zo zálohy po preinštalovaní.
     *
     * @return obsah súboru, alebo prázdny reťazec, keď sa nenašiel
     */
    fun readExportedFile(subFolder: String, fileName: String): String {
        val safeName = fileName.ifBlank { return "" }
        val folder = subFolder.filter { it.isLetterOrDigit() || it == '-' || it == '_' }
        val relative = if (folder.isEmpty()) "Organista" else "Organista/$folder"

        return runCatching {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val path = "${Environment.DIRECTORY_DOWNLOADS}/$relative"
                contentResolver.query(
                    MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                    arrayOf(MediaStore.Downloads._ID),
                    "${MediaStore.Downloads.DISPLAY_NAME} = ? AND ${MediaStore.Downloads.RELATIVE_PATH} LIKE ?",
                    arrayOf(safeName, "$path%"),
                    "${MediaStore.Downloads.DATE_MODIFIED} DESC",
                )?.use { cursor ->
                    val column = cursor.getColumnIndexOrThrow(MediaStore.Downloads._ID)
                    while (cursor.moveToNext()) {
                        val uri = ContentUris.withAppendedId(
                            MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                            cursor.getLong(column),
                        )
                        val text = runCatching {
                            contentResolver.openInputStream(uri)?.use { it.readBytes().decodeToString() }
                        }.getOrNull()
                        if (!text.isNullOrBlank()) return@runCatching text
                    }
                }
                ""
            } else {
                val file = File(File(getExternalFilesDir(null), relative), safeName)
                if (file.isFile) file.readText() else ""
            }
        }.getOrDefault("")
    }

    /** Zmaže predchádzajúci súbor rovnakého mena, aby záloha nepribúdala v kópiách. */
    private fun replaceInDownloads(name: String, relativePath: String) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return
        runCatching {
            contentResolver.query(
                MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                arrayOf(MediaStore.Downloads._ID),
                "${MediaStore.Downloads.DISPLAY_NAME} = ? AND ${MediaStore.Downloads.RELATIVE_PATH} LIKE ?",
                arrayOf(name, "$relativePath%"),
                null,
            )?.use { cursor ->
                val column = cursor.getColumnIndexOrThrow(MediaStore.Downloads._ID)
                while (cursor.moveToNext()) {
                    val uri = ContentUris.withAppendedId(
                        MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                        cursor.getLong(column),
                    )
                    contentResolver.delete(uri, null, null)
                }
            }
        }
    }

    // ------------------------------------------------------------ aktualizácia

    /** Stiahne text z adresy na GitHube (kontrola novej verzie). */
    fun fetchText(url: String, callback: String) {
        if (!isAllowedUrl(url)) {
            callJs(callback, JSONObject().put("ok", false).put("error", "Nepovolená adresa.").toString())
            return
        }
        Thread {
            val result = JSONObject()
            try {
                val connection = openConnection(url)
                try {
                    val code = connection.responseCode
                    if (code in 200..299) {
                        val text = connection.inputStream.bufferedReader().use { it.readText() }
                        result.put("ok", true).put("text", text)
                    } else {
                        result.put("ok", false).put("error", "GitHub odpovedal $code.")
                    }
                } finally {
                    connection.disconnect()
                }
            } catch (error: Exception) {
                result.put("ok", false).put("error", "Spojenie s GitHubom zlyhalo.")
            }
            callJs(callback, result.toString())
        }.start()
    }

    /**
     * Stiahne APK novej verzie a otvorí inštalátor. Údaje aplikácie zostávajú
     * zachované – Android pri aktualizácii dáta nemaže.
     */
    fun installUpdate(url: String, version: String) {
        if (!isAllowedUrl(url)) {
            callJs("window.organistaUpdateState", JSONObject()
                .put("stage", "error").put("error", "Nepovolená adresa.").toString())
            return
        }
        Thread {
            val state = JSONObject().put("version", version)
            try {
                val dir = File(filesDir, "updates").apply { mkdirs() }
                dir.listFiles()?.forEach { it.delete() }
                val target = File(dir, "organista-$version.apk")

                val connection = openConnection(url)
                try {
                    if (connection.responseCode !in 200..299) {
                        throw IllegalStateException("odpoveď ${connection.responseCode}")
                    }
                    connection.inputStream.use { input ->
                        target.outputStream().use { output -> input.copyTo(output) }
                    }
                } finally {
                    connection.disconnect()
                }

                val uri = FileProvider.getUriForFile(this, "$packageName.files", target)
                val intent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(uri, "application/vnd.android.package-archive")
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                runOnUiThread { startActivity(intent) }
                callJs("window.organistaUpdateState", state.put("stage", "installer").toString())
            } catch (error: Exception) {
                callJs("window.organistaUpdateState", state
                    .put("stage", "error")
                    .put("error", "Aktualizáciu sa nepodarilo stiahnuť.").toString())
            }
        }.start()
    }

    private fun openConnection(url: String): HttpURLConnection =
        (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = 15000
            readTimeout = 30000
            instanceFollowRedirects = true
            setRequestProperty("User-Agent", "Organista/${BuildConfigCompat.versionName} (Android)")
            setRequestProperty("Accept", "application/vnd.github+json, application/octet-stream, */*")
        }

    /** Sťahovať sa dá len z GitHubu tohto projektu. */
    private fun isAllowedUrl(url: String): Boolean = runCatching {
        val parsed = URL(url)
        parsed.protocol == "https" && parsed.host in setOf(
            "api.github.com", "github.com", "objects.githubusercontent.com", "codeload.github.com",
        )
    }.getOrDefault(false)

    private fun toast(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }

    private companion object {
        const val SONGS_SUBFOLDER = "piesne"
        const val SONGS_RELATIVE = "Organista/piesne"
        const val SONGS_README = "PRECITAJ-MA.txt"
        const val KEY_SONGS_TREE = "songsTree"
        val SONGS_README_TEXT = """
            PIESNE PRE APLIKÁCIU ORGANISTA
            ==============================

            Sem (Stiahnuté/Organista/piesne) skopíruj z počítača súbory .xml
            s piesňami. Tablet pripoj k počítaču USB káblom a v počítači otvor:

                Tablet -> Interná pamäť -> Download (Stiahnuté) -> Organista -> piesne

            Priečinky, ktoré sem vytvoríš, sa v aplikácii stanú zbierkami.
            Napríklad:

                piesne/JKS/342-O_Boze_nas.xml
                piesne/Vlastne/Moja_piesen.xml

            Potom v tablete otvor aplikáciu Organista, choď do časti Knižnica
            a ťukni na "Načítať piesne z tabletu". Prvýkrát sa Android spýta,
            či aplikácia môže tento priečinok čítať - potvrď "Použiť tento
            priečinok" a "Povoliť". Nabudúce to už stačí jedno ťuknutie.

            Podporované sú súbory .xml vo vlastnom formáte aplikácie,
            v formáte OpenSong aj OpenLyrics/OpenLP.
        """.trimIndent()
    }
}
