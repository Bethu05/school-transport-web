import {
  useState,
} from 'react';

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Paper,
  Snackbar,
  Switch,
  TextField,
  Typography,
} from '@mui/material';

import {
  CheckCircleOutlineRounded,
  NotificationsNoneRounded,
  SettingsRounded,
} from '@mui/icons-material';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  useAuth,
} from '../auth/AuthProvider';

import {
  getMyNotificationPreferences,
  listMyNotifications,
  markNotificationRead,
  updateMyNotificationPreferences,
  type NotificationType,
  type UpdateNotificationPreferencesInput,
} from './notifications.api';

const PAGE_SIZES = [
  10,
  25,
  50,
  100,
] as const;

function errorMessage(
  error:
    unknown,
): string {
  return error instanceof
    Error
    ? error.message
    : 'The operation could not be completed.';
}

function formatDateTime(
  value:
    string,
): string {
  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'en-GB',
    {
      dateStyle:
        'medium',

      timeStyle:
        'short',

      timeZone:
        'Africa/Nairobi',
    },
  ).format(
    date,
  );
}

function notificationTypeLabel(
  type:
    NotificationType,
): string {
  switch (
    type
  ) {
    case 'student.boarded':
      return 'Boarded';

    case 'student.dropped_off':
      return 'Dropped off';
  }
}

