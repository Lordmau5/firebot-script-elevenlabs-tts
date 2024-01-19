/* globals module */
module.exports = {
	root: true,
	plugins: [
		'@stylistic',
		'@typescript-eslint',
		'html'
	],
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended'
	],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 'latest'
	},
	rules: {
		'keyword-spacing': 'error',

		'@stylistic/array-bracket-newline': [
			'error',
			{
				minItems: 2
			}
		],
		'@stylistic/array-bracket-spacing': [
			'error',
			'always'
		],
		'@stylistic/array-element-newline': [
			'error',
			{
				minItems: 2
			}
		],
		'@stylistic/arrow-parens': [
			'error',
			'as-needed'
		],
		'@stylistic/arrow-spacing': 'error',
		'@stylistic/brace-style': [
			'error',
			'stroustrup'
		],
		'@stylistic/comma-dangle': [
			'error',
			'never'
		],
		'@stylistic/comma-style': [
			'error',
			'last'
		],
		'@stylistic/dot-location': [
			'error',
			'property'
		],
		'@stylistic/eol-last': [
			'error',
			'always'
		],
		'@stylistic/function-call-argument-newline': [
			'error',
			'consistent'
		],
		'@stylistic/function-paren-newline': [
			'error',
			'multiline-arguments'
		],
		'@stylistic/indent': [
			'error',
			'tab'
		],
		'@stylistic/linebreak-style': [
			'error',
			'unix'
		],
		'@stylistic/lines-around-comment': [
			'error',
			{
				allowBlockStart: true,
				allowBlockEnd: true,
				beforeBlockComment: true
			}
		],
		'@stylistic/lines-between-class-members': [
			'error',
			'always'
		],
		'@stylistic/no-extra-semi': 'error',
		'@stylistic/no-floating-decimal': 'error',
		'@stylistic/no-mixed-operators': 'error',
		'@stylistic/no-mixed-spaces-and-tabs': 'error',
		'@stylistic/no-multi-spaces': [
			'error',
			{
				exceptions: {
					VariableDeclarator: true,
					ImportDeclaration: true
				}
			}
		],
		'@stylistic/no-multiple-empty-lines': 'error',
		'@stylistic/no-trailing-spaces': 'error',
		'@stylistic/no-whitespace-before-property': 'error',
		'@stylistic/nonblock-statement-body-position': [
			'error',
			'below'
		],
		'@stylistic/object-curly-newline': [
			'error',
			'always'
		],
		'@stylistic/object-curly-spacing': [
			'error',
			'always'
		],
		'@stylistic/object-property-newline': [
			'error',
			{
				allowAllPropertiesOnSameLine: false
			}
		],
		'@stylistic/operator-linebreak': [
			'error',
			'before'
		],
		'@stylistic/padded-blocks': [
			'error',
			'never'
		],
		'@stylistic/padding-line-between-statements': [
			'error',
			{
				blankLine: 'always',
				prev: '*',
				next: 'return'
			}
		],
		'@stylistic/quote-props': [
			'error',
			'as-needed'
		],
		'@stylistic/quotes': [
			'error',
			'single',
			{
				allowTemplateLiterals: true
			}
		],
		'@stylistic/rest-spread-spacing': [
			'error',
			'never'
		],
		'@stylistic/semi': 'error',
		'@stylistic/semi-spacing': 'error',
		'@stylistic/semi-style': [
			'error',
			'last'
		],
		'@stylistic/space-before-blocks': [
			'error',
			'always'
		],
		'@stylistic/space-before-function-paren': [
			'error',
			'never'
		],
		'@stylistic/space-in-parens': [
			'error',
			'never'
		],
		'@stylistic/space-infix-ops': 'error',
		'@stylistic/spaced-comment': [
			'error',
			'always'
		],
		'@stylistic/switch-colon-spacing': 'error',
		'@stylistic/template-curly-spacing': [
			'error',
			'always'
		],
		'@stylistic/template-tag-spacing': [
			'error',
			'always'
		],
		'@stylistic/wrap-regex': 'error',

		'@typescript-eslint/no-unused-vars': 'off',
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/ban-ts-comment': 'off'
	}
};
