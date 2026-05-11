Review $ARGUMENTS for performance issues.

Check for:
- N+1 query patterns in JPA/Hibernate (missing @EntityGraph, lazy loading in loops)
- Missing database indexes on frequently queried columns
- Unbounded queries (missing LIMIT/pagination)
- Memory leaks (unclosed resources, growing collections)
- Connection pool exhaustion risks
- Blocking calls in async/reactive code
- Oversized API payloads (missing field selection or pagination)
- Missing caching where appropriate
- Inefficient string concatenation in loops
- Image/file processing without streaming

Report each finding with file path, estimated impact, and fix.
