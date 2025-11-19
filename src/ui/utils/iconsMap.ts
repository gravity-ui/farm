import {
    ArrowRotateLeft,
    ArrowUpRightFromSquare,
    ArrowsRotateLeft,
    FileCode,
    ListCheck,
    Play,
    Stop,
    TrashBin,
    CopyPlus,
} from '@gravity-ui/icons';

export const InstanceIconsMap = {
    GoToInstance: ArrowUpRightFromSquare,
    StopInstance: Stop,
    RunInstance: Play,
    RestartInstance: ArrowRotateLeft,
    RebuildInstance: ArrowsRotateLeft,
    CloneInstance: CopyPlus,
    ViewInstanceLogs: ListCheck,
    ViewBuildLogs: FileCode,
    DeleteInstance: TrashBin,
};
