# Kotlin Multiplatform (KMP) + Compose Multiplatform Guide
## FIVUCSAS Mobile & Desktop Application

This guide covers migrating from Flutter to **Kotlin Multiplatform (KMP)** with **Compose Multiplatform** for cross-platform development.

---

## 📋 Table of Contents

1. [Why Kotlin Multiplatform?](#1-why-kotlin-multiplatform)
2. [Architecture Overview](#2-architecture-overview)
3. [Setup & Installation](#3-setup--installation)
4. [Project Structure](#4-project-structure)
5. [Shared Module Implementation](#5-shared-module-implementation)
6. [Android App](#6-android-app)
7. [iOS App](#7-ios-app)
8. [Desktop App](#8-desktop-app)
9. [Networking & API](#9-networking--api)
10. [Biometric Integration](#10-biometric-integration)
11. [Testing](#11-testing)
12. [Build & Deploy](#12-build--deploy)

---

## 1. Why Kotlin Multiplatform?

### ✅ Advantages for FIVUCSAS:

1. **Same Language as Backend** (Java/Kotlin ecosystem)
2. **True Native Performance** (No bridge/VM overhead)
3. **Direct Native API Access** (Camera, ML Kit, Biometrics)
4. **Better Type Safety** (Kotlin vs Dart)
5. **Compose Multiplatform** (Modern declarative UI)
6. **Desktop First-Class** (JVM-based, not experimental)
7. **Gradual Migration** (Can start with shared business logic)
8. **Corporate Backing** (JetBrains + Google)

### 📊 Code Sharing Strategy:

```
┌─────────────────────────────────────────────────┐
│           FIVUCSAS KMP Project                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌───────────────────────────────────────┐     │
│  │     Shared Module (95% code)          │     │
│  │  - Business Logic                     │     │
│  │  - Data Models                        │     │
│  │  - Networking (Ktor)                  │     │
│  │  - ViewModels                         │     │
│  │  - Use Cases                          │     │
│  │  - Repositories                       │     │
│  │  - Compose Multiplatform UI (optional)│     │
│  └───────────────────────────────────────┘     │
│           │          │          │               │
│           ▼          ▼          ▼               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ Android │  │   iOS   │  │ Desktop │        │
│  │  (5%)   │  │  (5%)   │  │  (5%)   │        │
│  └─────────┘  └─────────┘  └─────────┘        │
└─────────────────────────────────────────────────┘
```

---

## 2. Architecture Overview

### Clean Architecture with KMP:

```
shared/
├── commonMain/           # Shared code (all platforms)
│   ├── domain/          # Business Logic (Pure Kotlin)
│   │   ├── entities/
│   │   ├── repositories/
│   │   └── usecases/
│   ├── data/            # Data Layer
│   │   ├── models/
│   │   ├── repositories/
│   │   └── datasources/
│   ├── presentation/    # ViewModels + UI
│   │   ├── viewmodels/
│   │   └── compose/     # Compose Multiplatform UI
│   └── di/              # Dependency Injection (Koin)
│
├── androidMain/         # Android-specific
│   ├── platform/        # Platform implementations
│   └── android/         # Android utilities
│
├── iosMain/             # iOS-specific
│   └── platform/        # Platform implementations
│
└── desktopMain/         # Desktop-specific
    └── platform/        # Platform implementations
```

---

## 3. Setup & Installation

### 3.1 Prerequisites

**Required Tools:**
```powershell
# Install Kotlin via IntelliJ IDEA or Android Studio
# Android Studio: https://developer.android.com/studio

# Install Xcode (macOS only for iOS)
xcode-select --install

# Install CocoaPods (macOS for iOS)
sudo gem install cocoapods

# Install JDK 21
# Download from: https://adoptium.net/
```

### 3.2 IDE Setup

**Option 1: IntelliJ IDEA Ultimate (Recommended)**
- Download from: https://www.jetbrains.com/idea/download/
- Install Kotlin Multiplatform plugin
- Install Compose Multiplatform plugin

**Option 2: Android Studio**
- Download latest Canary/Beta
- Install KMP plugin
- Install Compose Multiplatform plugin

**Option 3: Fleet (New IDE)**
- Download from: https://www.jetbrains.com/fleet/
- Built-in KMP support

---

## 4. Project Structure

### 4.1 Create KMP Project

```bash
# Navigate to FIVUCSAS directory
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS

# Option 1: Use IntelliJ IDEA
# File -> New -> Project -> Kotlin Multiplatform
# Select: Mobile + Desktop targets

# Option 2: Use Kotlin Multiplatform Wizard
# Visit: https://kmp.jetbrains.com/
# Configure and download template
```

### 4.2 Gradle Configuration

**Root `build.gradle.kts`:**

```kotlin
plugins {
    kotlin("multiplatform") version "1.9.20" apply false
    kotlin("plugin.serialization") version "1.9.20" apply false
    id("com.android.application") version "8.1.4" apply false
    id("com.android.library") version "8.1.4" apply false
    id("org.jetbrains.compose") version "1.5.10" apply false
}

allprojects {
    repositories {
        google()
        mavenCentral()
        maven("https://maven.pkg.jetbrains.space/public/p/compose/dev")
    }
}
```

**`shared/build.gradle.kts`:**

```kotlin
plugins {
    kotlin("multiplatform")
    kotlin("plugin.serialization")
    id("com.android.library")
    id("org.jetbrains.compose")
}

kotlin {
    // Targets
    androidTarget()
    
    jvm("desktop") {
        jvmToolchain(21)
    }
    
    listOf(
        iosX64(),
        iosArm64(),
        iosSimulatorArm64()
    ).forEach { iosTarget ->
        iosTarget.binaries.framework {
            baseName = "shared"
            isStatic = true
        }
    }

    sourceSets {
        val commonMain by getting {
            dependencies {
                // Compose Multiplatform
                implementation(compose.runtime)
                implementation(compose.foundation)
                implementation(compose.material3)
                implementation(compose.components.resources)
                
                // Kotlin Coroutines
                implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")
                
                // Ktor (Networking)
                implementation("io.ktor:ktor-client-core:2.3.5")
                implementation("io.ktor:ktor-client-content-negotiation:2.3.5")
                implementation("io.ktor:ktor-serialization-kotlinx-json:2.3.5")
                implementation("io.ktor:ktor-client-auth:2.3.5")
                implementation("io.ktor:ktor-client-logging:2.3.5")
                
                // Kotlinx Serialization
                implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.0")
                
                // DateTime
                implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.4.1")
                
                // Dependency Injection (Koin)
                implementation("io.insert-koin:koin-core:3.5.0")
                
                // Settings (SharedPreferences)
                implementation("com.russhwolf:multiplatform-settings:1.1.0")
                
                // ViewModel
                implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.6.2")
            }
        }
        
        val androidMain by getting {
            dependencies {
                implementation("io.ktor:ktor-client-okhttp:2.3.5")
                implementation("androidx.security:security-crypto:1.1.0-alpha06")
                
                // CameraX
                implementation("androidx.camera:camera-core:1.3.0")
                implementation("androidx.camera:camera-camera2:1.3.0")
                implementation("androidx.camera:camera-lifecycle:1.3.0")
                implementation("androidx.camera:camera-view:1.3.0")
                
                // ML Kit Face Detection
                implementation("com.google.mlkit:face-detection:16.1.5")
                
                // Biometric
                implementation("androidx.biometric:biometric:1.2.0-alpha05")
            }
        }
        
        val iosMain by creating {
            dependsOn(commonMain)
            dependencies {
                implementation("io.ktor:ktor-client-darwin:2.3.5")
            }
        }
        
        val desktopMain by getting {
            dependencies {
                implementation(compose.desktop.currentOs)
                implementation("io.ktor:ktor-client-cio:2.3.5")
            }
        }
        
        val commonTest by getting {
            dependencies {
                implementation(kotlin("test"))
                implementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.3")
                implementation("io.insert-koin:koin-test:3.5.0")
            }
        }
    }
}

android {
    namespace = "com.fivucsas.mobile"
    compileSdk = 34
    
    defaultConfig {
        minSdk = 24
    }
    
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_21
        targetCompatibility = JavaVersion.VERSION_21
    }
}
```

---

## 5. Shared Module Implementation

### 5.1 Domain Layer - Entities

**`shared/src/commonMain/kotlin/domain/entities/User.kt`:**

```kotlin
package com.fivucsas.mobile.domain.entities

import kotlinx.datetime.Instant

data class User(
    val id: String,
    val email: String,
    val firstName: String,
    val lastName: String,
    val phoneNumber: String?,
    val isBiometricEnrolled: Boolean,
    val createdAt: Instant
) {
    val fullName: String
        get() = "$firstName $lastName"
}
```

### 5.2 Domain Layer - Repository Interfaces

**`shared/src/commonMain/kotlin/domain/repositories/AuthRepository.kt`:**

```kotlin
package com.fivucsas.mobile.domain.repositories

import com.fivucsas.mobile.domain.entities.User

interface AuthRepository {
    suspend fun login(email: String, password: String): Result<User>
    suspend fun register(
        email: String,
        password: String,
        firstName: String,
        lastName: String,
        phoneNumber: String? = null
    ): Result<User>
    suspend fun logout(): Result<Unit>
    suspend fun getCurrentUser(): Result<User>
    suspend fun isLoggedIn(): Boolean
}
```

### 5.3 Domain Layer - Use Cases

**`shared/src/commonMain/kotlin/domain/usecases/LoginUseCase.kt`:**

```kotlin
package com.fivucsas.mobile.domain.usecases

import com.fivucsas.mobile.domain.entities.User
import com.fivucsas.mobile.domain.repositories.AuthRepository

class LoginUseCase(
    private val authRepository: AuthRepository
) {
    suspend operator fun invoke(email: String, password: String): Result<User> {
        return authRepository.login(email, password)
    }
}
```

### 5.4 Data Layer - Models

**`shared/src/commonMain/kotlin/data/models/UserDto.kt`:**

```kotlin
package com.fivucsas.mobile.data.models

import com.fivucsas.mobile.domain.entities.User
import kotlinx.datetime.Instant
import kotlinx.serialization.Serializable

@Serializable
data class UserDto(
    val id: String,
    val email: String,
    val firstName: String,
    val lastName: String,
    val phoneNumber: String? = null,
    val isBiometricEnrolled: Boolean,
    val createdAt: String
) {
    fun toDomain(): User = User(
        id = id,
        email = email,
        firstName = firstName,
        lastName = lastName,
        phoneNumber = phoneNumber,
        isBiometricEnrolled = isBiometricEnrolled,
        createdAt = Instant.parse(createdAt)
    )
}

@Serializable
data class LoginRequest(
    val email: String,
    val password: String
)

@Serializable
data class LoginResponse(
    val accessToken: String,
    val refreshToken: String,
    val user: UserDto
)

@Serializable
data class RegisterRequest(
    val email: String,
    val password: String,
    val firstName: String,
    val lastName: String,
    val phoneNumber: String? = null
)
```

### 5.5 Data Layer - API Client

**`shared/src/commonMain/kotlin/data/network/ApiClient.kt`:**

```kotlin
package com.fivucsas.mobile.data.network

import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.plugins.*
import io.ktor.client.plugins.auth.*
import io.ktor.client.plugins.auth.providers.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.plugins.logging.*
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.json.Json

class ApiClient(
    private val baseUrl: String = "http://10.0.2.2:8080/api/v1",
    private val tokenStorage: TokenStorage
) {
    private val client = HttpClient {
        install(ContentNegotiation) {
            json(Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
            })
        }
        
        install(Logging) {
            logger = Logger.DEFAULT
            level = LogLevel.ALL
        }
        
        install(Auth) {
            bearer {
                loadTokens {
                    tokenStorage.getTokens()?.let {
                        BearerTokens(
                            accessToken = it.accessToken,
                            refreshToken = it.refreshToken
                        )
                    }
                }
                
                refreshTokens {
                    val refreshToken = tokenStorage.getTokens()?.refreshToken
                    if (refreshToken != null) {
                        val response: LoginResponse = client.post("$baseUrl/auth/refresh") {
                            contentType(ContentType.Application.Json)
                            setBody(mapOf("refreshToken" to refreshToken))
                        }.body()
                        
                        tokenStorage.saveTokens(
                            TokenPair(
                                response.accessToken,
                                response.refreshToken
                            )
                        )
                        
                        BearerTokens(
                            accessToken = response.accessToken,
                            refreshToken = response.refreshToken
                        )
                    } else {
                        null
                    }
                }
            }
        }
        
        defaultRequest {
            url(baseUrl)
            contentType(ContentType.Application.Json)
        }
    }
    
    suspend inline fun <reified T> get(
        path: String,
        block: HttpRequestBuilder.() -> Unit = {}
    ): T {
        return client.get(path, block).body()
    }
    
    suspend inline fun <reified T> post(
        path: String,
        body: Any? = null,
        block: HttpRequestBuilder.() -> Unit = {}
    ): T {
        return client.post(path) {
            if (body != null) setBody(body)
            block()
        }.body()
    }
    
    suspend inline fun <reified T> put(
        path: String,
        body: Any? = null,
        block: HttpRequestBuilder.() -> Unit = {}
    ): T {
        return client.put(path) {
            if (body != null) setBody(body)
            block()
        }.body()
    }
    
    fun close() {
        client.close()
    }
}
```

### 5.6 Data Layer - Repository Implementation

**`shared/src/commonMain/kotlin/data/repositories/AuthRepositoryImpl.kt`:**

```kotlin
package com.fivucsas.mobile.data.repositories

import com.fivucsas.mobile.data.models.LoginRequest
import com.fivucsas.mobile.data.models.LoginResponse
import com.fivucsas.mobile.data.models.RegisterRequest
import com.fivucsas.mobile.data.network.ApiClient
import com.fivucsas.mobile.data.network.TokenStorage
import com.fivucsas.mobile.domain.entities.User
import com.fivucsas.mobile.domain.repositories.AuthRepository

class AuthRepositoryImpl(
    private val apiClient: ApiClient,
    private val tokenStorage: TokenStorage
) : AuthRepository {
    
    override suspend fun login(email: String, password: String): Result<User> {
        return try {
            val response: LoginResponse = apiClient.post(
                "/auth/login",
                LoginRequest(email, password)
            )
            
            tokenStorage.saveTokens(
                TokenPair(response.accessToken, response.refreshToken)
            )
            
            Result.success(response.user.toDomain())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun register(
        email: String,
        password: String,
        firstName: String,
        lastName: String,
        phoneNumber: String?
    ): Result<User> {
        return try {
            val response: UserDto = apiClient.post(
                "/auth/register",
                RegisterRequest(email, password, firstName, lastName, phoneNumber)
            )
            Result.success(response.toDomain())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun logout(): Result<Unit> {
        return try {
            apiClient.post<Unit>("/auth/logout")
            tokenStorage.clearTokens()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun getCurrentUser(): Result<User> {
        return try {
            val user: UserDto = apiClient.get("/users/me")
            Result.success(user.toDomain())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun isLoggedIn(): Boolean {
        return tokenStorage.getTokens() != null
    }
}
```

### 5.7 Presentation Layer - ViewModel

**`shared/src/commonMain/kotlin/presentation/viewmodels/AuthViewModel.kt`:**

```kotlin
package com.fivucsas.mobile.presentation.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fivucsas.mobile.domain.entities.User
import com.fivucsas.mobile.domain.usecases.LoginUseCase
import com.fivucsas.mobile.domain.usecases.LogoutUseCase
import com.fivucsas.mobile.domain.usecases.RegisterUseCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class AuthState {
    object Initial : AuthState()
    object Loading : AuthState()
    data class Authenticated(val user: User) : AuthState()
    data class Error(val message: String) : AuthState()
}

class AuthViewModel(
    private val loginUseCase: LoginUseCase,
    private val registerUseCase: RegisterUseCase,
    private val logoutUseCase: LogoutUseCase
) : ViewModel() {
    
    private val _state = MutableStateFlow<AuthState>(AuthState.Initial)
    val state: StateFlow<AuthState> = _state.asStateFlow()
    
    fun login(email: String, password: String) {
        viewModelScope.launch {
            _state.value = AuthState.Loading
            
            loginUseCase(email, password)
                .onSuccess { user ->
                    _state.value = AuthState.Authenticated(user)
                }
                .onFailure { error ->
                    _state.value = AuthState.Error(
                        error.message ?: "Login failed"
                    )
                }
        }
    }
    
    fun register(
        email: String,
        password: String,
        firstName: String,
        lastName: String,
        phoneNumber: String? = null
    ) {
        viewModelScope.launch {
            _state.value = AuthState.Loading
            
            registerUseCase(email, password, firstName, lastName, phoneNumber)
                .onSuccess { user ->
                    _state.value = AuthState.Authenticated(user)
                }
                .onFailure { error ->
                    _state.value = AuthState.Error(
                        error.message ?: "Registration failed"
                    )
                }
        }
    }
    
    fun logout() {
        viewModelScope.launch {
            logoutUseCase()
            _state.value = AuthState.Initial
        }
    }
}
```

### 5.8 Dependency Injection

**`shared/src/commonMain/kotlin/di/AppModule.kt`:**

```kotlin
package com.fivucsas.mobile.di

import com.fivucsas.mobile.data.network.ApiClient
import com.fivucsas.mobile.data.repositories.AuthRepositoryImpl
import com.fivucsas.mobile.domain.repositories.AuthRepository
import com.fivucsas.mobile.domain.usecases.LoginUseCase
import com.fivucsas.mobile.domain.usecases.LogoutUseCase
import com.fivucsas.mobile.domain.usecases.RegisterUseCase
import com.fivucsas.mobile.presentation.viewmodels.AuthViewModel
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val appModule = module {
    // Network
    single { ApiClient(tokenStorage = get()) }
    
    // Repositories
    single<AuthRepository> { AuthRepositoryImpl(get(), get()) }
    
    // Use Cases
    single { LoginUseCase(get()) }
    single { RegisterUseCase(get()) }
    single { LogoutUseCase(get()) }
    
    // ViewModels
    viewModel { AuthViewModel(get(), get(), get()) }
}

// Platform-specific modules defined in each platform
expect val platformModule: org.koin.core.module.Module
```

---

## 6. Android App

### 6.1 Android Module Setup

**`androidApp/build.gradle.kts`:**

```kotlin
plugins {
    kotlin("android")
    id("com.android.application")
    id("org.jetbrains.compose")
}

android {
    namespace = "com.fivucsas.mobile.android"
    compileSdk = 34
    
    defaultConfig {
        applicationId = "com.fivucsas.mobile"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
    }
    
    buildFeatures {
        compose = true
    }
    
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.3"
    }
}

dependencies {
    implementation(project(":shared"))
    implementation("androidx.activity:activity-compose:1.8.0")
    implementation("io.insert-koin:koin-android:3.5.0")
    implementation("io.insert-koin:koin-androidx-compose:3.5.0")
}
```

### 6.2 Android MainActivity

**`androidApp/src/main/kotlin/MainActivity.kt`:**

```kotlin
package com.fivucsas.mobile.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.fivucsas.mobile.presentation.compose.App
import org.koin.android.ext.koin.androidContext
import org.koin.core.context.startKoin

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        startKoin {
            androidContext(this@MainActivity)
            modules(appModule, platformModule)
        }
        
        setContent {
            MaterialTheme {
                App()
            }
        }
    }
}
```

---

## 7. iOS App

### 7.1 iOS Integration

**`iosApp/iosApp.swift`:**

```swift
import SwiftUI
import shared

@main
struct iOSApp: App {
    init() {
        KoinKt.doInitKoin()
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
```

---

## 8. Desktop App

### 8.1 Desktop Application

**`desktopApp/src/jvmMain/kotlin/Main.kt`:**

```kotlin
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import com.fivucsas.mobile.presentation.compose.App
import org.koin.core.context.startKoin

fun main() = application {
    startKoin {
        modules(appModule, platformModule)
    }
    
    Window(
        onCloseRequest = ::exitApplication,
        title = "FIVUCSAS"
    ) {
        App()
    }
}
```

---

## 9. Networking & API

All networking is handled in the shared module using **Ktor Client** (see Section 5.5).

Platform-specific HTTP engines:
- **Android**: OkHttp
- **iOS**: Darwin (NSURLSession)
- **Desktop**: CIO (Coroutine-based IO)

---

## 10. Biometric Integration

### 10.1 Expect/Actual Pattern

**`shared/src/commonMain/kotlin/platform/BiometricService.kt`:**

```kotlin
expect class BiometricService {
    suspend fun authenticate(): Result<Boolean>
    fun isAvailable(): Boolean
}
```

**`shared/src/androidMain/kotlin/platform/BiometricService.android.kt`:**

```kotlin
actual class BiometricService(private val context: Context) {
    actual suspend fun authenticate(): Result<Boolean> {
        // Use androidx.biometric
        return suspendCoroutine { continuation ->
            val executor = ContextCompat.getMainExecutor(context)
            val biometricPrompt = BiometricPrompt(
                context as FragmentActivity,
                executor,
                object : BiometricPrompt.AuthenticationCallback() {
                    override fun onAuthenticationSucceeded(
                        result: BiometricPrompt.AuthenticationResult
                    ) {
                        continuation.resume(Result.success(true))
                    }
                    
                    override fun onAuthenticationError(
                        errorCode: Int,
                        errString: CharSequence
                    ) {
                        continuation.resume(
                            Result.failure(Exception(errString.toString()))
                        )
                    }
                }
            )
            
            val promptInfo = BiometricPrompt.PromptInfo.Builder()
                .setTitle("Biometric Authentication")
                .setSubtitle("Authenticate to continue")
                .setNegativeButtonText("Cancel")
                .build()
            
            biometricPrompt.authenticate(promptInfo)
        }
    }
    
    actual fun isAvailable(): Boolean {
        val biometricManager = BiometricManager.from(context)
        return biometricManager.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_STRONG
        ) == BiometricManager.BIOMETRIC_SUCCESS
    }
}
```

---

## 11. Testing

### 11.1 Common Tests

**`shared/src/commonTest/kotlin/domain/usecases/LoginUseCaseTest.kt`:**

```kotlin
class LoginUseCaseTest {
    private lateinit var authRepository: AuthRepository
    private lateinit var loginUseCase: LoginUseCase
    
    @BeforeTest
    fun setup() {
        authRepository = mockk()
        loginUseCase = LoginUseCase(authRepository)
    }
    
    @Test
    fun `login should return user when successful`() = runTest {
        // Arrange
        val email = "test@test.com"
        val password = "password"
        val user = User(/* ... */)
        
        coEvery { 
            authRepository.login(email, password) 
        } returns Result.success(user)
        
        // Act
        val result = loginUseCase(email, password)
        
        // Assert
        assertTrue(result.isSuccess)
        assertEquals(user, result.getOrNull())
    }
}
```

---

## 12. Build & Deploy

### Build Commands

```bash
# Build Android APK
./gradlew :androidApp:assembleRelease

# Build iOS (macOS only)
./gradlew :iosApp:linkReleaseFrameworkIosArm64

# Build Desktop JAR
./gradlew :desktopApp:packageDistributionForCurrentOS

# Run tests
./gradlew :shared:test

# Run on Android
./gradlew :androidApp:installDebug

# Run on Desktop
./gradlew :desktopApp:run
```

---

## Comparison: Flutter vs KMP

| Feature | Flutter | Kotlin Multiplatform |
|---------|---------|---------------------|
| **Setup Time** | 2-3 hours | 4-6 hours |
| **Learning Curve** | Medium | Easy (if know Kotlin) |
| **Performance** | Good | **Excellent (Native)** |
| **Backend Integration** | Different language | **Same ecosystem** |
| **Camera/ML Kit** | Via plugins | **Direct native** |
| **Code Sharing** | 95% | 90-95% |
| **Maturity** | Very mature | Rapidly maturing |
| **Corporate Use** | Good | **Growing fast** |

---

## Migration Strategy

### Phase 1: Setup (Week 1)
1. Create KMP project structure
2. Set up shared module with domain layer
3. Implement basic networking with Ktor

### Phase 2: Core Features (Week 2-3)
1. Implement authentication (shared)
2. Create Android app
3. Create Desktop app

### Phase 3: Advanced (Week 4-5)
1. Add biometric support
2. Implement camera integration
3. Add iOS support (if needed)

### Phase 4: Testing & Polish (Week 6)
1. Write tests
2. Performance optimization
3. Documentation

---

## Resources

- **Kotlin Multiplatform**: https://kotlinlang.org/docs/multiplatform.html
- **Compose Multiplatform**: https://www.jetbrains.com/lp/compose-multiplatform/
- **Ktor**: https://ktor.io/
- **Koin**: https://insert-koin.io/
- **KMP Wizard**: https://kmp.jetbrains.com/

---

**Ready to build native cross-platform apps with Kotlin!** 🚀
