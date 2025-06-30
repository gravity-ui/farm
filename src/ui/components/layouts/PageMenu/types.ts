export interface PageMenuItemNext {
    icon: React.ReactNode;
    title?: string;
    handler?(): void;
    path: string | null;
    externalHref?: string;
    /**
     * Highlight menu item if page has nested subpages
     */
    withNestedPages?: boolean;
    hide?: boolean;
}

export interface MenuNext {
    title?: React.ReactNode;
    /**
     * card goes below the title
     */
    card?: {
        className?: string;
        icon: React.ReactNode;
        iconLoading?: boolean;
    };
    /**
     * side menu item links that refer to neighboring sections
     * like overview and operations
     */
    items: PageMenuItemNext[];
    description?: React.ReactNode;
}
