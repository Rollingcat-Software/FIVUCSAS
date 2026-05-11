Analyze the architecture of $ARGUMENTS for violations of hexagonal architecture, SOLID principles, and clean architecture.

Check for:
- Domain layer importing infrastructure/adapter classes (DIP violation)
- Controllers containing business logic (SRP violation)
- God classes exceeding 500 lines
- Services implementing too many interfaces (ISP violation)
- Circular dependencies between modules
- JPA entities leaking into domain layer
- Missing port/adapter boundaries
- Feature envy (classes using other classes' data more than their own)
- Improper dependency injection patterns

Report violations with file paths, line numbers, and suggested fixes.