export function NotificationsPage() {
  const {
    tenant,
  } =
    useAuth();

  const queryClient =
    useQueryClient();

  const tenantId =
    tenant?.tenantId;

  const [
    limit,
    setLimit,
  ] =
    useState<
      number
    >(25);

  const [
    cursor,
    setCursor,
  ] =
    useState<
      string | null
    >(null);

  const [
    cursorHistory,
    setCursorHistory,
  ] =
    useState<
      Array<
        string | null
      >
    >([]);

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState<
      string | null
    >(null);

  function resetPaging():
    void {
    setCursor(
      null,
    );

    setCursorHistory(
      [],
    );
  }

  const notificationsQuery =
    useQuery({
      queryKey: [
        'my-notifications',
        tenantId,
        limit,
        cursor,
      ],

      enabled:
        Boolean(
          tenantId,
        ),

      queryFn:
        async () => {
          if (!tenantId) {
            throw new Error(
              'No active tenant',
            );
          }

          return listMyNotifications(
            tenantId,
            {
              limit,

              cursor:
                cursor ??
                undefined,
            },
          );
        },
    });

  const preferencesQuery =
    useQuery({
      queryKey: [
        'my-notification-preferences',
        tenantId,
      ],

      enabled:
        Boolean(
          tenantId,
        ),

      retry:
        false,

      queryFn:
        async () => {
          if (!tenantId) {
            throw new Error(
              'No active tenant',
            );
          }

          return getMyNotificationPreferences(
            tenantId,
          );
        },
    });

  const markReadMutation =
    useMutation({
      mutationFn:
        async (
          notificationId:
            string,
        ) => {
          if (!tenantId) {
            throw new Error(
              'No active tenant',
            );
          }

          return markNotificationRead(
            tenantId,
            notificationId,
          );
        },

      onSuccess:
        async () => {
          await queryClient
            .invalidateQueries({
              queryKey: [
                'my-notifications',
              ],
            });
        },
    });

  const preferenceMutation =
    useMutation({
      mutationFn:
        async (
          input:
            UpdateNotificationPreferencesInput,
        ) => {
          if (!tenantId) {
            throw new Error(
              'No active tenant',
            );
          }

          return updateMyNotificationPreferences(
            tenantId,
            input,
          );
        },

      onSuccess:
        async () => {
          await queryClient
            .invalidateQueries({
              queryKey: [
                'my-notification-preferences',
              ],
            });

          setSuccessMessage(
            'Notification preferences updated.',
          );
        },
    });

  const notifications =
    notificationsQuery
      .data
      ?.items ??
    [];

  const unreadCount =
    notifications.filter(
      (
        notification,
      ) =>
        !notification.readAt,
    ).length;

  const preferences =
    preferencesQuery.data;

  return (
    <Box>
      <Box
        sx={{
          mb:
            3,
        }}
      >
        <Typography
          component="h1"
          sx={{
            fontSize:
              26,

            fontWeight:
              850,

            letterSpacing:
              '-0.03em',
          }}
        >
          Notifications
        </Typography>

        <Typography
          sx={{
            mt:
              0.5,

            color:
              'text.secondary',

            fontSize:
              13.5,
          }}
        >
          Your personal school transport notification inbox.
        </Typography>
      </Box>

      <Box
        sx={{
          display:
            'grid',

          gridTemplateColumns: {
            xs:
              '1fr',

            lg:
              'minmax(0, 2fr) minmax(280px, 1fr)',
          },

          gap:
            2.5,

          alignItems:
            'start',
        }}
      >
        {/* ====================================================
            INBOX
            ==================================================== */}

        <Box>
          <Paper
            elevation={
              0
            }
            sx={{
              mb:
                2,

              p:
                2,

              display:
                'flex',

              justifyContent:
                'space-between',

              alignItems:
                'center',

              gap:
                2,

              border:
                '1px solid',

              borderColor:
                'divider',
            }}
          >
            <Box
              sx={{
                display:
                  'flex',

                alignItems:
                  'center',

                gap:
                  1.25,
              }}
            >
              <NotificationsNoneRounded />

              <Box>
                <Typography
                  sx={{
                    fontWeight:
                      800,
                  }}
                >
                  Inbox
                </Typography>

                <Typography
                  sx={{
                    color:
                      'text.secondary',

                    fontSize:
                      11.5,
                  }}
                >
                  {unreadCount} unread on this page
                </Typography>
              </Box>
            </Box>

            <TextField
              select
              size="small"
              label="Rows"
              value={
                limit
              }
              onChange={(
                event,
              ) => {
                setLimit(
                  Number(
                    event.target
                      .value,
                  ),
                );

                resetPaging();
              }}
              sx={{
                width:
                  100,
              }}
            >
              {PAGE_SIZES.map(
                (
                  size,
                ) => (
                  <MenuItem
                    key={
                      size
                    }
                    value={
                      size
                    }
                  >
                    {size}
                  </MenuItem>
                ),
              )}
            </TextField>
          </Paper>

          {notificationsQuery.isLoading ? (
            <Box
              sx={{
                py:
                  6,

                display:
                  'grid',

                placeItems:
                  'center',
              }}
            >
              <CircularProgress
                size={
                  28
                }
              />
            </Box>
          ) : null}

          {notificationsQuery.isError ? (
            <Alert
              severity="error"
              sx={{
                mb:
                  2,
              }}
            >
              {errorMessage(
                notificationsQuery.error,
              )}
            </Alert>
          ) : null}

          {!notificationsQuery.isLoading &&
          !notificationsQuery.isError &&
          notifications.length ===
            0 ? (
            <Paper
              elevation={
                0
              }
              sx={{
                p:
                  4,

                textAlign:
                  'center',

                border:
                  '1px solid',

                borderColor:
                  'divider',
              }}
            >
              <NotificationsNoneRounded
                sx={{
                  fontSize:
                    36,

                  color:
                    'text.secondary',
                }}
              />

              <Typography
                sx={{
                  mt:
                    1,

                  fontWeight:
                    800,
                }}
              >
                No notifications
              </Typography>

              <Typography
                sx={{
                  mt:
                    0.5,

                  color:
                    'text.secondary',

                  fontSize:
                    12.5,
                }}
              >
                New transport updates linked to your guardian profile will appear here.
              </Typography>
            </Paper>
          ) : null}

          {notifications.map(
            (
              notification,
            ) => {
              const unread =
                !notification.readAt;

              return (
                <Paper
                  key={
                    notification.id
                  }
                  elevation={
                    0
                  }
                  sx={{
                    mb:
                      1.5,

                    p:
                      2.25,

                    border:
                      '1px solid',

                    borderColor:
                      unread
                        ? 'primary.main'
                        : 'divider',

                    bgcolor:
                      unread
                        ? 'action.hover'
                        : 'background.paper',
                  }}
                >
                  <Box
                    sx={{
                      display:
                        'flex',

                      justifyContent:
                        'space-between',

                      alignItems: {
                        xs:
                          'flex-start',

                        sm:
                          'center',
                      },

                      flexDirection: {
                        xs:
                          'column',

                        sm:
                          'row',
                      },

                      gap:
                        1.5,
                    }}
                  >
                    <Box
                      sx={{
                        minWidth:
                          0,
                      }}
                    >
                      <Box
                        sx={{
                          display:
                            'flex',

                          alignItems:
                            'center',

                          flexWrap:
                            'wrap',

                          gap:
                            1,
                        }}
                      >
                        <Typography
                          sx={{
                            fontWeight:
                              unread
                                ? 850
                                : 700,

                            fontSize:
                              14.5,
                          }}
                        >
                          {notification.title}
                        </Typography>

                        <Chip
                          size="small"
                          label={
                            notificationTypeLabel(
                              notification.notificationType,
                            )
                          }
                          variant="outlined"
                        />

                        {unread ? (
                          <Chip
                            size="small"
                            label="Unread"
                            color="primary"
                          />
                        ) : null}
                      </Box>

                      <Typography
                        sx={{
                          mt:
                            1,

                          color:
                            'text.secondary',

                          fontSize:
                            13,

                          lineHeight:
                            1.6,
                        }}
                      >
                        {notification.body}
                      </Typography>

                      <Typography
                        sx={{
                          mt:
                            1,

                          color:
                            'text.secondary',

                          fontSize:
                            11.5,
                        }}
                      >
                        {formatDateTime(
                          notification.createdAt,
                        )}
                      </Typography>
                    </Box>

                    {unread ? (
                      <Button
                        size="small"
                        startIcon={
                          <CheckCircleOutlineRounded />
                        }
                        disabled={
                          markReadMutation
                            .isPending
                        }
                        onClick={() =>
                          markReadMutation
                            .mutate(
                              notification.id,
                            )
                        }
                      >
                        Mark read
                      </Button>
                    ) : null}
                  </Box>
                </Paper>
              );
            },
          )}

          {!notificationsQuery.isLoading &&
          !notificationsQuery.isError ? (
            <Box
              sx={{
                mt:
                  2,

                display:
                  'flex',

                justifyContent:
                  'space-between',

                alignItems:
                  'center',
              }}
            >
              <Button
                disabled={
                  cursorHistory.length ===
                  0
                }
                onClick={() => {
                  const previous =
                    cursorHistory[
                      cursorHistory.length -
                      1
                    ] ??
                    null;

                  setCursorHistory(
                    (
                      history,
                    ) =>
                      history.slice(
                        0,
                        -1,
                      ),
                  );

                  setCursor(
                    previous,
                  );
                }}
              >
                Previous
              </Button>

              <Button
                disabled={
                  !notificationsQuery
                    .data
                    ?.nextCursor
                }
                onClick={() => {
                  const next =
                    notificationsQuery
                      .data
                      ?.nextCursor;

                  if (!next) {
                    return;
                  }

                  setCursorHistory(
                    (
                      history,
                    ) => [
                      ...history,
                      cursor,
                    ],
                  );

                  setCursor(
                    next,
                  );
                }}
              >
                Next
              </Button>
            </Box>
          ) : null}

          {markReadMutation.isError ? (
            <Alert
              severity="error"
              sx={{
                mt:
                  2,
              }}
            >
              {errorMessage(
                markReadMutation.error,
              )}
            </Alert>
          ) : null}
        </Box>

        {/* ====================================================
            PREFERENCES
            ==================================================== */}

        <Paper
          elevation={
            0
          }
          sx={{
            p:
              2.5,

            border:
              '1px solid',

            borderColor:
              'divider',
          }}
        >
          <Box
            sx={{
              mb:
                2,

              display:
                'flex',

              alignItems:
                'center',

              gap:
                1,
            }}
          >
            <SettingsRounded />

            <Typography
              sx={{
                fontWeight:
                  850,
              }}
            >
              Preferences
            </Typography>
          </Box>

          {preferencesQuery.isLoading ? (
            <Box
              sx={{
                py:
                  2,

                display:
                  'grid',

                placeItems:
                  'center',
              }}
            >
              <CircularProgress
                size={
                  24
                }
              />
            </Box>
          ) : null}

          {preferencesQuery.isError ? (
            <Alert
              severity="info"
            >
              Notification preferences are available when this account is linked to an active guardian profile.
            </Alert>
          ) : null}

          {preferences ? (
            <Box
              sx={{
                display:
                  'grid',

                gap:
                  1,
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={
                      preferences.notifyBoarded
                    }
                    disabled={
                      preferenceMutation
                        .isPending
                    }
                    onChange={(
                      _event,
                      checked,
                    ) =>
                      preferenceMutation
                        .mutate({
                          notifyBoarded:
                            checked,
                        })
                    }
                  />
                }
                label="Student boarded"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={
                      preferences.notifyDroppedOff
                    }
                    disabled={
                      preferenceMutation
                        .isPending
                    }
                    onChange={(
                      _event,
                      checked,
                    ) =>
                      preferenceMutation
                        .mutate({
                          notifyDroppedOff:
                            checked,
                        })
                    }
                  />
                }
                label="Student dropped off"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={
                      preferences.notifyTripUpdates
                    }
                    disabled={
                      preferenceMutation
                        .isPending
                    }
                    onChange={(
                      _event,
                      checked,
                    ) =>
                      preferenceMutation
                        .mutate({
                          notifyTripUpdates:
                            checked,
                        })
                    }
                  />
                }
                label="Trip updates"
              />

              <Typography
                sx={{
                  mt:
                    1,

                  color:
                    'text.secondary',

                  fontSize:
                    11.5,

                  lineHeight:
                    1.6,
                }}
              >
                These preferences belong to your active guardian profile and apply only to your own notifications.
              </Typography>
            </Box>
          ) : null}

          {preferenceMutation.isError ? (
            <Alert
              severity="error"
              sx={{
                mt:
                  2,
              }}
            >
              {errorMessage(
                preferenceMutation.error,
              )}
            </Alert>
          ) : null}
        </Paper>
      </Box>

      <Snackbar
        open={
          successMessage !==
          null
        }
        autoHideDuration={
          3000
        }
        onClose={() =>
          setSuccessMessage(
            null,
          )
        }
        anchorOrigin={{
          vertical:
            'bottom',

          horizontal:
            'right',
        }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() =>
            setSuccessMessage(
              null,
            )
          }
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
