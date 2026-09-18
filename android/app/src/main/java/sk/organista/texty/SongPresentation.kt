package sk.organista.texty

import android.app.Presentation
import android.content.Context
import android.graphics.Color
import android.os.Bundle
import android.view.Display
import android.view.ViewGroup
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
            loadUrl("${WebApp.BASE_URL}display.html")
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
        // Okno na televízore si samo nevyžiada prekreslenie, keď sa obsah
        // zmení bez dotyku – bez tohto by text zaostával o jeden krok.
        view.postInvalidateOnAnimation()
    }

    fun destroy() {
        webView?.destroy()
        webView = null
    }
}
