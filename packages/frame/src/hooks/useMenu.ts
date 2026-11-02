import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * A fold that hangs off the control that opened it: whether it is open, and the box a press inside it does not close.
 *
 * A menu is not a panel and does not fold on an edge. It closes when the press lands outside it, which is the press a
 * person makes without being told to, and on Escape. The control that opened it is part of the box, so pressing that
 * control again is its own press rather than this one closing the menu and the control opening it on the same click.
 *
 * It is a hook and not a panel's flag because the frame has two of them and the rule is the same rule: two copies of
 * it are two places for the outside press to be read differently.
 */
export function useMenu(): [boolean, (open: boolean) => void, RefObject<HTMLDivElement | null>] {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (box.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    // Capture, because a control group stops the press before it reaches the page: a menu must still close when another
    // control in the same group is pressed.
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return [open, setOpen, box];
}
