package sk.organista.texty

import android.app.Activity
import android.content.Context
import android.hardware.display.DisplayManager
import android.media.MediaRouter
import android.os.Handler
import android.os.Looper
import android.view.Display
import android.view.WindowManager
import androidx.webkit.WebViewAssetLoader

/**
 * Sleduje, či je k tabletu pripojená druhá obrazovka, a keď áno, spustí na nej
 * premietanie. Funguje rovnako pre HDMI, bezdrôtový displej aj pre zrkadlenie
 * obrazovky cez Chromecast – Android všetky tieto prípady ohlási ako
 * „prezentačný displej“.
 */
class PresentationController(
    private val activity: Activity,
    private val assetLoader: WebViewAssetLoader,
    private val onChange: (name: String?) -> Unit,
) {

    private val handler = Handler(Looper.getMainLooper())
    private val mediaRouter = activity.getSystemService(Context.MEDIA_ROUTER_SERVICE) as MediaRouter
    private val displayManager = activity.getSystemService(Context.DISPLAY_SERVICE) as DisplayManager

    private var presentation: SongPresentation? = null
    private var lastState: String = "null"
    private var started = false

    var displayName: String? = null
        private set

    private val routerCallback = object : MediaRouter.SimpleCallback() {
        override fun onRouteSelected(router: MediaRouter, type: Int, info: MediaRouter.RouteInfo) = refresh()
        override fun onRouteUnselected(router: MediaRouter, type: Int, info: MediaRouter.RouteInfo) = refresh()
        override fun onRoutePresentationDisplayChanged(router: MediaRouter, info: MediaRouter.RouteInfo) = refresh()
    }

    private val displayListener = object : DisplayManager.DisplayListener {
        override fun onDisplayAdded(displayId: Int) = refresh()
        override fun onDisplayRemoved(displayId: Int) = refresh()
        override fun onDisplayChanged(displayId: Int) = refresh()
    }

    fun start() {
        if (started) return
        started = true
        mediaRouter.addCallback(MediaRouter.ROUTE_TYPE_LIVE_VIDEO, routerCallback)
        displayManager.registerDisplayListener(displayListener, handler)
        refresh()
    }

    fun stop() {
        if (!started) return
        started = false
        mediaRouter.removeCallback(routerCallback)
        displayManager.unregisterDisplayListener(displayListener)
        dismiss()
    }

    /** Uloží posledný stav a hneď ho pošle na televízor, ak je pripojený. */
    fun publish(stateJson: String) {
        lastState = stateJson
        presentation?.render(stateJson)
    }

    private fun pickDisplay(): Display? {
        val route = mediaRouter.getSelectedRoute(MediaRouter.ROUTE_TYPE_LIVE_VIDEO)
        route?.presentationDisplay?.let { return it }
        return displayManager.getDisplays(DisplayManager.DISPLAY_CATEGORY_PRESENTATION).firstOrNull()
    }

    private fun refresh() {
        handler.post {
            if (!started) return@post
            val display = pickDisplay()
            val current = presentation

            if (display == null) {
                if (current != null) dismiss()
                notifyChange(null)
                return@post
            }
            if (current != null && current.display?.displayId == display.displayId) {
                notifyChange(display.name)
                return@post
            }

            dismiss()
            val next = SongPresentation(activity, display, assetLoader)
            try {
                next.show()
            } catch (error: WindowManager.InvalidDisplayException) {
                next.destroy()
                notifyChange(null)
                return@post
            }
            next.setOnDismissListener {
                if (presentation === next) {
                    presentation = null
                    notifyChange(null)
                }
            }
            next.render(lastState)
            presentation = next
            notifyChange(display.name)
        }
    }

    private fun notifyChange(name: String?) {
        if (displayName == name) return
        displayName = name
        onChange(name)
    }

    private fun dismiss() {
        presentation?.let {
            it.setOnDismissListener(null)
            runCatching { it.dismiss() }
            it.destroy()
        }
        presentation = null
    }
}
