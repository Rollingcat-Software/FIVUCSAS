Analyze the test suite for $ARGUMENTS. Identify:

- Untested critical paths (authentication, authorization, verification pipeline, biometric processing)
- Missing edge cases (null inputs, boundary values, concurrent access)
- Tests that don't actually assert anything meaningful
- Flaky test patterns (timing dependencies, order dependencies, shared state)
- Integration test gaps between services
- Missing error path testing (what happens when external services fail)
- API endpoints without corresponding controller tests

Suggest the 10 most impactful tests to add, ordered by risk reduction.
