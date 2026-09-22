import { Box, Button, Container, Typography } from "@mui/material";

import { DirectionsBusRounded, LoginRounded } from "@mui/icons-material";

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

        borderBottom: "1px solid",
        borderColor: "divider",

        bgcolor: "rgba(255,255,255,0.94)",
        backdropFilter: "blur(14px)",
      }}
    >
      <Container
        maxWidth="xl"
        sx={{
          minHeight: 76,

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
              width: 42,
              height: 42,

              display: "grid",
              placeItems: "center",

              borderRadius: 2,

              bgcolor: "primary.main",
              color: "primary.contrastText",
            }}
          >
            <DirectionsBusRounded />
          </Box>

          <Box>
            <Typography
              sx={{
                fontSize: 15,
                fontWeight: 900,
                lineHeight: 1.1,
              }}
            >
              School Transport
            </Typography>

            <Typography
              sx={{
                mt: 0.2,
                color: "text.secondary",
                fontSize: 9.5,
                fontWeight: 650,
              }}
            >
              by sirb-Technologies
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
            Features
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
            Request a demo
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
