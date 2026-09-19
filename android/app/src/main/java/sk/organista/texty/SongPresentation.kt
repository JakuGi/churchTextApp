package sk.organista.texty

import android.app.Presentation
import android.content.Context
import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.Display
import android.view.ViewGroup
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader

/**
 * Druhá obrazovka – to, čo vidia veriaci na televízore.
 *
 * Android vytvorí takúto obrazovku vždy, keď je pripojený externý displej
 * (HDMI, bezdrôtový displej alebo zrkadlenie cez Chromecast). Na tablete
 * pritom zostáva ovládanie, na televízore je len text piesne.
 */
class SongPresentation(
    context: Context,
    display: Display,
    private val assetLoader: WebViewAssetLoader,
) : Presentation(context, display) {

    private var webView: WebView? = null
    private var ready = false
    private var pending: String? = null

    private val handler = Handler(Looper.getMainLooper())
    private var drawUntil = 0L

    /**
     * Okno na druhej obrazovke sa samo prekresľuje len vtedy, keď ho o to
     * niekto požiada. Po zmene textu preto chvíľu žiadame o prekreslenie
     * v každom snímku – inak by prelínanie zamrzlo v polovici.
     */
    private val keepDrawing = object : Runnable {
        override fun run() {
            val view = webView ?: return
            view.invalidate()
            if (SystemClock.uptimeMillis() < drawUntil) handler.postDelayed(this, FRAME_MS)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val view = WebView(context).apply {
            setBackgroundColor(Color.BLACK)
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            )
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = true
            // Bez tohto Android na veľkej obrazovke sám zväčšuje písmo
            // („text autosizing“) a text potom vytečie – na televízore bolo
            // vidieť menej riadkov než v náhľade na tablete.
            settings.textZoom = 100
            settings.layoutAlgorithm = WebSettings.LayoutAlgorithm.NORMAL
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView, request: android.webkit.WebResourceRequest) =
                    assetLoader.shouldInterceptRequest(request.url)

                override fun onPageFinished(view: WebView, url: String) {
                    ready = true
                    pending?.let { render(it) }
                    pending = null
                }
            }
            // ?rezim=tv – stránka vie, že stav dostane z natívnej časti
            // a nemá sa pokúšať o spojenie so serverom ani o miestny prenos.
            loadUrl("${WebApp.BASE_URL}display.html?rezim=tv")
        }
        webView = view
        setContentView(view)

        window?.decorView?.setBackgroundColor(Color.BLACK)
    }

    /** Pošle na televízor stav (slohu) ako JSON. */
    fun render(stateJson: String) {
        val view = webView
        if (view == null || !ready) {
            pending = stateJson
            return
        }
        view.evaluateJavascript("window.organistaRender($stateJson);", null)
        // Prekresľuj, kým dobehne prelínanie (najdlhšie nastaviteľné je 400 ms).
        val running = drawUntil > SystemClock.uptimeMillis()
        drawUntil = SystemClock.uptimeMillis() + DRAW_WINDOW_MS
        if (!running) handler.post(keepDrawing)
    }

    fun destroy() {
        drawUntil = 0L
        handler.removeCallbacks(keepDrawing)
        webView?.destroy()
        webView = null
    }

    private companion object {
        const val FRAME_MS = 16L
        const val DRAW_WINDOW_MS = 800L
    }
}
