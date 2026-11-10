@cli
Feature: Tools command discovery
  Commands are named by their source filename and loaded only when needed.

  Scenario: An unknown command fails clearly
    Given a CLI directory containing a working "sample" command
    When I invoke the test CLI with "missing"
    Then the CLI fails with an error containing "Unknown command missing"

  Scenario: A broken command module fails clearly
    Given a CLI directory containing a broken "broken" command
    When I invoke the test CLI with "broken"
    Then the CLI fails with an error containing "Failed to load command"

  Scenario: Help fails rather than hiding a broken command module
    Given a CLI directory containing a broken "broken" command
    When I invoke the test CLI with "--help"
    Then the CLI fails with an error containing "Failed to load command"
