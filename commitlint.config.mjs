// Commits conventionnels (cahier des charges §16) : type(portée): sujet
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [0],
    'body-max-line-length': [1, 'always', 100],
  },
};
