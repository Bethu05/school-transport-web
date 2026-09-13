import {
    useMemo,
    useState,
    type FormEvent,
} from 'react';

import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Paper,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';

import {
    AddLocationAltRounded,
    DeleteOutlineRounded,
    EditLocationAltRounded,
    PlaceRounded,
} from '@mui/icons-material';

import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';

import {
    listStops,
    type Stop,
} from '../stops/stops.api';

import {
    addRouteStop,
    listRouteStops,
    removeRouteStop,
    updateRouteStop,
    type AddRouteStopInput,
    type Route,
    type RouteStop,
    type UpdateRouteStopInput,
} from './routes.api';

interface RouteStopsDialogProps {
    open: boolean;
    tenantId: string | undefined;
    route: Route | null;
    onClose: () => void;
}

interface StopFormState {
    stopId: string;
    stopOrder: string;
    plannedOffsetMinutes: string;
}

interface EditFormState {
    stopOrder: string;
    plannedOffsetMinutes: string;
}

const EMPTY_ROUTE_STOPS: RouteStop[] = [];
const EMPTY_STOPS: Stop[] = [];

function errorMessage(
    error: unknown,
): string {
    return error instanceof Error
        ? error.message
        : 'The operation could not be completed.';
}

function stopLabel(
    stop: Stop,
): string {
    return stop.code
        ? `${stop.name} (${stop.code})`
        : stop.name;
}

function parsePositiveInteger(
    value: string,
): number | null {
    if (!/^\d+$/.test(value.trim())) {
        return null;
    }

    const number = Number(value);

    return Number.isInteger(number) && number >= 1
        ? number
        : null;
}

function parseOptionalOffset(
    value: string,
): number | null | 'invalid' {
    if (!value.trim()) {
        return null;
    }

    if (!/^\d+$/.test(value.trim())) {
        return 'invalid';
    }

    const number = Number(value);

    return Number.isInteger(number) && number >= 0
        ? number
        : 'invalid';
}

