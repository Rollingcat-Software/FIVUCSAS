# FIVUCSAS - Implementation Roadmap & Action Plan

## Current Status: BUILD SUCCESSFUL ✅

**Date**: October 31, 2025  
**Version**: 1.0.0-MVP  
**Build Status**: ✅ All platforms building successfully  
**Next Phase**: Feature Implementation

---

## Phase 1: IMMEDIATE FIXES & ENHANCEMENTS (Week 1)

### 1.1 Implement Missing Platform-Specific Code

#### Task 1.1.1: Desktop Token Storage
**File**: `mobile-app/shared/src/desktopMain/kotlin/com/fivucsas/mobile/platform/DesktopTokenStorage.kt`

**Implementation**:
```kotlin
package com.fivucsas.mobile.platform

import com.fivucsas.mobile.data.local.TokenStorage
import java.util.prefs.Preferences

actual class DesktopTokenStorage : TokenStorage {
    private val prefs = Preferences.userRoot().node("com.fivucsas.mobile")
    
    actual override fun saveToken(token: String) {
        prefs.put(TOKEN_KEY, token)
        prefs.flush()
    }
    
    actual override fun getToken(): String? {
        return prefs.get(TOKEN_KEY, null)
    }
    
    actual override fun clearToken() {
        prefs.remove(TOKEN_KEY)
        prefs.flush()
    }
    
    companion object {
        private const val TOKEN_KEY = "auth_token"
    }
}
```

**Testing**:
```bash
cd mobile-app
./gradlew.bat :desktopApp:run
# Test: Register > Logout > Login (token should persist)
```

---

#### Task 1.1.2: iOS Token Storage  
**File**: `mobile-app/shared/src/iosMain/kotlin/com/fivucsas/mobile/platform/IosTokenStorage.kt`

**Implementation**:
```kotlin
package com.fivucsas.mobile.platform

import com.fivucsas.mobile.data.local.TokenStorage
import platform.Foundation.NSUserDefaults

actual class IosTokenStorage : TokenStorage {
    private val userDefaults = NSUserDefaults.standardUserDefaults
    
    actual override fun saveToken(token: String) {
        userDefaults.setObject(token, forKey = TOKEN_KEY)
        userDefaults.synchronize()
    }
    
    actual override fun getToken(): String? {
        return userDefaults.stringForKey(TOKEN_KEY)
    }
    
    actual override fun clearToken() {
        userDefaults.removeObjectForKey(TOKEN_KEY)
        userDefaults.synchronize()
    }
    
    companion object {
        private const val TOKEN_KEY = "auth_token"
    }
}
```

---

### 1.2 Implement Dependency Injection with Koin

#### Task 1.2.1: Add Koin Dependencies
**File**: `mobile-app/shared/build.gradle.kts`

```kotlin
kotlin {
    sourceSets {
        val commonMain by getting {
            dependencies {
                // ... existing dependencies
                
                // Koin for KMP
                implementation("io.insert-koin:koin-core:3.5.3")
            }
        }
        
        val androidMain by getting {
            dependencies {
                // ... existing dependencies
                
                // Koin for Android
                implementation("io.insert-koin:koin-android:3.5.3")
                implementation("io.insert-koin:koin-androidx-compose:3.5.3")
            }
        }
    }
}
```

#### Task 1.2.2: Create DI Modules
**File**: `mobile-app/shared/src/commonMain/kotlin/com/fivucsas/mobile/di/AppModules.kt`

