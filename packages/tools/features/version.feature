Feature: Typed package manifest lookup
  The tools package exposes a zero-dependency helper that loads the nearest
  package.json as a typed PackageMeta, so every workspace reads its own name
  and version through one shared implementation (DRY).

  Background:
    Given a temporary workspace

  Scenario: reading the manifest of the calling package
    Given a package "demo-package" at version "1.2.3"
    And a module "src/index.ts" inside that package
    When I read the package meta from that module
    Then the meta name is "demo-package"
    And the meta version is "1.2.3"

  Scenario: walking up from nested files
    Given a package "deep-package" at version "0.4.0"
    And a module "src/lib/nested/deep.ts" inside that package
    When I read the package meta from that module
    Then the meta name is "deep-package"

  Scenario: rejecting a manifest without a name
    Given a package manifest without a name
    And a module "src/index.ts" inside that package
    When I try to read the package meta from that module
    Then the read fails with an error mentioning "name"

  Scenario: rejecting an invalid version
    Given a package "bad-version" at version "one.two"
    And a module "src/index.ts" inside that package
    When I try to read the package meta from that module
    Then the read fails with an error mentioning "version"

  Scenario Outline: accepting semantic versions
    Given a package "semver-demo" at version "<version>"
    And a module "src/index.ts" inside that package
    When I read the package meta from that module
    Then the meta version is "<version>"

    Examples:
      | version       |
      | 0.0.0         |
      | 1.2.3         |
      | 2.0.0-rc.1    |
      | 1.4.2+build.9 |

  Scenario: preserving unknown fields in raw
    Given a package "raw-demo" at version "1.0.0" with extra field "customField"
    And a module "src/index.ts" inside that package
    When I read the package meta from that module
    Then the raw field "customField" is "kept"

  Scenario: caching repeated lookups
    Given a package "cache-demo" at version "3.0.0"
    And a module "src/index.ts" inside that package
    When I read the package meta from that module twice
    Then both reads return the same instance
