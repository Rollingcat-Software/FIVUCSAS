# COMPLETE IMPLEMENTATION GUIDE - FIVUCSAS Mobile/Desktop Apps

## Quick Start

This document provides step-by-step instructions to fix all issues and implement all missing features.

---

## Part 1: IMMEDIATE FIXES (Already Done ✅)

### 1.1 Fix Kotlin Version Compatibility ✅
- Changed from Kotlin 1.9.21 to 1.9.20 (compatible with Compose 1.5.11)
- File: `mobile-app/build.gradle.kts`

### 1.2 Create Error Model ✅
- Created `AppError.kt` sealed class hierarchy
- File: `shared/src/commonMain/kotlin/com/fivucsas/mobile/domain/model/errors/AppError.kt`

### 1.3 Create TokenRepository Interface ✅
- Separated token concerns
- File: `shared/src/commonMain/kotlin/com/fivucsas/mobile/domain/repository/TokenRepository.kt`

---

## Part 2: REFACTORING EXISTING CODE (Next Steps)

### 2.1 Refactor AuthRepository (Remove token methods)

**File**: `shared/src/commonMain/kotlin/com/fivucsas/mobile/domain/repository/AuthRepository.kt`

```kotlin
package com.fivucsas.mobile.domain.repository

import com.fivucsas.mobile.domain.model.AuthToken
import com.fivucsas.mobile.domain.model.User
import com.fivucsas.mobile.domain.model.errors.AppError

interface AuthRepository {
    suspend fun register(
        email: String,
        password: String,
        firstName: String,
        lastName: String
    ): Result<Pair<User, AuthToken>>

    suspend fun login(email: String, password: String): Result<Pair<User, AuthToken>>

    suspend fun logout(): Result<Unit>
}
```

### 2.2 Implement TokenRepository

**File**: `shared/src/commonMain/kotlin/com/fivucsas/mobile/data/repository/TokenRepositoryImpl.kt`

```kotlin
package com.fivucsas.mobile.data.repository

import com.fivucsas.mobile.data.local.TokenStorage
import com.fivucsas.mobile.domain.repository.TokenRepository

class TokenRepositoryImpl(
    private val tokenStorage: TokenStorage
) : TokenRepository {
    
    override fun getToken(): String? = tokenStorage.getToken()
    
    override fun saveToken(token: String) = tokenStorage.saveToken(token)
    
    override fun clearToken() = tokenStorage.clearToken()
    
    override fun hasToken(): Boolean = tokenStorage.getToken() != null
}
```

### 2.3 Create DTO Mappers

**File**: `shared/src/commonMain/kotlin/com/fivucsas/mobile/data/remote/mapper/AuthMapper.kt`

```kotlin
package com.fivucsas.mobile.data.remote.mapper

import com.fivucsas.mobile.data.remote.AuthResponse
import com.fivucsas.mobile.domain.model.AuthToken
import com.fivucsas.mobile.domain.model.User
import kotlinx.datetime.Instant

object AuthMapper {
    
    fun mapToUser(dto: AuthResponse.UserDto): User {
        return User(
            id = dto.id,
            email = dto.email,
            firstName = dto.firstName,
            lastName = dto.lastName,
            isBiometricEnrolled = dto.isBiometricEnrolled,
            createdAt = Instant.parse(dto.createdAt)
        )
    }
    
    fun mapToAuthToken(dto: AuthResponse): AuthToken {
        return AuthToken(
            accessToken = dto.accessToken,
            tokenType = dto.tokenType
        )
    }
    
    fun mapResponse(dto: AuthResponse): Pair<User, AuthToken> {
        return Pair(mapToUser(dto.user), mapToAuthToken(dto))
    }
}
```

### 2.4 Split ApiClient into Specialized Clients

**File**: `shared/src/commonMain/kotlin/com/fivucsas/mobile/data/remote/factory/HttpClientFactory.kt`

```kotlin
package com.fivucsas.mobile.data.remote.factory

import io.ktor.client.*
import io.ktor.client.plugins.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.plugins.logging.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.json.Json

object HttpClientFactory {
    
    fun create(
        baseUrl: String,
        tokenProvider: () -> String? = { null },
        enableLogging: Boolean = true
    ): HttpClient {
        return HttpClient {
            install(ContentNegotiation) {
                json(Json {
                    ignoreUnknownKeys = true
                    isLenient = true
                    prettyPrint = true
                })
            }

            if (enableLogging) {
                install(Logging) {
                    logger = Logger.SIMPLE
                    level = LogLevel.ALL
                }
            }

            install(HttpTimeout) {
                requestTimeoutMillis = 30000
                connectTimeoutMillis = 30000
            }

            defaultRequest {
                url(baseUrl)
                contentType(ContentType.Application.Json)

                tokenProvider()?.let { token ->
                    headers {
                        append(HttpHeaders.Authorization, "Bearer $token")
                    }
                }
            }
        }
    }
}
```

