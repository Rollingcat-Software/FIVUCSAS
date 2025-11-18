# Flutter Cross-Platform App Development Guide
## FIVUCSAS Mobile Application

This comprehensive guide will walk you through creating and coding the Flutter mobile app for the FIVUCSAS project from scratch.

---

## Table of Contents
1. [Setup & Installation](#1-setup--installation)
2. [Project Initialization](#2-project-initialization)
3. [Project Structure Setup](#3-project-structure-setup)
4. [Core Configuration](#4-core-configuration)
5. [Dependency Injection](#5-dependency-injection)
6. [Network Layer](#6-network-layer)
7. [Authentication Feature](#7-authentication-feature)
8. [Biometric Feature](#8-biometric-feature)
9. [UI Implementation](#9-ui-implementation)
10. [Testing](#10-testing)
11. [Platform-Specific Configuration](#11-platform-specific-configuration)
12. [Build & Deploy](#12-build--deploy)

---

## 1. Setup & Installation

### Install Flutter SDK

**Windows:**
```powershell
# Download Flutter SDK from https://flutter.dev/docs/get-started/install/windows
# Extract to C:\src\flutter
# Add to PATH: C:\src\flutter\bin

# Verify installation
flutter doctor
```

**macOS/Linux:**
```bash
# Download and extract Flutter
git clone https://github.com/flutter/flutter.git -b stable
export PATH="$PATH:`pwd`/flutter/bin"

# Verify installation
flutter doctor
```

### Install Required Tools

**Android Studio:**
- Download from https://developer.android.com/studio
- Install Android SDK (API 34)
- Install Android Emulator

**Visual Studio Code (Recommended):**
```bash
# Install VS Code
# Install Flutter extension
# Install Dart extension
```

**Xcode (macOS only for iOS):**
```bash
xcode-select --install
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch
```

---

## 2. Project Initialization

### Create Flutter Project

```bash
# Navigate to FIVUCSAS directory
cd C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS

# Remove existing mobile-app if needed (backup .env.example and README.md first)
# Then create new Flutter project
cd mobile-app
flutter create --org com.fivucsas --project-name fivucsas_mobile .

# Verify project creation
flutter pub get
flutter run
```

### Configure pubspec.yaml

Replace the contents of `mobile-app/pubspec.yaml`:

```yaml
name: fivucsas_mobile
description: FIVUCSAS Mobile Application for Biometric Authentication
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.5.0 <4.0.0'
  flutter: ">=3.24.0"

dependencies:
  flutter:
    sdk: flutter
  flutter_localizations:
    sdk: flutter

  # State Management
  flutter_bloc: ^8.1.3
  equatable: ^2.0.5
  get_it: ^7.6.4

  # Networking
  dio: ^5.4.0
  retrofit: ^4.0.3
  retrofit_generator: ^8.0.6
  pretty_dio_logger: ^1.3.1
  json_annotation: ^4.8.1

  # Local Storage
  hive: ^2.2.3
  hive_flutter: ^1.1.0
  shared_preferences: ^2.2.2
  flutter_secure_storage: ^9.0.0

  # Camera & ML
  camera: ^0.10.5+5
  google_mlkit_face_detection: ^0.10.0
  image: ^4.1.3

  # UI Components
  flutter_svg: ^2.0.9
  lottie: ^2.7.0
  shimmer: ^3.0.0
  flutter_screenutil: ^5.9.0
  cached_network_image: ^3.3.0
  carousel_slider: ^4.2.1
  
  # Utilities
  intl: ^0.19.0
  qr_code_scanner: ^1.0.1
  permission_handler: ^11.1.0
  connectivity_plus: ^5.0.2
  path_provider: ^2.1.1
  logger: ^2.0.2+1
  dartz: ^0.10.1
  encrypt: ^5.0.3

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.1
  
  # Code Generation
  build_runner: ^2.4.6
  json_serializable: ^6.7.1
  hive_generator: ^2.0.1
  
  # Testing
  mockito: ^5.4.3
  bloc_test: ^9.1.5
  integration_test:
    sdk: flutter

flutter:
  uses-material-design: true
  
  assets:
    - assets/images/
    - assets/icons/
    - assets/animations/
  
  fonts:
    - family: Poppins
      fonts:
        - asset: assets/fonts/Poppins-Regular.ttf
        - asset: assets/fonts/Poppins-Medium.ttf
          weight: 500
        - asset: assets/fonts/Poppins-SemiBold.ttf
          weight: 600
        - asset: assets/fonts/Poppins-Bold.ttf
          weight: 700
```

Install dependencies:
```bash
flutter pub get
```

---

## 3. Project Structure Setup

### Create Directory Structure

```bash
# Navigate to lib directory
cd mobile-app/lib

# Create core directories
mkdir -p core/{constants,theme,utils,errors,network,config}

# Create feature directories
mkdir -p features/auth/{data/{models,datasources,repositories},domain/{entities,repositories,usecases},presentation/{bloc,pages,widgets}}
mkdir -p features/biometric/{data/{models,datasources,repositories},domain/{entities,repositories,usecases},presentation/{bloc,pages,widgets}}
mkdir -p features/profile/{data/{models,datasources,repositories},domain/{entities,repositories,usecases},presentation/{bloc,pages,widgets}}
mkdir -p features/home/{presentation/{pages,widgets}}

# Create shared directory
mkdir -p shared/widgets
```

Final structure:
```
lib/
├── core/
│   ├── config/
│   ├── constants/
│   ├── errors/
│   ├── network/
│   ├── theme/
│   └── utils/
├── features/
│   ├── auth/
│   │   ├── data/
│   │   ├── domain/
│   │   └── presentation/
│   ├── biometric/
│   │   ├── data/
│   │   ├── domain/
│   │   └── presentation/
│   ├── profile/
│   │   ├── data/
│   │   ├── domain/
│   │   └── presentation/
│   └── home/
│       └── presentation/
├── shared/
│   └── widgets/
├── app.dart
├── injection_container.dart
└── main.dart
```

---

## 4. Core Configuration

### 4.1 Environment Configuration

Create `lib/core/config/env_config.dart`:

```dart
class EnvConfig {
  // API Configuration
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8080/api/v1', // Android emulator
  );
  
  static const String biometricApiUrl = String.fromEnvironment(
    'BIOMETRIC_API_URL',
    defaultValue: 'http://10.0.2.2:8001/api/v1',
  );
  
  // App Configuration
  static const String appName = 'FIVUCSAS';
  static const String environment = String.fromEnvironment(
    'ENVIRONMENT',
    defaultValue: 'development',
  );
  
  // Network Configuration
  static const int connectTimeout = 30000; // 30 seconds
  static const int receiveTimeout = 30000;
  static const int sendTimeout = 30000;
  
  // Storage Keys
  static const String accessTokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userDataKey = 'user_data';
  
  // Feature Flags
  static const bool enableBiometricLogin = true;
  static const bool enablePushNotifications = true;
  static const bool enableAnalytics = false;
  
  static bool get isProduction => environment == 'production';
  static bool get isDevelopment => environment == 'development';
}
```

### 4.2 App Constants

Create `lib/core/constants/app_constants.dart`:

```dart
class AppConstants {
  // API Endpoints
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String refreshToken = '/auth/refresh';
  static const String logout = '/auth/logout';
  static const String profile = '/users/me';
  static const String enrollBiometric = '/face/enroll';
  static const String verifyBiometric = '/face/verify';
  static const String generatePuzzle = '/liveness/generate-puzzle';
  static const String verifyLiveness = '/liveness/verify';
  
  // App Info
  static const String appVersion = '1.0.0';
  static const String appBuild = '1';
  
  // Pagination
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;
  
  // Biometric Settings
  static const int minFaceSize = 100; // pixels
  static const double faceSimilarityThreshold = 0.85;
  static const int maxEnrollmentAttempts = 3;
  static const int puzzleStepCount = 3;
  
  // UI Constants
  static const double defaultPadding = 16.0;
  static const double defaultRadius = 8.0;
  static const double buttonHeight = 48.0;
  
  // Validation
  static const int minPasswordLength = 8;
  static const int maxPasswordLength = 128;
}
```

### 4.3 App Theme

Create `lib/core/theme/app_theme.dart`:

```dart
import 'package:flutter/material.dart';

class AppTheme {
  // Colors
  static const Color primaryColor = Color(0xFF2563EB);
  static const Color secondaryColor = Color(0xFF10B981);
  static const Color errorColor = Color(0xFFEF4444);
  static const Color warningColor = Color(0xFFF59E0B);
  static const Color successColor = Color(0xFF10B981);
  static const Color backgroundColor = Color(0xFFF9FAFB);
  static const Color surfaceColor = Colors.white;
  static const Color textPrimary = Color(0xFF111827);
  static const Color textSecondary = Color(0xFF6B7280);
  
  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.light(
      primary: primaryColor,
      secondary: secondaryColor,
      error: errorColor,
      background: backgroundColor,
      surface: surfaceColor,
    ),
    scaffoldBackgroundColor: backgroundColor,
    fontFamily: 'Poppins',
    
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      foregroundColor: textPrimary,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: TextStyle(
        color: textPrimary,
        fontSize: 18,
        fontWeight: FontWeight.w600,
        fontFamily: 'Poppins',
      ),
    ),
    
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        minimumSize: const Size(double.infinity, 48),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        textStyle: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
    
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: primaryColor, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: errorColor),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    
    cardTheme: CardTheme(
      color: surfaceColor,
      elevation: 1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
    ),
  );
  
  static ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.dark(
      primary: primaryColor,
      secondary: secondaryColor,
      error: errorColor,
      background: const Color(0xFF111827),
      surface: const Color(0xFF1F2937),
    ),
    scaffoldBackgroundColor: const Color(0xFF111827),
    fontFamily: 'Poppins',
  );
}
```

### 4.4 Error Handling

Create `lib/core/errors/failures.dart`:

```dart
import 'package:equatable/equatable.dart';

abstract class Failure extends Equatable {
  final String message;
  final int? code;
  
  const Failure(this.message, [this.code]);
  
  @override
  List<Object?> get props => [message, code];
}

class ServerFailure extends Failure {
  const ServerFailure(String message, [int? code]) : super(message, code);
}

class NetworkFailure extends Failure {
  const NetworkFailure(String message) : super(message);
}

class CacheFailure extends Failure {
  const CacheFailure(String message) : super(message);
}

class ValidationFailure extends Failure {
  const ValidationFailure(String message) : super(message);
}

class AuthenticationFailure extends Failure {
  const AuthenticationFailure(String message, [int? code]) : super(message, code);
}

class BiometricFailure extends Failure {
  const BiometricFailure(String message) : super(message);
}
```

Create `lib/core/errors/exceptions.dart`:

```dart
class ServerException implements Exception {
  final String message;
  final int? statusCode;
  
  ServerException(this.message, [this.statusCode]);
}

class NetworkException implements Exception {
  final String message;
  NetworkException(this.message);
}

class CacheException implements Exception {
  final String message;
  CacheException(this.message);
}

class UnauthorizedException implements Exception {
  final String message;
  UnauthorizedException(this.message);
}
```

---

## 5. Dependency Injection

Create `lib/injection_container.dart`:

```dart
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:get_it/get_it.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'core/config/env_config.dart';
import 'core/network/api_client.dart';
import 'core/network/auth_interceptor.dart';
import 'features/auth/data/datasources/auth_local_datasource.dart';
import 'features/auth/data/datasources/auth_remote_datasource.dart';
import 'features/auth/data/repositories/auth_repository_impl.dart';
import 'features/auth/domain/repositories/auth_repository.dart';
import 'features/auth/domain/usecases/login_usecase.dart';
import 'features/auth/domain/usecases/logout_usecase.dart';
import 'features/auth/domain/usecases/register_usecase.dart';
import 'features/auth/presentation/bloc/auth_bloc.dart';

final sl = GetIt.instance;

Future<void> init() async {
  // External Dependencies
  final sharedPreferences = await SharedPreferences.getInstance();
  sl.registerLazySingleton(() => sharedPreferences);
  
  const secureStorage = FlutterSecureStorage();
  sl.registerLazySingleton(() => secureStorage);
  
  await Hive.initFlutter();
  
  // Dio & Network
  sl.registerLazySingleton(() => Dio(BaseOptions(
    baseUrl: EnvConfig.apiBaseUrl,
    connectTimeout: const Duration(milliseconds: EnvConfig.connectTimeout),
    receiveTimeout: const Duration(milliseconds: EnvConfig.receiveTimeout),
    sendTimeout: const Duration(milliseconds: EnvConfig.sendTimeout),
  )));
  
  sl.registerLazySingleton(() => AuthInterceptor(sl(), sl()));
  
  sl<Dio>().interceptors.add(sl<AuthInterceptor>());
  
  sl.registerLazySingleton<ApiClient>(() => ApiClient(sl()));
  
  // Data Sources
  sl.registerLazySingleton<AuthRemoteDataSource>(
    () => AuthRemoteDataSourceImpl(sl()),
  );
  
  sl.registerLazySingleton<AuthLocalDataSource>(
    () => AuthLocalDataSourceImpl(sl(), sl()),
  );
  
  // Repositories
  sl.registerLazySingleton<AuthRepository>(
    () => AuthRepositoryImpl(
      remoteDataSource: sl(),
      localDataSource: sl(),
    ),
  );
  
  // Use Cases
  sl.registerLazySingleton(() => LoginUseCase(sl()));
  sl.registerLazySingleton(() => RegisterUseCase(sl()));
  sl.registerLazySingleton(() => LogoutUseCase(sl()));
  
  // BLoCs
  sl.registerFactory(
    () => AuthBloc(
      loginUseCase: sl(),
      registerUseCase: sl(),
      logoutUseCase: sl(),
    ),
  );
}
```

---

## 6. Network Layer

### 6.1 API Client

Create `lib/core/network/api_client.dart`:

```dart
import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';

import '../config/env_config.dart';
import '../../features/auth/data/models/login_request.dart';
import '../../features/auth/data/models/login_response.dart';
import '../../features/auth/data/models/register_request.dart';
import '../../features/auth/data/models/user_model.dart';

part 'api_client.g.dart';

@RestApi(baseUrl: EnvConfig.apiBaseUrl)
abstract class ApiClient {
  factory ApiClient(Dio dio, {String baseUrl}) = _ApiClient;
  
  // Auth Endpoints
  @POST('/auth/login')
  Future<LoginResponse> login(@Body() LoginRequest request);
  
  @POST('/auth/register')
  Future<UserModel> register(@Body() RegisterRequest request);
  
  @POST('/auth/refresh')
  Future<LoginResponse> refreshToken(@Body() Map<String, String> request);
  
  @POST('/auth/logout')
  Future<void> logout();
  
  // User Endpoints
  @GET('/users/me')
  Future<UserModel> getProfile();
  
  @PUT('/users/me')
  Future<UserModel> updateProfile(@Body() Map<String, dynamic> data);
}
```

### 6.2 Auth Interceptor

Create `lib/core/network/auth_interceptor.dart`:

```dart
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config/env_config.dart';

class AuthInterceptor extends Interceptor {
  final FlutterSecureStorage secureStorage;
  final SharedPreferences sharedPreferences;
  
  AuthInterceptor(this.secureStorage, this.sharedPreferences);
  
  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await secureStorage.read(key: EnvConfig.accessTokenKey);
    
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    
    return handler.next(options);
  }
  
  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode == 401) {
      // Try to refresh token
      final refreshToken = await secureStorage.read(
        key: EnvConfig.refreshTokenKey,
      );
      
      if (refreshToken != null) {
        try {
          final dio = Dio(BaseOptions(baseUrl: EnvConfig.apiBaseUrl));
          final response = await dio.post('/auth/refresh', data: {
            'refreshToken': refreshToken,
          });
          
          final newAccessToken = response.data['accessToken'];
          await secureStorage.write(
            key: EnvConfig.accessTokenKey,
            value: newAccessToken,
          );
          
          // Retry original request
          err.requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';
          final cloneReq = await dio.fetch(err.requestOptions);
          return handler.resolve(cloneReq);
        } catch (e) {
          // Refresh failed, logout user
          await secureStorage.deleteAll();
          await sharedPreferences.clear();
        }
      }
    }
    
    return handler.next(err);
  }
}
```

---

## 7. Authentication Feature

### 7.1 Domain Layer - Entity

Create `lib/features/auth/domain/entities/user.dart`:

```dart
import 'package:equatable/equatable.dart';

class User extends Equatable {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String? phoneNumber;
  final bool isBiometricEnrolled;
  final DateTime createdAt;
  
  const User({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    this.phoneNumber,
    required this.isBiometricEnrolled,
    required this.createdAt,
  });
  
  String get fullName => '$firstName $lastName';
  
  @override
  List<Object?> get props => [
    id,
    email,
    firstName,
    lastName,
    phoneNumber,
    isBiometricEnrolled,
    createdAt,
  ];
}
```

### 7.2 Domain Layer - Repository Interface

Create `lib/features/auth/domain/repositories/auth_repository.dart`:

```dart
import 'package:dartz/dartz.dart';

import '../../../../core/errors/failures.dart';
import '../entities/user.dart';

abstract class AuthRepository {
  Future<Either<Failure, User>> login(String email, String password);
  Future<Either<Failure, User>> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    String? phoneNumber,
  });
  Future<Either<Failure, void>> logout();
  Future<Either<Failure, User>> getCurrentUser();
  Future<bool> isLoggedIn();
}
```

### 7.3 Domain Layer - Use Cases

Create `lib/features/auth/domain/usecases/login_usecase.dart`:

```dart
import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';

import '../../../../core/errors/failures.dart';
import '../entities/user.dart';
import '../repositories/auth_repository.dart';

class LoginUseCase {
  final AuthRepository repository;
  
  LoginUseCase(this.repository);
  
  Future<Either<Failure, User>> call(LoginParams params) {
    return repository.login(params.email, params.password);
  }
}

class LoginParams extends Equatable {
  final String email;
  final String password;
  
  const LoginParams({
    required this.email,
    required this.password,
  });
  
  @override
  List<Object> get props => [email, password];
}
```

Create similar files for `register_usecase.dart` and `logout_usecase.dart`.

### 7.4 Data Layer - Models

Create `lib/features/auth/data/models/user_model.dart`:

```dart
import 'package:json_annotation/json_annotation.dart';

import '../../domain/entities/user.dart';

part 'user_model.g.dart';

@JsonSerializable()
class UserModel extends User {
  const UserModel({
    required String id,
    required String email,
    required String firstName,
    required String lastName,
    String? phoneNumber,
    required bool isBiometricEnrolled,
    required DateTime createdAt,
  }) : super(
    id: id,
    email: email,
    firstName: firstName,
    lastName: lastName,
    phoneNumber: phoneNumber,
    isBiometricEnrolled: isBiometricEnrolled,
    createdAt: createdAt,
  );
  
  factory UserModel.fromJson(Map<String, dynamic> json) =>
      _$UserModelFromJson(json);
  
  Map<String, dynamic> toJson() => _$UserModelToJson(this);
}
```

### 7.5 Data Layer - Data Sources

Create `lib/features/auth/data/datasources/auth_remote_datasource.dart`:

```dart
import '../../../../core/errors/exceptions.dart';
import '../../../../core/network/api_client.dart';
import '../models/login_request.dart';
import '../models/register_request.dart';
import '../models/user_model.dart';

abstract class AuthRemoteDataSource {
  Future<UserModel> login(String email, String password);
  Future<UserModel> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    String? phoneNumber,
  });
  Future<void> logout();
  Future<UserModel> getProfile();
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final ApiClient apiClient;
  
  AuthRemoteDataSourceImpl(this.apiClient);
  
  @override
  Future<UserModel> login(String email, String password) async {
    try {
      final request = LoginRequest(email: email, password: password);
      final response = await apiClient.login(request);
      
      // Store tokens (handle in interceptor or here)
      return response.user;
    } catch (e) {
      throw ServerException('Login failed: ${e.toString()}');
    }
  }
  
  @override
  Future<UserModel> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    String? phoneNumber,
  }) async {
    try {
      final request = RegisterRequest(
        email: email,
        password: password,
        firstName: firstName,
        lastName: lastName,
        phoneNumber: phoneNumber,
      );
      return await apiClient.register(request);
    } catch (e) {
      throw ServerException('Registration failed: ${e.toString()}');
    }
  }
  
  @override
  Future<void> logout() async {
    try {
      await apiClient.logout();
    } catch (e) {
      throw ServerException('Logout failed: ${e.toString()}');
    }
  }
  
  @override
  Future<UserModel> getProfile() async {
    try {
      return await apiClient.getProfile();
    } catch (e) {
      throw ServerException('Failed to get profile: ${e.toString()}');
    }
  }
}
```

### 7.6 Data Layer - Repository Implementation

Create `lib/features/auth/data/repositories/auth_repository_impl.dart`:

```dart
import 'package:dartz/dartz.dart';

import '../../../../core/errors/exceptions.dart';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_local_datasource.dart';
import '../datasources/auth_remote_datasource.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource remoteDataSource;
  final AuthLocalDataSource localDataSource;
  
  AuthRepositoryImpl({
    required this.remoteDataSource,
    required this.localDataSource,
  });
  
  @override
  Future<Either<Failure, User>> login(String email, String password) async {
    try {
      final user = await remoteDataSource.login(email, password);
      await localDataSource.cacheUser(user);
      return Right(user);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }
  
  @override
  Future<Either<Failure, User>> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    String? phoneNumber,
  }) async {
    try {
      final user = await remoteDataSource.register(
        email: email,
        password: password,
        firstName: firstName,
        lastName: lastName,
        phoneNumber: phoneNumber,
      );
      await localDataSource.cacheUser(user);
      return Right(user);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }
  
  @override
  Future<Either<Failure, void>> logout() async {
    try {
      await remoteDataSource.logout();
      await localDataSource.clearCache();
      return const Right(null);
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }
  
  @override
  Future<Either<Failure, User>> getCurrentUser() async {
    try {
      final user = await localDataSource.getCachedUser();
      if (user != null) {
        return Right(user);
      }
      return const Left(CacheFailure('No user found'));
    } catch (e) {
      return Left(CacheFailure(e.toString()));
    }
  }
  
  @override
  Future<bool> isLoggedIn() async {
    return await localDataSource.hasToken();
  }
}
```

### 7.7 Presentation Layer - BLoC

Create `lib/features/auth/presentation/bloc/auth_bloc.dart`:

```dart
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';

import '../../domain/entities/user.dart';
import '../../domain/usecases/login_usecase.dart';
import '../../domain/usecases/logout_usecase.dart';
import '../../domain/usecases/register_usecase.dart';

part 'auth_event.dart';
part 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final LoginUseCase loginUseCase;
  final RegisterUseCase registerUseCase;
  final LogoutUseCase logoutUseCase;
  
  AuthBloc({
    required this.loginUseCase,
    required this.registerUseCase,
    required this.logoutUseCase,
  }) : super(AuthInitial()) {
    on<LoginRequested>(_onLoginRequested);
    on<RegisterRequested>(_onRegisterRequested);
    on<LogoutRequested>(_onLogoutRequested);
  }
  
  Future<void> _onLoginRequested(
    LoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    
    final result = await loginUseCase(
      LoginParams(email: event.email, password: event.password),
    );
    
    result.fold(
      (failure) => emit(AuthError(failure.message)),
      (user) => emit(Authenticated(user)),
    );
  }
  
  Future<void> _onRegisterRequested(
    RegisterRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    
    final result = await registerUseCase(
      RegisterParams(
        email: event.email,
        password: event.password,
        firstName: event.firstName,
        lastName: event.lastName,
        phoneNumber: event.phoneNumber,
      ),
    );
    
    result.fold(
      (failure) => emit(AuthError(failure.message)),
      (user) => emit(Authenticated(user)),
    );
  }
  
  Future<void> _onLogoutRequested(
    LogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    
    final result = await logoutUseCase();
    
    result.fold(
      (failure) => emit(AuthError(failure.message)),
      (_) => emit(AuthInitial()),
    );
  }
}
```

### 7.8 Presentation Layer - UI

Create `lib/features/auth/presentation/pages/login_page.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../bloc/auth_bloc.dart';
import '../widgets/login_form.dart';

class LoginPage extends StatelessWidget {
  const LoginPage({super.key});
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: BlocConsumer<AuthBloc, AuthState>(
          listener: (context, state) {
            if (state is Authenticated) {
              Navigator.of(context).pushReplacementNamed('/home');
            } else if (state is AuthError) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(state.message)),
              );
            }
          },
          builder: (context, state) {
            return SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 60),
                  
                  // Logo
                  Image.asset(
                    'assets/images/logo.png',
                    height: 80,
                  ),
                  const SizedBox(height: 24),
                  
                  // Title
                  Text(
                    'Welcome Back',
                    style: Theme.of(context).textTheme.headlineMedium,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Sign in to continue',
                    style: Theme.of(context).textTheme.bodyMedium,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 48),
                  
                  // Login Form
                  const LoginForm(),
                  
                  const SizedBox(height: 24),
                  
                  // Register Link
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text("Don't have an account? "),
                      TextButton(
                        onPressed: () {
                          Navigator.pushNamed(context, '/register');
                        },
                        child: const Text('Sign Up'),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
```

---

## 8. Biometric Feature

### 8.1 Camera Service

Create `lib/features/biometric/data/services/camera_service.dart`:

```dart
import 'package:camera/camera.dart';

class CameraService {
  CameraController? _controller;
  bool _isInitialized = false;
  
  Future<void> initialize() async {
    final cameras = await availableCameras();
    final frontCamera = cameras.firstWhere(
      (camera) => camera.lensDirection == CameraLensDirection.front,
      orElse: () => cameras.first,
    );
    
    _controller = CameraController(
      frontCamera,
      ResolutionPreset.medium,
      enableAudio: false,
      imageFormatGroup: ImageFormatGroup.yuv420,
    );
    
    await _controller!.initialize();
    _isInitialized = true;
  }
  
  CameraController? get controller => _controller;
  bool get isInitialized => _isInitialized;
  
  void dispose() {
    _controller?.dispose();
    _isInitialized = false;
  }
  
  Future<String> takePicture() async {
    if (!_isInitialized || _controller == null) {
      throw Exception('Camera not initialized');
    }
    
    final image = await _controller!.takePicture();
    return image.path;
  }
  
  Stream<CameraImage> get imageStream {
    if (!_isInitialized || _controller == null) {
      throw Exception('Camera not initialized');
    }
    
    return Stream.fromFuture(
      _controller!.startImageStream().then((_) => _controller!.value.isStreamingImages
        ? Stream<CameraImage>.empty()
        : Stream<CameraImage>.empty()
      ),
    );
  }
}
```

### 8.2 Face Detection Service

Create `lib/features/biometric/data/services/face_detection_service.dart`:

```dart
import 'package:camera/camera.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';

class FaceDetectionService {
  late FaceDetector _faceDetector;
  
  FaceDetectionService() {
    _faceDetector = FaceDetector(
      options: FaceDetectorOptions(
        enableLandmarks: true,
        enableClassification: true,
        enableTracking: true,
        performanceMode: FaceDetectorMode.accurate,
      ),
    );
  }
  
  Future<List<Face>> detectFaces(CameraImage image) async {
    final inputImage = _convertToInputImage(image);
    if (inputImage == null) return [];
    
    final faces = await _faceDetector.processImage(inputImage);
    return faces;
  }
  
  InputImage? _convertToInputImage(CameraImage image) {
    // Convert CameraImage to InputImage
    // Implementation depends on platform
    return null; // Placeholder
  }
  
  bool isFaceInFrame(Face face, Size imageSize) {
    final boundingBox = face.boundingBox;
    
    // Check if face is centered and large enough
    final centerX = imageSize.width / 2;
    final centerY = imageSize.height / 2;
    
    final faceCenterX = boundingBox.left + boundingBox.width / 2;
    final faceCenterY = boundingBox.top + boundingBox.height / 2;
    
    final isHorizontallyCentered = (faceCenterX - centerX).abs() < imageSize.width * 0.2;
    final isVerticallyCentered = (faceCenterY - centerY).abs() < imageSize.height * 0.2;
    final isLargeEnough = boundingBox.width > imageSize.width * 0.3;
    
    return isHorizontallyCentered && isVerticallyCentered && isLargeEnough;
  }
  
  bool detectSmile(Face face) {
    return face.smilingProbability != null && face.smilingProbability! > 0.8;
  }
  
  bool detectBlink(Face face) {
    final leftEyeOpen = face.leftEyeOpenProbability ?? 1.0;
    final rightEyeOpen = face.rightEyeOpenProbability ?? 1.0;
    
    return leftEyeOpen < 0.2 && rightEyeOpen < 0.2;
  }
  
  void dispose() {
    _faceDetector.close();
  }
}
```

---

## 9. UI Implementation

### 9.1 Main App

Update `lib/main.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

import 'app.dart';
import 'injection_container.dart' as di;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await di.init();
  
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});
  
  @override
  Widget build(BuildContext context) {
    return ScreenUtilInit(
      designSize: const Size(375, 812),
      builder: (context, child) {
        return App();
      },
    );
  }
}
```

Create `lib/app.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'core/theme/app_theme.dart';
import 'features/auth/presentation/bloc/auth_bloc.dart';
import 'features/auth/presentation/pages/login_page.dart';
import 'features/auth/presentation/pages/register_page.dart';
import 'features/home/presentation/pages/home_page.dart';
import 'injection_container.dart';

class App extends StatelessWidget {
  const App({super.key});
  
  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<AuthBloc>(
          create: (_) => sl<AuthBloc>(),
        ),
      ],
      child: MaterialApp(
        title: 'FIVUCSAS',
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.light,
        initialRoute: '/login',
        routes: {
          '/login': (context) => const LoginPage(),
          '/register': (context) => const RegisterPage(),
          '/home': (context) => const HomePage(),
        },
      ),
    );
  }
}
```

---

## 10. Testing

### 10.1 Unit Tests

Create `test/features/auth/domain/usecases/login_usecase_test.dart`:

```dart
import 'package:dartz/dartz.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';

import 'package:fivucsas_mobile/features/auth/domain/entities/user.dart';
import 'package:fivucsas_mobile/features/auth/domain/repositories/auth_repository.dart';
import 'package:fivucsas_mobile/features/auth/domain/usecases/login_usecase.dart';

@GenerateMocks([AuthRepository])
import 'login_usecase_test.mocks.dart';

void main() {
  late LoginUseCase usecase;
  late MockAuthRepository mockAuthRepository;
  
  setUp(() {
    mockAuthRepository = MockAuthRepository();
    usecase = LoginUseCase(mockAuthRepository);
  });
  
  const testUser = User(
    id: '1',
    email: 'test@test.com',
    firstName: 'Test',
    lastName: 'User',
    isBiometricEnrolled: false,
    createdAt: '2024-01-01',
  );
  
  test('should return User when login is successful', () async {
    // Arrange
    when(mockAuthRepository.login(any, any))
        .thenAnswer((_) async => const Right(testUser));
    
    // Act
    final result = await usecase(
      const LoginParams(email: 'test@test.com', password: 'password'),
    );
    
    // Assert
    expect(result, const Right(testUser));
    verify(mockAuthRepository.login('test@test.com', 'password'));
    verifyNoMoreInteractions(mockAuthRepository);
  });
}
```

### 10.2 Widget Tests

Create `test/features/auth/presentation/pages/login_page_test.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';

import 'package:fivucsas_mobile/features/auth/presentation/bloc/auth_bloc.dart';
import 'package:fivucsas_mobile/features/auth/presentation/pages/login_page.dart';

void main() {
  late MockAuthBloc mockAuthBloc;
  
  setUp(() {
    mockAuthBloc = MockAuthBloc();
  });
  
  Widget makeTestableWidget(Widget body) {
    return MaterialApp(
      home: BlocProvider<AuthBloc>.value(
        value: mockAuthBloc,
        child: body,
      ),
    );
  }
  
  testWidgets('should show login form', (WidgetTester tester) async {
    // Arrange
    when(mockAuthBloc.state).thenReturn(AuthInitial());
    
    // Act
    await tester.pumpWidget(makeTestableWidget(const LoginPage()));
    
    // Assert
    expect(find.text('Welcome Back'), findsOneWidget);
    expect(find.byType(TextField), findsNWidgets(2));
    expect(find.byType(ElevatedButton), findsOneWidget);
  });
}
```

---

## 11. Platform-Specific Configuration

### 11.1 Android Configuration

Edit `android/app/build.gradle`:

```gradle
android {
    namespace "com.fivucsas.mobile"
    compileSdkVersion 34
    ndkVersion flutter.ndkVersion

    defaultConfig {
        applicationId "com.fivucsas.mobile"
        minSdkVersion 21
        targetSdkVersion 34
        versionCode flutterVersionCode.toInteger()
        versionName flutterVersionName
        multiDexEnabled true
    }

    buildTypes {
        release {
            signingConfig signingConfigs.debug
            minifyEnabled true
            shrinkResources true
        }
    }
}

dependencies {
    implementation 'androidx.multidex:multidex:2.0.1'
}
```

Edit `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.CAMERA"/>
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
    
    <uses-feature android:name="android.hardware.camera"/>
    <uses-feature android:name="android.hardware.camera.autofocus"/>
    
    <application
        android:label="FIVUCSAS"
        android:name="${applicationName}"
        android:icon="@mipmap/ic_launcher">
        <!-- Activities -->
    </application>
</manifest>
```

### 11.2 iOS Configuration

Edit `ios/Runner/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access for facial recognition and biometric enrollment</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>We need photo library access to select and save images</string>
<key>NSFaceIDUsageDescription</key>
<string>We use Face ID for secure authentication</string>
```

---

## 12. Build & Deploy

### Generate Code

```bash
# Generate code for JSON serialization and Retrofit
flutter pub run build_runner build --delete-conflicting-outputs
```

### Run the App

```bash
# Debug mode
flutter run

# Profile mode
flutter run --profile

# Release mode
flutter run --release
```

### Build APK

```bash
# Build debug APK
flutter build apk --debug

# Build release APK
flutter build apk --release

# Build split APKs
flutter build apk --split-per-abi
```

### Build for iOS

```bash
# Build for iOS
flutter build ios --release

# Build IPA
flutter build ipa --release
```

---

## Next Steps

1. **Implement remaining features:**
   - Complete biometric enrollment flow
   - Add liveness detection (Biometric Puzzle)
   - Implement profile management
   - Add settings screen

2. **Add advanced features:**
   - Push notifications
   - Offline support with local cache
   - QR code scanning
   - Biometric authentication history

3. **Testing & Quality:**
   - Write comprehensive unit tests
   - Add widget tests
   - Implement integration tests
   - Set up CI/CD pipeline

4. **Performance optimization:**
   - Optimize image processing
   - Reduce app size
   - Improve cold start time
   - Add performance monitoring

5. **Documentation:**
   - API documentation
   - User guide
   - Developer documentation
   - Deployment guide

---

## Useful Commands

```bash
# Check for issues
flutter doctor

# Clean build
flutter clean

# Get dependencies
flutter pub get

# Update dependencies
flutter pub upgrade

# Analyze code
flutter analyze

# Format code
dart format lib/

# Run tests
flutter test

# Run tests with coverage
flutter test --coverage

# Check outdated packages
flutter pub outdated

# Generate icons
flutter pub run flutter_launcher_icons:main

# Generate splash screen
flutter pub run flutter_native_splash:create
```

---

## Resources

- **Flutter Documentation:** https://docs.flutter.dev/
- **Dart Documentation:** https://dart.dev/guides
- **BLoC Pattern:** https://bloclibrary.dev/
- **Clean Architecture:** https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
- **ML Kit Face Detection:** https://developers.google.com/ml-kit/vision/face-detection

---

**Happy Coding! 🚀**

This guide provides a solid foundation for your FIVUCSAS Flutter mobile app. Customize and extend it based on your specific requirements.
