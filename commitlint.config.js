/**
 * Conventional Commits, with the Wagr slug enforced as the scope.
 * See [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) for the full rules.
 *
 * Examples:
 *   feat(ussd-session-handler): add Redis TTL on session start
 *   fix(payslip-gpt): handle empty deductions array
 *   docs(jira-map): add new slug for hotfix story
 *   chore: bump pnpm to 9.4
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'chore',
        'docs',
        'test',
        'refactor',
        'perf',
        'build',
        'ci',
        'style',
        'revert',
      ],
    ],
    'scope-case': [2, 'always', 'kebab-case'],
    'subject-case': [2, 'never', ['pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'body-leading-blank': [1, 'always'],
    'footer-leading-blank': [1, 'always'],
  },
}
