# 🚀 Backend Enhancement: Day 1-2 Implementation Plan

**Phase:** User Management & Statistics API  
**Duration:** 4 hours  
**Goal:** Match mobile app API expectations  

---

## 🎯 **What We'll Build**

### **Mobile App Expects:**
```kotlin
// From your mobile app
interface IdentityApi {
    suspend fun getUsers(): List<UserDto>
    suspend fun getUserById(id: String): UserDto?
    suspend fun createUser(request: CreateUserRequest): UserDto
    suspend fun updateUser(id: String, request: UpdateUserRequest): UserDto
    suspend fun deleteUser(id: String)
    suspend fun searchUsers(query: String): List<UserDto>
    suspend fun getStatistics(): StatisticsDto
}
```

### **We Need to Add:**
1. ✅ User CRUD operations
2. ✅ Search functionality
3. ✅ Statistics endpoint
4. ✅ Enhanced User entity
5. ✅ DTOs matching mobile app

---

## 📋 **Implementation Checklist**

### **Step 1: Enhance User Entity** (30 min)

**Current User.java:**
```java
- email
- passwordHash
- firstName
- lastName
- isBiometricEnrolled
- createdAt
```

**Missing Fields (from mobile app):**
- ❌ idNumber (Turkish ID - 11 digits)
- ❌ phoneNumber
- ❌ address
- ❌ status (ACTIVE, INACTIVE, SUSPENDED)
- ❌ enrolledAt
- ❌ lastVerifiedAt
- ❌ verificationCount

**Action:** Update User.java to match mobile app User model

---

### **Step 2: Create DTOs** (30 min)

**Files to Create:**
```
dto/
├── UserDto.java                    ✅ Full user data
├── CreateUserRequest.java          ✅ Create request
├── UpdateUserRequest.java          ✅ Update request
├── UserSearchRequest.java          ✅ Search parameters
├── StatisticsDto.java              ✅ Statistics data
└── ErrorResponse.java              ✅ Error handling
```

**UserDto.java:**
```java
public class UserDto {
    private String id;
    private String name;           // firstName + lastName
    private String email;
    private String idNumber;       // Turkish ID
    private String phoneNumber;
    private String address;
    private UserStatus status;     // ACTIVE, INACTIVE, SUSPENDED
    private Instant enrolledAt;
    private Instant lastVerifiedAt;
    private Integer verificationCount;
}
```

---

### **Step 3: Create UserController** (45 min)

**File:** `controller/UserController.java`

**Endpoints:**
```java
@RestController
@RequestMapping("/api/v1/users")
public class UserController {
    
    @GetMapping
    public ResponseEntity<List<UserDto>> getAllUsers();
    
    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getUserById(@PathVariable String id);
    
    @PostMapping
    public ResponseEntity<UserDto> createUser(@Valid @RequestBody CreateUserRequest request);
    
    @PutMapping("/{id}")
    public ResponseEntity<UserDto> updateUser(
        @PathVariable String id, 
        @Valid @RequestBody UpdateUserRequest request
    );
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable String id);
    
    @GetMapping("/search")
    public ResponseEntity<List<UserDto>> searchUsers(
        @RequestParam String query
    );
}
```

---

### **Step 4: Create UserService** (45 min)

**File:** `service/UserService.java`

**Methods:**
```java
@Service
public class UserService {
    
    public List<UserDto> getAllUsers();
    
    public Optional<UserDto> getUserById(String id);
    
    public UserDto createUser(CreateUserRequest request);
    
    public UserDto updateUser(String id, UpdateUserRequest request);
    
    public void deleteUser(String id);
    
    public List<UserDto> searchUsers(String query);
    
    // Helper methods
    private UserDto mapToDto(User user);
    private User mapToEntity(CreateUserRequest request);
}
```

---

### **Step 5: Create StatisticsController** (30 min)

**File:** `controller/StatisticsController.java`

**Endpoint:**
```java
@RestController
@RequestMapping("/api/v1/statistics")
public class StatisticsController {
    
    @GetMapping
    public ResponseEntity<StatisticsDto> getStatistics();
}
```

**StatisticsDto.java:**
```java
public class StatisticsDto {
    private Integer totalUsers;
    private Integer activeUsers;
    private Integer inactiveUsers;
    private Double successRate;
    private Integer totalVerifications;
    private Integer failedAttempts;
}
```

---

### **Step 6: Create StatisticsService** (30 min)

**File:** `service/StatisticsService.java`

