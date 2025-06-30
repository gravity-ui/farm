import React, {useCallback, useState} from 'react';

import type {MarkdownEditorViewProps} from '@gravity-ui/markdown-editor';
import {MarkdownEditorView, useMarkdownEditor} from '@gravity-ui/markdown-editor';
import {Button, Dialog, Flex, Popover} from '@gravity-ui/uikit';
import {getIn} from 'final-form';
import {useField, useFormState} from 'react-final-form';

import {ci18n} from '../../../i18n-common/ci18n';
import {toaster} from '../../../services/toaster';
import {YfmPreview} from '../../YfmPreview/YfmPreview';
import type {FieldBaseProps} from '../types';

import {i18n} from './i18n';

import * as styles from './EditorField.module.css';

export interface EditorFieldProps<FieldValue = string>
    extends Omit<MarkdownEditorViewProps, 'toaster' | 'stickyToolbar'>,
        FieldBaseProps<FieldValue, string> {}

export function EditorField<FieldValue = string>({
    name,
    fieldConfig,
    onSpyChange,
    ...props
}: EditorFieldProps<FieldValue>) {
    const {
        input: {value, onChange},
    } = useField<FieldValue, HTMLElement, string>(name, fieldConfig);

    const {initialValues} = useFormState();

    const editor = useMarkdownEditor({
        preset: 'yfm',
        initial: {
            markup: getIn(initialValues, name) ?? '',
        },
        md: {
            html: false,
        },
    });

    const [open, setOpen] = useState<boolean>(false);

    const handleUpdate = React.useCallback(
        (newValue: string) => {
            onChange(newValue);
            onSpyChange?.(newValue);
        },
        [onChange, onSpyChange],
    );

    const submitHandler = useCallback(() => {
        const editorValue = editor.getValue();

        handleUpdate(editorValue);
        toaster.add({
            name: 'save-description',
            title: i18n('save-description'),
            content: '',
            theme: 'success',
            autoHiding: 2000,
        });
    }, [editor, handleUpdate]);

    const saveHandler = useCallback(() => {
        submitHandler();
        setOpen(false);
    }, [submitHandler]);

    React.useEffect(() => {
        editor.on('submit', submitHandler);

        return () => {
            editor.off('submit', submitHandler);
        };
    }, [submitHandler, editor]);

    return (
        <React.Fragment>
            <Flex gap="3" grow>
                <Button onClick={() => setOpen(true)}>{i18n('edit-description')}</Button>
                {value && (
                    <Popover
                        placement={['bottom-end', 'right-end', 'top']}
                        content={
                            <div className={styles.preview}>
                                <YfmPreview value={value} />
                            </div>
                        }
                    >
                        <Button view="flat">{i18n('preview')}</Button>
                    </Popover>
                )}
            </Flex>
            <Dialog className={styles.dialog} open={open} onClose={() => setOpen(false)} size="l">
                <Dialog.Header caption={i18n('description')} />
                <Dialog.Body>
                    <MarkdownEditorView {...props} stickyToolbar editor={editor} />
                </Dialog.Body>
                <Dialog.Footer>
                    <Flex gap="3" direction="row-reverse" grow>
                        <Button onClick={saveHandler} view="action" size="l">
                            {ci18n('save')}
                        </Button>
                        <Button view="flat" size="l" onClick={() => setOpen(false)}>
                            {ci18n('close')}
                        </Button>
                    </Flex>
                </Dialog.Footer>
            </Dialog>
        </React.Fragment>
    );
}
