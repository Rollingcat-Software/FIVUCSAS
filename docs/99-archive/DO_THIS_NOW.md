# ⚡ IMMEDIATE NEXT STEP - 3 HOURS TO MVP

**Current Time:** November 3, 2025 20:02  
**Biometric Service:** ✅ RUNNING on :8001  
**Backend API:** ❌ NOT RUNNING (needs start)

---

## 🎯 WHAT TO DO RIGHT NOW

### **Step 1: Start Backend API** (5 minutes)

```powershell
# Open NEW terminal window
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\identity-core-api

# Start the backend
.\gradlew.bat bootRun

# Wait for: "Started IdentityCoreApiApplication"
```

**Expected Output:**
```
...
2025-11-03 20:XX:XX.XXX  INFO --- [main] c.f.i.IdentityCoreApiApplication : Started IdentityCoreApiApplication in X.XXX seconds
```

---

### **Step 2: Verify Backend** (1 minute)

```powershell
# In another terminal
Invoke-RestMethod http://localhost:8080/api/v1/health

# Expected: {"status": "healthy"}
```

---

### **Step 3: Add Biometric Integration** (2 hours)

Create the integration between Spring Boot and Biometric Service.

#### **3.1 Create Biometric Controller**

**File:** `identity-core-api/src/main/java/com/fivucsas/identitycore/controller/BiometricController.java`

```java
package com.fivucsas.identitycore.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.fivucsas.identitycore.dto.BiometricEnrollRequest;
import com.fivucsas.identitycore.dto.BiometricVerifyRequest;
import com.fivucsas.identitycore.service.BiometricService;

@RestController
@RequestMapping("/api/v1/biometric")
public class BiometricController {

    @Autowired
    private BiometricService biometricService;

    @PostMapping("/enroll")
    public ResponseEntity<?> enrollFace(
        @RequestParam("userId") Long userId,
        @RequestParam("file") MultipartFile file
    ) {
        return biometricService.enrollFace(userId, file);
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyFace(
        @RequestParam("userId") Long userId,
        @RequestParam("file") MultipartFile file
    ) {
        return biometricService.verifyFace(userId, file);
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Map.of("status", "healthy", "service", "biometric"));
    }
}
```

#### **3.2 Create Biometric Service**

**File:** `identity-core-api/src/main/java/com/fivucsas/identitycore/service/BiometricService.java`

```java
package com.fivucsas.identitycore.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@Service
public class BiometricService {

    @Value("${biometric.service.url:http://localhost:8001}")
    private String biometricServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public ResponseEntity<?> enrollFace(Long userId, MultipartFile file) {
        try {
            // Call Python biometric service
            String url = biometricServiceUrl + "/api/v1/face/enroll";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename();
                }
            });

            HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);
            
            // Get embedding from biometric service
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                Map<String, Object> biometricResponse = response.getBody();
                String embedding = (String) biometricResponse.get("embedding");
                
                // TODO: Store embedding in database with userId
                // userRepository.saveEmbedding(userId, embedding);
                
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Face enrolled successfully",
                    "userId", userId
                ));
            } else {
                return ResponseEntity.status(response.getStatusCode())
                    .body(Map.of("error", "Biometric enrollment failed"));
            }
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }

    public ResponseEntity<?> verifyFace(Long userId, MultipartFile file) {
        try {
            // TODO: Get stored embedding from database
            // String storedEmbedding = userRepository.getEmbedding(userId);
            
            String storedEmbedding = ""; // Placeholder
            
            // Call Python biometric service
            String url = biometricServiceUrl + "/api/v1/face/verify";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename();
                }
            });
            body.add("stored_embedding", storedEmbedding);

            HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            
            return ResponseEntity.ok(response.getBody());
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }
}
```

---

### **Step 4: Test Integration** (30 minutes)

```powershell
# Test biometric enrollment
$imagePath = "C:\path\to\test-face.jpg"
$uri = "http://localhost:8080/api/v1/biometric/enroll"

$form = @{
    userId = 1
    file = Get-Item -Path $imagePath
}

Invoke-RestMethod -Uri $uri -Method Post -Form $form
```

---

### **Step 5: Test Mobile App** (30 minutes)

Once backend is working:

```powershell
# Navigate to mobile app
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\mobile-app

# Run on Android emulator or device
.\gradlew.bat :composeApp:installDebug
```

---

## ✅ SUCCESS CRITERIA

When complete, you should have:

1. ✅ Backend running on :8080
2. ✅ Biometric service running on :8001
3. ✅ Face enrollment working
4. ✅ Face verification working
5. ✅ Mobile app connecting to backend
6. ✅ **MVP COMPLETE** 🎉

---

## 🚨 IF BACKEND WON'T START

### **Issue: Gradle build fails**
```powershell
cd identity-core-api
.\gradlew.bat clean build --refresh-dependencies
```

### **Issue: Port 8080 already in use**
```powershell
# Find and kill process
netstat -ano | findstr :8080
taskkill /PID <process_id> /F
```

### **Issue: Database connection error**
Check `application.yml` - should be using H2 in-memory for MVP

---

## 📊 TIME BREAKDOWN

| Task | Time | Status |
|------|------|--------|
| Start Backend | 5 min | ⏸️ Waiting |
| Verify Backend | 1 min | ⏸️ Waiting |
| Add BiometricController | 30 min | ⏸️ Waiting |
| Add BiometricService | 45 min | ⏸️ Waiting |
| Test Integration | 30 min | ⏸️ Waiting |
| Test Mobile App | 30 min | ⏸️ Waiting |
| **TOTAL** | **~3 hours** | **⏸️ Ready to Start** |

---

## 💬 WHAT TO SAY

Ready to start? Say:

```
"Start the backend API now"
"Add biometric integration to Spring Boot"
"Test the complete MVP flow"
```

---

**Current Status:** Biometric ✅ | Backend ❌ | Mobile ⏸️  
**Next Action:** START BACKEND  
**Time to MVP:** 3 hours ⚡

---

**Last Updated:** November 3, 2025 20:02