```kotlin
package com.fivucsas.mobile.di

import com.fivucsas.mobile.data.remote.ApiClient
import com.fivucsas.mobile.data.repository.AuthRepositoryImpl
import com.fivucsas.mobile.data.repository.BiometricRepositoryImpl
import com.fivucsas.mobile.domain.repository.AuthRepository
import com.fivucsas.mobile.domain.repository.BiometricRepository
import com.fivucsas.mobile.domain.usecase.*
import com.fivucsas.mobile.presentation.biometric.BiometricViewModel
import com.fivucsas.mobile.presentation.login.LoginViewModel
import com.fivucsas.mobile.presentation.register.RegisterViewModel
import org.koin.dsl.module
import org.koin.core.module.dsl.factoryOf
import org.koin.core.module.dsl.singleOf

// Platform-specific module (will be provided by each platform)
expect fun platformModule(): Module

val dataModule = module {
    // API Client
    single {
        ApiClient(
            baseUrl = getProperty("API_BASE_URL", "http://10.0.2.2:8080/api/v1"),
            tokenProvider = { get<TokenStorage>().getToken() }
        )
    }
    
    // Repositories
    single<AuthRepository> { 
        AuthRepositoryImpl(
            apiClient = get(),
            tokenStorage = get()
        )
    }
    
    single<BiometricRepository> { 
        BiometricRepositoryImpl(
            apiClient = get()
        )
    }
}

val domainModule = module {
    // Use Cases
    factoryOf(::LoginUseCase)
    factoryOf(::RegisterUseCase)
    factoryOf(::EnrollFaceUseCase)
    factoryOf(::VerifyFaceUseCase)
}

val presentationModule = module {
    // ViewModels
    factory { LoginViewModel(get()) }
    factory { RegisterViewModel(get()) }
    factory { BiometricViewModel(get(), get()) }
}

// Combine all modules
fun appModules() = listOf(
    platformModule(),
    dataModule,
    domainModule,
    presentationModule
)
```

#### Task 1.2.3: Platform-Specific DI Modules

**Android**: `mobile-app/shared/src/androidMain/kotlin/com/fivucsas/mobile/di/PlatformModule.kt`
```kotlin
package com.fivucsas.mobile.di

import com.fivucsas.mobile.data.local.TokenStorage
import com.fivucsas.mobile.platform.AndroidTokenStorage
import org.koin.android.ext.koin.androidContext
import org.koin.dsl.module

actual fun platformModule() = module {
    single<TokenStorage> { AndroidTokenStorage(androidContext()) }
}
```

**Desktop**: `mobile-app/shared/src/desktopMain/kotlin/com/fivucsas/mobile/di/PlatformModule.kt`
```kotlin
package com.fivucsas.mobile.di

import com.fivucsas.mobile.data.local.TokenStorage
import com.fivucsas.mobile.platform.DesktopTokenStorage
import org.koin.dsl.module

actual fun platformModule() = module {
    single<TokenStorage> { DesktopTokenStorage() }
}
```

**iOS**: `mobile-app/shared/src/iosMain/kotlin/com/fivucsas/mobile/di/PlatformModule.kt`
```kotlin
package com.fivucsas.mobile.di

import com.fivucsas.mobile.data.local.TokenStorage
import com.fivucsas.mobile.platform.IosTokenStorage
import org.koin.dsl.module

actual fun platformModule() = module {
    single<TokenStorage> { IosTokenStorage() }
}
```

#### Task 1.2.4: Initialize Koin in Applications

**Android**: `mobile-app/androidApp/src/main/kotlin/com/fivucsas/mobile/android/MainActivity.kt`
```kotlin
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize Koin (once, in Application class is better)
        startKoin {
            androidContext(this@MainActivity)
            modules(appModules())
        }
        
        setContent {
            FIVUCSASTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    // Use Koin to get dependencies
                    val loginViewModel = koinInject<LoginViewModel>()
                    AppNavigation()
                }
            }
        }
    }
}
```

**Desktop**: `mobile-app/desktopApp/src/desktopMain/kotlin/com/fivucsas/desktop/Main.kt`
```kotlin
fun main() = application {
    // Initialize Koin
    startKoin {
        modules(appModules())
    }
    
    // ... rest of the code
}
```

---

### 1.3 Implement Error Mapper

#### Task 1.3.1: Create Error Mapper
**File**: `mobile-app/shared/src/commonMain/kotlin/com/fivucsas/mobile/data/error/ErrorMapper.kt`

