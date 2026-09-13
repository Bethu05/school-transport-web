import {
    useState,
    type FormEvent,
} from 'react';

import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    TextField,
    Typography,
} from '@mui/material';

import type {
    School,
} from '../schools/schools.api';

import type {
    CreateStopInput,
    Stop,
    UpdateStopInput,
} from './stops.api';

interface StopFormDialogProps {
    open: boolean;

    stop:
    | Stop
    | null;

    stopSchoolName: string;

    schools:
    School[];

    saving: boolean;

    error:
    | string
    | null;

    onClose: () => void;

    onSubmit: (
        input:
            | CreateStopInput
            | UpdateStopInput,
    ) => Promise<void>;
}

interface StopFormState {
    schoolId: string;

    name: string;

    code: string;

    address: string;

    latitude: string;

    longitude: string;

    geofenceRadiusMeters:
    string;
}

function createFormState(
    stop:
        | Stop
        | null,
): StopFormState {
    if (!stop) {
        return {
            schoolId: '',
            name: '',
            code: '',
            address: '',
            latitude: '',
            longitude: '',
            geofenceRadiusMeters:
                '75',
        };
    }

    return {
        schoolId:
            stop.schoolId ??
            '',

        name:
            stop.name,

        code:
            stop.code ??
            '',

        address:
            stop.address ??
            '',

        latitude:
            String(
                stop.latitude,
            ),

        longitude:
            String(
                stop.longitude,
            ),

        geofenceRadiusMeters:
            String(
                stop.geofenceRadiusMeters,
            ),
    };
}

function optionalText(
    value: string,
): string | undefined {
    const trimmed =
        value.trim();

    return trimmed ||
        undefined;
}

function parseCoordinate(
    value: string,
    minimum: number,
    maximum: number,
): number | null {
    if (
        !value.trim()
    ) {
        return null;
    }

    const number =
        Number(value);

    if (
        !Number.isFinite(
            number,
        ) ||
        number < minimum ||
        number > maximum
    ) {
        return null;
    }

    return number;
}

