# 🚀 FIVUCSAS Mobile-App Repository - Complete Refactoring Plan
**Date:** November 3, 2025  
**Goal:** Transform desktop-app code into proper KMP/CMP architecture  
**Target:** Single repo for iOS, Android, Desktop (Windows/macOS/Linux)  
**IDE:** Android Studio for all platforms  
**Timeline:** 7-10 days

---

## 🎯 STRATEGY OVERVIEW

### Current Situation
```
mobile-app/
├── desktopApp/          ✅ Complete UI (but wrong architecture)
│   └── ViewModels are HERE (❌ WRONG - should be in shared/)
├── androidApp/          ⚠️ Empty
├── iosApp/              ❌ Not created yet
└── shared/              ⚠️ Empty (❌ CRITICAL - should contain all logic!)
```

### Target Architecture
```
mobile-app/
├── shared/              ✅ 90-95% of code (ALL platforms use this)
│   ├── domain/          → Business logic, models, use cases
│   ├── data/            → Repositories, API clients
│   └── presentation/    → ViewModels, UI states
├── androidApp/          ✅ 5% Android-specific (camera, permissions)
├── desktopApp/          ✅ 5% Desktop-specific (window, system tray)
└── iosApp/              ✅ 5% iOS-specific (camera, permissions)
```

### Key Decision: One Repo for All Native Apps ✅

**CORRECT APPROACH:**
- ✅ `mobile-app/` contains: Android, iOS, Desktop
- ✅ 90-95% code shared in `shared/` module
- ✅ Android Studio as single IDE for all platforms
- ✅ Desktop app lives in `mobile-app/desktopApp/` (already there!)
- ✅ `web-app/` stays separate (different tech stack: React)

**Benefits:**
- Single source of truth for business logic
- One codebase to maintain
- Test once, works everywhere
- Easy dependency management
- Simplified CI/CD

---

## 📋 REFACTORING ROADMAP

### PHASE 1: Shared Module Architecture (Days 1-4) ⚠️ CRITICAL

This is THE MOST IMPORTANT phase. Get this right, everything else is easy.

#### Day 1: Create Clean Architecture Layers in `shared/`

**Goal:** Move all business logic from `desktopApp/` to `shared/`

##### 1.1 Create Directory Structure

```bash
cd mobile-app/shared/src/commonMain/kotlin
mkdir -p com/fivucsas/shared/{domain,data,presentation}
mkdir -p com/fivucsas/shared/domain/{model,repository,usecase,validation,exception}
mkdir -p com/fivucsas/shared/data/{repository,remote,local}
mkdir -p com/fivucsas/shared/data/remote/{api,dto}
mkdir -p com/fivucsas/shared/data/local/cache
mkdir -p com/fivucsas/shared/presentation/{viewmodel,state}
```

**Result:**
```
shared/src/commonMain/kotlin/com/fivucsas/shared/
├── domain/
│   ├── model/              → User, EnrollmentData, BiometricData
│   ├── repository/         → Interfaces (UserRepository, BiometricRepository)
│   ├── usecase/            → Business logic (EnrollUserUseCase, VerifyUserUseCase)
│   ├── validation/         → ValidationRules, ValidationResult
│   └── exception/          → Custom exceptions
├── data/
│   ├── repository/         → Implementations (UserRepositoryImpl)
│   ├── remote/
│   │   ├── api/           → API interfaces
│   │   └── dto/           → Data transfer objects
│   └── local/
│       └── cache/         → Local caching
└── presentation/
    ├── viewmodel/         → AppStateManager, KioskViewModel, AdminViewModel
    └── state/             → UiState, EnrollmentState, etc.
```

##### 1.2 Move Models to Shared

**Extract from:** `desktopApp/src/.../ui/kiosk/KioskMode.kt`

**Current (WRONG):**
```kotlin
// In KioskMode.kt (desktop-specific)
data class EnrollmentData(
    val fullName: String = "",
    val email: String = "",
    val idNumber: String = ""
)
```

**Create:** `shared/src/commonMain/kotlin/com/fivucsas/shared/domain/model/EnrollmentData.kt`

```kotlin
package com.fivucsas.shared.domain.model

/**
 * Enrollment data model - shared across all platforms
 */
data class EnrollmentData(
    val fullName: String = "",
    val email: String = "",
    val idNumber: String = "",
    val phoneNumber: String = "",
    val address: String = ""
)
```

**Extract from:** `desktopApp/src/.../ui/admin/AdminDashboard.kt`

**Create:** `shared/src/commonMain/kotlin/com/fivucsas/shared/domain/model/User.kt`

```kotlin
package com.fivucsas.shared.domain.model

/**
 * User model - shared across all platforms
 */
data class User(
    val id: String,
    val fullName: String,
    val email: String,
    val idNumber: String,
    val phoneNumber: String = "",
    val enrollmentDate: String,
    val status: UserStatus,
    val hasBiometric: Boolean = false
)

enum class UserStatus {
    ACTIVE,
    INACTIVE,
    PENDING,
    SUSPENDED
}
```

**Create:** `shared/src/commonMain/kotlin/com/fivucsas/shared/domain/model/BiometricData.kt`

```kotlin
package com.fivucsas.shared.domain.model

/**
 * Biometric data model
 */
data class BiometricData(
    val id: String,
    val userId: String,
    val faceEmbedding: FloatArray,
    val enrollmentDate: String,
    val lastVerificationDate: String? = null,
    val verificationCount: Int = 0
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other == null || this::class != other::class) return false

        other as BiometricData

        if (id != other.id) return false
        if (userId != other.userId) return false
        if (!faceEmbedding.contentEquals(other.faceEmbedding)) return false

        return true
    }

    override fun hashCode(): Int {
        var result = id.hashCode()
        result = 31 * result + userId.hashCode()
        result = 31 * result + faceEmbedding.contentHashCode()
        return result
    }
}
```

**Create:** `shared/src/commonMain/kotlin/com/fivucsas/shared/domain/model/Statistics.kt`