**File**: `shared/src/commonMain/kotlin/com/fivucsas/mobile/data/remote/client/AuthApiClient.kt`

```kotlin
package com.fivucsas.mobile.data.remote.client

import com.fivucsas.mobile.data.remote.AuthResponse
import com.fivucsas.mobile.data.remote.LoginRequest
import com.fivucsas.mobile.data.remote.RegisterRequest
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.request.*

class AuthApiClient(private val httpClient: HttpClient) {
    
    suspend fun login(request: LoginRequest): AuthResponse {
        return httpClient.post("/auth/login") {
            setBody(request)
        }.body()
    }

    suspend fun register(request: RegisterRequest): AuthResponse {
        return httpClient.post("/auth/register") {
            setBody(request)
        }.body()
    }
}
```

**File**: `shared/src/commonMain/kotlin/com/fivucsas/mobile/data/remote/client/BiometricApiClient.kt`

```kotlin
package com.fivucsas.mobile.data.remote.client

import com.fivucsas.mobile.data.remote.BiometricVerificationResponse
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.request.forms.*
import io.ktor.http.*

class BiometricApiClient(private val httpClient: HttpClient) {
    
    suspend fun enrollFace(userId: String, imageBytes: ByteArray): BiometricVerificationResponse {
        return httpClient.submitFormWithBinaryData(
            url = "/biometric/enroll/$userId",
            formData = formData {
                append("image", imageBytes, Headers.build {
                    append(HttpHeaders.ContentType, "image/jpeg")
                    append(HttpHeaders.ContentDisposition, "filename=face.jpg")
                })
            }
        ).body()
    }

    suspend fun verifyFace(userId: String, imageBytes: ByteArray): BiometricVerificationResponse {
        return httpClient.submitFormWithBinaryData(
            url = "/biometric/verify/$userId",
            formData = formData {
                append("image", imageBytes, Headers.build {
                    append(HttpHeaders.ContentType, "image/jpeg")
                    append(HttpHeaders.ContentDisposition, "filename=face.jpg")
                })
            }
        ).body()
    }
}
```

### 2.5 Add Environment Configuration

**File**: `shared/src/commonMain/kotlin/com/fivucsas/mobile/util/config/EnvironmentConfig.kt`

```kotlin
package com.fivucsas.mobile.util.config

data class EnvironmentConfig(
    val apiBaseUrl: String,
    val enableLogging: Boolean,
    val requestTimeout: Long
) {
    companion object {
        fun development(): EnvironmentConfig {
            return EnvironmentConfig(
                apiBaseUrl = "http://10.0.2.2:8080/api/v1", // Android emulator
                enableLogging = true,
                requestTimeout = 30000
            )
        }
        
        fun staging(): EnvironmentConfig {
            return EnvironmentConfig(
                apiBaseUrl = "https://staging-api.fivucsas.com/api/v1",
                enableLogging = true,
                requestTimeout = 30000
            )
        }
        
        fun production(): EnvironmentConfig {
            return EnvironmentConfig(
                apiBaseUrl = "https://api.fivucsas.com/api/v1",
                enableLogging = false,
                requestTimeout = 30000
            )
        }
    }
}

// Platform-specific: get current environment
expect fun getCurrentEnvironment(): EnvironmentConfig
```

**File**: `shared/src/androidMain/kotlin/com/fivucsas/mobile/util/config/EnvironmentConfig.android.kt`

```kotlin
package com.fivucsas.mobile.util.config

actual fun getCurrentEnvironment(): EnvironmentConfig {
    // In production, read from BuildConfig
    return EnvironmentConfig.development()
}
```

**File**: `shared/src/desktopMain/kotlin/com/fivucsas/mobile/util/config/EnvironmentConfig.desktop.kt`

```kotlin
package com.fivucsas.mobile.util.config

actual fun getCurrentEnvironment(): EnvironmentConfig {
    val env = System.getProperty("APP_ENV") ?: "development"
    return when (env) {
        "production" -> EnvironmentConfig.production()
        "staging" -> EnvironmentConfig.staging()
        else -> EnvironmentConfig.development()
    }
}
```

---

## Part 3: DEPENDENCY INJECTION WITH KOIN

### 3.1 Add Koin Dependency

**File**: `shared/build.gradle.kts`

