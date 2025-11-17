# Software Engineer's Essential Checklist

## Core Design Principles

### SOLID Principles
- **S - Single Responsibility Principle**: Each class should have one reason to change
- **O - Open/Closed Principle**: Open for extension, closed for modification
- **L - Liskov Substitution Principle**: Subtypes must be substitutable for their base types
- **I - Interface Segregation Principle**: Many client-specific interfaces over one general-purpose interface
- **D - Dependency Inversion Principle**: Depend on abstractions, not concretions

### DRY, KISS, YAGNI
- **DRY (Don't Repeat Yourself)**: Avoid code duplication, extract reusable components
- **KISS (Keep It Simple, Stupid)**: Favor simplicity over complexity
- **YAGNI (You Aren't Gonna Need It)**: Don't build features until they're actually needed

### Separation of Concerns
- Divide program into distinct sections, each addressing a separate concern
- Layer your architecture appropriately (presentation, business logic, data access)

### Composition Over Inheritance
- Prefer object composition to class inheritance for better flexibility
- Avoid deep inheritance hierarchies

## Design Patterns

### Creational Patterns
- **Singleton**: Ensure a class has only one instance
- **Factory Method**: Create objects without specifying exact class
- **Abstract Factory**: Create families of related objects
- **Builder**: Construct complex objects step by step
- **Prototype**: Clone existing objects

### Structural Patterns
- **Adapter**: Make incompatible interfaces work together
- **Decorator**: Add behavior to objects dynamically
- **Facade**: Provide simplified interface to complex subsystem
- **Proxy**: Control access to an object
- **Composite**: Compose objects into tree structures

### Behavioral Patterns
- **Observer**: Define one-to-many dependency between objects
- **Strategy**: Define family of algorithms, make them interchangeable
- **Command**: Encapsulate requests as objects
- **State**: Alter object behavior when internal state changes
- **Template Method**: Define skeleton of algorithm in base class

## Common Anti-Patterns & Flaws to Avoid

### Code Smells
- **God Object**: Classes that know too much or do too much
- **Spaghetti Code**: Unstructured and difficult-to-maintain code
- **Magic Numbers**: Unexplained numeric constants in code
- **Dead Code**: Unused code that should be removed
- **Shotgun Surgery**: Single change requires multiple class modifications
- **Feature Envy**: Method uses more features of another class than its own
- **Long Methods**: Methods that are too long and do too much
- **Large Classes**: Classes with too many responsibilities

### Architecture Anti-Patterns
- **Big Ball of Mud**: System lacking perceivable architecture
- **Golden Hammer**: Using familiar solution for every problem
- **Lava Flow**: Dead code and forgotten design decisions
- **Vendor Lock-in**: Over-dependence on specific vendor
- **Premature Optimization**: Optimizing before knowing bottlenecks

### Development Anti-Patterns
- **Copy-Paste Programming**: Duplicating code instead of abstracting
- **Hard Coding**: Embedding configuration in source code
- **Not Invented Here**: Rejecting existing solutions in favor of building own
- **Reinventing the Wheel**: Creating solution that already exists

## Code Quality Principles

### Clean Code
- Meaningful and descriptive names for variables, functions, classes
- Functions should be small and do one thing well
- Minimize function arguments (ideally 0-2)
- Write self-documenting code that's easy to understand
- Comments explain "why", not "what"
- Consistent formatting and style

### Error Handling
- Use exceptions rather than return codes
- Provide context with exceptions
- Don't return or pass null when possible
- Fail fast and loudly during development
- Handle errors at appropriate abstraction level

### Testing
- Write unit tests for all business logic
- Aim for high code coverage (but not as sole metric)
- Test behavior, not implementation
- Follow AAA pattern: Arrange, Act, Assert
- Keep tests independent and repeatable
- Test edge cases and error conditions

## Architecture Principles

### Modularity & Coupling
- High cohesion within modules
- Loose coupling between modules
- Clear module boundaries and interfaces
- Minimize dependencies between components

### Scalability Considerations
- Design for horizontal scaling when possible
- Stateless services are easier to scale
- Use caching strategically
- Consider async processing for long operations
- Plan for database scaling early

### Security First
- Never trust user input - validate and sanitize
- Use parameterized queries to prevent SQL injection
- Implement proper authentication and authorization
- Store sensitive data encrypted
- Follow principle of least privilege
- Keep dependencies updated for security patches

## Performance Best Practices

- Profile before optimizing
- Optimize algorithms before micro-optimizations
- Consider Big O complexity of algorithms
- Use appropriate data structures
- Lazy load when beneficial
- Cache expensive operations wisely
- Minimize database queries and use indexing

## Version Control Best Practices

- Write clear, descriptive commit messages
- Commit small, logical changes frequently
- Keep commits atomic and focused
- Use feature branches for development
- Review code before merging
- Never commit secrets or credentials

## Documentation

- Maintain up-to-date README files
- Document API contracts and interfaces
- Explain complex business logic
- Keep architecture diagrams current
- Document deployment procedures
- Note known limitations and trade-offs

## Collaboration & Communication

- Write code for humans, not just machines
- Conduct thorough code reviews
- Give constructive feedback
- Be open to feedback on your code
- Share knowledge with team members
- Ask questions when uncertain

## Continuous Learning

- Stay updated with technology trends
- Learn from code reviews (both giving and receiving)
- Read source code of well-designed libraries
- Practice with side projects
- Contribute to open source
- Attend conferences or watch tech talks

## Before Committing Code

- Does it work? Test thoroughly
- Is it readable? Can others understand it?
- Is it maintainable? Can it be easily modified?
- Does it follow team conventions?
- Are there tests? Do they pass?
- Is it properly documented?
- Have you handled errors appropriately?
- Could this be simpler?
- Are there any security vulnerabilities?
- Does it perform adequately?