```kotlin
package com.fivucsas.shared.domain.model

/**
 * Statistics model for admin dashboard
 */
data class Statistics(
    val totalUsers: Int = 0,
    val activeUsers: Int = 0,
    val pendingVerifications: Int = 0,
    val todayEnrollments: Int = 0,
    val successRate: Float = 0f
)
```

**Files Created (Day 1):**
```
✅ shared/domain/model/EnrollmentData.kt
✅ shared/domain/model/User.kt
✅ shared/domain/model/BiometricData.kt
✅ shared/domain/model/Statistics.kt
✅ shared/domain/model/UserStatus.kt
```

##### 1.3 Create Repository Interfaces

**Create:** `shared/src/commonMain/kotlin/com/fivucsas/shared/domain/repository/UserRepository.kt`

```kotlin
package com.fivucsas.shared.domain.repository

import com.fivucsas.shared.domain.model.User
import com.fivucsas.shared.domain.model.Statistics

/**
 * User repository interface - defines contract for data access
 * Implementations can be for API, local cache, or mock data
 */
interface UserRepository {
    /**
     * Get all users
     * @return Result with list of users or error
     */
    suspend fun getUsers(): Result<List<User>>
    
    /**
     * Get user by ID
     * @param id User ID
     * @return Result with user or error
     */
    suspend fun getUserById(id: String): Result<User>
    
    /**
     * Create new user
     * @param user User to create
     * @return Result with created user or error
     */
    suspend fun createUser(user: User): Result<User>
    
    /**
     * Update existing user
     * @param id User ID
     * @param user Updated user data
     * @return Result with updated user or error
     */
    suspend fun updateUser(id: String, user: User): Result<User>
    
    /**
     * Delete user
     * @param id User ID
     * @return Result with success or error
     */
    suspend fun deleteUser(id: String): Result<Unit>
    
    /**
     * Search users by query
     * @param query Search query
     * @return Result with matching users or error
     */
    suspend fun searchUsers(query: String): Result<List<User>>
    
    /**
     * Get user statistics
     * @return Result with statistics or error
     */
    suspend fun getStatistics(): Result<Statistics>
}
```

**Create:** `shared/src/commonMain/kotlin/com/fivucsas/shared/domain/repository/BiometricRepository.kt`

```kotlin
package com.fivucsas.shared.domain.repository

import com.fivucsas.shared.domain.model.BiometricData

/**
 * Biometric repository interface
 */
interface BiometricRepository {
    /**
     * Enroll user's face
     * @param userId User ID
     * @param imageData Face image as byte array
     * @return Result with biometric data or error
     */
    suspend fun enrollFace(userId: String, imageData: ByteArray): Result<BiometricData>
    
    /**
     * Verify user's face
     * @param imageData Face image as byte array
     * @return Result with verification result or error
     */
    suspend fun verifyFace(imageData: ByteArray): Result<VerificationResult>
    
    /**
     * Check liveness (anti-spoofing)
     * @param actions List of facial actions performed
     * @return Result with liveness check result or error
     */
    suspend fun checkLiveness(actions: List<FacialAction>): Result<LivenessResult>
    
    /**
     * Get user's biometric data
     * @param userId User ID
     * @return Result with biometric data or error
     */
    suspend fun getBiometricData(userId: String): Result<BiometricData>
    
    /**
     * Delete user's biometric data
     * @param userId User ID
     * @return Result with success or error
     */
    suspend fun deleteBiometricData(userId: String): Result<Unit>
}

/**
 * Verification result
 */
data class VerificationResult(
    val isVerified: Boolean,
    val userId: String?,
    val confidence: Float,
    val message: String
)

/**
 * Liveness check result
 */
data class LivenessResult(
    val isLive: Boolean,
    val confidence: Float,
    val message: String
)

/**
 * Facial action for liveness detection
 */
enum class FacialAction {
    SMILE,
    BLINK,
    LOOK_LEFT,
    LOOK_RIGHT,
    LOOK_UP,
    LOOK_DOWN,
    OPEN_MOUTH
}
```

**Create:** `shared/src/commonMain/kotlin/com/fivucsas/shared/domain/repository/AuthRepository.kt`

```kotlin
package com.fivucsas.shared.domain.repository

/**
 * Authentication repository interface
 */
interface AuthRepository {
    /**
     * Login user
     * @param email User email
     * @param password User password
     * @return Result with auth tokens or error
     */
    suspend fun login(email: String, password: String): Result<AuthTokens>
    
    /**
     * Logout user
     * @return Result with success or error
     */
    suspend fun logout(): Result<Unit>
    
    /**
     * Refresh access token
     * @param refreshToken Refresh token
     * @return Result with new tokens or error
     */
    suspend fun refreshToken(refreshToken: String): Result<AuthTokens>
    
    /**
     * Check if user is authenticated
     * @return True if authenticated
     */
    suspend fun isAuthenticated(): Boolean
    
    /**
     * Get current access token
     * @return Access token or null
     */
    suspend fun getAccessToken(): String?
}

/**
 * Authentication tokens
 */
data class AuthTokens(
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Long
)
```

**Files Created (Day 1):**
```
✅ shared/domain/repository/UserRepository.kt
✅ shared/domain/repository/BiometricRepository.kt
✅ shared/domain/repository/AuthRepository.kt
```

##### 1.4 Update Desktop App Imports

**Before:**
```kotlin
// desktopApp/.../ui/kiosk/KioskMode.kt
data class EnrollmentData(...)  // ❌ Local definition
class KioskViewModel { ... }     // ❌ Local definition
```

**After:**
```kotlin
// desktopApp/.../ui/kiosk/KioskMode.kt
import com.fivucsas.shared.domain.model.EnrollmentData  // ✅ From shared
import com.fivucsas.shared.presentation.viewmodel.KioskViewModel  // ✅ Will be from shared (Day 4)
```

**Verification:**
```bash
cd mobile-app
./gradlew desktopApp:compileKotlinDesktop
# Should compile successfully
```

