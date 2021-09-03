// test cases
// versionCheckPlugin does not fail if emitErrors is false

import { join } from "path";

import { expect } from "chai";
import * as sinon from "sinon";

import { ICompilation } from "../../../src/plugin/common";

import * as chalk from "chalk";
import { IWebpackStats } from "../../../src/lib/interfaces/webpack-stats";
import { toPosixPath } from "../../../src/lib/util/files";
import { IFixtures, loadFixtures, VERSIONS } from "../../utils";

import {
  isAllowedVersionViolated,
  VersionCheckPlugin
} from "../../../src/plugin/versions";

const MULTI_SCENARIO = "multiple-resolved-no-duplicates";

describe("plugin/versionCheck", () => {
  let fixtures: IFixtures;

  before(() => loadFixtures().then((f) => { fixtures = f; }));

  describe("isAllowedVersionViolated", () => {
    it('passes when only one version is included with no specifier', () => {
      const packages = {
        'my-addon': {
          '1.2.3': {}
        }
      };

      expect(isAllowedVersionViolated({}, 'my-addon', packages)).to.eql(false);
    });

    it('allows prerelease versions with a `*` specifier', () => {
      const packages = {
        'my-addon': {
          '1.2.3': {},
          '2.0.0-beta.1': {},
        }
      };
      const allowedVersions = {
        'my-addon' : '*'
      }

      expect(isAllowedVersionViolated(allowedVersions, 'my-addon', packages)).to.eql(false);
    });

    it('fails when only one version is included that doesn\'t satisfy the specifier', () => {
      const packages = {
        'my-addon': {
          '1.2.3': {}
        }
      };

      const allowedVersions = {
        'my-addon': '^1.2.4',
      };

      expect(isAllowedVersionViolated(allowedVersions, 'my-addon', packages)).to.eql(true);
    });

    it('passes when only one version is included that satisfies the specifier', () => {
      const packages = {
        'my-addon': {
          '1.2.3': {}
        }
      };

      const allowedVersions = {
        'my-addon': '^1.2.0',
      };

      expect(isAllowedVersionViolated(allowedVersions, 'my-addon', packages)).to.eql(false);
    });

    it('fails when multiple versions are included and one doesn\'t satisfy the specifier', () => {
      const packages = {
        'my-addon': {
          '1.2.3': {},
          '1.4.2': {}
        },
        'foo': {
          '1.0.0': {}
        }
      };

      const allowedVersions = {
        'my-addon': '^1.4.0',
      };

      expect(isAllowedVersionViolated(allowedVersions, 'my-addon', packages)).to.eql(true);
    });

    it('passes when multiple versions are included that satisfy the specifier', () => {
      const packages = {
        'my-addon': {
          '1.4.2': {},
          '1.4.3': {}
        },
        'foo': {
          '1.0.0': {}
        }
      };

      const allowedVersions = {
        'my-addon': '^1.4.0',
      };

      expect(isAllowedVersionViolated(allowedVersions, 'my-addon', packages)).to.eql(false);
    });
  });
  describe.only("VersionCheckPlugin", () => {
    VERSIONS.forEach((vers) => {
      // Mock compilation:
      let compilation: ICompilation;
      let toJson: () => IWebpackStats;

      // Report outputs
      let failureReport: string;
      let verboseFailureReport: string;
      let verboseReport: string;

      before(async () => {
        // tslint:disable max-line-length
        failureReport = `    Versions violations
    Inspectpack versionsPlugin found the following packages violating the allowedVersions specified:

    foo - allowed semver: ^1.2.0
      * 1.1.1
        * Num deps: 1, files: 1
          * multiple-resolved-no-duplicates@1.2.3 -> foo@1.1.1
        * Num deps: 1, files: 1
          * multiple-resolved-no-duplicates@1.2.3 -> uses-foo@1.1.1 -> foo@1.1.1`;

        verboseReport = `    Versions info
    Single version packages
    ## \`bundle-no-duplicates.js\`
    * more-no-duplicates
      * 1.1.1
        * Num deps: 1, files: 1
          * multiple-resolved-no-duplicates@1.2.3 -> more-no-duplicates@1.1.1
    * uses-no-duplicates
      * 1.1.1
        * Num deps: 1, files: 1
          * multiple-resolved-no-duplicates@1.2.3 -> uses-no-duplicates@1.1.1

    ## \`bundle.js\`
    * foo
      * 1.1.1
        * Num deps: 1, files: 1
          * multiple-resolved-no-duplicates@1.2.3 -> foo@1.1.1
        * Num deps: 1, files: 1
          * multiple-resolved-no-duplicates@1.2.3 -> uses-foo@1.1.1 -> foo@1.1.1
    * more-no-duplicates
      * 1.1.1
        * Num deps: 1, files: 1
          * multiple-resolved-no-duplicates@1.2.3 -> more-no-duplicates@1.1.1
    * uses-foo
      * 1.1.1
        * Num deps: 1, files: 1
          * multiple-resolved-no-duplicates@1.2.3 -> uses-foo@1.1.1
    * uses-no-duplicates
      * 1.1.1
        * Num deps: 1, files: 1
          * multiple-resolved-no-duplicates@1.2.3 -> uses-no-duplicates@1.1.1

    Duplicate version packages
    ## \`bundle-no-duplicates.js\`
    * no-duplicates
      * 1.1.1
        * Num deps: 1, files: 1
          * multiple-resolved-no-duplicates@1.2.3 -> no-duplicates@1.1.1
      * 2.1.1
        * Num deps: 1, files: 1
          * multiple-resolved-no-duplicates@1.2.3 -> uses-no-duplicates@1.1.1 -> no-duplicates@2.1.1
      * 3.1.1
        * Num deps: 1, files: 1
          * multiple-resolved-no-duplicates@1.2.3 -> more-no-duplicates@1.1.1 -> no-duplicates@3.1.1

    ## \`bundle.js\`
    * no-duplicates
      * 1.1.1
        * Num deps: 1, files: 1
          * multiple-resolved-no-duplicates@1.2.3 -> no-duplicates@1.1.1
      * 2.1.1
        * Num deps: 1, files: 1
          * multiple-resolved-no-duplicates@1.2.3 -> uses-no-duplicates@1.1.1 -> no-duplicates@2.1.1
      * 3.1.1
        * Num deps: 1, files: 1
          * multiple-resolved-no-duplicates@1.2.3 -> more-no-duplicates@1.1.1 -> no-duplicates@3.1.1
`;
        // tslint:enable max-line-length

        verboseFailureReport = `${verboseReport}\n${failureReport}`;
      });

      beforeEach(() => {
        const stats = fixtures[toPosixPath(join(MULTI_SCENARIO, `dist-development-${vers}`))];
        toJson = sinon.stub().returns(stats);
        compilation = {
          errors: [],
          getStats: () => ({ toJson }),
          warnings: [],
        };
      });

      describe(`v${vers}`, () => {
        let origChalkLevel: chalk.Level;

        beforeEach(() => {
          // Stash and disable chalk for tests.
          origChalkLevel = chalk.level;
          (chalk as any).level = 0;
        });

        afterEach(() => {
          (chalk as any).level = origChalkLevel;
        });

        it(`produces a default report`, () => {
          const plugin = new VersionCheckPlugin({
            allowedVersions: {
              'foo': '^1.2.0'
            },
          });

          return plugin.analyze(compilation).then(() => {
            expect(compilation.warnings).to.eql([]);
            expect(compilation.errors)
              .to.have.lengthOf(1).and
              .to.have.property("0").that
                .is.an("Error").and
                .has.property("message", failureReport);
          });
        });

        it(`produces a verbose report`, () => {
          const plugin = new VersionCheckPlugin({
            allowedVersions: {
              'foo': '^1.2.0'
            },
            verbose: true,
          });

          return plugin.analyze(compilation).then(() => {
            expect(compilation.warnings).to.eql([]);
            expect(compilation.errors)
              .to.have.lengthOf(1).and
              .to.have.property("0").that
                .is.an("Error").and
                .has.property("message", verboseFailureReport);
          });
        });

        it(`produces a verbose report when no violations`, () => {
          const plugin = new VersionCheckPlugin({
            allowedVersions: {},
            verbose: true,
          });

          return plugin.analyze(compilation).then(() => {
            expect(compilation.errors).to.eql([]);
            expect(compilation.warnings)
              .to.have.lengthOf(1).and
              .to.have.property("0").that
                .is.an("Error").and
                .has.property("message", verboseReport);
          });
        });

        it(`produces no report when no violations occur`, () => {
          const plugin = new VersionCheckPlugin({
            allowedVersions: {},
            verbose: false,
          });

          return plugin.analyze(compilation).then(() => {
            expect(compilation.warnings).to.eql([]);
            expect(compilation.errors).to.eql([]);
          });
        });

        it(`produces a verbose report`, () => {
          const plugin = new VersionCheckPlugin({
            allowedVersions: {
              'foo': '^1.2.0'
            },
            verbose: true,
            emitErrors: false,
          });

          return plugin.analyze(compilation).then(() => {
            expect(compilation.errors).to.eql([]);
            expect(compilation.warnings)
              .to.have.lengthOf(1).and
              .to.have.property("0").that
                .is.an("Error").and
                .has.property("message", verboseFailureReport);
          });
        });
      });
    });

  });
});
