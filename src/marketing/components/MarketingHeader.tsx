import { Box, Button, Container, Typography } from "@mui/material";

import { LoginRounded, RouteRounded } from "@mui/icons-material";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/AuthProvider";

export function MarketingHeader() {
  const navigate = useNavigate();

  const { authenticated } = useAuth();

  return (
    <Box
      component="header"
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 20,

        py: { xs: 1, md: 1.25 },
        px: { xs: 1, md: 1.5 },

        bgcolor: "transparent",
      }}
    >
      <Container
        maxWidth="xl"
        sx={{
          minHeight: { xs: 60, md: 64 },

          px: { xs: 1.4, md: 2 },

          border: "1px solid rgba(8,127,121,0.14)",
          borderRadius: 3,

          bgcolor: "rgba(242,247,247,0.82)",
          backdropFilter: "blur(18px) saturate(145%)",
          WebkitBackdropFilter: "blur(18px) saturate(145%)",

          boxShadow: "0 14px 34px rgba(11,31,42,0.10)",

          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",

          gap: 3,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.3,
          }}
        >
          <Box
            sx={{
              width: 38,
              height: 38,

              display: "grid",
              placeItems: "center",

              borderRadius: 2,

              bgcolor: "primary.main",
              boxShadow: "0 8px 20px rgba(8,127,121,0.20)",
              color: "primary.contrastText",
            }}
          >
            <RouteRounded />
          </Box>

          <Box>
            <Typography
              sx={{
                fontSize: 15,
                fontWeight: 900,
                lineHeight: 1.1,
              }}
            >
              AFIKA
            </Typography>

            <Typography
              sx={{
                mt: 0.2,
                color: "text.secondary",
                fontSize: 9.5,
                fontWeight: 650,
              }}
            >
              Mobility
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: {
              xs: "none",
              md: "flex",
            },

            alignItems: "center",
            gap: 0.5,
          }}
        >
          <Button component="a" href="#features" color="inherit">
            Platform
          </Button>

          <Button component="a" href="#how-it-works" color="inherit">
            How it works
          </Button>

          <Button component="a" href="#multi-school" color="inherit">
            Multi-school
          </Button>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Button
            component="a"
            href="#request-demo"
            variant="outlined"
            sx={{
              display: {
                xs: "none",
                sm: "inline-flex",
              },
            }}
          >
            Book a demo
          </Button>

          <Button
            variant="contained"
            startIcon={<LoginRounded />}
            onClick={() => navigate(authenticated ? "/dashboard" : "/login")}
          >
            {authenticated ? "Open app" : "Sign in"}
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