Add to commonMain dependencies:
```kotlin
// Koin for Dependency Injection
val koinVersion = "3.5.0"
implementation("io.insert-koin:koin-core:$koinVersion")
implementation("io.insert-koin:koin-test:$koinVersion")
```

Add to androidMain dependencies:
```kotlin
implementation("io.insert-koin:koin-android:3.5.0")
```

### 3.2 Create Koin Modules

**File**: `shared/src/commonMain/kotlin/com/fivucsas/mobile/di/NetworkModule.kt`

```kotlin
package com.fivucsas.mobile.di

import com.fivucsas.mobile.data.remote.client.AuthApiClient
import com.fivucsas.mobile.data.remote.client.BiometricApiClient
import com.fivucsas.mobile.data.remote.factory.HttpClientFactory
import com.fivucsas.mobile.domain.repository.TokenRepository
import com.fivucsas.mobile.util.config.getCurrentEnvironment
import org.koin.dsl.module

val networkModule = module {
    single {
        val config = getCurrentEnvironment()
        val tokenRepo: TokenRepository = get()
        
        HttpClientFactory.create(
            baseUrl = config.apiBaseUrl,
            tokenProvider = { tokenRepo.getToken() },
            enableLogging = config.enableLogging
        )
    }
    
    single { AuthApiClient(get()) }
    single { BiometricApiClient(get()) }
}
```

**File**: `shared/src/commonMain/kotlin/com/fivucsas/mobile/di/RepositoryModule.kt`

```kotlin
package com.fivucsas.mobile.di

import com.fivucsas.mobile.data.local.TokenStorage
import com.fivucsas.mobile.data.repository.AuthRepositoryImpl
import com.fivucsas.mobile.data.repository.BiometricRepositoryImpl
import com.fivucsas.mobile.data.repository.TokenRepositoryImpl
import com.fivucsas.mobile.domain.repository.AuthRepository
import com.fivucsas.mobile.domain.repository.BiometricRepository
import com.fivucsas.mobile.domain.repository.TokenRepository
import org.koin.dsl.module

val repositoryModule = module {
    single<TokenStorage> { TokenStorage() }
    single<TokenRepository> { TokenRepositoryImpl(get()) }
    single<AuthRepository> { AuthRepositoryImpl(get(), get()) }
    single<BiometricRepository> { BiometricRepositoryImpl(get()) }
}
```

**File**: `shared/src/commonMain/kotlin/com/fivucsas/mobile/di/UseCaseModule.kt`

```kotlin
package com.fivucsas.mobile.di

import com.fivucsas.mobile.domain.usecase.EnrollFaceUseCase
import com.fivucsas.mobile.domain.usecase.LoginUseCase
import com.fivucsas.mobile.domain.usecase.RegisterUseCase
import com.fivucsas.mobile.domain.usecase.VerifyFaceUseCase
import org.koin.dsl.module

val useCaseModule = module {
    factory { LoginUseCase(get()) }
    factory { RegisterUseCase(get()) }
    factory { EnrollFaceUseCase(get()) }
    factory { VerifyFaceUseCase(get()) }
}
```

**File**: `shared/src/commonMain/kotlin/com/fivucsas/mobile/di/ViewModelModule.kt`

```kotlin
package com.fivucsas.mobile.di

import com.fivucsas.mobile.presentation.biometric.BiometricViewModel
import com.fivucsas.mobile.presentation.login.LoginViewModel
import com.fivucsas.mobile.presentation.register.RegisterViewModel
import org.koin.dsl.module

val viewModelModule = module {
    factory { LoginViewModel(get()) }
    factory { RegisterViewModel(get()) }
    factory { BiometricViewModel(get(), get()) }
}
```

**File**: `shared/src/commonMain/kotlin/com/fivucsas/mobile/di/KoinInitializer.kt`

```kotlin
package com.fivucsas.mobile.di

import org.koin.core.context.startKoin
import org.koin.dsl.KoinAppDeclaration

fun initKoin(appDeclaration: KoinAppDeclaration = {}) {
    startKoin {
        appDeclaration()
        modules(
            networkModule,
            repositoryModule,
            useCaseModule,
            viewModelModule
        )
    }
}
```

---

## Part 4: HOW TO RUN THE APPS

### 4.1 Build the Project

```bash
cd mobile-app

# Clean build
./gradlew clean

# Build all
./gradlew build
```

### 4.2 Run Android App

**Option 1: Command Line**
```bash
./gradlew :androidApp:installDebug
# Then run on device/emulator
```

**Option 2: Android Studio**
1. Open `mobile-app` folder in Android Studio
2. Wait for Gradle sync
3. Select `androidApp` configuration
4. Click Run ▶️