```kotlin
package com.fivucsas.mobile.data.error

import com.fivucsas.mobile.domain.model.errors.AppError
import io.ktor.client.plugins.*
import io.ktor.client.statement.*
import kotlinx.serialization.json.Json

object ErrorMapper {
    
    suspend fun mapException(throwable: Throwable): AppError {
        return when (throwable) {
            is ClientRequestException -> mapHttpError(throwable)
            is ServerResponseException -> mapServerError(throwable)
            is RedirectResponseException -> AppError.NetworkError.Unknown
            is AppError -> throwable
            else -> AppError.Unknown(
                message = throwable.message ?: "Unknown error occurred",
                cause = throwable
            )
        }
    }
    
    private suspend fun mapHttpError(exception: ClientRequestException): AppError {
        val statusCode = exception.response.status.value
        
        return when (statusCode) {
            400 -> parseErrorBody(exception) ?: AppError.ValidationError.InvalidInput
            401 -> AppError.AuthError.InvalidCredentials
            403 -> AppError.AuthError.Unauthorized
            404 -> AppError.NetworkError.NotFound
            409 -> AppError.AuthError.UserAlreadyExists
            422 -> parseErrorBody(exception) ?: AppError.ValidationError.InvalidInput
            429 -> AppError.NetworkError.RateLimitExceeded
            else -> AppError.NetworkError.Unknown
        }
    }
    
    private suspend fun mapServerError(exception: ServerResponseException): AppError {
        return AppError.NetworkError.ServerError(
            code = exception.response.status.value,
            message = "Server error: ${exception.message}"
        )
    }
    
    private suspend fun parseErrorBody(exception: ClientRequestException): AppError? {
        return try {
            val errorBody = exception.response.bodyAsText()
            val json = Json { ignoreUnknownKeys = true }
            // Parse error response and create specific AppError
            // This depends on your backend error response format
            null
        } catch (e: Exception) {
            null
        }
    }
}
```

#### Task 1.3.2: Update Repository to Use Error Mapper
**File**: `mobile-app/shared/src/commonMain/kotlin/com/fivucsas/mobile/data/repository/AuthRepositoryImpl.kt`

```kotlin
class AuthRepositoryImpl(
    private val apiClient: ApiClient,
    private val tokenStorage: TokenStorage
) : AuthRepository {

    override suspend fun login(email: String, password: String): Result<Pair<User, AuthToken>> {
        return try {
            val response = apiClient.login(LoginRequest(email, password))
            
            tokenStorage.saveToken(response.accessToken)
            
            val user = User(
                id = response.user.id,
                email = response.user.email,
                firstName = response.user.firstName,
                lastName = response.user.lastName,
                isBiometricEnrolled = response.user.isBiometricEnrolled,
                createdAt = Instant.parse(response.user.createdAt)
            )
            
            val token = AuthToken(
                accessToken = response.accessToken,
                tokenType = response.tokenType
            )
            
            Result.success(Pair(user, token))
        } catch (e: Exception) {
            // Use Error Mapper
            val appError = ErrorMapper.mapException(e)
            Result.failure(appError)
        }
    }
    
    // Apply same pattern to other methods...
}
```

---

### 1.4 Enhance Security

#### Task 1.4.1: Implement Encrypted Storage for Android
**File**: `mobile-app/androidApp/build.gradle.kts`

Add dependency:
```kotlin
dependencies {
    // ... existing dependencies
    implementation("androidx.security:security-crypto:1.1.0-alpha06")
}
```

**File**: `mobile-app/shared/src/androidMain/kotlin/com/fivucsas/mobile/platform/AndroidTokenStorage.kt`

```kotlin
package com.fivucsas.mobile.platform

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.fivucsas.mobile.data.local.TokenStorage

class AndroidTokenStorage(private val context: Context) : TokenStorage {
    
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()
    
    private val encryptedPrefs = EncryptedSharedPreferences.create(
        context,
        PREFS_NAME,
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
    
    override fun saveToken(token: String) {
        encryptedPrefs.edit()
            .putString(TOKEN_KEY, token)
            .apply()
    }
    
    override fun getToken(): String? {
        return encryptedPrefs.getString(TOKEN_KEY, null)
    }
    
    override fun clearToken() {
        encryptedPrefs.edit()
            .remove(TOKEN_KEY)
            .apply()
    }
    
    companion object {
        private const val PREFS_NAME = "fivucsas_secure_prefs"
        private const val TOKEN_KEY = "auth_token"
    }
}
```

