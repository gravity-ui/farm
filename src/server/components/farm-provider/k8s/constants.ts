export enum K8sPodStatus {
    Pending = 'Pending',
    Running = 'Running',
    Succeeded = 'Succeeded',
    Failed = 'Failed',
}

export enum K8sContainerStatus {
    Terminating = 'Terminating',
    Ready = 'Ready',
    Pending = 'Pending',
    Running = 'Running',
    Succeeded = 'Succeeded',
    Failed = 'Failed',
    ContainerCreating = 'ContainerCreating',
    CrashLoopBackOff = 'CrashLoopBackOff',
    ErrImagePull = 'ErrImagePull',
    ImagePullBackOff = 'ImagePullBackOff',
    CreateContainerConfigError = 'CreateContainerConfigError',
    InvalidImageName = 'InvalidImageName',
    CreateContainerError = 'CreateContainerError',
    Completed = 'Completed',
    OOMKilled = 'OOMKilled',
    Error = 'Error',
    ContainerCannotRun = 'ContainerCannotRun',
    DeadlineExceeded = 'DeadlineExceeded',
}
