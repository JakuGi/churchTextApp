plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Webová časť aplikácie (rovnaké súbory ako verzia pre prehliadač) sa pri
// zostavení skopíruje do assets, takže je len jedna kópia kódu.
val webSource = rootProject.projectDir.parentFile
val copyWebApp = tasks.register<Copy>("copyWebApp") {
    duplicatesStrategy = DuplicatesStrategy.INCLUDE
    from(webSource) {
        include("index.html", "display.html", "icon.svg", "manifest.webmanifest")
        include("css/**", "js/**", "songs/**")
    }
    into(layout.buildDirectory.dir("generated/web/www"))
}

android {
    namespace = "sk.organista.texty"
    compileSdk = 35

    defaultConfig {
        applicationId = "sk.organista.texty"
        minSdk = 24
        targetSdk = 35
        versionCode = 5
        versionName = "a0.1.1"
    }

    // Podpisovanie: ak sú v prostredí kľúče (GitHub secrets), použijú sa.
    // Inak sa použije ladiaci kľúč, aby sa APK dalo nainštalovať vždy.
    val keystorePath = System.getenv("ORGANISTA_KEYSTORE")
    signingConfigs {
        if (!keystorePath.isNullOrBlank()) {
            create("release") {
                storeFile = file(keystorePath)
                storePassword = System.getenv("ORGANISTA_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("ORGANISTA_KEY_ALIAS")
                keyPassword = System.getenv("ORGANISTA_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = if (!keystorePath.isNullOrBlank()) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
        }
    }

    sourceSets {
        getByName("main") {
            assets.srcDir(layout.buildDirectory.dir("generated/web"))
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

tasks.named("preBuild") {
    dependsOn(copyWebApp)
}

dependencies {
    implementation("androidx.activity:activity:1.9.3")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.documentfile:documentfile:1.0.1")
    implementation("androidx.core:core-ktx:1.15.0")
}