---

## Phase 2: BIOMETRIC FEATURES (Week 2)

### 2.1 Implement Liveness Detection Algorithm

#### Task 2.1.1: Add MediaPipe Dependency
**File**: `mobile-app/androidApp/build.gradle.kts`

```kotlin
dependencies {
    // ... existing dependencies
    
    // Google MediaPipe for facial landmarks
    implementation("com.google.mediapipe:tasks-vision:0.10.9")
}
```

#### Task 2.1.2: Create Biometric Domain Models
**File**: `mobile-app/shared/src/commonMain/kotlin/com/fivucsas/mobile/domain/model/biometric/LivenessModels.kt`

```kotlin
package com.fivucsas.mobile.domain.model.biometric

data class BiometricPuzzle(
    val challengeId: String,
    val actions: List<PuzzleAction>,
    val timeoutSeconds: Int = 30
)

enum class PuzzleAction {
    SMILE,
    BLINK,
    TURN_LEFT,
    TURN_RIGHT,
    LOOK_UP,
    LOOK_DOWN,
    OPEN_MOUTH
}

data class FacialLandmarks(
    val points: List<LandmarkPoint>,
    val timestamp: Long
)

data class LandmarkPoint(
    val x: Float,
    val y: Float,
    val z: Float,
    val visibility: Float
)

data class LivenessResult(
    val isLive: Boolean,
    val confidence: Float,
    val completedActions: List<PuzzleAction>,
    val failedAction: PuzzleAction? = null
)

data class ActionMetrics(
    val eyeAspectRatio: Float,      // EAR
    val mouthAspectRatio: Float,    // MAR
    val headPose: HeadPose
)

data class HeadPose(
    val yaw: Float,    // Left-right rotation
    val pitch: Float,  // Up-down rotation
    val roll: Float    // Tilt
)
```

#### Task 2.1.3: Implement Action Detection Algorithms
**File**: `mobile-app/shared/src/commonMain/kotlin/com/fivucsas/mobile/domain/biometric/ActionDetector.kt`

