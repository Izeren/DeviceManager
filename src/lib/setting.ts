import type { Action } from "svelte/action";
import { changes, ChangeType, settings } from "$lib/undo-redo";

export const setting: Action<
  HTMLInputElement | HTMLSelectElement,
  { id: number; inverse?: number; scale?: number }
> = function (
  node: HTMLInputElement | HTMLSelectElement,
  { id, inverse, scale },
) {
  node.setAttribute("disabled", "");
  const type = node.getAttribute("type") as "number" | "checkbox" | "range";
  const isNumeric =
    type === "number" || type === "range" || node instanceof HTMLSelectElement;
  const min = node.hasAttribute("min")
    ? Number(node.getAttribute("min"))
    : undefined;
  const max = node.hasAttribute("max")
    ? Number(node.getAttribute("max"))
    : undefined;

  const unsubscribe = settings.subscribe(async (settings) => {
    if (id in settings) {
      const { value, isApplied } = settings[id]!;
      if (isNumeric) {
        node.value = (
          inverse !== undefined
            ? inverse / value
            : scale !== undefined
              ? scale * value
              : value
        ).toString();
      } else {
        node.checked = value !== 0;
      }
      if (isApplied) {
        node.classList.remove("pending-changes");
      } else {
        node.classList.add("pending-changes");
      }
      node.removeAttribute("disabled");
    } else {
      node.setAttribute("disabled", "");
    }
  });

  async function listener() {
    let value: number;
    if (isNumeric) {
      value = Number(node.value);
      if (Number.isNaN(value)) return;
      value = Math.floor(
        inverse !== undefined
          ? inverse / value
          : scale !== undefined
            ? value / scale
            : value,
      );
      if (min !== undefined) value = Math.max(min, value);
      if (max !== undefined) value = Math.min(max, value);
    } else {
      value = node.checked ? 1 : 0;
    }

    changes.update((changes) => {
      changes.push([
        {
          type: ChangeType.Setting,
          id: id,
          setting: value,
        },
      ]);
      return changes;
    });
  }

  node.addEventListener("change", listener);

  return {
    destroy() {
      node.removeEventListener("change", listener);
      unsubscribe();
    },
  };
};
