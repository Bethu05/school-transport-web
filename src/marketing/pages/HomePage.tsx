import { Box, Button, Chip, Container, Paper, Typography } from "@mui/material";

import {
  ArrowForwardRounded,
  CheckCircleRounded,
  DirectionsBusRounded,
  FamilyRestroomRounded,
  MapRounded,
  NotificationsRounded,
  RouteRounded,
  SchoolRounded,
} from "@mui/icons-material";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/AuthProvider";

import { MarketingLayout } from "../MarketingLayout";

const features = [
  {
    title: "Live vehicle tracking",

    description:
      "See active school journeys and vehicle positions from one operational view.",

    icon: <MapRounded />,
  },

  {
    title: "Transport safety",

    description:
      "Surface operational safety events and help teams respond quickly.",

    icon: <NotificationsRounded />,
  },

  {
    title: "Route management",

    description:
      "Build routes, organise stops and manage daily transport operations.",

    icon: <RouteRounded />,
  },

  {
    title: "Fleet & drivers",

    description:
      "Keep vehicles, GPS assignments and authorised drivers organised.",

    icon: <DirectionsBusRounded />,
  },

  {
    title: "Student visibility",

    description:
      "Connect students with their transport journey and operational records.",

    icon: <SchoolRounded />,
  },

  {
    title: "Parent experience",

    description:
      "Give families clearer visibility into the journeys that matter to them.",

    icon: <FamilyRestroomRounded />,
  },
];