```kotlin
package com.fivucsas.mobile.domain.biometric

import com.fivucsas.mobile.domain.model.biometric.*
import kotlin.math.pow
import kotlin.math.sqrt

object ActionDetector {
    
    // Eye Aspect Ratio thresholds
    private const val EAR_BLINK_THRESHOLD = 0.21
    private const val EAR_OPEN_THRESHOLD = 0.25
    
    // Mouth Aspect Ratio thresholds
    private const val MAR_SMILE_THRESHOLD = 0.3
    private const val MAR_OPEN_MOUTH_THRESHOLD = 0.5
    
    // Head pose thresholds (degrees)
    private const val HEAD_TURN_THRESHOLD = 15.0
    private const val HEAD_LOOK_THRESHOLD = 10.0
    
    fun calculateEAR(landmarks: FacialLandmarks, eye: Eye): Float {
        val points = when (eye) {
            Eye.LEFT -> listOf(33, 160, 158, 133, 153, 144) // MediaPipe left eye indices
            Eye.RIGHT -> listOf(362, 385, 387, 263, 373, 380) // MediaPipe right eye indices
        }
        
        val landmarkPoints = points.map { landmarks.points[it] }
        
        // Vertical distances
        val vertical1 = distance(landmarkPoints[1], landmarkPoints[5])
        val vertical2 = distance(landmarkPoints[2], landmarkPoints[4])
        
        // Horizontal distance
        val horizontal = distance(landmarkPoints[0], landmarkPoints[3])
        
        // EAR formula
        return (vertical1 + vertical2) / (2.0f * horizontal)
    }
    
    fun calculateMAR(landmarks: FacialLandmarks): Float {
        // Mouth landmark indices (MediaPipe)
        val upperLip = landmarks.points[13]
        val lowerLip = landmarks.points[14]
        val leftCorner = landmarks.points[78]
        val rightCorner = landmarks.points[308]
        
        val verticalDistance = distance(upperLip, lowerLip)
        val horizontalDistance = distance(leftCorner, rightCorner)
        
        return verticalDistance / horizontalDistance
    }
    
    fun calculateHeadPose(landmarks: FacialLandmarks): HeadPose {
        // Simplified head pose estimation using key facial points
        val noseTip = landmarks.points[1]
        val leftEye = landmarks.points[33]
        val rightEye = landmarks.points[263]
        val leftMouth = landmarks.points[61]
        val rightMouth = landmarks.points[291]
        
        // Calculate yaw (left-right rotation)
        val eyeCenter = midpoint(leftEye, rightEye)
        val mouthCenter = midpoint(leftMouth, rightMouth)
        val yaw = calculateYaw(noseTip, eyeCenter, mouthCenter)
        
        // Calculate pitch (up-down rotation)
        val pitch = calculatePitch(noseTip, eyeCenter)
        
        // Calculate roll (tilt)
        val roll = calculateRoll(leftEye, rightEye)
        
        return HeadPose(yaw, pitch, roll)
    }
    
    fun detectAction(
        action: PuzzleAction,
        landmarks: FacialLandmarks,
        previousLandmarks: FacialLandmarks? = null
    ): Boolean {
        return when (action) {
            PuzzleAction.BLINK -> detectBlink(landmarks, previousLandmarks)
            PuzzleAction.SMILE -> detectSmile(landmarks)
            PuzzleAction.OPEN_MOUTH -> detectOpenMouth(landmarks)
            PuzzleAction.TURN_LEFT -> detectHeadTurn(landmarks, isLeft = true)
            PuzzleAction.TURN_RIGHT -> detectHeadTurn(landmarks, isLeft = false)
            PuzzleAction.LOOK_UP -> detectVerticalLook(landmarks, isUp = true)
            PuzzleAction.LOOK_DOWN -> detectVerticalLook(landmarks, isUp = false)
        }
    }
    
    private fun detectBlink(current: FacialLandmarks, previous: FacialLandmarks?): Boolean {
        val earLeft = calculateEAR(current, Eye.LEFT)
        val earRight = calculateEAR(current, Eye.RIGHT)
        val avgEAR = (earLeft + earRight) / 2.0f
        
        if (previous == null) return false
        
        val prevEarLeft = calculateEAR(previous, Eye.LEFT)
        val prevEarRight = calculateEAR(previous, Eye.RIGHT)
        val prevAvgEAR = (prevEarLeft + prevEarRight) / 2.0f
        
        // Blink detected: EAR drops below threshold then recovers
        return prevAvgEAR > EAR_OPEN_THRESHOLD && avgEAR < EAR_BLINK_THRESHOLD
    }
    
    private fun detectSmile(landmarks: FacialLandmarks): Boolean {
        val mar = calculateMAR(landmarks)
        return mar > MAR_SMILE_THRESHOLD
    }
    
    private fun detectOpenMouth(landmarks: FacialLandmarks): Boolean {
        val mar = calculateMAR(landmarks)
        return mar > MAR_OPEN_MOUTH_THRESHOLD
    }
    
    private fun detectHeadTurn(landmarks: FacialLandmarks, isLeft: Boolean): Boolean {
        val headPose = calculateHeadPose(landmarks)
        return if (isLeft) {
            headPose.yaw < -HEAD_TURN_THRESHOLD
        } else {
            headPose.yaw > HEAD_TURN_THRESHOLD
        }
    }
    
    private fun detectVerticalLook(landmarks: FacialLandmarks, isUp: Boolean): Boolean {
        val headPose = calculateHeadPose(landmarks)
        return if (isUp) {
            headPose.pitch < -HEAD_LOOK_THRESHOLD
        } else {
            headPose.pitch > HEAD_LOOK_THRESHOLD
        }
    }
    
    // Helper functions
    private fun distance(p1: LandmarkPoint, p2: LandmarkPoint): Float {
        val dx = p1.x - p2.x
        val dy = p1.y - p2.y
        val dz = p1.z - p2.z
        return sqrt(dx.pow(2) + dy.pow(2) + dz.pow(2))
    }
    
    private fun midpoint(p1: LandmarkPoint, p2: LandmarkPoint): LandmarkPoint {
        return LandmarkPoint(
            x = (p1.x + p2.x) / 2,
            y = (p1.y + p2.y) / 2,
            z = (p1.z + p2.z) / 2,
            visibility = (p1.visibility + p2.visibility) / 2
        )
    }
    
    private fun calculateYaw(nose: LandmarkPoint, eyeCenter: LandmarkPoint, mouthCenter: LandmarkPoint): Float {
        // Simplified yaw calculation
        // In production, use proper 3D geometry or PnP algorithm
        return (nose.x - eyeCenter.x) * 45 // Approximate conversion to degrees
    }
    
    private fun calculatePitch(nose: LandmarkPoint, eyeCenter: LandmarkPoint): Float {
        return (nose.y - eyeCenter.y) * 45
    }
    
    private fun calculateRoll(leftEye: LandmarkPoint, rightEye: LandmarkPoint): Float {
        val dy = rightEye.y - leftEye.y
        val dx = rightEye.x - leftEye.x
        return kotlin.math.atan2(dy, dx) * (180 / kotlin.math.PI).toFloat()
    }
    
    enum class Eye {
        LEFT, RIGHT
    }
}
```

