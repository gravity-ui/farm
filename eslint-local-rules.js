module.exports = {
    'no-restricted-i18n-import': {
        meta: {
            type: 'problem',
            docs: {
                description: 'Enforce that i18n can only be imported from "./i18n"',
                category: 'Best Practices',
                recommended: true,
            },
            schema: [], // no options
            messages: {
                invalidI18nImport: 'i18n can only be imported from "./i18n"',
            },
        },

        create(context) {
            return {
                ImportDeclaration(node) {
                    // Check if the import specifiers include 'i18n'
                    const hasI18nImport = node.specifiers.some(
                        (specifier) =>
                            specifier.type === 'ImportSpecifier' &&
                            specifier.imported.name === 'i18n',
                    );

                    if (hasI18nImport) {
                        // Check if the import source is exactly './i18n'
                        if (node.source.value !== './i18n') {
                            context.report({
                                node,
                                messageId: 'invalidI18nImport',
                            });
                        }
                    }
                },
            };
        },
    },
};