export function StopFormDialog({
    open,
    stop,
    stopSchoolName,
    schools,
    saving,
    error,
    onClose,
    onSubmit,
}: StopFormDialogProps) {
    const [
        form,
        setForm,
    ] =
        useState<StopFormState>(
            () =>
                createFormState(
                    stop,
                ),
        );

    const [
        validationError,
        setValidationError,
    ] =
        useState<
            string | null
        >(null);

    const editing =
        stop !== null;

    function updateField<
        K extends keyof StopFormState,
    >(
        key: K,
        value:
            StopFormState[K],
    ): void {
        setForm(
            (current) => ({
                ...current,

                [key]:
                    value,
            }),
        );
    }

    async function handleSubmit(
        event:
            FormEvent<HTMLFormElement>,
    ): Promise<void> {
        event.preventDefault();

        setValidationError(
            null,
        );

        const name =
            form.name.trim();

        if (!name) {
            setValidationError(
                'Stop name is required.',
            );

            return;
        }

        const latitude =
            parseCoordinate(
                form.latitude,
                -90,
                90,
            );

        if (
            latitude ===
            null
        ) {
            setValidationError(
                'Latitude must be a number between -90 and 90.',
            );

            return;
        }

        const longitude =
            parseCoordinate(
                form.longitude,
                -180,
                180,
            );

        if (
            longitude ===
            null
        ) {
            setValidationError(
                'Longitude must be a number between -180 and 180.',
            );

            return;
        }

        const geofenceRadius =
            Number(
                form.geofenceRadiusMeters,
            );

        if (
            !Number.isInteger(
                geofenceRadius,
            ) ||
            geofenceRadius <
            1
        ) {
            setValidationError(
                'Geofence radius must be a whole number of at least 1 metre.',
            );

            return;
        }

        if (editing) {
            const input:
                UpdateStopInput = {
                name,

                code:
                    optionalText(
                        form.code,
                    ),

                address:
                    optionalText(
                        form.address,
                    ),

                latitude,

                longitude,

                geofenceRadiusMeters:
                    geofenceRadius,
            };

            await onSubmit(
                input,
            );

            return;
        }

        const input:
            CreateStopInput = {
            schoolId:
                form.schoolId ||
                undefined,

            name,

            code:
                optionalText(
                    form.code,
                ),

            address:
                optionalText(
                    form.address,
                ),

            latitude,

            longitude,

            geofenceRadiusMeters:
                geofenceRadius,
        };

        await onSubmit(
            input,
        );
    }

    return (
        <Dialog
            open={open}

            onClose={
                saving
                    ? undefined
                    : onClose
            }

            fullWidth

            maxWidth="md"
        >
            <Box
                component="form"

                onSubmit={
                    handleSubmit
                }
            >
                <DialogTitle
                    sx={{
                        pb: 1,

                        fontWeight:
                            850,
                    }}
                >
                    {editing
                        ? 'Edit stop'
                        : 'Add stop'}
                </DialogTitle>

                <DialogContent>
                    <Typography
                        sx={{
                            mb: 2.5,

                            color:
                                'text.secondary',

                            fontSize:
                                12.5,

                            lineHeight:
                                1.6,
                        }}
                    >
                        {editing
                            ? 'Update the stop details, map coordinates and geofence radius.'
                            : 'Create a shared or school-specific transport stop.'}
                    </Typography>

                    {validationError ? (
                        <Alert
                            severity="error"

                            sx={{
                                mb: 2,
                            }}
                        >
                            {validationError}
                        </Alert>
                    ) : null}

                    {error ? (
                        <Alert
                            severity="error"

                            sx={{
                                mb: 2,
                            }}
                        >
                            {error}
                        </Alert>
                    ) : null}

                    <Box
                        sx={{
                            display:
                                'grid',

                            gridTemplateColumns: {
                                xs:
                                    '1fr',

                                sm:
                                    'repeat(2, minmax(0, 1fr))',
                            },

                            gap: 2,
                        }}
                    >
                        {editing ? (
                            <TextField
                                label="School scope"

                                value={
                                    stopSchoolName
                                }

                                disabled

                                helperText="School scope is fixed after creation to protect existing route relationships."
                            />
                        ) : (
                            <TextField
                                select

                                label="School scope"

                                value={
                                    form.schoolId
                                }

                                onChange={(
                                    event,
                                ) =>
                                    updateField(
                                        'schoolId',
                                        event.target
                                            .value,
                                    )
                                }

                                helperText="Choose Shared stop when the stop may be reused across schools."
                            >
                                <MenuItem
                                    value=""
                                >
                                    Shared stop
                                </MenuItem>

                                {schools.map(
                                    (school) => (
                                        <MenuItem
                                            key={
                                                school.id
                                            }

                                            value={
                                                school.id
                                            }
                                        >
                                            {school.name}
                                            {school.code
                                                ? ` (${school.code})`
                                                : ''}
                                        </MenuItem>
                                    ),
                                )}
                            </TextField>
                        )}

                        <TextField
                            label="Stop name"

                            required

                            value={
                                form.name
                            }

                            onChange={(
                                event,
                            ) =>
                                updateField(
                                    'name',
                                    event.target
                                        .value,
                                )
                            }

                            slotProps={{
                                htmlInput: {
                                    maxLength:
                                        150,
                                },
                            }}
                        />

                        <TextField
                            label="Code"

                            value={
                                form.code
                            }

                            onChange={(
                                event,
                            ) =>
                                updateField(
                                    'code',
                                    event.target
                                        .value,
                                )
                            }

                            placeholder="e.g. WEST-001"

                            slotProps={{
                                htmlInput: {
                                    maxLength:
                                        50,
                                },
                            }}
                        />

                        <TextField
                            label="Address"

                            value={
                                form.address
                            }

                            onChange={(
                                event,
                            ) =>
                                updateField(
                                    'address',
                                    event.target
                                        .value,
                                )
                            }

                            placeholder="Street, estate or landmark"
                        />

                        <TextField
                            label="Latitude"

                            required

                            type="number"

                            value={
                                form.latitude
                            }

                            onChange={(
                                event,
                            ) =>
                                updateField(
                                    'latitude',
                                    event.target
                                        .value,
                                )
                            }

                            slotProps={{
                                htmlInput: {
                                    min: -90,
                                    max: 90,
                                    step:
                                        'any',
                                },
                            }}
                        />

                        <TextField
                            label="Longitude"

                            required

                            type="number"

                            value={
                                form.longitude
                            }

                            onChange={(
                                event,
                            ) =>
                                updateField(
                                    'longitude',
                                    event.target
                                        .value,
                                )
                            }

                            slotProps={{
                                htmlInput: {
                                    min: -180,
                                    max: 180,
                                    step:
                                        'any',
                                },
                            }}
                        />

                        <TextField
                            label="Geofence radius (metres)"

                            required

                            type="number"

                            value={
                                form.geofenceRadiusMeters
                            }

                            onChange={(
                                event,
                            ) =>
                                updateField(
                                    'geofenceRadiusMeters',
                                    event.target
                                        .value,
                                )
                            }

                            slotProps={{
                                htmlInput: {
                                    min: 1,
                                    step: 1,
                                },
                            }}
                        />
                    </Box>
                </DialogContent>

                <DialogActions
                    sx={{
                        px: 3,

                        pb: 3,
                    }}
                >
                    <Button
                        onClick={
                            onClose
                        }

                        disabled={
                            saving
                        }
                    >
                        Cancel
                    </Button>

                    <Button
                        type="submit"

                        variant="contained"

                        disabled={
                            saving
                        }
                    >
                        {saving
                            ? 'Saving...'
                            : editing
                                ? 'Save changes'
                                : 'Add stop'}
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    );
}
