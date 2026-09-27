import { Box, Container, Divider, Typography } from "@mui/material";

import { RouteRounded } from "@mui/icons-material";

export function MarketingFooter() {
  return (
    <Box
      component="footer"
      sx={{
        mt: 10,
        bgcolor: "#0B1F2A",
        color: "common.white",
      }}
    >
      <Container
        maxWidth="xl"
        sx={{
          py: 5,
        }}
      >
        <Box
          sx={{
            display: "flex",

            flexDirection: {
              xs: "column",
              md: "row",
            },

            alignItems: {
              xs: "flex-start",
              md: "center",
            },

            justifyContent: "space-between",

            gap: 3,
          }}
        >
          <Box
            sx={{
              display: "flex",
              gap: 1.5,
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,

                display: "grid",
                placeItems: "center",

                borderRadius: 2,

                bgcolor: "rgba(255,255,255,0.10)",
              }}
            >
              <RouteRounded />
            </Box>

            <Box>
              <Typography
                sx={{
                  fontWeight: 850,
                }}
              >
                Afika Mobility
              </Typography>

              <Typography
                sx={{
                  mt: 0.25,

                  color: "rgba(255,255,255,0.55)",

                  fontSize: 10.5,
                }}
              >
                Safe journeys. Clear operations. Connected mobility.
              </Typography>
            </Box>
          </Box>

          <Typography
            sx={{
              maxWidth: 480,

              color: "rgba(255,255,255,0.60)",

              fontSize: 11.5,

              lineHeight: 1.7,
            }}
          >
            A connected transport operations platform bringing routes, vehicles,
            drivers, passengers and operational visibility together.
          </Typography>
        </Box>

        <Divider
          sx={{
            my: 4,

            borderColor: "rgba(255,255,255,0.10)",
          }}
        />

        <Box
          sx={{
            display: "flex",

            flexDirection: {
              xs: "column",
              sm: "row",
            },

            justifyContent: "space-between",

            gap: 1,
          }}
        >
          <Typography
            sx={{
              color: "rgba(255,255,255,0.45)",

              fontSize: 10,
            }}
          >
            © 2026 Afika Mobility
          </Typography>

          <Typography
            sx={{
              color: "rgba(255,255,255,0.45)",

              fontSize: 10,
            }}
          >
            Transport Operations Platform
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
