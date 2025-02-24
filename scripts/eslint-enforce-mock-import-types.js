import { ESLintUtils } from '@typescript-eslint/utils'
import { TSESTree } from '@typescript-eslint/types'

const createRule = ESLintUtils.RuleCreator(name => name)

export default createRule({
  name: 'enforce-tap-mock-import-typing',
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure t.mockImport uses type assertions.',
    },
    schema: [],
    messages: {
      missingTypeAssertion:
        't.mockImport should use a type assertion like <typeof import(...)>',
    },
    fixable: 'code',
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.arguments[0]?.type ===
            TSESTree.AST_NODE_TYPES.Literal &&
          typeof node.arguments[0].value === 'string' &&
          node.typeArguments === undefined &&
          node.callee.type ===
            TSESTree.AST_NODE_TYPES.MemberExpression &&
          node.callee.object.type ===
            TSESTree.AST_NODE_TYPES.Identifier &&
          node.callee.object.name === 't' &&
          node.callee.property.type ===
            TSESTree.AST_NODE_TYPES.Identifier &&
          node.callee.property.name === 'mockImport'
        ) {
          const importPath = node.arguments[0].value
          context.report({
            node,
            messageId: 'missingTypeAssertion',
            fix(fixer) {
              return fixer.insertTextAfter(
                node.callee,
                `<typeof import('${importPath}')>`,
              )
            },
          })
        }
      },
    }
  },
})
