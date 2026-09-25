import { useEffect, useState } from 'react';
import { Button, Callout, Dialog } from './ui';
import { useFeedback } from './ui/feedback';
import { FREE_CASE_LIMIT, getUnlockOffer, restorePurchases, type UnlockOffer } from './purchases';

interface PurchaseError {
  userCancelled?: boolean | null;
  message?: string;
}

export { FREE_CASE_LIMIT };

export function PaywallDialog({ open, onClose, onUnlocked = () => {} }: { open: boolean; onClose: () => void; onUnlocked?: () => void }) {
  const [offer, setOffer] = useState<UnlockOffer | null>(null);
  const [loadingOffer, setLoadingOffer] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toast } = useFeedback();

  useEffect(() => {
    if (!open) return;
    setLoadingOffer(true);
    getUnlockOffer()
      .then(setOffer)
      .finally(() => setLoadingOffer(false));
  }, [open]);

  const buy = async () => {
    if (!offer) return;
    setBusy(true);
    try {
      if (await offer.purchase()) {
        toast('Full library unlocked — thank you!');
        onUnlocked();
        onClose();
      }
    } catch (e) {
      const err = e as PurchaseError;
      if (!err?.userCancelled) toast(`Purchase failed: ${err?.message ?? 'unknown error'}`);
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    try {
      if (await restorePurchases()) {
        toast('Purchase restored');
        onUnlocked();
        onClose();
      } else {
        toast('No previous purchase found for this Apple ID');
      }
    } catch (e) {
      toast(`Restore failed: ${(e as Error)?.message ?? 'unknown error'}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Unlock the full library"
      actions={
        <>
          <Button variant="text" onClick={() => void restore()} disabled={busy}>
            Restore purchase
          </Button>
          <Button variant="text" onClick={onClose} disabled={busy}>
            Not now
          </Button>
          <Button variant="filled" onClick={() => void buy()} disabled={busy || loadingOffer || !offer}>
            {offer ? `Unlock for ${offer.priceString}` : loadingOffer ? 'Loading…' : 'Unavailable'}
          </Button>
        </>
      }
    >
      <Callout>
        The free version keeps up to {FREE_CASE_LIMIT} mysteries in your library. Unlock the full library once, for good — no
        subscription, no ads — to save as many as you like.
      </Callout>
    </Dialog>
  );
}
