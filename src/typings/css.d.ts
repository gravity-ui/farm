declare module '*.module.css' {
    interface ClassNames {
        [className: string]: string;
    }

    const exportedVariables: ClassNames;
    export = exportedVariables;
}

declare module '*.module.scss' {
    interface ClassNames {
        [className: string]: string;
    }

    const exportedVariables: ClassNames;
    export = exportedVariables;
}
