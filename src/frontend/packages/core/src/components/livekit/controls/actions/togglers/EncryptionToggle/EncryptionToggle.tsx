import { useRoomContext } from "@livekit/components-react"
import { Button } from "@openfun/cunningham-react"
import { Form, Formik } from 'formik';
import { useState, useMemo } from "react"

import { ShieldIcon } from "../../../../assets/icons"
import { FormikInput } from '../../../../../design-system/Formik/Input/FormikInput';
import * as Yup from 'yup';
import { FormikSubmitButton } from '../../../../../design-system/Formik/SubmitButton/FormikSubmitButton';
import { Box, Layer } from 'grommet';
import { ExternalE2EEKeyProvider } from "livekit-client";
import { defineMessages, useIntl } from 'react-intl';

const messages = defineMessages({
    encryptionExplanation: {
      defaultMessage: 'When encrypting, enter a key that you have shared with other participants via a secure means.',
      description: 'The explanation for the encrpytion',
      id: 'components.room.encryption.explanation',
    },
    encryptionKey: {
      id: 'components.room.encryption.key',
      description: 'Key label for encryption',
      defaultMessage: 'Encryption key',
    },
    encryptionQuery: {
        id: "components.room.encrytpion.query",
        description: "Query for encryption",
        defaultMessage: "Enter the encryption key"
    },
    encryptionSubmit: {
        id: "components.room.encryption.submit",
        description: "Submit button for encryption",
        defaultMessage: "Encrypt the conference"
    }
  });

export const EncryptionToggle = () => {
    const intl = useIntl();
    const room = useRoomContext()
    const [open, setOpen] = useState(false);
    const [encrypted, setEncrypted] = useState(false);

    const handleClick = (event: React.MouseEvent) => {
        !encrypted?
        handleOpen(event)
        :
        Unencrypt()
    }

    const Unencrypt = () => {
        room?.setE2EEEnabled(false)
        setEncrypted(!encrypted)
    }

    const handleOpen = (event: React.MouseEvent) => {
        event.preventDefault();
        setOpen(true)
    };

    const handleClose = (event?: React.MouseEvent | React.KeyboardEvent) => {
        event?.preventDefault();
        setOpen(false);
    };

    const handleSubmit = (
        values: EncryptionFormValues,
    ) => {
        const key = values.name;
        (room.options.e2ee?.keyProvider as ExternalE2EEKeyProvider).setKey(key)
        room?.setE2EEEnabled(true)
        handleClose();
        setEncrypted(!encrypted)

    }

    return (
        <div>
            <Button color={encrypted? "secondary" : "primary"} icon={<ShieldIcon />} onClick={handleClick} />
            {open &&
                <Layer
                    id="confirmDelete"
                    onClickOutside={handleClose}
                    onEsc={handleClose}
                    position="center"
                    role="dialog"
                >
                    <Box pad="medium" width="medium">
                        <EncryptionForm handleSubmit={handleSubmit} />
                    </Box>
                </Layer>
            }</div>

    )
}

interface EncryptionFormValues {
    name: string;
}

const EncryptionForm = (EncryptionFormProps: any) => {

    const intl = useIntl();
    const validationSchema = Yup.object().shape({ name: Yup.string().required() });

    const initialValues: EncryptionFormValues = useMemo(
        () => ({
            name: '',
        }),
        [],
    )

    return (
        <Formik
            initialValues={initialValues}
            onSubmit={EncryptionFormProps.handleSubmit}
            validationSchema={validationSchema}
        >
            <Form>
                {intl.formatMessage(messages.encryptionExplanation)} <br /><br/>
                <FormikInput
                    {...{ autoFocus: true }}
                    fullWidth
                    label={intl.formatMessage(messages.encryptionKey)}
                    name="name"
                    text={intl.formatMessage(messages.encryptionQuery)}
                />
                <FormikSubmitButton type={"button"}
                    label={intl.formatMessage(messages.encryptionSubmit)}
                />
            </Form>
        </Formik>
    );
};