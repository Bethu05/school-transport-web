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
    Driver,
} from '../drivers/drivers.api';

import type {
    Vehicle,
} from '../vehicles/vehicles.api';

import type {
    Trip,
    UpdateTripInput,
} from './trips.api';

const BUSINESS_TIME_ZONE =
    'Africa/Nairobi';

const BUSINESS_UTC_OFFSET =
    '+03:00';

interface TripEditDialogProps {
    open: boolean;

    trip:
    | Trip
    | null;

    vehicles:
    readonly Vehicle[];

    drivers:
    readonly Driver[];

    saving: boolean;

    error:
    | string
    | null;

    onClose: () => void;

    onSave: (
        input: UpdateTripInput,
    ) => Promise<void>;
}

interface TripEditFormState {
    serviceDate: string;

    startTime: string;

    endTime: string;

    vehicleId: string;

    driverId: string;

    notes: string;
}

/**
 * Convert an API timestamp into the local business
 * clock time shown to the transport operator.
 */
function timeInputValue(
    value:
        | string
        | null,
): string {
    if (!value) {
        return '';
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return '';
    }

    const parts =
        new Intl.DateTimeFormat(
            'en-GB',
            {
                timeZone:
                    BUSINESS_TIME_ZONE,

                hour:
                    '2-digit',

                minute:
                    '2-digit',

                hour12:
                    false,
            },
        ).formatToParts(
            date,
        );

    const hour =
        parts.find(
            (part) =>
                part.type ===
                'hour',
        )?.value;

    const minute =
        parts.find(
            (part) =>
                part.type ===
                'minute',
        )?.value;

    if (
        !hour ||
        !minute
    ) {
        return '';
    }

    return `${hour}:${minute}`;
}

/**
 * Convert the operator's business date/time back into
 * the explicit ISO value expected by the backend.
 */
function toBusinessIso(
    serviceDate: string,
    time: string,
): string {
    return (
        `${serviceDate}` +
        `T${time}:00` +
        BUSINESS_UTC_OFFSET
    );
}

function createFormState(
    trip:
        | Trip
        | null,
): TripEditFormState {
    if (!trip) {
        return {
            serviceDate:
                '',

            startTime:
                '',

            endTime:
                '',

            vehicleId:
                '',

            driverId:
                '',

            notes:
                '',
        };
    }

    return {
        serviceDate:
            trip.serviceDate,

        startTime:
            timeInputValue(
                trip.scheduledStartAt,
            ),

        endTime:
            timeInputValue(
                trip.scheduledEndAt,
            ),

        vehicleId:
            trip.vehicleId ??
            '',

        driverId:
            trip.driverId ??
            '',

        notes:
            trip.notes ??
            '',
    };
}

function vehicleLabel(
    vehicle: Vehicle,
): string {
    const description =
        [
            vehicle.make,
            vehicle.model,
        ]
            .filter(Boolean)
            .join(' ');

    return description
        ? `${vehicle.registrationNumber} — ${description}`
        : vehicle.registrationNumber;
}

function driverLabel(
    driver: Driver,
): string {
    return [
        driver.firstName,
        driver.lastName,
    ]
        .filter(Boolean)
        .join(' ');
}

