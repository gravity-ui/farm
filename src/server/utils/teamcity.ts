export function prepareBuildNode(buildId: string, branchId: string | number, url: string) {
    return `
<build branchName="${branchId}">
    <buildType id="${buildId}"/>
    <properties>
        <property name="env.INTERFACE_BASE_URL" value="${url}"/>
        <property name="reverse.dep.*.env.INTERFACE_BASE_URL" value="${url}"/>
    </properties>
</build>
`;
}