**Day 1 Checklist:**
- [ ] Created `shared/` directory structure
- [ ] Moved all models to `shared/domain/model/`
- [ ] Created repository interfaces
- [ ] Updated imports in `desktopApp/`
- [ ] Verified compilation

**Estimated Time:** 3-4 hours

---

#### Day 2: Data Layer Implementation

**Goal:** Implement repositories and API infrastructure

##### 2.1 Create Mock Repository Implementations

For now, we'll create mock implementations. Later (when backend is ready), we'll create API implementations.

**Create:** `shared/src/commonMain/kotlin/com/fivucsas/shared/data/repository/UserRepositoryImpl.kt`

```kotlin
package com.fivucsas.shared.data.repository

import com.fivucsas.shared.domain.model.Statistics
import com.fivucsas.shared.domain.model.User
import com.fivucsas.shared.domain.model.UserStatus
import com.fivucsas.shared.domain.repository.UserRepository
import kotlinx.coroutines.delay

/**
 * Mock implementation of UserRepository
 * TODO: Replace with API implementation when backend is ready
 */
class UserRepositoryImpl : UserRepository {
    
    // Mock data storage
    private val users = mutableListOf(
        User(
            id = "1",
            fullName = "John Doe",
            email = "john@example.com",
            idNumber = "12345678901",
            enrollmentDate = "2025-01-15",
            status = UserStatus.ACTIVE,
            hasBiometric = true
        ),
        User(
            id = "2",
            fullName = "Jane Smith",
            email = "jane@example.com",
            idNumber = "98765432109",
            enrollmentDate = "2025-02-20",
            status = UserStatus.ACTIVE,
            hasBiometric = true
        ),
        User(
            id = "3",
            fullName = "Bob Wilson",
            email = "bob@example.com",
            idNumber = "55566677788",
            enrollmentDate = "2025-03-10",
            status = UserStatus.PENDING,
            hasBiometric = false
        )
    )
    
    override suspend fun getUsers(): Result<List<User>> {
        return try {
            // Simulate network delay
            delay(500)
            Result.success(users.toList())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun getUserById(id: String): Result<User> {
        return try {
            delay(300)
            val user = users.find { it.id == id }
            if (user != null) {
                Result.success(user)
            } else {
                Result.failure(Exception("User not found"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun createUser(user: User): Result<User> {
        return try {
            delay(500)
            val newUser = user.copy(
                id = (users.size + 1).toString(),
                enrollmentDate = getCurrentDate()
            )
            users.add(newUser)
            Result.success(newUser)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun updateUser(id: String, user: User): Result<User> {
        return try {
            delay(500)
            val index = users.indexOfFirst { it.id == id }
            if (index != -1) {
                users[index] = user
                Result.success(user)
            } else {
                Result.failure(Exception("User not found"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun deleteUser(id: String): Result<Unit> {
        return try {
            delay(500)
            val removed = users.removeIf { it.id == id }
            if (removed) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("User not found"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun searchUsers(query: String): Result<List<User>> {
        return try {
            delay(300)
            val results = users.filter {
                it.fullName.contains(query, ignoreCase = true) ||
                it.email.contains(query, ignoreCase = true) ||
                it.idNumber.contains(query)
            }
            Result.success(results)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun getStatistics(): Result<Statistics> {
        return try {
            delay(500)
            val stats = Statistics(
                totalUsers = users.size,
                activeUsers = users.count { it.status == UserStatus.ACTIVE },
                pendingVerifications = users.count { it.status == UserStatus.PENDING },
                todayEnrollments = users.count { it.enrollmentDate == getCurrentDate() },
                successRate = 95.5f
            )
            Result.success(stats)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    private fun getCurrentDate(): String {
        // TODO: Use actual date/time library
        return "2025-11-03"
    }
}
```

**Create similar for:** `BiometricRepositoryImpl.kt`, `AuthRepositoryImpl.kt`

##### 2.2 Create API Infrastructure (Stub for now)

**Create:** `shared/src/commonMain/kotlin/com/fivucsas/shared/data/remote/api/IdentityApi.kt`

```kotlin
package com.fivucsas.shared.data.remote.api

import com.fivucsas.shared.data.remote.dto.UserDto
import com.fivucsas.shared.data.remote.dto.AuthResponseDto

/**
 * Identity API interface
 * TODO: Implement with Ktor when backend is ready
 */
interface IdentityApi {
    suspend fun login(email: String, password: String): AuthResponseDto
    suspend fun getUsers(): List<UserDto>
    suspend fun getUserById(id: String): UserDto
    suspend fun createUser(user: UserDto): UserDto
    suspend fun updateUser(id: String, user: UserDto): UserDto
    suspend fun deleteUser(id: String)
}
```

**Create:** `shared/src/commonMain/kotlin/com/fivucsas/shared/data/remote/dto/UserDto.kt`

```kotlin
package com.fivucsas.shared.data.remote.dto

import com.fivucsas.shared.domain.model.User
import com.fivucsas.shared.domain.model.UserStatus
import kotlinx.serialization.Serializable

/**
 * Data Transfer Object for User
 * Used for API communication
 */
@Serializable
data class UserDto(
    val id: String,
    val fullName: String,
    val email: String,
    val idNumber: String,
    val phoneNumber: String = "",
    val enrollmentDate: String,
    val status: String,
    val hasBiometric: Boolean = false
)

/**
 * Convert DTO to domain model
 */
fun UserDto.toModel(): User {
    return User(
        id = id,
        fullName = fullName,
        email = email,
        idNumber = idNumber,
        phoneNumber = phoneNumber,
        enrollmentDate = enrollmentDate,
        status = UserStatus.valueOf(status),
        hasBiometric = hasBiometric
    )
}

/**
 * Convert domain model to DTO
 */
fun User.toDto(): UserDto {
    return UserDto(
        id = id,
        fullName = fullName,
        email = email,
        idNumber = idNumber,
        phoneNumber = phoneNumber,
        enrollmentDate = enrollmentDate,
        status = status.name,
        hasBiometric = hasBiometric
    )
}
```