export function TripEditDialog({
    open,
    trip,
    vehicles,
    drivers,
    saving,
    error,
    onClose,
    onSave,
}: TripEditDialogProps) {
    const [
        form,
        setForm,
    ] =
        useState<TripEditFormState>(
            () =>
                createFormState(
                    trip,
                ),
        );

    const [
        validationError,
        setValidationError,
    ] =
        useState<
            string | null
        >(null);

    /**
     * The backend intentionally limits ordinary editing to
     * Draft and Scheduled trips.
     *
     * Once boarding or execution begins, historical operating
     * state should not be rewritten through this form.
     */
    const editable =
        trip?.status ===
        'draft' ||
        trip?.status ===
        'scheduled';

    const compatibleVehicles =
        vehicles.filter(
            (vehicle) =>
                (
                    vehicle.status ===
                    'active' ||
                    vehicle.id ===
                    trip?.vehicleId
                ) &&
                (
                    !trip ||
                    vehicle.schoolId ===
                    null ||
                    vehicle.schoolId ===
                    trip.schoolId
                ),
        );

    const compatibleDrivers =
        drivers.filter(
            (driver) =>
                (
                    driver.status ===
                    'active' ||
                    driver.id ===
                    trip?.driverId
                ) &&
                (
                    !trip ||
                    driver.schoolId ===
                    null ||
                    driver.schoolId ===
                    trip.schoolId
                ),
        );

    function updateField<
        K extends keyof TripEditFormState,
    >(
        key: K,
        value:
            TripEditFormState[K],
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

        if (
            !trip ||
            !editable
        ) {
            setValidationError(
                'This trip can no longer be edited.',
            );

            return;
        }

        if (
            !form.serviceDate
        ) {
            setValidationError(
                'Please select the service date.',
            );

            return;
        }

        if (
            !form.startTime
        ) {
            setValidationError(
                'Please enter the departure time.',
            );

            return;
        }

        if (
            !form.endTime
        ) {
            setValidationError(
                'Please enter the expected finish time.',
            );

            return;
        }

        if (
            !form.vehicleId
        ) {
            setValidationError(
                'Please select a vehicle.',
            );

            return;
        }

        if (
            !form.driverId
        ) {
            setValidationError(
                'Please select a driver.',
            );

            return;
        }

        const scheduledStartAt =
            toBusinessIso(
                form.serviceDate,
                form.startTime,
            );

        const scheduledEndAt =
            toBusinessIso(
                form.serviceDate,
                form.endTime,
            );

        const start =
            new Date(
                scheduledStartAt,
            );

        const end =
            new Date(
                scheduledEndAt,
            );

        if (
            end.getTime() <=
            start.getTime()
        ) {
            setValidationError(
                'Expected finish time must be later than the departure time.',
            );

            return;
        }

        const notes =
            form.notes.trim();

        const input:
            UpdateTripInput = {
            vehicleId:
                form.vehicleId,

            driverId:
                form.driverId,

            serviceDate:
                form.serviceDate,

            scheduledStartAt,

            scheduledEndAt,

            notes:
                notes ||
                null,
        };

        await onSave(
            input,
        );
    }

    return (
        <Dialog
            open={
                open
            }
            onClose={
                saving
                    ? undefined
                    : onClose
            }
            fullWidth
            maxWidth="sm"
        >
            <Box
                component="form"
                onSubmit={
                    handleSubmit
                }
            >
                <DialogTitle
                    sx={{
                        fontWeight:
                            850,
                    }}
                >
                    Edit trip
                </DialogTitle>

                <DialogContent>
                    <Typography
                        sx={{
                            mb: 2.5,

                            color:
                                'text.secondary',

                            fontSize:
                                13,

                            lineHeight:
                                1.6,
                        }}
                    >
                        Update the vehicle, driver or operating times for this trip.
                    </Typography>

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
                        {validationError ||
                            error ? (
                            <Alert
                                severity="error"
                                sx={{
                                    gridColumn:
                                        '1 / -1',
                                }}
                            >
                                {validationError ??
                                    error}
                            </Alert>
                        ) : null}

                        {!editable &&
                            trip ? (
                            <Alert
                                severity="info"
                                sx={{
                                    gridColumn:
                                        '1 / -1',
                                }}
                            >
                                This trip has already entered its operating lifecycle and can
                                no longer be edited here.
                            </Alert>
                        ) : null}

                        <TextField
                            label="Route"
                            value={
                                trip?.routeCode
                                    ? `${trip.routeName} (${trip.routeCode})`
                                    : trip?.routeName ??
                                    ''
                            }
                            disabled
                            helperText="The route cannot be changed after the trip has been created."
                            sx={{
                                gridColumn:
                                    '1 / -1',
                            }}
                        />

                        <TextField
                            required
                            type="date"
                            label="Service date"
                            value={
                                form.serviceDate
                            }
                            disabled={
                                saving ||
                                !editable
                            }
                            onChange={(
                                event,
                            ) =>
                                updateField(
                                    'serviceDate',
                                    event.target
                                        .value,
                                )
                            }
                            slotProps={{
                                inputLabel: {
                                    shrink:
                                        true,
                                },
                            }}
                        />

                        <Box />

                        <TextField
                            required
                            type="time"
                            label="Departure"
                            value={
                                form.startTime
                            }
                            disabled={
                                saving ||
                                !editable
                            }
                            onChange={(
                                event,
                            ) =>
                                updateField(
                                    'startTime',
                                    event.target
                                        .value,
                                )
                            }
                            slotProps={{
                                inputLabel: {
                                    shrink:
                                        true,
                                },
                            }}
                        />

                        <TextField
                            required
                            type="time"
                            label="Expected finish"
                            value={
                                form.endTime
                            }
                            disabled={
                                saving ||
                                !editable
                            }
                            onChange={(
                                event,
                            ) =>
                                updateField(
                                    'endTime',
                                    event.target
                                        .value,
                                )
                            }
                            slotProps={{
                                inputLabel: {
                                    shrink:
                                        true,
                                },
                            }}
                        />

                        <TextField
                            select
                            required
                            label="Vehicle"
                            value={
                                form.vehicleId
                            }
                            disabled={
                                saving ||
                                !editable
                            }
                            onChange={(
                                event,
                            ) =>
                                updateField(
                                    'vehicleId',
                                    event.target
                                        .value,
                                )
                            }
                            helperText="Choose the vehicle assigned to this trip."
                        >
                            {compatibleVehicles.map(
                                (
                                    vehicle,
                                ) => (
                                    <MenuItem
                                        key={
                                            vehicle.id
                                        }
                                        value={
                                            vehicle.id
                                        }
                                    >
                                        {vehicleLabel(
                                            vehicle,
                                        )}
                                    </MenuItem>
                                ),
                            )}
                        </TextField>

                        <TextField
                            select
                            required
                            label="Driver"
                            value={
                                form.driverId
                            }
                            disabled={
                                saving ||
                                !editable
                            }
                            onChange={(
                                event,
                            ) =>
                                updateField(
                                    'driverId',
                                    event.target
                                        .value,
                                )
                            }
                            helperText="Choose the driver assigned to this trip."
                        >
                            {compatibleDrivers.map(
                                (
                                    driver,
                                ) => (
                                    <MenuItem
                                        key={
                                            driver.id
                                        }
                                        value={
                                            driver.id
                                        }
                                    >
                                        {driverLabel(
                                            driver,
                                        )}
                                    </MenuItem>
                                ),
                            )}
                        </TextField>

                        <TextField
                            multiline
                            minRows={3}
                            label="Notes"
                            value={
                                form.notes
                            }
                            disabled={
                                saving ||
                                !editable
                            }
                            onChange={(
                                event,
                            ) =>
                                updateField(
                                    'notes',
                                    event.target
                                        .value,
                                )
                            }
                            placeholder="Optional operational notes"
                            slotProps={{
                                htmlInput: {
                                    maxLength:
                                        2000,
                                },
                            }}
                            sx={{
                                gridColumn:
                                    '1 / -1',
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
                        disabled={
                            saving
                        }
                        onClick={
                            onClose
                        }
                    >
                        Cancel
                    </Button>

                    <Button
                        type="submit"
                        variant="contained"
                        disabled={
                            saving ||
                            !editable
                        }
                    >
                        {saving
                            ? 'Saving...'
                            : 'Save changes'}
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    );
}