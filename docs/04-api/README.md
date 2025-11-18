# API Documentation

Interactive API documentation for FIVUCSAS services.

## Auto-Generated API Documentation

### Backend API (Spring Boot)

**⭐ Interactive Documentation:**
- **Swagger UI:** [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- **OpenAPI JSON:** [http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs)
- **OpenAPI YAML:** [http://localhost:8080/v3/api-docs.yaml](http://localhost:8080/v3/api-docs.yaml)

**Note:** Start the backend first:
```bash
cd identity-core-api
./gradlew bootRun
```

### Biometric Service (FastAPI)

**⭐ Interactive Documentation:**
- **FastAPI Docs:** [http://localhost:8001/docs](http://localhost:8001/docs)
- **ReDoc:** [http://localhost:8001/redoc](http://localhost:8001/redoc)
- **OpenAPI JSON:** [http://localhost:8001/openapi.json](http://localhost:8001/openapi.json)

**Note:** Start the service first:
```bash
cd biometric-processor
./venv/Scripts/activate
uvicorn app.main:app --reload --port 8001
```

## Reference Documentation

- **[SERVICES_OVERVIEW.md](SERVICES_OVERVIEW.md)** - Overview of service capabilities
- **[BACKEND_REVIEW.md](BACKEND_REVIEW.md)** - Backend code review

### Implementation Guides
- **[backend-api/SPRINGDOC_SETUP.md](backend-api/SPRINGDOC_SETUP.md)** - SpringDoc OpenAPI setup for backend
- **[biometric-service/FASTAPI_SETUP.md](biometric-service/FASTAPI_SETUP.md)** - FastAPI documentation setup

## API Features

### Authentication API
- User registration
- User login (JWT tokens)
- Token refresh
- Logout

### User Management API
- Create users
- List users (with search and filtering)
- Get user details
- Update users
- Delete users
- User statistics

### Biometric API
- Enroll face biometric (extract 512-d face embedding)
- Verify face biometric (compare against enrolled embedding)
- Get biometric enrollment status

### Tenant Management API (Future)
- Multi-tenant support

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```bash
Authorization: Bearer <your-jwt-token>
```

## Example API Calls

### Register User
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+905551234567",
    "idNumber": "12345678901"
  }'
```

### Login
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

### Get All Users (requires auth)
```bash
curl -X GET http://localhost:8080/api/v1/users \
  -H "Authorization: Bearer <your-token>"
```

### Enroll Biometric
```bash
curl -X POST http://localhost:8080/api/v1/biometric/enroll/{userId} \
  -H "Authorization: Bearer <your-token>" \
  -F "image=@path/to/face-image.jpg"
```

### Verify Biometric
```bash
curl -X POST http://localhost:8080/api/v1/biometric/verify/{userId} \
  -H "Authorization: Bearer <your-token>" \
  -F "image=@path/to/verification-image.jpg"
```

For more examples and interactive testing, see the Swagger UI.

## API Design Principles

- RESTful design
- OpenAPI 3.0 specification
- Auto-generated from code annotations (always accurate)
- JWT-based authentication
- Proper HTTP status codes
- Consistent error responses
- Input validation

---

[← Back to Main Documentation](../README.md)
