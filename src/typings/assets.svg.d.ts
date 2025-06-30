declare type SVGIcon = React.FunctionComponent<React.SVGProps<SVGSVGElement>>;

declare module '*.svg' {
    const content: SVGIcon;

    export default content;
}

declare module 'assets/icons/*.svg' {
    const path: string;

    export default path;
}
