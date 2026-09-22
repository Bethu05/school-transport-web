import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

interface UpgradeRequiredDialogProps {
  open: boolean;

  featureName: string;

  onClose: () => void;
}

/**
 * Lightweight commercial lock explanation.
 *
 * Pricing, checkout and marketing copy deliberately remain outside
 * this demo-ready component. The backend entitlement remains the
 * authoritative access boundary.
 */
export function UpgradeRequiredDialog({
  open,
  featureName,
  onClose,
}: UpgradeRequiredDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle
        sx={{
          fontWeight: 850,
        }}
      >
        Upgrade required
      </DialogTitle>

      <DialogContent>
        <Typography
          sx={{
            color: "text.secondary",
            fontSize: 13,
            lineHeight: 1.7,
          }}
        >
          {featureName} is not enabled for your organisation&apos;s current
          package. Contact your service provider to enable this feature.
        </Typography>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 3,
        }}
      >
        <Button
          variant="contained"
          onClick={onClose}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
