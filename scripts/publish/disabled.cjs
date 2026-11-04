'use strict';
console.error('Registry publishing is disabled for this incompatible fork. Choose organization-owned package names and replace local dependencies before enabling a new release workflow. Local npm pack remains available for integration tests.');
process.exitCode = 1;
