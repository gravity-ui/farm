import React from 'react';

import {Button, Checkbox, Dialog, Flex, Text} from '@gravity-ui/uikit';

import {ci18n} from '../../../i18n-common/ci18n';

import {i18n} from './i18n';

interface DeleteOriginalInstanceModalProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    onSubmit: (isDeleteOriginalInstance: boolean) => void;
    cloneInstanceHash: string | null;
}

const DeleteOriginalInstanceModal = ({
    open,
    setOpen,
    onSubmit,
    cloneInstanceHash,
}: DeleteOriginalInstanceModalProps) => {
    const [isDeleteOriginalInstance, setIsDeleteOriginalInstance] = React.useState(false);

    const handleSave = React.useCallback(() => {
        onSubmit(isDeleteOriginalInstance);
    }, [onSubmit, isDeleteOriginalInstance]);

    return (
        <Dialog open={open} onClose={() => setOpen(false)} size="m">
            <Dialog.Header caption={i18n('delete-original-instance-title')} />
            <Dialog.Body>
                <Flex gap="6" direction="column" grow>
                    <Text variant="body-2">{i18n('delete-original-instance-description')}</Text>
                    <Checkbox
                        size="l"
                        checked={isDeleteOriginalInstance}
                        content={i18n('confirm-delete-original-instance', {
                            hash: cloneInstanceHash,
                        })}
                        onUpdate={setIsDeleteOriginalInstance}
                    />
                </Flex>
            </Dialog.Body>
            <Dialog.Footer>
                <Flex gap="3" direction="row-reverse" grow>
                    <Button onClick={handleSave} view="action" size="l">
                        {ci18n('save')}
                    </Button>
                    <Button view="flat" size="l" onClick={() => setOpen(false)}>
                        {ci18n('close')}
                    </Button>
                </Flex>
            </Dialog.Footer>
        </Dialog>
    );
};

export default DeleteOriginalInstanceModal;
