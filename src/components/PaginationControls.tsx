import {
    Box,
    FormControl,
    MenuItem,
    Pagination,
    Select,
    Typography,
    type SelectChangeEvent,
} from '@mui/material';

const PAGE_SIZE_OPTIONS = [
    10,
    25,
    50,
    100,
] as const;

interface PaginationControlsProps {
    page: number;

    limit: number;

    total: number;

    totalPages: number;

    onPageChange: (
        page: number,
    ) => void;

    onLimitChange: (
        limit: number,
    ) => void;
}

function rangeStart(
    page: number,
    limit: number,
    total: number,
): number {
    if (total === 0) {
        return 0;
    }

    return (
        (page - 1) *
        limit +
        1
    );
}

function rangeEnd(
    page: number,
    limit: number,
    total: number,
): number {
    if (total === 0) {
        return 0;
    }

    return Math.min(
        page * limit,
        total,
    );
}

/**
 * Shared platform pagination control.
 *
 * Standard behaviour:
 *
 * - 10 records per page by default
 * - user can select 10 / 25 / 50 / 100
 * - page numbers are shown
 * - previous / next navigation is provided by MUI
 * - changing page size is handled by the parent so the
 *   parent can reset back to page 1
 *
 * This component contains no domain logic, so it can be
 * reused across all list screens.
 */
export function PaginationControls({
    page,
    limit,
    total,
    totalPages,
    onPageChange,
    onLimitChange,
}: PaginationControlsProps) {
    function handleLimitChange(
        event:
            SelectChangeEvent<number>,
    ): void {
        const nextLimit =
            Number(
                event.target.value,
            );

        onLimitChange(
            nextLimit,
        );
    }

    return (
        <Box
            sx={{
                px: 2.5,
                py: 1.75,

                display:
                    'flex',

                flexDirection: {
                    xs:
                        'column',

                    md:
                        'row',
                },

                alignItems: {
                    xs:
                        'stretch',

                    md:
                        'center',
                },

                justifyContent:
                    'space-between',

                gap: 2,

                borderTop:
                    '1px solid',

                borderColor:
                    'divider',
            }}
        >
            <Typography
                sx={{
                    color:
                        'text.secondary',

                    fontSize:
                        12,
                }}
            >
                Showing{' '}
                <strong>
                    {rangeStart(
                        page,
                        limit,
                        total,
                    )}
                </strong>
                {'–'}
                <strong>
                    {rangeEnd(
                        page,
                        limit,
                        total,
                    )}
                </strong>{' '}
                of{' '}
                <strong>
                    {total}
                </strong>
            </Typography>

            <Box
                sx={{
                    display:
                        'flex',

                    flexDirection: {
                        xs:
                            'column',

                        sm:
                            'row',
                    },

                    alignItems: {
                        xs:
                            'stretch',

                        sm:
                            'center',
                    },

                    justifyContent:
                        'flex-end',

                    gap: 2,
                }}
            >
                <Box
                    sx={{
                        display:
                            'flex',

                        alignItems:
                            'center',

                        gap: 1,
                    }}
                >
                    <Typography
                        sx={{
                            color:
                                'text.secondary',

                            fontSize:
                                12,

                            whiteSpace:
                                'nowrap',
                        }}
                    >
                        Rows per page
                    </Typography>

                    <FormControl
                        size="small"
                    >
                        <Select<number>
                            value={
                                limit
                            }
                            onChange={
                                handleLimitChange
                            }
                            inputProps={{
                                'aria-label':
                                    'Rows per page',
                            }}
                            sx={{
                                minWidth:
                                    78,

                                fontSize:
                                    12,
                            }}
                        >
                            {PAGE_SIZE_OPTIONS.map(
                                (
                                    option,
                                ) => (
                                    <MenuItem
                                        key={
                                            option
                                        }
                                        value={
                                            option
                                        }
                                    >
                                        {option}
                                    </MenuItem>
                                ),
                            )}
                        </Select>
                    </FormControl>
                </Box>

                <Pagination
                    page={
                        Math.max(
                            1,
                            page,
                        )
                    }
                    count={
                        Math.max(
                            1,
                            totalPages,
                        )
                    }
                    disabled={
                        total ===
                        0
                    }
                    onChange={(
                        _event,
                        nextPage,
                    ) =>
                        onPageChange(
                            nextPage,
                        )
                    }
                    showFirstButton
                    showLastButton
                    siblingCount={
                        1
                    }
                    boundaryCount={
                        1
                    }
                    size="small"
                    shape="rounded"
                />
            </Box>
        </Box>
    );
}