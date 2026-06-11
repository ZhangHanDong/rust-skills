# Error Handling: Library vs Application

## Library Error Design

### Principles
1. **Define specific error types** - Don't use `anyhow` in libraries
2. **Implement std::error::Error** - For compatibility
3. **Provide error variants** - Let users match on errors
4. **Include source errors** - Enable error chains
5. **Be `Send + Sync`** - For async compatibility

### Example: Library Error Type
```rust
// lib.rs
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DatabaseError {
    #[error("connection failed: {host}:{port}")]
    ConnectionFailed {
        host: String,
        port: u16,
        #[source]
        source: std::io::Error,
    },

    #[error("query failed: {query}")]
    QueryFailed {
        query: String,
        #[source]
        source: SqlError,
    },

    #[error("record not found: {table}.{id}")]
    NotFound { table: String, id: String },

    #[error("constraint violation: {0}")]
    ConstraintViolation(String),
}

// Public Result alias
pub type Result<T> = std::result::Result<T, DatabaseError>;
```

---

## Application Error Design

### Principles
1. **Use anyhow for convenience** - Or custom unified error
2. **Add context liberally** - Help debugging
3. **Log at boundaries** - Don't log in libraries
4. **Convert to user-friendly messages** - For display

### Converting Library Errors at the Boundary
```rust
use mylib::DatabaseError;

async fn get_user_handler(id: &str) -> Result<Response> {
    match db.get_user(id).await {
        Ok(user) => Ok(Response::json(user)),

        Err(DatabaseError::NotFound { .. }) => {
            Ok(Response::not_found("User not found"))
        }

        Err(DatabaseError::ConnectionFailed { .. }) => {
            error!("Database connection failed");
            Ok(Response::internal_error("Service unavailable"))
        }

        Err(e) => {
            error!("Database error: {}", e);
            Err(e.into())  // Convert to anyhow::Error
        }
    }
}
```

---

## Error Handling Layers

```
+-------------------------------------+
|           Application Layer          |
|  - Use anyhow or unified error       |
|  - Add context at boundaries         |
|  - Log errors                        |
|  - Convert to user messages          |
+-------------------------------------+
                 |
                 | calls
                 v
+-------------------------------------+
|           Service Layer              |
|  - Map between error types           |
|  - Add business context              |
|  - Handle recoverable errors         |
+-------------------------------------+
                 |
                 | calls
                 v
+-------------------------------------+
|           Library Layer              |
|  - Define specific error types       |
|  - Use thiserror                     |
|  - Include source errors             |
|  - No logging                        |
+-------------------------------------+
```

---

## HTTP API Error Response (axum)

```rust
use axum::{response::IntoResponse, http::StatusCode};
use serde::Serialize;

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
    code: String,
}

enum AppError {
    NotFound(String),
    BadRequest(String),
    Internal(anyhow::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, error, code) = match self {
            AppError::NotFound(msg) => {
                (StatusCode::NOT_FOUND, msg, "NOT_FOUND")
            }
            AppError::BadRequest(msg) => {
                (StatusCode::BAD_REQUEST, msg, "BAD_REQUEST")
            }
            AppError::Internal(e) => {
                tracing::error!("Internal error: {:#}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Internal server error".to_string(),
                    "INTERNAL_ERROR",
                )
            }
        };

        let body = ErrorResponse {
            error,
            code: code.to_string(),
        };

        (status, axum::Json(body)).into_response()
    }
}
```