export function RouteStopsDialog({
    open,
    tenantId,
    route,
    onClose,
}: RouteStopsDialogProps) {
    const queryClient = useQueryClient();

    const [addOpen, setAddOpen] = useState(false);
    const [editingStop, setEditingStop] = useState<RouteStop | null>(null);
    const [removeTarget, setRemoveTarget] = useState<RouteStop | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [addForm, setAddForm] = useState<StopFormState>({
        stopId: '',
        stopOrder: '1',
        plannedOffsetMinutes: '',
    });

    const [editForm, setEditForm] = useState<EditFormState>({
        stopOrder: '1',
        plannedOffsetMinutes: '',
    });

    const routeId = route?.id;

    const routeStopsQuery = useQuery({
        queryKey: [
            'route-stops',
            tenantId,
            routeId,
        ],

        enabled: Boolean(
            open &&
            tenantId &&
            routeId,
        ),

        queryFn: async () => {
            if (!tenantId || !routeId) {
                throw new Error('Route context is unavailable');
            }

            return listRouteStops(
                tenantId,
                routeId,
            );
        },
    });

    const stopsQuery = useQuery({
        queryKey: [
            'stops',
            tenantId,
        ],

        enabled: Boolean(
            open &&
            tenantId,
        ),

        queryFn: async () => {
            if (!tenantId) {
                throw new Error('No active tenant');
            }

            return listStops(
                tenantId,
            );
        },
    });

    const routeStops =
        routeStopsQuery.data ??
        EMPTY_ROUTE_STOPS;

    const stops =
        stopsQuery.data ??
        EMPTY_STOPS;

    const availableStops = useMemo(
        () => {
            if (!route) {
                return [];
            }

            const attachedStopIds = new Set(
                routeStops.map(
                    (routeStop) => routeStop.stopId,
                ),
            );

            return stops
                .filter(
                    (stop) =>
                        stop.status === 'active' &&
                        !attachedStopIds.has(stop.id) &&
                        (
                            stop.schoolId === null ||
                            stop.schoolId === route.schoolId
                        ),
                )
                .sort(
                    (left, right) =>
                        left.name.localeCompare(right.name),
                );
        },
        [
            route,
            routeStops,
            stops,
        ],
    );

    async function refreshData(): Promise<void> {
        await Promise.all([
            queryClient.invalidateQueries({
                queryKey: [
                    'route-stops',
                    tenantId,
                    routeId,
                ],
            }),

            queryClient.invalidateQueries({
                queryKey: [
                    'routes',
                ],
            }),
        ]);
    }

    function handleClose(): void {
        setAddOpen(false);
        setEditingStop(null);
        setRemoveTarget(null);
        setFormError(null);
        setSuccessMessage(null);
        onClose();
    }

    function openAddStop(): void {
        setFormError(null);

        setAddForm({
            stopId: '',
            stopOrder: String(routeStops.length + 1),
            plannedOffsetMinutes: '',
        });

        setAddOpen(true);
    }

    function openEditStop(
        routeStop: RouteStop,
    ): void {
        setFormError(null);

        setEditingStop(
            routeStop,
        );

        setEditForm({
            stopOrder: String(routeStop.stopOrder),
            plannedOffsetMinutes:
                routeStop.plannedOffsetMinutes === null
                    ? ''
                    : String(routeStop.plannedOffsetMinutes),
        });
    }

    const addMutation = useMutation({
        mutationFn: async (
            input: AddRouteStopInput,
        ) => {
            if (!tenantId || !routeId) {
                throw new Error('Route context is unavailable');
            }

            return addRouteStop(
                tenantId,
                routeId,
                input,
            );
        },

        onSuccess: async () => {
            await refreshData();
            setAddOpen(false);
            setFormError(null);
            setSuccessMessage('Stop added to route.');
        },

        onError: (error) => {
            setFormError(
                errorMessage(error),
            );
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({
            routeStopId,
            input,
        }: {
            routeStopId: string;
            input: UpdateRouteStopInput;
        }) => {
            if (!tenantId || !routeId) {
                throw new Error('Route context is unavailable');
            }

            return updateRouteStop(
                tenantId,
                routeId,
                routeStopId,
                input,
            );
        },

        onSuccess: async () => {
            await refreshData();
            setEditingStop(null);
            setFormError(null);
            setSuccessMessage('Route stop updated.');
        },

        onError: (error) => {
            setFormError(
                errorMessage(error),
            );
        },
    });

    const removeMutation = useMutation({
        mutationFn: async (
            routeStopId: string,
        ) => {
            if (!tenantId || !routeId) {
                throw new Error('Route context is unavailable');
            }

            return removeRouteStop(
                tenantId,
                routeId,
                routeStopId,
            );
        },

        onSuccess: async () => {
            await refreshData();
            setRemoveTarget(null);
            setSuccessMessage('Stop removed from route.');
        },
    });

    async function submitAdd(
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> {
        event.preventDefault();
        setFormError(null);

        const stopOrder = parsePositiveInteger(
            addForm.stopOrder,
        );

        const offset = parseOptionalOffset(
            addForm.plannedOffsetMinutes,
        );

        if (!addForm.stopId) {
            setFormError('Please select a stop.');
            return;
        }

        if (stopOrder === null) {
            setFormError('Position must be a whole number of 1 or more.');
            return;
        }

        if (offset === 'invalid') {
            setFormError('Time after departure must be 0 or more minutes.');
            return;
        }

        await addMutation.mutateAsync({
            stopId: addForm.stopId,
            stopOrder,
            plannedOffsetMinutes:
                offset === null
                    ? undefined
                    : offset,
        });
    }

    async function submitEdit(
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> {
        event.preventDefault();
        setFormError(null);

        if (!editingStop) {
            return;
        }

        const stopOrder = parsePositiveInteger(
            editForm.stopOrder,
        );

        const offset = parseOptionalOffset(
            editForm.plannedOffsetMinutes,
        );

        if (stopOrder === null) {
            setFormError('Position must be a whole number of 1 or more.');
            return;
        }

        if (offset === 'invalid') {
            setFormError('Time after departure must be 0 or more minutes.');
            return;
        }

        const input: UpdateRouteStopInput = {
            stopOrder,
        };

        if (offset !== null) {
            input.plannedOffsetMinutes = offset;
        }

        await updateMutation.mutateAsync({
            routeStopId: editingStop.id,
            input,
        });
    }

    const routeInactive =
        route?.status === 'inactive';

    const busy =
        addMutation.isPending ||
        updateMutation.isPending ||
        removeMutation.isPending;

    return (
        <>
            <Dialog
                open={open}
                onClose={busy ? undefined : handleClose}
                fullWidth
                maxWidth="md"
            >
                <DialogTitle sx={{ fontWeight: 850 }}>
                    {route
                        ? `Route stops — ${route.name}`
                        : 'Route stops'}
                </DialogTitle>

                <DialogContent>
                    {routeInactive ? (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            This route is inactive. Activate it before changing its stops.
                        </Alert>
                    ) : null}

                    {successMessage ? (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            {successMessage}
                        </Alert>
                    ) : null}

                    {routeStopsQuery.isError ? (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {errorMessage(routeStopsQuery.error)}
                        </Alert>
                    ) : null}

                    {stopsQuery.isError ? (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            Available stops could not be loaded. Existing route stops can still
                            be viewed.
                        </Alert>
                    ) : null}

                    <Box
                        sx={{
                            mb: 2,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 2,
                            flexWrap: 'wrap',
                        }}
                    >
                        <Box>
                            <Typography sx={{ fontWeight: 850 }}>
                                Ordered stops
                            </Typography>

                            <Typography
                                sx={{
                                    mt: 0.4,
                                    color: 'text.secondary',
                                    fontSize: 12,
                                }}
                            >
                                The position controls the order buses visit each stop.
                            </Typography>
                        </Box>

                        <Button
                            variant="contained"
                            startIcon={<AddLocationAltRounded />}
                            disabled={
                                routeInactive ||
                                stopsQuery.isLoading ||
                                stopsQuery.isError ||
                                availableStops.length === 0
                            }
                            onClick={openAddStop}
                        >
                            Add stop
                        </Button>
                    </Box>

                    {routeStopsQuery.isLoading ? (
                        <Box
                            sx={{
                                py: 6,
                                display: 'grid',
                                placeItems: 'center',
                            }}
                        >
                            <CircularProgress size={30} />
                        </Box>
                    ) : null}

                    {!routeStopsQuery.isLoading &&
                        !routeStopsQuery.isError &&
                        routeStops.length === 0 ? (
                        <Paper
                            elevation={0}
                            sx={{
                                py: 6,
                                px: 3,
                                textAlign: 'center',
                                border: '1px solid',
                                borderColor: 'divider',
                            }}
                        >
                            <PlaceRounded
                                sx={{
                                    fontSize: 38,
                                    color: 'primary.main',
                                }}
                            />

                            <Typography sx={{ mt: 1.5, fontWeight: 800 }}>
                                No stops on this route yet
                            </Typography>

                            <Typography
                                sx={{
                                    mt: 0.5,
                                    color: 'text.secondary',
                                    fontSize: 12,
                                }}
                            >
                                Add the first pickup or drop-off point to begin building the
                                route.
                            </Typography>
                        </Paper>
                    ) : null}

                    {!routeStopsQuery.isLoading &&
                        !routeStopsQuery.isError &&
                        routeStops.length > 0 ? (
                        <Box
                            sx={{
                                display: 'grid',
                                gap: 1,
                            }}
                        >
                            {routeStops.map((routeStop) => (
                                <Paper
                                    key={routeStop.id}
                                    elevation={0}
                                    sx={{
                                        p: 1.75,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        display: 'grid',
                                        gridTemplateColumns: {
                                            xs: 'auto 1fr auto',
                                            md: '52px 1fr 140px 150px 84px',
                                        },
                                        gap: 1.5,
                                        alignItems: 'center',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 36,
                                            height: 36,
                                            display: 'grid',
                                            placeItems: 'center',
                                            borderRadius: 2,
                                            bgcolor: 'rgba(201,165,92,0.10)',
                                            color: 'primary.main',
                                            fontWeight: 900,
                                        }}
                                    >
                                        {routeStop.stopOrder}
                                    </Box>

                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography
                                            noWrap
                                            sx={{
                                                fontSize: 12.5,
                                                fontWeight: 800,
                                            }}
                                        >
                                            {routeStop.stopName}
                                        </Typography>

                                        <Typography
                                            sx={{
                                                color: 'text.secondary',
                                                fontSize: 10.5,
                                            }}
                                        >
                                            {routeStop.stopCode ?? 'No stop code'}
                                        </Typography>
                                    </Box>

                                    <Box
                                        sx={{
                                            display: {
                                                xs: 'none',
                                                md: 'block',
                                            },
                                        }}
                                    >
                                        <Typography
                                            sx={{
                                                color: 'text.secondary',
                                                fontSize: 10,
                                                fontWeight: 800,
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Position
                                        </Typography>

                                        <Typography sx={{ mt: 0.3, fontSize: 12 }}>
                                            {routeStop.stopOrder}
                                        </Typography>
                                    </Box>

                                    <Box
                                        sx={{
                                            display: {
                                                xs: 'none',
                                                md: 'block',
                                            },
                                        }}
                                    >
                                        <Typography
                                            sx={{
                                                color: 'text.secondary',
                                                fontSize: 10,
                                                fontWeight: 800,
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Planned time
                                        </Typography>

                                        <Typography sx={{ mt: 0.3, fontSize: 12 }}>
                                            {routeStop.plannedOffsetMinutes === null
                                                ? 'Not set'
                                                : routeStop.plannedOffsetMinutes === 0
                                                    ? 'Start'
                                                    : `+${routeStop.plannedOffsetMinutes} min`}
                                        </Typography>
                                    </Box>

                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <Tooltip title="Edit stop position/time">
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    disabled={routeInactive || busy}
                                                    onClick={() => openEditStop(routeStop)}
                                                >
                                                    <EditLocationAltRounded fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>

                                        <Tooltip title="Remove from route">
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    disabled={routeInactive || busy}
                                                    onClick={() => setRemoveTarget(routeStop)}
                                                >
                                                    <DeleteOutlineRounded fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </Box>
                                </Paper>
                            ))}
                        </Box>
                    ) : null}

                    {!routeInactive &&
                        !stopsQuery.isLoading &&
                        !stopsQuery.isError &&
                        availableStops.length === 0 &&
                        stops.length > 0 ? (
                        <Typography
                            sx={{
                                mt: 2,
                                color: 'text.secondary',
                                fontSize: 11.5,
                            }}
                        >
                            Every active stop available to this school is already on the route.
                        </Typography>
                    ) : null}
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button disabled={busy} onClick={handleClose}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={addOpen}
                onClose={addMutation.isPending ? undefined : () => setAddOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <Box component="form" onSubmit={submitAdd}>
                    <DialogTitle sx={{ fontWeight: 850 }}>
                        Add stop to route
                    </DialogTitle>

                    <DialogContent>
                        {formError ? (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {formError}
                            </Alert>
                        ) : null}

                        <Box
                            sx={{
                                pt: 1,
                                display: 'grid',
                                gridTemplateColumns: {
                                    xs: '1fr',
                                    sm: '1fr 1fr',
                                },
                                gap: 2,
                            }}
                        >
                            <TextField
                                select
                                required
                                label="Stop"
                                value={addForm.stopId}
                                onChange={(event) =>
                                    setAddForm((current) => ({
                                        ...current,
                                        stopId: event.target.value,
                                    }))
                                }
                                helperText="Choose a stop for this route's school."
                                sx={{ gridColumn: '1 / -1' }}
                            >
                                {availableStops.map((stop) => (
                                    <MenuItem key={stop.id} value={stop.id}>
                                        {stopLabel(stop)}
                                        {stop.address ? ` — ${stop.address}` : ''}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                required
                                type="number"
                                label="Position"
                                value={addForm.stopOrder}
                                onChange={(event) =>
                                    setAddForm((current) => ({
                                        ...current,
                                        stopOrder: event.target.value,
                                    }))
                                }
                                helperText="1 = first stop, 2 = second, etc."
                                slotProps={{
                                    htmlInput: {
                                        min: 1,
                                        step: 1,
                                    },
                                }}
                            />

                            <TextField
                                type="number"
                                label="Minutes after departure"
                                value={addForm.plannedOffsetMinutes}
                                onChange={(event) =>
                                    setAddForm((current) => ({
                                        ...current,
                                        plannedOffsetMinutes: event.target.value,
                                    }))
                                }
                                placeholder="e.g. 12"
                                helperText="Use 0 for the starting stop."
                                slotProps={{
                                    htmlInput: {
                                        min: 0,
                                        step: 1,
                                    },
                                }}
                            />
                        </Box>
                    </DialogContent>

                    <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Button
                            disabled={addMutation.isPending}
                            onClick={() => setAddOpen(false)}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            variant="contained"
                            disabled={addMutation.isPending || availableStops.length === 0}
                        >
                            {addMutation.isPending ? 'Adding...' : 'Add stop'}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>

            <Dialog
                open={editingStop !== null}
                onClose={
                    updateMutation.isPending
                        ? undefined
                        : () => setEditingStop(null)
                }
                fullWidth
                maxWidth="sm"
            >
                <Box component="form" onSubmit={submitEdit}>
                    <DialogTitle sx={{ fontWeight: 850 }}>
                        Edit route stop
                    </DialogTitle>

                    <DialogContent>
                        {formError ? (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {formError}
                            </Alert>
                        ) : null}

                        {editingStop ? (
                            <Chip
                                icon={<PlaceRounded />}
                                label={editingStop.stopName}
                                sx={{ mb: 2 }}
                            />
                        ) : null}

                        <Box
                            sx={{
                                pt: 1,
                                display: 'grid',
                                gridTemplateColumns: {
                                    xs: '1fr',
                                    sm: '1fr 1fr',
                                },
                                gap: 2,
                            }}
                        >
                            <TextField
                                required
                                type="number"
                                label="Position"
                                value={editForm.stopOrder}
                                onChange={(event) =>
                                    setEditForm((current) => ({
                                        ...current,
                                        stopOrder: event.target.value,
                                    }))
                                }
                                helperText="The position must not already be occupied."
                                slotProps={{
                                    htmlInput: {
                                        min: 1,
                                        step: 1,
                                    },
                                }}
                            />

                            <TextField
                                type="number"
                                label="Minutes after departure"
                                value={editForm.plannedOffsetMinutes}
                                onChange={(event) =>
                                    setEditForm((current) => ({
                                        ...current,
                                        plannedOffsetMinutes: event.target.value,
                                    }))
                                }
                                helperText="Blank leaves the existing value unchanged."
                                slotProps={{
                                    htmlInput: {
                                        min: 0,
                                        step: 1,
                                    },
                                }}
                            />
                        </Box>
                    </DialogContent>

                    <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Button
                            disabled={updateMutation.isPending}
                            onClick={() => setEditingStop(null)}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            variant="contained"
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? 'Saving...' : 'Save changes'}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>

            <Dialog
                open={removeTarget !== null}
                onClose={
                    removeMutation.isPending
                        ? undefined
                        : () => setRemoveTarget(null)
                }
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle sx={{ fontWeight: 850 }}>
                    Remove stop from route?
                </DialogTitle>

                <DialogContent>
                    {removeMutation.isError ? (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {errorMessage(removeMutation.error)}
                        </Alert>
                    ) : null}

                    <Typography
                        sx={{
                            color: 'text.secondary',
                            fontSize: 13,
                            lineHeight: 1.7,
                        }}
                    >
                        {removeTarget
                            ? `${removeTarget.stopName} will be removed from this route. The reusable stop itself will not be deleted.`
                            : ''}
                    </Typography>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button
                        disabled={removeMutation.isPending}
                        onClick={() => setRemoveTarget(null)}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        disabled={removeMutation.isPending || !removeTarget}
                        onClick={() => {
                            if (removeTarget) {
                                removeMutation.mutate(
                                    removeTarget.id,
                                );
                            }
                        }}
                    >
                        {removeMutation.isPending
                            ? 'Removing...'
                            : 'Remove stop'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