---

### 2.2 Implement Camera Integration (Android)

#### Task 2.2.1: Create Camera Manager
**File**: `mobile-app/androidApp/src/main/kotlin/com/fivucsas/mobile/android/camera/CameraManager.kt`

```kotlin
package com.fivucsas.mobile.android.camera

import android.content.Context
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.core.content.ContextCompat
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class CameraManager(private val context: Context) {
    
    private var imageAnalyzer: ImageAnalysis? = null
    private val cameraExecutor: ExecutorService = Executors.newSingleThreadExecutor()
    
    fun startCamera(
        previewView: PreviewView,
        onImageAnalyzed: (ImageProxy) -> Unit
    ) {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()
            
            val preview = Preview.Builder()
                .build()
                .also {
                    it.setSurfaceProvider(previewView.surfaceProvider)
                }
            
            imageAnalyzer = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()
                .also {
                    it.setAnalyzer(cameraExecutor, { image ->
                        onImageAnalyzed(image)
                        image.close()
                    })
                }
            
            val cameraSelector = CameraSelector.DEFAULT_FRONT_CAMERA
            
            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(
                    context as androidx.lifecycle.LifecycleOwner,
                    cameraSelector,
                    preview,
                    imageAnalyzer
                )
            } catch (e: Exception) {
                // Handle error
            }
        }, ContextCompat.getMainExecutor(context))
    }
    
    fun shutdown() {
        cameraExecutor.shutdown()
    }
}
```

---

## Summary of Implementation Priority

### Week 1: Foundation
1. ✅ Fix build issues (DONE)
2. ⏳ Implement platform-specific TokenStorage (Desktop, iOS)
3. ⏳ Add Koin DI framework
4. ⏳ Implement Error Mapper
5. ⏳ Add encrypted storage (Android)

### Week 2: Biometric Features
6. ⏳ Integrate MediaPipe
7. ⏳ Implement Action Detector algorithms
8. ⏳ Add camera integration (Android)
9. ⏳ Create Liveness Detection UI

### Week 3: Backend Integration
10. ⏳ Verify backend APIs
11. ⏳ Test end-to-end flows
12. ⏳ Handle network errors
13. ⏳ Add offline support

### Week 4: Testing & Polish
14. ⏳ Write unit tests
15. ⏳ Add integration tests
16. ⏳ Performance optimization
17. ⏳ UI polish

---

**Next Command to Execute:**
```bash
# After implementing the above changes, rebuild:
cd mobile-app
./gradlew.bat clean build
./gradlew.bat :desktopApp:run
```

---

*This document will be updated as implementation progresses.*