**Day 2 Checklist:**
- [ ] Created `UserRepositoryImpl` with mock data
- [ ] Created `BiometricRepositoryImpl` stub
- [ ] Created `AuthRepositoryImpl` stub
- [ ] Created API interfaces (stubs)
- [ ] Created DTOs with mappers
- [ ] Verified compilation

**Estimated Time:** 4-5 hours

---

#### Day 3: Use Cases & Business Logic

**Goal:** Extract business logic into use cases

##### 3.1 Create Validation Layer

**Create:** `shared/src/commonMain/kotlin/com/fivucsas/shared/domain/validation/ValidationRules.kt`

```kotlin
package com.fivucsas.shared.domain.validation

/**
 * Centralized validation rules
 */
object ValidationRules {
    
    private const val MIN_NAME_LENGTH = 3
    private const val MAX_NAME_LENGTH = 100
    private const val EMAIL_REGEX = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
    private const val NATIONAL_ID_LENGTH = 11
    
    fun validateFullName(name: String): ValidationResult {
        return when {
            name.isBlank() -> 
                ValidationResult.Error("Name is required")
            name.length < MIN_NAME_LENGTH -> 
                ValidationResult.Error("Name must be at least $MIN_NAME_LENGTH characters")
            name.length > MAX_NAME_LENGTH -> 
                ValidationResult.Error("Name must not exceed $MAX_NAME_LENGTH characters")
            !name.matches(Regex("^[a-zA-ZğüşöçİĞÜŞÖÇ\\s]+$")) -> 
                ValidationResult.Error("Name must contain only letters")
            else -> 
                ValidationResult.Success
        }
    }
    
    fun validateEmail(email: String): ValidationResult {
        return when {
            email.isBlank() -> 
                ValidationResult.Error("Email is required")
            !email.matches(Regex(EMAIL_REGEX)) -> 
                ValidationResult.Error("Invalid email format")
            else -> 
                ValidationResult.Success
        }
    }
    
    fun validateNationalId(id: String): ValidationResult {
        return when {
            id.isBlank() -> 
                ValidationResult.Error("National ID is required")
            id.length != NATIONAL_ID_LENGTH -> 
                ValidationResult.Error("National ID must be $NATIONAL_ID_LENGTH digits")
            !id.all { it.isDigit() } -> 
                ValidationResult.Error("National ID must contain only digits")
            !isValidTurkishId(id) -> 
                ValidationResult.Error("Invalid Turkish ID number")
            else -> 
                ValidationResult.Success
        }
    }
    
    fun validatePhoneNumber(phone: String): ValidationResult {
        return when {
            phone.isBlank() -> 
                ValidationResult.Error("Phone number is required")
            !phone.matches(Regex("^\\+?[0-9]{10,13}$")) -> 
                ValidationResult.Error("Invalid phone number format")
            else -> 
                ValidationResult.Success
        }
    }
    
    /**
     * Turkish National ID validation algorithm
     */
    private fun isValidTurkishId(id: String): Boolean {
        if (id.length != 11 || id[0] == '0') return false
        
        val digits = id.map { it.toString().toInt() }
        
        // Check 10th digit
        val sum10 = (digits[0] + digits[2] + digits[4] + digits[6] + digits[8]) * 7 -
                    (digits[1] + digits[3] + digits[5] + digits[7])
        
        if (sum10 % 10 != digits[9]) return false
        
        // Check 11th digit
        val sum11 = digits.take(10).sum()
        if (sum11 % 10 != digits[10]) return false
        
        return true
    }
}

/**
 * Validation result sealed class
 */
sealed class ValidationResult {
    object Success : ValidationResult()
    data class Error(val message: String) : ValidationResult()
    
    val isValid: Boolean get() = this is Success
    val errorMessage: String? get() = (this as? Error)?.message
}
```

##### 3.2 Create Use Cases

**Create:** `shared/src/commonMain/kotlin/com/fivucsas/shared/domain/usecase/enrollment/EnrollUserUseCase.kt`

```kotlin
package com.fivucsas.shared.domain.usecase.enrollment

import com.fivucsas.shared.domain.exception.ValidationException
import com.fivucsas.shared.domain.model.EnrollmentData
import com.fivucsas.shared.domain.model.User
import com.fivucsas.shared.domain.model.UserStatus
import com.fivucsas.shared.domain.repository.BiometricRepository
import com.fivucsas.shared.domain.repository.UserRepository
import com.fivucsas.shared.domain.validation.ValidationResult
import com.fivucsas.shared.domain.validation.ValidationRules

/**
 * Use case for enrolling a new user
 * 
 * This encapsulates the business logic for user enrollment:
 * 1. Validate user data
 * 2. Create user in system
 * 3. Enroll biometric data
 * 4. Handle rollback if biometric enrollment fails
 */
class EnrollUserUseCase(
    private val userRepository: UserRepository,
    private val biometricRepository: BiometricRepository
) {
    /**
     * Enroll a new user
     * 
     * @param enrollmentData User enrollment data
     * @param faceImage User's face image for biometric enrollment
     * @return Result with enrolled user or error
     */
    suspend operator fun invoke(
        enrollmentData: EnrollmentData,
        faceImage: ByteArray
    ): Result<User> {
        // Step 1: Validate all fields
        validateEnrollmentData(enrollmentData)?.let { error ->
            return Result.failure(ValidationException(error))
        }
        
        // Step 2: Create user
        val user = User(
            id = "", // Will be assigned by backend
            fullName = enrollmentData.fullName,
            email = enrollmentData.email,
            idNumber = enrollmentData.idNumber,
            phoneNumber = enrollmentData.phoneNumber,
            enrollmentDate = "", // Will be assigned by backend
            status = UserStatus.PENDING,
            hasBiometric = false
        )
        
        val userResult = userRepository.createUser(user)
        if (userResult.isFailure) {
            return Result.failure(
                userResult.exceptionOrNull() ?: Exception("Failed to create user")
            )
        }
        
        // Step 3: Enroll biometric data
        val createdUser = userResult.getOrThrow()
        val biometricResult = biometricRepository.enrollFace(createdUser.id, faceImage)
        
        if (biometricResult.isFailure) {
            // Rollback: delete user if biometric enrollment failed
            userRepository.deleteUser(createdUser.id)
            return Result.failure(
                biometricResult.exceptionOrNull() ?: Exception("Failed to enroll biometric data")
            )
        }
        
        // Step 4: Update user status
        val updatedUser = createdUser.copy(
            status = UserStatus.ACTIVE,
            hasBiometric = true
        )
        
        return userRepository.updateUser(createdUser.id, updatedUser)
    }
    
    /**
     * Validate enrollment data
     * @return Error message if validation fails, null if valid
     */
    private fun validateEnrollmentData(data: EnrollmentData): String? {
        // Validate full name
        val nameValidation = ValidationRules.validateFullName(data.fullName)
        if (nameValidation is ValidationResult.Error) {
            return nameValidation.message
        }
        
        // Validate email
        val emailValidation = ValidationRules.validateEmail(data.email)
        if (emailValidation is ValidationResult.Error) {
            return emailValidation.message
        }
        
        // Validate national ID
        val idValidation = ValidationRules.validateNationalId(data.idNumber)
        if (idValidation is ValidationResult.Error) {
            return idValidation.message
        }
        
        // Validate phone (if provided)
        if (data.phoneNumber.isNotBlank()) {
            val phoneValidation = ValidationRules.validatePhoneNumber(data.phoneNumber)
            if (phoneValidation is ValidationResult.Error) {
                return phoneValidation.message
            }
        }
        
        return null
    }
}
```

