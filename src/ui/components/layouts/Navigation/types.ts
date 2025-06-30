export interface NavigationProps {
    compact?: boolean;
    children: React.ReactElement;
}

export interface ItemProps {
    compact: boolean;
}

export type AboutItemProps = ItemProps & {
    asideRef: React.RefObject<HTMLDivElement>;
};

export interface SettingsItemProps {
    compact: boolean;
    asideRef: React.RefObject<HTMLDivElement>;
    openSettings: boolean;
    setOpenSettings: React.Dispatch<React.SetStateAction<boolean>>;
}
