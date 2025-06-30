import React from 'react';

import debounce from 'lodash/debounce';

export function useDebouncedValue<T, V>(initialValue: T, deps: Array<V>, timeout = 500) {
    const [debouncedValue, setDebouncedValue] = React.useState<T>(initialValue);

    const setDebounced = React.useMemo(
        () => debounce(setDebouncedValue, timeout),
        [setDebouncedValue, timeout],
    );

    React.useEffect(() => {
        setDebounced(initialValue);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    return debouncedValue;
}