**Requirements:**
- Android SDK 24+ (Android 7.0+)
- Android Studio Hedgehog or later
- Physical device or emulator

### 4.3 Run Desktop App

**Option 1: Command Line**
```bash
./gradlew :desktopApp:run
```

**Option 2: Package as Executable**
```bash
# Windows (.msi)
./gradlew :desktopApp:packageMsi

# macOS (.dmg)
./gradlew :desktopApp:packageDmg

# Linux (.deb)
./gradlew :desktopApp:packageDeb
```

**Requirements:**
- JDK 21+
- Minimum: Windows 10, macOS 10.14, Ubuntu 20.04

### 4.4 Run iOS App (macOS only)

```bash
# Generate iOS framework
./gradlew :shared:linkDebugFrameworkIosArm64

# Install CocoaPods dependencies
cd iosApp
pod install

# Open in Xcode
open iosApp.xcworkspace
```

Then build and run in Xcode.

**Requirements:**
- macOS 12.0+
- Xcode 14.0+
- CocoaPods
- iOS 14.0+ device or simulator

---

## Part 5: TESTING

### 5.1 Run Unit Tests

```bash
# All tests
./gradlew test

# Android tests
./gradlew :androidApp:testDebugUnitTest

# iOS tests
./gradlew :shared:iosX64Test

# Desktop tests
./gradlew :desktopApp:test
```

### 5.2 Run Integration Tests

```bash
# Android instrumented tests (requires device/emulator)
./gradlew :androidApp:connectedAndroidTest
```

### 5.3 Manual Testing Checklist

**Android App:**
- [ ] Register new user
- [ ] Login with credentials
- [ ] Enroll face (camera access)
- [ ] Verify face
- [ ] Logout

**Desktop App:**
- [ ] Admin dashboard loads
- [ ] Kiosk mode works
- [ ] User management
- [ ] Reports generation

**iOS App:**
- [ ] All Android features
- [ ] Native camera integration
- [ ] Biometric enrollment

---

## Part 6: TROUBLESHOOTING

### Issue: Kotlin version incompatibility
**Solution**: Already fixed - using Kotlin 1.9.20

### Issue: Gradle sync fails
**Solution**:
```bash
./gradlew --stop
rm -rf .gradle build
./gradlew clean build
```

### Issue: Android app can't reach API
**Solution**:
- Use `http://10.0.2.2:8080` for emulator
- Use `http://YOUR_IP:8080` for physical device
- Check backend is running

### Issue: Desktop camera not working
**Solution**:
- Grant camera permissions in system settings
- Check webcam is connected
- Only one app can use camera at a time

### Issue: iOS build fails
**Solution**:
```bash
cd iosApp
pod deintegrate
pod install
```

---

## Part 7: NEXT MODULES TO IMPLEMENT

### Module 1: Liveness Detection (Priority 1)
- MediaPipe integration
- Blink detection (EAR)
- Smile detection (MAR)
- Head movement tracking
- Challenge generation

### Module 2: Biometric Puzzle (Priority 1)
- Random challenge generator
- Active liveness flow
- Challenge validation
- Result aggregation

### Module 3: Camera Module (Priority 2)
- Platform-specific implementations
- Frame capture
- Image preprocessing
- Quality checks

### Module 4: Desktop Admin Features (Priority 2)
- User management UI
- Reports dashboard
- System settings
- Bulk operations

### Module 5: Offline Support (Priority 3)
- SQLDelight database
- Sync mechanism
- Conflict resolution

---

## Part 8: DEPLOYMENT

### Android
```bash
# Build release APK
./gradlew :androidApp:assembleRelease

# Build AAB for Play Store
./gradlew :androidApp:bundleRelease
```

### Desktop
```bash
# Package for distribution
./gradlew :desktopApp:packageDistributionForCurrentOS
```

### iOS
Build in Xcode for App Store distribution.

---

## SUMMARY

**Status**: ✅ Kotlin version fixed, architecture analysis complete
**Next Step**: Implement refactored repositories with Koin DI
**Timeline**: 
- Week 1: Complete refactoring
- Week 2-3: Implement new modules
- Week 4: Testing and integration
- Week 5: Documentation and deployment

**Key Files Modified**:
1. ✅ `build.gradle.kts` - Kotlin version
2. ✅ `AppError.kt` - Error model
3. ✅ `TokenRepository.kt` - Repository interface
4. 🔄 All other files in implementation plan

**To Build Immediately**:
```bash
cd mobile-app
./gradlew :desktopApp:run    # Desktop app
./gradlew :androidApp:installDebug  # Android app
```

