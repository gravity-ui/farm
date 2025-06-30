import React from 'react';

import {TrashBin} from '@gravity-ui/icons';
import type {ActionsPanelProps} from '@gravity-ui/uikit';
import {ActionsPanel, Card, Dialog, Flex, Icon, List, Text} from '@gravity-ui/uikit';
import type {AxiosError} from 'axios';

import type {
    DeleteInstancesRequest,
    DeleteInstancesResponse,
} from '../../../../shared/api/deleteInstances';
import {ci18n} from '../../../i18n-common/ci18n';
import api from '../../../services/api';
import {toaster} from '../../../services/toaster';
import {getErrorMessageFromAxios} from '../../../utils/common';

import {i18n} from './i18n';

import * as styles from './InstancesGroupActions.module.scss';

export const InstancesGroupActions = ({
    instances,
    onDelete,
    clearInstances,
}: {
    instances: string[];
    onDelete: () => void;
    clearInstances: () => void;
}) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const openDeleteDialog = React.useCallback(() => {
        setIsOpen(true);
    }, []);

    const handleDelete = React.useCallback(async () => {
        setIsLoading(true);

        await api
            .request<DeleteInstancesRequest, DeleteInstancesResponse>({
                action: 'deleteInstances',
                data: {
                    hashes: instances,
                },
            })
            .then(() => {
                setIsOpen(false);
                onDelete();
            })
            .catch((e: AxiosError<{message: string}>) => {
                toaster.add({
                    name: 'submit',
                    title: ci18n('error-title'),
                    content: getErrorMessageFromAxios(e),
                    theme: 'danger',
                });
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [instances, onDelete]);

    const actions: ActionsPanelProps['actions'] = React.useMemo(
        () => [
            {
                id: 'delete',
                button: {
                    props: {
                        children: [<Icon key="icon" data={TrashBin} />, ci18n('delete')],
                        onClick: () => openDeleteDialog(),
                    },
                },
                dropdown: {
                    item: {
                        action: () => openDeleteDialog(),
                        text: ci18n('delete'),
                    },
                },
            },
        ],
        [openDeleteDialog],
    );

    const title = i18n('delete', {
        count: instances.length,
    });

    return (
        <div className={styles.actions}>
            <ActionsPanel
                className={styles.actionsPanel}
                onClose={() => clearInstances()}
                actions={actions}
                noteClassName={styles.note}
                renderNote={() =>
                    i18n('selected', {
                        count: instances.length,
                    })
                }
            />

            <Dialog open={isOpen} onClose={() => setIsOpen(false)}>
                <Dialog.Header caption={title} />
                <Dialog.Body>
                    <Flex gap={2} direction="column">
                        <Text>
                            {i18n('delete-confirm', {
                                count: instances.length,
                            })}
                        </Text>

                        <Card className={styles.listCard}>
                            <List
                                filterable={false}
                                virtualized={false}
                                items={instances}
                                itemClassName={styles.listItem}
                            />
                        </Card>
                    </Flex>
                </Dialog.Body>
                <Dialog.Footer
                    onClickButtonApply={handleDelete}
                    onClickButtonCancel={() => setIsOpen(false)}
                    textButtonCancel={ci18n('cancel')}
                    loading={isLoading}
                    textButtonApply={ci18n('delete')}
                    propsButtonApply={{view: 'outlined-danger'}}
                />
            </Dialog>
        </div>
    );
};