**Create:** `shared/src/commonMain/kotlin/com/fivucsas/shared/domain/usecase/admin/GetUsersUseCase.kt`

```kotlin
package com.fivucsas.shared.domain.usecase.admin

import com.fivucsas.shared.domain.model.User
import com.fivucsas.shared.domain.repository.UserRepository

/**
 * Use case for getting all users
 */
class GetUsersUseCase(
    private val userRepository: UserRepository
) {
    suspend operator fun invoke(): Result<List<User>> {
        return userRepository.getUsers()
    }
}
```

**Create:** `shared/src/commonMain/kotlin/com/fivucsas/shared/domain/usecase/admin/SearchUsersUseCase.kt`

```kotlin
package com.fivucsas.shared.domain.usecase.admin

import com.fivucsas.shared.domain.model.User
import com.fivucsas.shared.domain.repository.UserRepository

/**
 * Use case for searching users
 */
class SearchUsersUseCase(
    private val userRepository: UserRepository
) {
    suspend operator fun invoke(query: String): Result<List<User>> {
        if (query.isBlank()) {
            return userRepository.getUsers()
        }
        return userRepository.searchUsers(query)
    }
}
```

**Create:** `shared/src/commonMain/kotlin/com/fivucsas/shared/domain/exception/AppExceptions.kt`

```kotlin
package com.fivucsas.shared.domain.exception

/**
 * Base exception for app
 */
sealed class AppException(message: String) : Exception(message)

/**
 * Validation error
 */
class ValidationException(message: String) : AppException(message)

/**
 * Network error
 */
class NetworkException(message: String) : AppException(message)

/**
 * Server error
 */
class ServerException(message: String) : AppException(message)

/**
 * Authentication error
 */
class AuthException(message: String) : AppException(message)

/**
 * Not found error
 */
class NotFoundException(message: String) : AppException(message)
```

**Day 3 Checklist:**
- [ ] Created `ValidationRules` with Turkish ID validation
- [ ] Created `ValidationResult` sealed class
- [ ] Created `EnrollUserUseCase` with rollback logic
- [ ] Created admin use cases
- [ ] Created exception hierarchy
- [ ] Verified compilation

**Estimated Time:** 5-6 hours

---

#### Day 4: Presentation Layer Migration ⚠️ CRITICAL

**Goal:** Move ViewModels from `desktopApp/` to `shared/presentation/`

This is the MOST CRITICAL step. After this, you'll have true multiplatform architecture.

##### 4.1 Create UI State Classes

**Create:** `shared/src/commonMain/kotlin/com/fivucsas/shared/presentation/state/UiState.kt`

```kotlin
package com.fivucsas.shared.presentation.state

/**
 * Generic UI state wrapper
 * Handles loading, success, error states uniformly
 */
sealed class UiState<out T> {
    /**
     * Idle state - no action taken yet
     */
    object Idle : UiState<Nothing>()
    
    /**
     * Loading state - operation in progress
     */
    object Loading : UiState<Nothing>()
    
    /**
     * Success state with data
     */
    data class Success<T>(val data: T) : UiState<T>()
    
    /**
     * Error state with message
     */
    data class Error(
        val message: String,
        val exception: Throwable? = null
    ) : UiState<Nothing>()
    
    /**
     * Check if state is loading
     */
    val isLoading: Boolean get() = this is Loading
    
    /**
     * Check if state is success
     */
    val isSuccess: Boolean get() = this is Success
    
    /**
     * Check if state is error
     */
    val isError: Boolean get() = this is Error
    
    /**
     * Get data if success, null otherwise
     */
    fun getDataOrNull(): T? = (this as? Success)?.data
    
    /**
     * Get error message if error, null otherwise
     */
    fun getErrorOrNull(): String? = (this as? Error)?.message
}
```

##### 4.2 Move ViewModels to Shared

**EXTRACT FROM:** `desktopApp/src/.../ui/kiosk/KioskMode.kt`

**CREATE:** `shared/src/commonMain/kotlin/com/fivucsas/shared/presentation/viewmodel/KioskViewModel.kt`