export function HomePage() {
  const navigate = useNavigate();

  const { authenticated } = useAuth();

  return (
    <MarketingLayout>
      {/* ====================================================
          HERO
          ==================================================== */}

      <Box
        sx={{
          position: "relative",
          overflow: "hidden",

          py: {
            xs: 8,
            md: 12,
          },

          background:
            "linear-gradient(135deg, #FFFDF8 0%, #F8F3E9 48%, #EDE1C8 100%)",
        }}
      >
        <Container maxWidth="xl">
          <Box
            sx={{
              display: "grid",

              gridTemplateColumns: {
                xs: "1fr",
                lg: "minmax(0, 1.02fr) minmax(440px, 0.98fr)",
              },

              alignItems: "center",

              gap: {
                xs: 6,
                lg: 8,
              },
            }}
          >
            <Box>
              <Chip
                label="Modern school transport operations"
                sx={{
                  mb: 3,

                  color: "primary.dark",

                  bgcolor: "rgba(201,165,92,0.12)",

                  fontWeight: 800,
                }}
              />

              <Typography
                component="h1"
                sx={{
                  maxWidth: 760,

                  fontSize: {
                    xs: 46,
                    sm: 58,
                    md: 72,
                  },

                  lineHeight: 0.98,

                  fontWeight: 950,

                  letterSpacing: "-0.055em",

                  color: "#17191D",
                }}
              >
                Safer journeys.
                <Box
                  component="span"
                  sx={{
                    display: "block",
                    color: "primary.main",
                  }}
                >
                  Smarter operations.
                </Box>
              </Typography>

              <Typography
                sx={{
                  mt: 3,

                  maxWidth: 650,

                  color: "text.secondary",

                  fontSize: {
                    xs: 17,
                    md: 19,
                  },

                  lineHeight: 1.7,
                }}
              >
                One platform for schools, transport teams, drivers and families
                to manage safer, more visible student journeys.
              </Typography>

              <Box
                sx={{
                  mt: 4,

                  display: "flex",
                  flexWrap: "wrap",

                  gap: 1.5,
                }}
              >
                <Button
                  component="a"
                  href="#request-demo"
                  variant="contained"
                  size="large"

                  endIcon={<ArrowForwardRounded />}
                >
                  Request a demo
                </Button>

                <Button
                  variant="outlined"
                  size="large"

                  onClick={() =>
                    navigate(authenticated ? "/dashboard" : "/login")
                  }
                >
                  {authenticated ? "Open platform" : "Customer sign in"}
                </Button>
              </Box>
            </Box>

            {/* ==================================================
                PRODUCT PREVIEW

                This is deliberately built from UI components
                today. Later we can replace / supplement it with
                actual product screenshots and photography.
                ================================================== */}

            <Paper
              elevation={0}
              sx={{
                p: 2,

                borderRadius: 4,

                border: "1px solid",

                borderColor: "rgba(201,165,92,0.25)",

                boxShadow: "0 35px 80px rgba(18,20,23,0.15)",

                bgcolor: "rgba(255,255,255,0.92)",
              }}
            >
              <Box
                sx={{
                  p: 3,

                  borderRadius: 3,

                  color: "common.white",

                  background:
                    "linear-gradient(125deg, #101828 0%, #163B43 58%, #0F766E 100%)",
                }}
              >
                <Typography
                  sx={{
                    color: "rgba(255,255,255,0.58)",

                    fontSize: 10,

                    fontWeight: 800,

                    textTransform: "uppercase",

                    letterSpacing: "0.13em",
                  }}
                >
                  Transport Command Centre
                </Typography>

                <Typography
                  sx={{
                    mt: 1,

                    fontSize: 25,

                    fontWeight: 900,
                  }}
                >
                  Today&apos;s operations
                </Typography>

                <Box
                  sx={{
                    mt: 3,

                    display: "grid",

                    gridTemplateColumns: "repeat(3, 1fr)",

                    gap: 1,
                  }}
                >
                  {[
                    ["12", "Vehicles"],
                    ["15", "Drivers"],
                    ["8", "Routes"],
                  ].map(([value, label]) => (
                    <Box
                      key={label}
                      sx={{
                        p: 1.5,

                        borderRadius: 2,

                        bgcolor: "rgba(255,255,255,0.08)",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 22,
                          fontWeight: 900,
                        }}
                      >
                        {value}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.3,

                          color: "rgba(255,255,255,0.56)",

                          fontSize: 9,
                        }}
                      >
                        {label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Box
                sx={{
                  mt: 2,

                  display: "grid",

                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "1fr 1fr",
                  },

                  gap: 1.5,
                }}
              >
                {[
                  "Live tracking",
                  "Safety monitoring",
                  "Driver management",
                  "Multi-school operations",
                ].map((item) => (
                  <Box
                    key={item}
                    sx={{
                      p: 1.5,

                      display: "flex",
                      alignItems: "center",

                      gap: 1,

                      borderRadius: 2,

                      bgcolor: "action.hover",
                    }}
                  >
                    <CheckCircleRounded
                      sx={{
                        fontSize: 18,
                        color: "success.main",
                      }}
                    />

                    <Typography
                      sx={{
                        fontSize: 10.5,
                        fontWeight: 750,
                      }}
                    >
                      {item}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Box>
        </Container>
      </Box>

      {/* ====================================================
          FEATURES
          ==================================================== */}

      <Container
        id="features"
        maxWidth="xl"
        sx={{
          py: {
            xs: 8,
            md: 11,
          },
        }}
      >
        <Typography
          sx={{
            color: "primary.dark",

            fontSize: 10,

            fontWeight: 850,

            letterSpacing: "0.14em",

            textTransform: "uppercase",
          }}
        >
          One connected platform
        </Typography>

        <Typography
          component="h2"
          sx={{
            mt: 1,

            maxWidth: 720,

            fontSize: {
              xs: 34,
              md: 48,
            },

            fontWeight: 950,

            lineHeight: 1.05,

            letterSpacing: "-0.045em",
          }}
        >
          Everything your transport team needs to stay in control.
        </Typography>

        <Box
          sx={{
            mt: 5,

            display: "grid",

            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0,1fr))",
              lg: "repeat(3, minmax(0,1fr))",
            },

            gap: 2,
          }}
        >
          {features.map((feature) => (
            <Paper
              key={feature.title}
              elevation={0}

              sx={{
                p: 3,

                minHeight: 210,

                border: "1px solid",

                borderColor: "divider",

                transition: "transform 160ms ease, box-shadow 160ms ease",

                "&:hover": {
                  transform: "translateY(-4px)",

                  boxShadow: "0 18px 45px rgba(18,20,23,0.08)",
                },
              }}
            >
              <Box
                sx={{
                  width: 46,
                  height: 46,

                  display: "grid",
                  placeItems: "center",

                  borderRadius: 2,

                  color: "primary.main",

                  bgcolor: "rgba(201,165,92,0.10)",
                }}
              >
                {feature.icon}
              </Box>

              <Typography
                sx={{
                  mt: 2.5,

                  fontSize: 16,

                  fontWeight: 850,
                }}
              >
                {feature.title}
              </Typography>

              <Typography
                sx={{
                  mt: 1,

                  color: "text.secondary",

                  fontSize: 12,

                  lineHeight: 1.7,
                }}
              >
                {feature.description}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Container>

      {/* ====================================================
          HOW IT WORKS
          ==================================================== */}

      <Box
        id="how-it-works"
        sx={{
          py: {
            xs: 8,
            md: 10,
          },

          bgcolor: "#101828",

          color: "common.white",
        }}
      >
        <Container maxWidth="xl">
          <Typography
            sx={{
              color: "rgba(255,255,255,0.48)",

              fontSize: 10,

              fontWeight: 850,

              letterSpacing: "0.14em",

              textTransform: "uppercase",
            }}
          >
            How it works
          </Typography>

          <Typography
            component="h2"
            sx={{
              mt: 1,

              fontSize: {
                xs: 34,
                md: 48,
              },

              fontWeight: 950,

              letterSpacing: "-0.045em",
            }}
          >
            From setup to every journey.
          </Typography>

          <Box
            sx={{
              mt: 5,

              display: "grid",

              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(4, minmax(0,1fr))",
              },

              gap: 2,
            }}
          >
            {[
              ["01", "Set up your schools"],

              ["02", "Build routes & fleet"],

              ["03", "Run daily journeys"],

              ["04", "Track & respond"],
            ].map(([number, label]) => (
              <Box
                key={number}
                sx={{
                  p: 3,

                  borderTop: "1px solid rgba(255,255,255,0.18)",
                }}
              >
                <Typography
                  sx={{
                    color: "rgba(225,196,122,0.88)",

                    fontSize: 12,

                    fontWeight: 850,
                  }}
                >
                  {number}
                </Typography>

                <Typography
                  sx={{
                    mt: 2,

                    fontSize: 17,

                    fontWeight: 800,
                  }}
                >
                  {label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ====================================================
          MULTI-SCHOOL
          ==================================================== */}

      <Container
        id="multi-school"
        maxWidth="xl"
        sx={{
          py: {
            xs: 8,
            md: 11,
          },
        }}
      >
        <Box
          sx={{
            display: "grid",

            gridTemplateColumns: {
              xs: "1fr",
              md: "0.9fr 1.1fr",
            },

            gap: 6,

            alignItems: "center",
          }}
        >
          <Box>
            <Box
              sx={{
                width: 58,
                height: 58,

                display: "grid",
                placeItems: "center",

                borderRadius: 3,

                color: "primary.main",

                bgcolor: "rgba(201,165,92,0.12)",
              }}
            >
              <SchoolRounded
                sx={{
                  fontSize: 30,
                }}
              />
            </Box>

            <Typography
              component="h2"
              sx={{
                mt: 3,

                fontSize: {
                  xs: 34,
                  md: 48,
                },

                fontWeight: 950,

                lineHeight: 1.06,

                letterSpacing: "-0.045em",
              }}
            >
              One organisation. Multiple schools.
            </Typography>

            <Typography
              sx={{
                mt: 2,

                color: "text.secondary",

                fontSize: 14,

                lineHeight: 1.75,
              }}
            >
              Manage multiple campuses under one customer account while keeping
              operational data securely isolated to the organisation.
            </Typography>
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: 3,

              border: "1px solid",

              borderColor: "divider",
            }}
          >
            {[
              ["Nairobi Primary School", "NPS"],

              ["Westlands Academy", "WA"],

              ["Karen Campus", "KC"],
            ].map(([name, code], index) => (
              <Box
                key={code}
                sx={{
                  py: 2,

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "space-between",

                  gap: 2,

                  borderBottom: index < 2 ? "1px solid" : "none",

                  borderColor: "divider",
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    {name}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.3,

                      color: "text.secondary",

                      fontSize: 10,
                    }}
                  >
                    School code {code}
                  </Typography>
                </Box>

                <Chip
                  label="Active"
                  size="small"

                  sx={{
                    color: "success.main",

                    bgcolor: "rgba(16,185,129,0.08)",
                  }}
                />
              </Box>
            ))}
          </Paper>
        </Box>
      </Container>

      {/* ====================================================
          DEMO CTA

          This is a visual CTA for now. We will connect a
          real demo-request endpoint/form before launch rather
          than pretending the lead has been saved.
          ==================================================== */}

      <Container id="request-demo" maxWidth="xl">
        <Paper
          elevation={0}
          sx={{
            px: {
              xs: 3,
              md: 6,
            },

            py: {
              xs: 5,
              md: 6,
            },

            borderRadius: 4,

            color: "common.white",

            background: "linear-gradient(125deg, #163B43 0%, #0F766E 100%)",
          }}
        >
          <Typography
            component="h2"
            sx={{
              maxWidth: 650,

              fontSize: {
                xs: 32,
                md: 44,
              },

              fontWeight: 950,

              lineHeight: 1.06,

              letterSpacing: "-0.04em",
            }}
          >
            Ready to see your school transport operation differently?
          </Typography>

          <Typography
            sx={{
              mt: 2,

              maxWidth: 650,

              color: "rgba(255,255,255,0.68)",

              fontSize: 13,

              lineHeight: 1.7,
            }}
          >
            Our demo-request form will live here before public launch and feed
            directly into the platform sales workflow.
          </Typography>

          <Chip
            label="Demo request workflow coming in the launch pass"
            sx={{
              mt: 3,

              color: "common.white",

              bgcolor: "rgba(255,255,255,0.10)",
            }}
          />
        </Paper>
      </Container>
    </MarketingLayout>
  );
}
