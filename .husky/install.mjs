// Git hooks are only needed for local development.
if (process.env.NODE_ENV === 'production' || process.env.CI || process.env.HUSKY === '0') {
    process.exit(0);
}

const husky = (await import('husky')).default;
husky();