```kotlin
package com.fivucsas.shared.presentation.viewmodel

import com.fivucsas.shared.domain.exception.AppException
import com.fivucsas.shared.domain.model.EnrollmentData
import com.fivucsas.shared.domain.model.User
import com.fivucsas.shared.domain.usecase.enrollment.EnrollUserUseCase
import com.fivucsas.shared.domain.usecase.verification.VerifyUserUseCase
import com.fivucsas.shared.presentation.state.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * ViewModel for Kiosk Mode
 * 
 * Manages state for:
 * - User enrollment
 * - Face verification
 * - Liveness detection
 * 
 * ARCHITECTURE: This is in SHARED module and used by ALL platforms!
 */
class KioskViewModel(
    private val enrollUserUseCase: EnrollUserUseCase,
    private val verifyUserUseCase: VerifyUserUseCase
) {
    // Coroutine scope for async operations
    private val viewModelScope = CoroutineScope(Dispatchers.Main)
    
    // Current screen state
    private val _currentScreen = MutableStateFlow(KioskScreen.WELCOME)
    val currentScreen: StateFlow<KioskScreen> = _currentScreen.asStateFlow()
    
    // Enrollment form data
    private val _enrollmentData = MutableStateFlow(EnrollmentData())
    val enrollmentData: StateFlow<EnrollmentData> = _enrollmentData.asStateFlow()
    
    // Enrollment state (loading, success, error)
    private val _enrollmentState = MutableStateFlow<UiState<User>>(UiState.Idle)
    val enrollmentState: StateFlow<UiState<User>> = _enrollmentState.asStateFlow()
    
    // Verification state
    private val _verificationState = MutableStateFlow<UiState<User>>(UiState.Idle)
    val verificationState: StateFlow<UiState<User>> = _verificationState.asStateFlow()
    
    /**
     * Navigate to screen
     */
    fun navigateToWelcome() {
        _currentScreen.value = KioskScreen.WELCOME
        resetStates()
    }
    
    fun navigateToEnroll() {
        _currentScreen.value = KioskScreen.ENROLL
    }
    
    fun navigateToVerify() {
        _currentScreen.value = KioskScreen.VERIFY
    }
    
    /**
     * Update enrollment form data
     */
    fun updateFullName(name: String) {
        _enrollmentData.update { it.copy(fullName = name) }
    }
    
    fun updateEmail(email: String) {
        _enrollmentData.update { it.copy(email = email) }
    }
    
    fun updateIdNumber(id: String) {
        _enrollmentData.update { it.copy(idNumber = id) }
    }
    
    fun updatePhoneNumber(phone: String) {
        _enrollmentData.update { it.copy(phoneNumber = phone) }
    }
    
    fun updateAddress(address: String) {
        _enrollmentData.update { it.copy(address = address) }
    }
    
    /**
     * Enroll user with biometric data
     * @param faceImage Captured face image
     */
    fun enrollUser(faceImage: ByteArray) {
        viewModelScope.launch {
            _enrollmentState.value = UiState.Loading
            
            try {
                val result = enrollUserUseCase(
                    enrollmentData = _enrollmentData.value,
                    faceImage = faceImage
                )
                
                _enrollmentState.value = when {
                    result.isSuccess -> UiState.Success(result.getOrThrow())
                    else -> UiState.Error(
                        message = result.exceptionOrNull()?.message ?: "Enrollment failed",
                        exception = result.exceptionOrNull()
                    )
                }
            } catch (e: Exception) {
                _enrollmentState.value = UiState.Error(
                    message = mapExceptionToMessage(e),
                    exception = e
                )
            }
        }
    }
    
    /**
     * Verify user with face image
     * @param faceImage Captured face image
     */
    fun verifyUser(faceImage: ByteArray) {
        viewModelScope.launch {
            _verificationState.value = UiState.Loading
            
            try {
                val result = verifyUserUseCase(faceImage)
                
                _verificationState.value = when {
                    result.isSuccess -> UiState.Success(result.getOrThrow())
                    else -> UiState.Error(
                        message = result.exceptionOrNull()?.message ?: "Verification failed",
                        exception = result.exceptionOrNull()
                    )
                }
            } catch (e: Exception) {
                _verificationState.value = UiState.Error(
                    message = mapExceptionToMessage(e),
                    exception = e
                )
            }
        }
    }
    
    /**
     * Reset all states
     */
    fun resetStates() {
        _enrollmentData.value = EnrollmentData()
        _enrollmentState.value = UiState.Idle
        _verificationState.value = UiState.Idle
    }
    
    /**
     * Map exceptions to user-friendly messages
     */
    private fun mapExceptionToMessage(exception: Exception): String {
        return when (exception) {
            is AppException -> exception.message ?: "An error occurred"
            else -> "An unexpected error occurred. Please try again."
        }
    }
}

/**
 * Kiosk screen navigation
 */
enum class KioskScreen {
    WELCOME,
    ENROLL,
    VERIFY
}
```

**EXTRACT FROM:** `desktopApp/src/.../Main.kt`

**CREATE:** `shared/src/commonMain/kotlin/com/fivucsas/shared/presentation/viewmodel/AppStateManager.kt`

```kotlin
package com.fivucsas.shared.presentation.viewmodel

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * App-wide state manager
 * 
 * Manages navigation between main app modes:
 * - Launcher (mode selection)
 * - Kiosk (self-service)
 * - Admin (management dashboard)
 */
class AppStateManager {
    private val _currentMode = MutableStateFlow(AppMode.LAUNCHER)
    val currentMode: StateFlow<AppMode> = _currentMode.asStateFlow()
    
    fun navigateToLauncher() {
        _currentMode.value = AppMode.LAUNCHER
    }
    
    fun navigateToKiosk() {
        _currentMode.value = AppMode.KIOSK
    }
    
    fun navigateToAdmin() {
        _currentMode.value = AppMode.ADMIN
    }
}

/**
 * App mode enum
 */
enum class AppMode {
    LAUNCHER,
    KIOSK,
    ADMIN
}
```

**EXTRACT FROM:** `desktopApp/src/.../ui/admin/AdminDashboard.kt`

**CREATE:** `shared/src/commonMain/kotlin/com/fivucsas/shared/presentation/viewmodel/AdminViewModel.kt`