**Implementation:**
```java
@Service
public class StatisticsService {
    
    private final UserRepository userRepository;
    private final BiometricDataRepository biometricDataRepository;
    
    public StatisticsDto getStatistics() {
        // Calculate from database
        int totalUsers = userRepository.count();
        int activeUsers = userRepository.countByStatus(UserStatus.ACTIVE);
        double successRate = calculateSuccessRate();
        
        return StatisticsDto.builder()
            .totalUsers(totalUsers)
            .activeUsers(activeUsers)
            .successRate(successRate)
            .build();
    }
}
```

---

### **Step 7: Add Validation** (30 min)

**Create:** `validation/TurkishIdValidator.java`

```java
@Constraint(validatedBy = TurkishIdConstraintValidator.class)
public @interface TurkishId {
    String message() default "Invalid Turkish ID number";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

public class TurkishIdConstraintValidator 
    implements ConstraintValidator<TurkishId, String> {
    
    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.length() != 11) {
            return false;
        }
        
        // Implement Turkish ID algorithm
        // (same as your mobile app ValidationRules.kt)
        return validateTurkishId(value);
    }
}
```

**Update DTOs:**
```java
public class CreateUserRequest {
    
    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 100)
    private String name;
    
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;
    
    @TurkishId  // Custom validator
    private String idNumber;
    
    @Pattern(regexp = "^\\+?[0-9]{10,15}$")
    private String phoneNumber;
}
```

---

### **Step 8: Global Error Handler** (30 min)

**Create:** `exception/GlobalExceptionHandler.java`

```java
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
        MethodArgumentNotValidException ex
    ) {
        List<String> errors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(FieldError::getDefaultMessage)
            .collect(Collectors.toList());
            
        ErrorResponse response = ErrorResponse.builder()
            .timestamp(Instant.now())
            .status(400)
            .error("Validation Failed")
            .message(errors.toString())
            .build();
            
        return ResponseEntity.badRequest().body(response);
    }
    
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(
        EntityNotFoundException ex
    ) {
        // Return 404 with user-friendly message
    }
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(
        Exception ex
    ) {
        log.error("Unexpected error occurred", ex);
        // Return 500 with generic message
    }
}
```

---

## 📁 **Files to Create (Summary)**

### **Entities:**
1. Update `User.java` - Add missing fields

### **DTOs (7 files):**
1. `UserDto.java`
2. `CreateUserRequest.java`
3. `UpdateUserRequest.java`
4. `UserSearchRequest.java`
5. `StatisticsDto.java`
6. `ErrorResponse.java`
7. `UserStatus.java` (enum)

### **Controllers (2 files):**
1. `UserController.java`
2. `StatisticsController.java`

### **Services (2 files):**
1. `UserService.java`
2. `StatisticsService.java`

### **Validation (1 file):**
1. `TurkishIdValidator.java`

### **Exception Handling (2 files):**
1. `GlobalExceptionHandler.java`
2. `EntityNotFoundException.java`

**Total:** ~15 new files + 1 update

---

## 🧪 **Testing Strategy**

### **Manual Testing (Quick):**
```bash
# 1. Start backend
cd identity-core-api
./gradlew bootRun

# 2. Test endpoints with curl
curl http://localhost:8080/api/v1/users
curl http://localhost:8080/api/v1/statistics
curl -X POST http://localhost:8080/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","idNumber":"12345678901"}'
```

### **Swagger Testing:**
```
http://localhost:8080/swagger-ui.html
```

### **Mobile App Integration:**
```kotlin
// In ApiConfig.kt
ApiConfig.useRealApi = true
ApiConfig.currentEnvironment = Environment.DEVELOPMENT
// Base URL: http://localhost:8080/api/v1
```

---

## ⏱️ **Time Breakdown**

```
Step 1: Enhance User Entity          (30 min)
Step 2: Create DTOs                   (30 min)
Step 3: Create UserController         (45 min)
Step 4: Create UserService            (45 min)
Step 5: Create StatisticsController   (30 min)
Step 6: Create StatisticsService      (30 min)
Step 7: Add Validation                (30 min)
Step 8: Global Error Handler          (30 min)
Testing & Integration                 (30 min)
===============================================
Total:                                ~4 hours
```

---

## ✅ **Success Criteria**

After implementation, you should have:
- [x] All CRUD endpoints working
- [x] Search functionality
- [x] Statistics endpoint
- [x] Input validation
- [x] Error handling
- [x] Swagger documentation
- [x] Compatible with mobile app
- [x] Ready to test integration

---

## 🚀 **Ready to Start?**

**We'll implement this step-by-step:**
1. Start with User entity enhancement
2. Create DTOs
3. Build controllers
4. Implement services
5. Add validation
6. Test everything

**Estimated completion:** 4 hours  
**Result:** Fully functional backend matching mobile app!

---

**Let's begin! Should we start with Step 1 (User Entity)?** 🎯