```kotlin
package com.fivucsas.shared.presentation.viewmodel

import com.fivucsas.shared.domain.model.Statistics
import com.fivucsas.shared.domain.model.User
import com.fivucsas.shared.domain.usecase.admin.DeleteUserUseCase
import com.fivucsas.shared.domain.usecase.admin.GetStatisticsUseCase
import com.fivucsas.shared.domain.usecase.admin.GetUsersUseCase
import com.fivucsas.shared.domain.usecase.admin.SearchUsersUseCase
import com.fivucsas.shared.presentation.state.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * ViewModel for Admin Dashboard
 * 
 * Manages state for:
 * - User management
 * - Statistics
 * - Analytics
 * - Security settings
 */
class AdminViewModel(
    private val getUsersUseCase: GetUsersUseCase,
    private val searchUsersUseCase: SearchUsersUseCase,
    private val deleteUserUseCase: DeleteUserUseCase,
    private val getStatisticsUseCase: GetStatisticsUseCase
) {
    private val viewModelScope = CoroutineScope(Dispatchers.Main)
    
    // Selected tab
    private val _selectedTab = MutableStateFlow(AdminTab.USERS)
    val selectedTab: StateFlow<AdminTab> = _selectedTab.asStateFlow()
    
    // Search query
    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()
    
    // Users state
    private val _usersState = MutableStateFlow<UiState<List<User>>>(UiState.Idle)
    val usersState: StateFlow<UiState<List<User>>> = _usersState.asStateFlow()
    
    // Statistics state
    private val _statisticsState = MutableStateFlow<UiState<Statistics>>(UiState.Idle)
    val statisticsState: StateFlow<UiState<Statistics>> = _statisticsState.asStateFlow()
    
    init {
        loadUsers()
        loadStatistics()
    }
    
    /**
     * Select tab
     */
    fun selectTab(tab: AdminTab) {
        _selectedTab.value = tab
    }
    
    /**
     * Update search query and search
     */
    fun updateSearchQuery(query: String) {
        _searchQuery.value = query
        searchUsers(query)
    }
    
    /**
     * Load all users
     */
    fun loadUsers() {
        viewModelScope.launch {
            _usersState.value = UiState.Loading
            
            try {
                val result = getUsersUseCase()
                _usersState.value = when {
                    result.isSuccess -> UiState.Success(result.getOrThrow())
                    else -> UiState.Error(
                        message = result.exceptionOrNull()?.message ?: "Failed to load users"
                    )
                }
            } catch (e: Exception) {
                _usersState.value = UiState.Error(
                    message = "Failed to load users: ${e.message}"
                )
            }
        }
    }
    
    /**
     * Search users
     */
    private fun searchUsers(query: String) {
        viewModelScope.launch {
            _usersState.value = UiState.Loading
            
            try {
                val result = searchUsersUseCase(query)
                _usersState.value = when {
                    result.isSuccess -> UiState.Success(result.getOrThrow())
                    else -> UiState.Error(
                        message = result.exceptionOrNull()?.message ?: "Search failed"
                    )
                }
            } catch (e: Exception) {
                _usersState.value = UiState.Error(
                    message = "Search failed: ${e.message}"
                )
            }
        }
    }
    
    /**
     * Delete user
     */
    fun deleteUser(userId: String) {
        viewModelScope.launch {
            try {
                val result = deleteUserUseCase(userId)
                if (result.isSuccess) {
                    // Reload users after deletion
                    loadUsers()
                } else {
                    // TODO: Show error to user
                }
            } catch (e: Exception) {
                // TODO: Show error to user
            }
        }
    }
    
    /**
     * Load statistics
     */
    private fun loadStatistics() {
        viewModelScope.launch {
            _statisticsState.value = UiState.Loading
            
            try {
                val result = getStatisticsUseCase()
                _statisticsState.value = when {
                    result.isSuccess -> UiState.Success(result.getOrThrow())
                    else -> UiState.Error(
                        message = result.exceptionOrNull()?.message ?: "Failed to load statistics"
                    )
                }
            } catch (e: Exception) {
                _statisticsState.value = UiState.Error(
                    message = "Failed to load statistics: ${e.message}"
                )
            }
        }
    }
    
    /**
     * Refresh data
     */
    fun refresh() {
        loadUsers()
        loadStatistics()
    }
}

/**
 * Admin tab enum
 */
enum class AdminTab {
    USERS,
    ANALYTICS,
    SECURITY,
    SETTINGS
}
```

##### 4.3 Update Desktop App to Use Shared ViewModels

**MODIFY:** `desktopApp/src/.../Main.kt`

**Before:**
```kotlin
class AppStateManager {  // ❌ Local definition
    // ...
}

fun main() = application {
    val stateManager = remember { AppStateManager() }  // ❌ Direct instantiation
    // ...
}
```

**After:**
```kotlin
import com.fivucsas.shared.presentation.viewmodel.AppStateManager  // ✅ From shared
import com.fivucsas.shared.presentation.viewmodel.AppMode          // ✅ From shared

fun main() = application {
    val stateManager = remember { AppStateManager() }  // ✅ Still works (for now, will use DI later)
    // ...
}

// ✅ REMOVE local AppStateManager class definition
// ✅ REMOVE local AppMode enum definition
```

**MODIFY:** `desktopApp/src/.../ui/kiosk/KioskMode.kt`

**Before:**
```kotlin
class KioskViewModel { ... }  // ❌ Local definition
data class EnrollmentData(...) // ❌ Local definition

@Composable
fun KioskMode(
    onBack: () -> Unit,
    viewModel: KioskViewModel = remember { KioskViewModel() }  // ❌ Direct instantiation
) {
    // ...
}
```

**After:**
```kotlin
import com.fivucsas.shared.domain.model.EnrollmentData                 // ✅ From shared
import com.fivucsas.shared.presentation.viewmodel.KioskViewModel       // ✅ From shared
import com.fivucsas.shared.presentation.viewmodel.KioskScreen          // ✅ From shared
import com.fivucsas.shared.presentation.state.UiState                  // ✅ From shared

@Composable
fun KioskMode(
    onBack: () -> Unit,
    viewModel: KioskViewModel = remember {  
        // ✅ TODO: Will use Koin DI later
        KioskViewModel(enrollUserUseCase, verifyUserUseCase)  
    }
) {
    // ✅ Use UiState for enrollment
    val enrollmentState by viewModel.enrollmentState.collectAsState()
    
    when (enrollmentState) {
        is UiState.Idle -> { /* Show form */ }
        is UiState.Loading -> { CircularProgressIndicator() }
        is UiState.Success -> { /* Show success */ }
        is UiState.Error -> { /* Show error */ }
    }
}

// ✅ REMOVE local KioskViewModel class
// ✅ REMOVE local EnrollmentData class
// ✅ REMOVE local KioskScreen enum
```

**MODIFY:** `desktopApp/src/.../ui/admin/AdminDashboard.kt`

**Before:**
```kotlin
class AdminViewModel { ... }  // ❌ Local definition

@Composable
fun AdminDashboard(
    onBack: () -> Unit,
    viewModel: AdminViewModel = remember { AdminViewModel() }
) {
    // ...
}
```

**After:**
```kotlin
import com.fivucsas.shared.domain.model.User                    // ✅ From shared
import com.fivucsas.shared.domain.model.Statistics             // ✅ From shared
import com.fivucsas.shared.presentation.viewmodel.AdminViewModel  // ✅ From shared
import com.fivucsas.shared.presentation.state.UiState           // ✅ From shared

@Composable
fun AdminDashboard(
    onBack: () -> Unit,
    viewModel: AdminViewModel = remember {
        // ✅ TODO: Will use Koin DI later
        AdminViewModel(getUsersUseCase, searchUsersUseCase, deleteUserUseCase, getStatisticsUseCase)
    }
) {
    // ✅ Use UiState for users
    val usersState by viewModel.usersState.collectAsState()
    
    when (usersState) {
        is UiState.Idle -> { }
        is UiState.Loading -> { CircularProgressIndicator() }
        is UiState.Success -> {
            val users = (usersState as UiState.Success).data
            UsersTable(users)
        }
        is UiState.Error -> {
            ErrorMessage((usersState as UiState.Error).message)
        }
    }
}

// ✅ REMOVE local AdminViewModel class
// ✅ REMOVE local User, Statistics classes
// ✅ REMOVE local AdminTab enum
```

**Day 4 Checklist:**
- [ ] Created `UiState<T>` sealed class
- [ ] Moved `AppStateManager` to `shared/presentation/viewmodel/`
- [ ] Moved `KioskViewModel` to `shared/presentation/viewmodel/`
- [ ] Moved `AdminViewModel` to `shared/presentation/viewmodel/`
- [ ] Updated `Main.kt` to use shared ViewModels
- [ ] Updated `KioskMode.kt` to use shared ViewModels
- [ ] Updated `AdminDashboard.kt` to use shared ViewModels
- [ ] Removed local ViewModel classes from `desktopApp/`
- [ ] Verified compilation
- [ ] Verified desktop app still runs

**Estimated Time:** 5-6 hours

---

### END OF WEEK 1 🎉

**What You've Achieved:**

✅ **Clean Architecture in Shared Module**
- Domain layer (models, repositories, use cases, validation)
- Data layer (repository implementations)
- Presentation layer (ViewModels, UI states)

✅ **True Multiplatform Code**
- 90% of code now in `shared/`
- Desktop app uses shared code
- Ready for Android/iOS to reuse

✅ **Better Architecture**
- Repository pattern
- Use cases for business logic
- Comprehensive validation
- Proper error handling (UiState)

✅ **Maintainable Code**
- Single source of truth
- Easy to test
- Easy to extend

**Next Week:** Dependency Injection, API Integration, Testing

---

## 📋 WEEK 2: INFRASTRUCTURE (Days 5-10)

See `REFACTORING_CHECKLIST.md` for detailed Week 2 plan.

**Quick Summary:**
- Day 5: Dependency Injection (Koin)
- Day 6: API Client (Ktor)
- Day 7: Error Handling UI
- Day 8-9: Testing
- Day 10: Security & Polish

---

## 🎯 SUCCESS CRITERIA

### After 10 Days, You Should Have:

✅ **Architecture**
- [ ] All business logic in `shared/`
- [ ] ViewModels in `shared/presentation/`
- [ ] Models in `shared/domain/model/`
- [ ] Repositories in `shared/data/`
- [ ] Use cases in `shared/domain/usecase/`

✅ **Desktop App**
- [ ] Uses only shared ViewModels
- [ ] Only platform-specific: UI + Window management
- [ ] Compiles and runs
- [ ] All features work

✅ **Code Quality**
- [ ] SOLID principles: 95%+
- [ ] No magic values
- [ ] Comprehensive validation
- [ ] Proper error handling
- [ ] Test coverage >80%

✅ **Ready for Android/iOS**
- [ ] Shared module complete
- [ ] Just add platform UI
- [ ] 90-95% code reuse

---

## 📊 QUICK REFERENCE

### What Goes Where?

| Code Type | Location | Shared? |
|-----------|----------|---------|
| **Business Logic** | `shared/domain/` | ✅ 100% |
| **Data Access** | `shared/data/` | ✅ 100% |
| **ViewModels** | `shared/presentation/viewmodel/` | ✅ 100% |
| **Models** | `shared/domain/model/` | ✅ 100% |
| **UI Components** | Platform-specific (desktopApp/androidApp/iosApp) | ❌ Platform-specific |
| **Camera Access** | Platform-specific | ❌ Platform-specific |
| **Permissions** | Platform-specific | ❌ Platform-specific |

### Commands

```bash
# Compile desktop app
./gradlew desktopApp:compileKotlinDesktop

# Run desktop app
./gradlew desktopApp:run

# Compile shared module
./gradlew shared:compileKotlinCommonMain

# Run tests
./gradlew shared:test

# Build all
./gradlew build
```

---

## 🚀 LET'S START!

**Ready to begin? Let's start with Day 1!**

I can help you:
1. Create the directory structure
2. Extract and move the models
3. Create repository interfaces
4. Update imports
5. Verify compilation

**Say "Start Day 1" and I'll begin!** 🎯
